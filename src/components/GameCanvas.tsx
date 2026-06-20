/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useEffect, useState, useMemo } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import {
  Breed,
  EvolutionLevel,
  GameMode,
  PowerUpType,
  ObstacleType,
  ObstacleInstance,
  CollectibleInstance,
  GhostRun,
  GhostFrame,
} from '../types';
import { GameAudio } from '../utils/audio';
import { ArrowLeft, ArrowRight, ArrowUp, ArrowDown, Construction, Sparkles, Bone } from 'lucide-react';

// Shared WebGL Geometry & Material Caches for smooth 60fps rendering and instant remounts
const geoCache = new Map<string, THREE.BufferGeometry>();
const matCache = new Map<string, THREE.Material>();

function getCachedGeometry<T extends THREE.BufferGeometry>(key: string, fn: () => T): T {
  if (!geoCache.has(key)) {
    geoCache.set(key, fn());
  }
  return geoCache.get(key) as T;
}

function getCachedMaterial<T extends THREE.Material>(key: string, fn: () => T): T {
  if (!matCache.has(key)) {
    matCache.set(key, fn());
  }
  return matCache.get(key) as T;
}

interface GameCanvasProps {
  activeBreed: Breed;
  evolution: EvolutionLevel;
  numLanes: 1 | 3 | 5;
  gameMode: GameMode;
  ghostRunToRace?: GhostRun;
  playerLevel: number;
  linkType?: string;
  customRound?: string;
  customOther?: string;
  customDogModelBuffer?: ArrayBuffer | null;
  onGameEnd: (stats: {
    distance: number;
    bonesCollected: number;
    howlTokensCollected: number;
    xpEarned: number;
    maxCombo: number;
    obstaclesAvoided: number;
    powerupsCollected: number;
  }) => void;
}

export const GameCanvas: React.FC<GameCanvasProps> = ({
  activeBreed,
  evolution,
  numLanes,
  gameMode,
  ghostRunToRace,
  playerLevel,
  linkType = 'whistle',
  customRound = 'none',
  customOther = 'none',
  customDogModelBuffer = null,
  onGameEnd,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Core gameplay mutable state (to avoid state re-render lag inside loop)
  const stateRef = useRef({
    distance: 0,
    speed: 15, // base speed
    score: 0,
    bonesCollected: 0,
    howlTokensCollected: 0,
    xpEarned: 0,
    combo: 1,
    maxCombo: 1,
    obstaclesAvoided: 0,
    powerupsCollected: 0,

    playerLane: 0, // Current lane (integer index)
    playerVisualLane: 0, // Smoothly interpolated lane location
    playerY: 0, // height of pet (0: ground)
    playerVy: 0, // Y speed (gravity)
    playerSlideTimer: 0, // duration of active ducking state
    isDigging: false,
    digDuration: 0,

    activePowerUp: 'none' as PowerUpType,
    powerUpTimer: 0, // ticks or seconds left, e.g. 10.0s

    obstacles: [] as ObstacleInstance[],
    collectibles: [] as CollectibleInstance[],
    particles: [] as Array<{
      x: number;
      y: number;
      vx: number;
      vy: number;
      color: string;
      life: number;
      maxLife: number;
      size: number;
    }>,

    isGameOver: false,
    gameTime: 0,
    lastSpawnZ: 0,
    introActive: true,
    introTime: 0,

    // Companion Link modifiers
    hasShield: false,
    invulnTimer: 0,
    stumbleTimer: 0,

    // Multiplayer ghost simulation
    ghostFrameIndex: 0,
    recordedFrames: [] as GhostFrame[],
  });

  // Controls UI indicators for visual aid
  const [isPaused, setIsPaused] = useState(false);
  const [activeLane, setActiveLane] = useState(0);
  const [showDigAlert, setShowDigAlert] = useState(false);
  const [activePowerUpUI, setActivePowerUpUI] = useState<PowerUpType>('none');
  const [powerUpTimeLeftUI, setPowerUpTimeLeftUI] = useState(0);

  // Perspective 3D metrics
  const focalLength = 300;
  const laneSpacing = 50; // visual distance between lanes in world space

  // Drag trace reference and direct click/touch triggers for canvas
  const dragStartRef = useRef<{ x: number; y: number } | null>(null);

  const handleCanvasStart = (clientX: number, clientY: number) => {
    if (!canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    dragStartRef.current = {
      x: clientX - rect.left,
      y: clientY - rect.top,
    };
  };

  const handleCanvasEnd = (clientX: number, clientY: number) => {
    if (!dragStartRef.current || !canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const endX = clientX - rect.left;
    const endY = clientY - rect.top;

    const dx = endX - dragStartRef.current.x;
    const dy = endY - dragStartRef.current.y;
    const absX = Math.abs(dx);
    const absY = Math.abs(dy);

    const state = stateRef.current;
    if (state.isGameOver || isPaused || state.introActive) {
      dragStartRef.current = null;
      return;
    }

    const minLane = numLanes === 5 ? -2 : numLanes === 3 ? -1 : 0;
    const maxLane = numLanes === 5 ? 2 : numLanes === 3 ? 1 : 0;

    // Determine if swipe of significant drag occurred, else trigger localized region click
    if (absX > 25 || absY > 25) {
      if (absX > absY) {
        if (dx > 0) {
          if (state.playerLane < maxLane && !state.isDigging) {
            state.playerLane += 1;
            GameAudio.playCollect(false, false);
          }
        } else {
          if (state.playerLane > minLane && !state.isDigging) {
            state.playerLane -= 1;
            GameAudio.playCollect(false, false);
          }
        }
      } else {
        if (dy > 0) {
          // Swipe down (slide/tunnel)
          if (state.playerY === 0 && !state.isDigging) {
            state.playerSlideTimer = 35;
            GameAudio.playCollect(false, false);
          } else if (state.playerY > 0) {
            state.playerVy = -12;
          }
        } else {
          // Swipe up (leap)
          if (state.playerY === 0 && state.playerSlideTimer <= 0 && !state.isDigging) {
            const jumpPower = state.activePowerUp === 'superjump' ? 14 : 9;
            state.playerVy = jumpPower;
            state.playerY = 0.1;
            GameAudio.playCollect(true, false);
          }
        }
      }
    } else {
      // Tap Region on physical canvas area!
      const clickX = dragStartRef.current.x;
      const clickY = dragStartRef.current.y;
      const canvasW = canvasRef.current.width;
      const canvasH = canvasRef.current.height;

      // Lower 40% height: Slide / go down the tunnel ("Click Down")
      if (clickY > canvasH * 0.6) {
        if (state.playerY === 0 && !state.isDigging) {
          state.playerSlideTimer = 35;
          GameAudio.playCollect(false, false);
        } else if (state.playerY > 0) {
          state.playerVy = -12;
        }
      }
      // Upper 40% height: Leap / Jump
      else if (clickY < canvasH * 0.4) {
        if (state.playerY === 0 && state.playerSlideTimer <= 0 && !state.isDigging) {
          const jumpPower = state.activePowerUp === 'superjump' ? 14 : 9;
          state.playerVy = jumpPower;
          state.playerY = 0.1;
          GameAudio.playCollect(true, false);
        }
      }
      // Left 35% width: move Left
      else if (clickX < canvasW * 0.35) {
        if (state.playerLane > minLane && !state.isDigging) {
          state.playerLane -= 1;
          GameAudio.playCollect(false, false);
        }
      }
      // Right 35% width: move Right
      else if (clickX > canvasW * 0.65) {
        if (state.playerLane < maxLane && !state.isDigging) {
          state.playerLane += 1;
          GameAudio.playCollect(false, false);
        }
      }
      // Center tap: E action / Digging active!
      else {
        triggerDigAction();
      }
    }
    dragStartRef.current = null;
  };

  // Keyboard and Touch controllers
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (stateRef.current.isGameOver || isPaused || stateRef.current.introActive) return;

      const state = stateRef.current;
      const key = e.key.toLowerCase();

      // Lane configs bound checking
      const minLane = numLanes === 5 ? -2 : numLanes === 3 ? -1 : 0;
      const maxLane = numLanes === 5 ? 2 : numLanes === 3 ? 1 : 0;

      if (key === 'arrowleft' || key === 'a') {
        if (state.playerLane > minLane && !state.isDigging) {
          state.playerLane -= 1;
          GameAudio.playCollect(false, false); // Quick swoosh sound
        }
      } else if (key === 'arrowright' || key === 'd') {
        if (state.playerLane < maxLane && !state.isDigging) {
          state.playerLane += 1;
          GameAudio.playCollect(false, false);
        }
      } else if (key === 'arrowup' || key === 'w' || e.key === ' ') {
        e.preventDefault();
        // Jump only on ground
        if (state.playerY === 0 && state.playerSlideTimer <= 0 && !state.isDigging) {
          const jumpPower = state.activePowerUp === 'superjump' ? 14 : 9;
          state.playerVy = jumpPower;
          state.playerY = 0.1; // rise
          GameAudio.playCollect(true, false);
        }
      } else if (key === 'arrowdown' || key === 's') {
        e.preventDefault();
        // Slide if on ground
        if (state.playerY === 0 && !state.isDigging) {
          state.playerSlideTimer = 35; // 35 frames duration
          GameAudio.playCollect(false, false);
        } else if (state.playerY > 0) {
          // Fast drop
          state.playerVy = -12;
        }
      } else if (key === 'e') {
        // Perform Digi-action if near a Dig Spot
        triggerDigAction();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [numLanes, isPaused]);

  // Dig Action triggers
  const triggerDigAction = () => {
    const state = stateRef.current;
    if (state.isGameOver || isPaused || state.isDigging) return;

    // Check if any dig spots are close enough
    const nearbyDigSpot = state.obstacles.find(
      (o) => o.type === 'dig_spot' && Math.abs(o.z - 45) < 30 && !o.passed
    );

    if (nearbyDigSpot) {
      state.isDigging = true;
      state.digDuration = 40; // 40 animation frames
      GameAudio.playDig();
      nearbyDigSpot.passed = true;

      // Reward them with coins and high combos
      const gains = Math.floor(10 + Math.random() * 20) * state.combo;
      state.bonesCollected += gains;
      state.xpEarned += 15;
      triggerDustBurst(0, 0, '#854d0e', 18);

      // Chance for premium howl token
      if (Math.random() > 0.85) {
        state.howlTokensCollected += 1;
        GameAudio.playCollect(true, true);
      }
    }
  };

  const triggerDustBurst = (x: number, y: number, color: string, count = 10) => {
    const state = stateRef.current;
    for (let i = 0; i < count; i++) {
      state.particles.push({
        x: x + (Math.random() - 0.5) * 30,
        y: y - Math.random() * 20,
        vx: (Math.random() - 0.5) * 8,
        vy: -Math.random() * 6 - 2,
        color,
        life: 0,
        maxLife: 20 + Math.random() * 20,
        size: 3 + Math.random() * 5,
      });
    }
  };

  // Main canvas animation and physics engine - DISABLED PARTIAL REMOVE
  /*
  useEffect(() => {
    GameAudio.startMusic();

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let isMounted = true;

    // Reset loop state parameters on mount
    stateRef.current.distance = 0;
    stateRef.current.speed = 13 + (evolution * 2); // No starting boost
    stateRef.current.hasShield = false;
    stateRef.current.invulnTimer = 0;
    stateRef.current.stumbleTimer = 0;
    stateRef.current.bonesCollected = 0;
    stateRef.current.howlTokensCollected = 0;
    stateRef.current.xpEarned = 0;
    stateRef.current.combo = 1;
    stateRef.current.maxCombo = 1;
    stateRef.current.playerLane = 0;
    stateRef.current.playerVisualLane = 0;
    stateRef.current.playerY = 0;
    stateRef.current.playerVy = 0;
    stateRef.current.playerSlideTimer = 0;
    stateRef.current.isDigging = false;
    stateRef.current.activePowerUp = 'none';
    stateRef.current.powerUpTimer = 0;
    stateRef.current.obstacles = [];
    stateRef.current.collectibles = [];
    stateRef.current.particles = [];
    stateRef.current.isGameOver = false;
    stateRef.current.gameTime = 0;
    stateRef.current.lastSpawnZ = 120;
    stateRef.current.ghostFrameIndex = 0;
    stateRef.current.recordedFrames = [];

    // Trigger initial onboarding bark
    setTimeout(() => {
      GameAudio.playBark(activeBreed === 'chihuahua');
    }, 400);

    const updatePhysics = () => {
      const state = stateRef.current;
      if (state.isGameOver || isPaused) return;

      state.gameTime += 1;

      // Decrement special companion link timers
      if (state.invulnTimer > 0) state.invulnTimer -= 1;
      if (state.stumbleTimer > 0) state.stumbleTimer -= 1;

      // Handle digging state freeze
      if (state.isDigging) {
        state.digDuration -= 1;
        if (state.digDuration % 3 === 0) {
          // Emit scraping dust
          triggerDustBurst(canvas.width / 2, canvas.height - 80, '#78350f', 3);
        }
        if (state.digDuration <= 0) {
          state.isDigging = false;
        }
        return; // frozen when digging
      }

      // If stumbled, crawl along at slow pace
      const activeSpeedForPhysics = state.stumbleTimer > 0 ? 4.8 : state.speed;

      // Progress distance
      const distanceGain = (activeSpeedForPhysics / 60);
      state.distance += distanceGain;

      // Speed progression every 100 meters
      const previousSpeedMilestone = Math.floor((state.distance - distanceGain) / 100);
      const currentSpeedMilestone = Math.floor(state.distance / 100);
      if (currentSpeedMilestone > previousSpeedMilestone) {
        state.speed += 1.5;
        // Visual text flash representation could occur, trigger simple sound
        GameAudio.playCollect(true, false);
      }

      // Smoothly swerve player lanes
      state.playerVisualLane += (state.playerLane - state.playerVisualLane) * 0.18;

      // Gravity and jump physics
      if (state.playerY > 0) {
        state.playerVy -= 0.45; // custom gravity
        state.playerY += state.playerVy;
        if (state.playerY <= 0) {
          state.playerY = 0;
          state.playerVy = 0;
        }
      }

      // Handle slide countdown
      if (state.playerSlideTimer > 0) {
        state.playerSlideTimer -= 1;
      }

      // Handle active powerup timers
      if (state.activePowerUp !== 'none') {
        state.powerUpTimer -= 1 / 60; // 1s decrements
        if (state.powerUpTimer <= 0) {
          state.activePowerUp = 'none';
        }
      }

      // Spawn obstacles and collectibles periodically in front
      const visualDelta = 300; // spawn distance
      if (state.distance * 10 - state.lastSpawnZ > 130) {
        const laneCount = numLanes;
        const availableLanes = laneCount === 5 ? [-2, -1, 0, 1, 2] : laneCount === 3 ? [-1, 0, 1] : [0];
        const chosenLane = availableLanes[Math.floor(Math.random() * availableLanes.length)];

        // Random generator selection
        const rand = Math.random();
        if (rand < 0.45) {
          // Spawn an obstacle
          const types: ObstacleType[] = ['table', 'teeter', 'swing_board', 'large_hoop', 'small_hoop', 'slalom_gates', 'covered_tunnel', 'jump_platform'];
          // Include dig spot if not in tunnel power
          if (state.activePowerUp !== 'tunnel') {
            types.push('dig_spot');
          }
          const chosenType = types[Math.floor(Math.random() * types.length)];
          state.obstacles.push({
            id: `obs-${state.gameTime}`,
            type: chosenType,
            lane: chosenLane,
            width: 30,
            height: chosenType === 'large_hoop' || chosenType === 'table' ? 45 : 25,
            z: visualDelta,
            passed: false,
            angle: chosenType === 'teeter' ? -15 : 0,
            swampSpeed: Math.random() * 0.1,
          });
        } else {
          // Spawn collectibles
          const colTypes: Array<'bone' | 'rare_bone' | 'howl_token' | 'power_up'> = ['bone', 'rare_bone', 'power_up'];
          if (Math.random() > 0.9) colTypes.push('howl_token');

          const colType = colTypes[Math.floor(Math.random() * colTypes.length)];
          const powerUps: PowerUpType[] = ['magnet', 'superjump', 'collector', 'tunnel', 'nitro'];
          const chosenPUp = colType === 'power_up' ? powerUps[Math.floor(Math.random() * powerUps.length)] : undefined;

          state.collectibles.push({
            id: `col-${state.gameTime}`,
            type: colType,
            powerUpType: chosenPUp,
            lane: chosenLane,
            z: visualDelta,
            height: colType === 'power_up' || Math.random() > 0.5 ? 25 : 0, // float high occasionally
            collected: false,
          });
        }
        state.lastSpawnZ = state.distance * 10;
      }

      // Handle active power up state interactions (e.g. Magnet pulls coins)
      const isNeural = linkType === 'neural';
      const magnetActive = state.activePowerUp === 'magnet' || state.activePowerUp === 'collector';

      // Move and filter obstacles
      state.obstacles.forEach((obs) => {
        obs.z -= activeSpeedForPhysics * 0.15; // travel towards player

        // Teeter tilting physical dynamics
        if (obs.type === 'teeter' && obs.z < 65 && obs.angle !== undefined) {
          obs.angle += (15 - obs.angle) * 0.15;
        }

        // Swerving Slalom fence gate or Swing Board
        if (obs.type === 'swing_board' && obs.angle !== undefined && obs.swampSpeed !== undefined) {
          obs.angle = Math.sin(state.gameTime * obs.swampSpeed) * 30;
        }

        // Check if player passed obstacle for combo points and statistics
        if (!obs.passed && obs.z < 35) {
          obs.passed = true;
          // Clean avoidance (if not collided)
          if (!state.isGameOver) {
            state.obstaclesAvoided += 1;
            state.combo += 1;
            state.maxCombo = Math.max(state.maxCombo, state.combo);
            // Clicker link gives 1.5x more XP!
            state.xpEarned += Math.round((linkType === 'clicker' ? 3 : 2) * state.combo);
          }
        }
      });

      state.obstacles = state.obstacles.filter((o) => o.z > -10);

      // Check digging spot triggers inside nearby vicinity
      const hasNearbyDigSpot = state.obstacles.some(
        (o) => o.type === 'dig_spot' && Math.abs(o.z - 45) < 30 && !o.passed
      );
      setShowDigAlert(hasNearbyDigSpot);

      // Handle items collection
      state.collectibles.forEach((col) => {
        col.z -= activeSpeedForPhysics * 0.15;

        // Neural link pulls items passively from distance z < 100, or doubles magnet pull!
        const pullsWithNeural = isNeural && col.z < 110;
        const activeMagnetPull = magnetActive || pullsWithNeural;

        // Magnet attraction physical pull
        if (activeMagnetPull && (col.type === 'bone' || col.type === 'rare_bone') && col.z < (isNeural ? 220 : 180)) {
          const dx = state.playerVisualLane - col.lane;
          // Sweep item lane toward player (Neural pulls even faster!)
          col.lane += dx * (isNeural ? 0.32 : 0.22);
          // Sweep altitude toward player height
          const dy = state.playerY - col.height;
          col.height += dy * (isNeural ? 0.32 : 0.22);
        }

        // Collection distance overlap
        const laneDelta = Math.abs(col.lane - state.playerVisualLane);
        const zDelta = Math.abs(col.z - 40); // player is stationed around z = 40
        const yDelta = Math.abs(col.height - state.playerY);

        if (!col.collected && laneDelta < 0.6 && zDelta < 18 && yDelta < 25) {
          col.collected = true;

          // Trigger particle blast
          triggerDustBurst(
            canvas.width / 2 + col.lane * 110,
            canvas.height - 80 - col.height * 1.5,
            col.type === 'howl_token' ? '#a78bfa' : col.type === 'rare_bone' ? '#f472b6' : '#fef08a',
            6
          );

          if (col.type === 'bone') {
            const bonesWorth = state.activePowerUp === 'collector' ? 3 : 1;
            state.bonesCollected += bonesWorth * state.combo;
            GameAudio.playCollect(false, false);
          } else if (col.type === 'rare_bone') {
            state.bonesCollected += 5 * state.combo;
            GameAudio.playCollect(true, false);
          } else if (col.type === 'howl_token') {
            state.howlTokensCollected += 1;
            GameAudio.playCollect(true, true);
          } else if (col.type === 'power_up' && col.powerUpType) {
            state.activePowerUp = col.powerUpType;
            state.powerUpTimer = col.powerUpType === 'nitro' ? 8.0 : 10.0;
            state.powerupsCollected += 1;
            GameAudio.playPowerup();
          }
        }
      });

      state.collectibles = state.collectibles.filter((c) => c.z > -10 && !c.collected);

      // Check obstacle collisions
      if (state.activePowerUp !== 'nitro' && state.activePowerUp !== 'tunnel') {
        state.obstacles.forEach((obs) => {
          if (obs.passed) return;

          const laneDelta = Math.abs(obs.lane - state.playerVisualLane);
          const zDelta = Math.abs(obs.z - 40); // collision sweep zone

          // Calibrate precise visual collision box based on current frame running speed
          const collisionZBox = Math.max(5.0, state.speed * 0.16);

          if (laneDelta < 0.65 && zDelta < collisionZBox) {
            // Check vertical leap boundaries or slides
            let collided = true;

            // Slide under hops
            if (obs.type === 'large_hoop') {
              // must jump or slide (it has opening, but jumping passes right through)
              if (state.playerY > 5 || state.playerSlideTimer > 0) collided = false;
            } else if (obs.type === 'small_hoop') {
              if (state.playerSlideTimer > 0) collided = false;
            } else if (obs.type === 'dig_spot') {
              // dig spots don't crash you, they are just dug up or passed over safely!
              collided = false;
            } else if (obs.type === 'covered_tunnel') {
              // must slide through covered tunnel
              if (state.playerSlideTimer > 0) collided = false;
            } else if (obs.type === 'jump_platform') {
              // if player jumps, they pass above. If they hit it flat, crash!
              if (state.playerY > 15) collided = false;
            } else {
              // Table, Teeter require jumping
              if (state.playerY > 15) {
                collided = false;
              }
            }

            if (collided) {
              if (linkType === 'bond' && state.invulnTimer > 0) {
                // Ignore collision - currently invulnerable!
              } else if (linkType === 'bond' && state.hasShield) {
                // Break shield and recover
                state.hasShield = false;
                state.invulnTimer = 180; // 3 seconds / 180 frames invulnerability
                state.stumbleTimer = 120; // 2 seconds / 120 frames recovery crawl
                GameAudio.playCrash(); // Play crash sound for stumble
                triggerDustBurst(canvas.width / 2 + state.playerVisualLane * 110, canvas.height - 120, '#ec4899', 30);
                triggerDustBurst(canvas.width / 2 + state.playerVisualLane * 110, canvas.height - 120, '#fbbf24', 15);
              } else {
                triggerGameOver();
              }
            }
          }
        });
      }

      // Record frames for ghost runs
      // Store periodic keyframes (every 2 frames) to save room
      if (state.gameTime % 2 === 0) {
        state.recordedFrames.push({
          z: state.distance,
          lane: state.playerLane,
          height: state.playerY,
          action: state.isDigging
            ? 'dig'
            : state.playerY > 0
            ? 'jump'
            : state.playerSlideTimer > 0
            ? 'slide'
            : 'run',
          isUnderground: state.activePowerUp === 'tunnel',
        });
      }

      // Update active live timers for React layout
      setActivePowerUpUI(state.activePowerUp);
      setPowerUpTimeLeftUI(Math.max(0, state.powerUpTimer));
    };

    const triggerGameOver = () => {
      const state = stateRef.current;
      state.isGameOver = true;
      GameAudio.playCrash();

      // Explode dog into stars
      triggerDustBurst(canvas.width / 2, canvas.height / 2, '#ef4444', 35);
      triggerDustBurst(canvas.width / 2, canvas.height / 2 + 30, '#fbbf24', 20);

      // Save ghost runs to localStorage if highscore
      if (gameMode === 'ghost' || gameMode === 'single') {
        const storedGhostJSON = localStorage.getItem('topdog_best_gh_run');
        let shouldSave = true;
        if (storedGhostJSON) {
          const prevRun = JSON.parse(storedGhostJSON) as GhostRun;
          if (prevRun.totalDistance > state.distance) shouldSave = false;
        }
        if (shouldSave) {
          const runToStore: GhostRun = {
            id: `ghost-${Date.now()}`,
            breed: activeBreed,
            evolution,
            totalDistance: state.distance,
            frames: state.recordedFrames,
          };
          localStorage.setItem('topdog_best_gh_run', JSON.stringify(runToStore));
        }
      }

      // Handover stats with a small delay
      setTimeout(() => {
        if (isMounted) {
          onGameEnd({
            distance: state.distance,
            bonesCollected: state.bonesCollected,
            howlTokensCollected: state.howlTokensCollected,
            xpEarned: state.xpEarned,
            maxCombo: state.maxCombo,
            obstaclesAvoided: state.obstaclesAvoided,
            powerupsCollected: state.powerupsCollected,
          });
        }
      }, 1500);
    };
  */

  // ============================================
  // THREE.JS 3D WEBGL RENDERING ENGINE PIPELINE
  // ============================================
  // 3D Voxel Pine Tree creator
  const createTreeMesh = () => {
    const group = new THREE.Group();
    const trunkGeo = getCachedGeometry('tree-trunk-geo', () => new THREE.CylinderGeometry(1.2, 1.6, 7, 8));
    const trunkMat = getCachedMaterial('tree-trunk-mat', () => new THREE.MeshPhongMaterial({ color: 0x5c2d17 }));
    const trunk = new THREE.Mesh(trunkGeo, trunkMat);
    trunk.position.y = 3.5;
    trunk.castShadow = true;
    group.add(trunk);

    const leafMat = getCachedMaterial('tree-leaf-mat', () => new THREE.MeshStandardMaterial({ color: 0x01573d, roughness: 0.8 }));
    const cone1Geo = getCachedGeometry('tree-cone1-geo', () => new THREE.ConeGeometry(7, 10, 8));
    const cone1 = new THREE.Mesh(cone1Geo, leafMat);
    cone1.position.y = 10;
    cone1.castShadow = true;
    group.add(cone1);

    const cone2Geo = getCachedGeometry('tree-cone2-geo', () => new THREE.ConeGeometry(5, 8, 8));
    const cone2 = new THREE.Mesh(cone2Geo, leafMat);
    cone2.position.y = 15;
    cone2.castShadow = true;
    group.add(cone2);

    const coneMat = getCachedMaterial('tree-cone-orange-mat', () => new THREE.MeshPhongMaterial({ color: 0xea580c }));
    const coneGeo = getCachedGeometry('tree-cone-orange-geo', () => new THREE.ConeGeometry(1.2, 3, 8));
    const cone = new THREE.Mesh(coneGeo, coneMat);
    cone.position.set(4, 1.5, 0);
    group.add(cone);
    return group;
  };

  // 3D Human model creator for start throw animation
  const createPersonModel = () => {
    const group = new THREE.Group();

    // Head
    const headGeo = getCachedGeometry('person-head-geo', () => new THREE.BoxGeometry(2, 2, 2));
    const headMat = getCachedMaterial('person-head-mat', () => new THREE.MeshStandardMaterial({ color: 0xffd166, roughness: 0.6 }));
    const head = new THREE.Mesh(headGeo, headMat);
    head.position.y = 8;
    head.castShadow = true;
    group.add(head);

    // Torso (Shirt)
    const torsoGeo = getCachedGeometry('person-torso-geo', () => new THREE.BoxGeometry(2.4, 4.5, 1.6));
    const torsoMat = getCachedMaterial('person-torso-mat', () => new THREE.MeshStandardMaterial({ color: 0xf97316, roughness: 0.8 })); // vibrant orange shirt
    const torso = new THREE.Mesh(torsoGeo, torsoMat);
    torso.position.y = 4.75;
    torso.castShadow = true;
    torso.receiveShadow = true;
    group.add(torso);

    // Legs
    const legGeo = getCachedGeometry('person-leg-geo', () => new THREE.BoxGeometry(1.0, 3.5, 1.2));
    const legMat = getCachedMaterial('person-pants-mat', () => new THREE.MeshStandardMaterial({ color: 0x3b82f6, roughness: 0.8 })); // blue pants
    const leftLeg = new THREE.Mesh(legGeo, legMat);
    leftLeg.position.set(-0.7, 1.75, 0);
    leftLeg.castShadow = true;
    group.add(leftLeg);
    
    const rightLeg = new THREE.Mesh(legGeo, legMat);
    rightLeg.position.set(0.7, 1.75, 0);
    rightLeg.castShadow = true;
    group.add(rightLeg);

    // Throwing Arm with Shoulder pivot
    const armGeo = getCachedGeometry('person-arm-geo', () => new THREE.BoxGeometry(0.8, 3.8, 0.8));
    const armMat = getCachedMaterial('person-skin-mat', () => new THREE.MeshStandardMaterial({ color: 0xffd166, roughness: 0.6 }));
    const armGroup = new THREE.Group();
    armGroup.position.set(1.6, 6.2, 0); // shoulder pivot
    
    const armMesh = new THREE.Mesh(armGeo, armMat);
    armMesh.position.y = -1.6; // shift down so pivot stays at shoulder
    armMesh.castShadow = true;
    armGroup.add(armMesh);
    
    group.add(armGroup);

    return { group, armGroup, torso, head };
  };

  // 3D White jumping fence/hurdle model creator
  const createFenceModel = () => {
    const group = new THREE.Group();

    // Two outer posts
    const postGeo = getCachedGeometry('fence-post-geo', () => new THREE.BoxGeometry(1.2, 10, 1.2));
    const woodMat = getCachedMaterial('fence-wood-mat', () => new THREE.MeshStandardMaterial({ color: 0xfed7aa, roughness: 0.9 }));
    
    const leftPost = new THREE.Mesh(postGeo, woodMat);
    leftPost.position.set(-9, 5, 0);
    leftPost.castShadow = true;
    group.add(leftPost);

    const rightPost = new THREE.Mesh(postGeo, woodMat);
    rightPost.position.set(9, 5, 0);
    rightPost.castShadow = true;
    group.add(rightPost);

    // Two horizontal crossbars
    const railGeo = getCachedGeometry('fence-rail-geo', () => new THREE.BoxGeometry(19, 1.2, 0.8));
    const rail1 = new THREE.Mesh(railGeo, woodMat);
    rail1.position.set(0, 3.5, 0);
    rail1.castShadow = true;
    rail1.receiveShadow = true;
    group.add(rail1);

    const rail2 = new THREE.Mesh(railGeo, woodMat);
    rail2.position.set(0, 7.5, 0);
    rail2.castShadow = true;
    rail2.receiveShadow = true;
    group.add(rail2);

    // Dynamic red stripes pickets
    const picketGeo = getCachedGeometry('fence-picket-geo', () => new THREE.BoxGeometry(1.0, 7.0, 0.5));
    const picketMat = getCachedMaterial('fence-picket-mat', () => new THREE.MeshStandardMaterial({ color: 0xef4444, roughness: 0.7 }));
    for (let i = -7; i <= 7; i += 3.5) {
      const picket = new THREE.Mesh(picketGeo, picketMat);
      picket.position.set(i, 5.5, 0.3);
      picket.castShadow = true;
      group.add(picket);
    }

    return group;
  };

  // 3D Voxel Breed Builders for all 5 Breeds
  const createDogModel = (breed: Breed, evo: EvolutionLevel) => {
    const dogGroup = new THREE.Group();
    const isChihuahua = breed === 'chihuahua';
    const isCorgi = breed === 'corgi';
    const isBulldog = breed === 'bulldog';
    const isGShepherd = breed === 'gshepherd';
    const isDachshund = breed === 'dachshund';

    let bodyColor = 0xd97706; // Tan
    let accentColor = 0x78350f; // Dark brown
    let secondaryColor = 0xfef3c7; // Cream

    if (isGShepherd) {
      bodyColor = 0x3e2723;
      accentColor = 0x211107;
      secondaryColor = 0xd7ccc8;
    } else if (isBulldog) {
      bodyColor = 0x94a3b8;
      accentColor = 0x475569;
      secondaryColor = 0xe2e8f0;
    } else if (isCorgi) {
      bodyColor = 0xf59e0b;
      accentColor = 0xb45309;
      secondaryColor = 0xffffff;
    } else if (isChihuahua) {
      bodyColor = 0xfbbf24;
      accentColor = 0x78350f;
      secondaryColor = 0xfef3c7;
    } else if (isDachshund) {
      bodyColor = 0x7c2d12;
      accentColor = 0x3f1105;
      secondaryColor = 0xfed7aa;
    }

    const bodyMat = new THREE.MeshStandardMaterial({ color: bodyColor, roughness: 0.5 });
    const accentMat = new THREE.MeshStandardMaterial({ color: accentColor, roughness: 0.5 });
    const secondaryMat = new THREE.MeshStandardMaterial({ color: secondaryColor, roughness: 0.5 });

    let bodyWidth = 14;
    let bodyHeight = 11;
    let bodyDepth = 22;

    if (isBulldog) {
      bodyWidth = 18;
      bodyHeight = 15;
      bodyDepth = 24;
    } else if (isDachshund) {
      bodyWidth = 10;
      bodyHeight = 9;
      bodyDepth = 32;
    } else if (isCorgi) {
      bodyWidth = 12;
      bodyHeight = 10;
      bodyDepth = 22;
    } else if (isChihuahua) {
      bodyWidth = 9;
      bodyHeight = 8;
      bodyDepth = 12;
    }

    const torsoGeo = new THREE.BoxGeometry(bodyWidth, bodyHeight, bodyDepth);
    const torso = new THREE.Mesh(torsoGeo, bodyMat);
    torso.castShadow = true;
    torso.receiveShadow = true;
    dogGroup.add(torso);

    const chestGeo = new THREE.BoxGeometry(bodyWidth + 0.5, bodyHeight * 0.8, bodyDepth * 0.3);
    const chest = new THREE.Mesh(chestGeo, secondaryMat);
    chest.position.set(0, -1, -bodyDepth * 0.35);
    torso.add(chest);

    const headGeo = new THREE.BoxGeometry(bodyWidth * 0.9, bodyHeight * 0.9, bodyDepth * 0.4);
    const head = new THREE.Mesh(headGeo, bodyMat);
    head.position.set(0, bodyHeight * 0.7, -bodyDepth * 0.52);
    head.castShadow = true;
    torso.add(head);

    const snoutGeo = new THREE.BoxGeometry(bodyWidth * 0.5, bodyHeight * 0.4, bodyDepth * 0.25);
    const snout = new THREE.Mesh(snoutGeo, accentMat);
    snout.position.set(0, -bodyHeight * 0.15, -bodyDepth * 0.28);
    head.add(snout);

    const eyeMat = new THREE.MeshBasicMaterial({ color: 0x000000 });
    const eyeGeo = new THREE.BoxGeometry(1.5, 1.5, 1.5);
    const reye = new THREE.Mesh(eyeGeo, eyeMat);
    reye.position.set(bodyWidth * 0.32, bodyHeight * 0.2, -bodyDepth * 0.181);
    head.add(reye);
    const leye = new THREE.Mesh(eyeGeo, eyeMat);
    leye.position.set(-bodyWidth * 0.32, bodyHeight * 0.2, -bodyDepth * 0.181);
    head.add(leye);

    const earMat = accentMat;
    if (isGShepherd || isCorgi || isChihuahua) {
      const ear1Geo = new THREE.BoxGeometry(2.5, 7, 2.5);
      const ear1 = new THREE.Mesh(ear1Geo, earMat);
      ear1.rotation.z = -0.15;
      ear1.position.set(-bodyWidth * 0.35, bodyHeight * 0.65, 0);
      head.add(ear1);
      const ear2 = ear1.clone();
      ear2.rotation.z = 0.15;
      ear2.position.x = bodyWidth * 0.35;
      head.add(ear2);
    } else {
      const ear1Geo = new THREE.BoxGeometry(3, 8, 3.5);
      const ear1 = new THREE.Mesh(ear1Geo, earMat);
      ear1.position.set(-bodyWidth * 0.48, bodyHeight * 0.1, 0);
      head.add(ear1);
      const ear2 = ear1.clone();
      ear2.position.x = bodyWidth * 0.48;
      head.add(ear2);
    }

    const tailGeo = new THREE.BoxGeometry(2.5, 2.5, 9);
    const tail = new THREE.Mesh(tailGeo, accentMat);
    tail.position.set(0, bodyHeight * 0.15, bodyDepth * 0.5);
    tail.rotation.x = -0.35;
    torso.add(tail);

    const collarColor = evo === 3 ? 0xff007f : evo === 2 ? 0xfbbf24 : 0xef4444;
    const collarMat = new THREE.MeshBasicMaterial({ color: collarColor });
    const collarGeo = new THREE.BoxGeometry(bodyWidth * 1.02, 2.2, bodyDepth * 0.45);
    const collar = new THREE.Mesh(collarGeo, collarMat);
    collar.position.set(0, bodyHeight * 0.35, -bodyDepth * 0.38);
    torso.add(collar);

    const legGeo = new THREE.BoxGeometry(3, bodyHeight * 0.75, 3);
    const legGroupL1 = new THREE.Group();
    legGroupL1.position.set(-bodyWidth * 0.35, -bodyHeight * 0.5, -bodyDepth * 0.32);
    const legMesh1 = new THREE.Mesh(legGeo, accentMat);
    legMesh1.position.y = -bodyHeight * 0.38;
    legMesh1.castShadow = true;
    legGroupL1.add(legMesh1);
    torso.add(legGroupL1);

    const legGroupR1 = new THREE.Group();
    legGroupR1.position.set(bodyWidth * 0.35, -bodyHeight * 0.5, -bodyDepth * 0.32);
    const legMesh2 = new THREE.Mesh(legGeo, bodyMat);
    legMesh2.position.y = -bodyHeight * 0.38;
    legMesh2.castShadow = true;
    legGroupR1.add(legMesh2);
    torso.add(legGroupR1);

    const legGroupL2 = new THREE.Group();
    legGroupL2.position.set(-bodyWidth * 0.35, -bodyHeight * 0.5, bodyDepth * 0.32);
    const legMesh3 = new THREE.Mesh(legGeo, bodyMat);
    legMesh3.position.y = -bodyHeight * 0.38;
    legMesh3.castShadow = true;
    legGroupL2.add(legMesh3);
    torso.add(legGroupL2);

    const legGroupR2 = new THREE.Group();
    legGroupR2.position.set(bodyWidth * 0.35, -bodyHeight * 0.5, bodyDepth * 0.32);
    const legMesh4 = new THREE.Mesh(legGeo, accentMat);
    legMesh4.position.y = -bodyHeight * 0.38;
    legMesh4.castShadow = true;
    legGroupR2.add(legMesh4);
    torso.add(legGroupR2);

    if (evo === 3) {
      const crownMat = new THREE.MeshPhongMaterial({ color: 0xec4899, emissive: 0xdb2777 });
      const crownGeo = new THREE.TorusGeometry(3.2, 0.8, 8, 16);
      const crown = new THREE.Mesh(crownGeo, crownMat);
      crown.rotation.x = Math.PI / 2;
      crown.position.set(0, bodyHeight * 0.65, -0.5);
      head.add(crown);
    }

    dogGroup.scale.set(0.12, 0.12, 0.12);
    return {
      group: dogGroup,
      tail,
      legs: [legGroupL1, legGroupR1, legGroupL2, legGroupR2],
      torso,
      head
    };
  };

  const createObstacleMesh = (type: ObstacleType): THREE.Object3D => {
    const group = new THREE.Group();
    if (type === 'table') {
      const tableTopGeo = getCachedGeometry('obs-table-top-geo', () => new THREE.BoxGeometry(22, 2.8, 14));
      const tableTopMat = getCachedMaterial('obs-table-top-mat', () => new THREE.MeshStandardMaterial({ color: 0x3b82f6, roughness: 0.3 }));
      const tableTop = new THREE.Mesh(tableTopGeo, tableTopMat);
      tableTop.position.y = 8.5;
      group.add(tableTop);

      const legGeo = getCachedGeometry('obs-table-leg-geo', () => new THREE.CylinderGeometry(0.8, 0.8, 8.5, 8));
      const legMat = getCachedMaterial('obs-table-leg-mat', () => new THREE.MeshPhongMaterial({ color: 0x1e293b }));
      for (const lx of [-9, 9]) {
        for (const lz of [-5, 5]) {
          const leg = new THREE.Mesh(legGeo, legMat);
          leg.position.set(lx, 4.25, lz);
          group.add(leg);
        }
      }
    } else if (type === 'teeter') {
      const pivotGeo = getCachedGeometry('obs-teeter-pivot-geo', () => new THREE.ConeGeometry(3.5, 6, 4));
      const pivotMat = getCachedMaterial('obs-teeter-pivot-mat', () => new THREE.MeshPhongMaterial({ color: 0x334155 }));
      const pivot = new THREE.Mesh(pivotGeo, pivotMat);
      pivot.position.y = 3;
      group.add(pivot);

      const plankGeo = getCachedGeometry('obs-teeter-plank-geo', () => new THREE.BoxGeometry(40, 1.2, 7));
      const plankMat = getCachedMaterial('obs-teeter-plank-mat', () => new THREE.MeshPhongMaterial({ color: 0x198754 }));
      const plank = new THREE.Mesh(plankGeo, plankMat);
      plank.position.y = 6;
      plank.name = 'plank';
      group.add(plank);

      const capGeo = getCachedGeometry('obs-teeter-cap-geo', () => new THREE.BoxGeometry(5, 1.3, 7.1));
      const capMat = getCachedMaterial('obs-teeter-cap-mat', () => new THREE.MeshPhongMaterial({ color: 0xffc107 }));
      const capL = new THREE.Mesh(capGeo, capMat);
      capL.position.x = -17.5;
      plank.add(capL);
      const capR = new THREE.Mesh(capGeo, capMat);
      capR.position.x = 17.5;
      plank.add(capR);
    } else if (type === 'small_hoop' || type === 'large_hoop') {
      const isLarge = type === 'large_hoop';
      const radius = isLarge ? 12 : 8;
      const hoopY = isLarge ? 15 : 10;
      const ringGeo = getCachedGeometry(`obs-hoop-ring-geo-${isLarge ? 'lg' : 'sm'}`, () => new THREE.TorusGeometry(radius, 1.2, 8, 24));
      const ringColor = isLarge ? 0xef4444 : 0x22d3ee;
      const ringMat = getCachedMaterial(`obs-hoop-ring-mat-${isLarge ? 'lg' : 'sm'}`, () => new THREE.MeshPhongMaterial({ color: ringColor, emissive: ringColor, emissiveIntensity: 0.3 }));
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.position.y = hoopY;
      group.add(ring);

      const postGeo = getCachedGeometry(`obs-hoop-post-geo-${isLarge ? 'lg' : 'sm'}`, () => new THREE.CylinderGeometry(0.6, 0.6, hoopY, 8));
      const postMat = getCachedMaterial('obs-hoop-post-mat', () => new THREE.MeshPhongMaterial({ color: 0x94a3b8 }));
      const leftPost = new THREE.Mesh(postGeo, postMat);
      leftPost.position.set(-radius, hoopY / 2, 0);
      group.add(leftPost);
      const rightPost = new THREE.Mesh(postGeo, postMat);
      rightPost.position.set(radius, hoopY / 2, 0);
      group.add(rightPost);
    } else if (type === 'slalom_gates') {
      for (let i = -1; i <= 1; i++) {
        const dx = i * 8;
        const poleGeo = getCachedGeometry('obs-slalom-pole-geo', () => new THREE.CylinderGeometry(0.8, 0.8, 16, 8));
        const poleMat = getCachedMaterial('obs-slalom-pole-mat', () => new THREE.MeshPhongMaterial({ color: 0xf59e0b }));
        const pole = new THREE.Mesh(poleGeo, poleMat);
        pole.position.set(dx, 8, 0);
        group.add(pole);

        const flagGeo = getCachedGeometry('obs-slalom-flag-geo', () => new THREE.BoxGeometry(6, 3, 0.2));
        const flagColor = i === 0 ? 0xef4444 : i === -1 ? 0x10b981 : 0x3b82f6;
        const flagMatVal = getCachedMaterial(`obs-slalom-flag-mat-${i}`, () => new THREE.MeshPhongMaterial({ color: flagColor }));
        const flag = new THREE.Mesh(flagGeo, flagMatVal);
        flag.position.set(dx + 3, 14, 0);
        flag.name = `flag_${i + 1}`;
        group.add(flag);
      }
    } else if (type === 'covered_tunnel') {
      const tubeGeo = getCachedGeometry('obs-tunnel-tube-geo', () => new THREE.CylinderGeometry(11, 11, 30, 16, 1, true));
      const tubeMat = getCachedMaterial('obs-tunnel-tube-mat', () => new THREE.MeshPhongMaterial({
        color: 0x3b82f6,
        transparent: true,
        opacity: 0.45,
        side: THREE.DoubleSide,
        depthWrite: false,
      }));
      const tube = new THREE.Mesh(tubeGeo, tubeMat);
      tube.rotation.x = Math.PI / 2;
      tube.position.y = 6;
      group.add(tube);

      const archGeo = getCachedGeometry('obs-tunnel-arch-geo', () => new THREE.TorusGeometry(11.2, 0.6, 8, 20));
      const archMat = getCachedMaterial('obs-tunnel-arch-mat', () => new THREE.MeshPhongMaterial({ color: 0x2563eb }));
      for (const tz of [-15, 0, 15]) {
        const arch = new THREE.Mesh(archGeo, archMat);
        arch.position.set(0, 6, tz);
        arch.rotation.y = Math.PI / 2;
        group.add(arch);
      }
    } else if (type === 'jump_platform') {
      const wedgeGeo = getCachedGeometry('obs-platform-wedge-geo', () => {
        const geo = new THREE.BoxGeometry(18, 8, 20);
        const pos = geo.attributes.position;
        for (let i = 0; i < pos.count; i++) {
          const z = pos.getZ(i);
          const y = pos.getY(i);
          if (z > 0) {
            pos.setY(i, y - 3.8);
          } else {
            pos.setY(i, y + 1.8);
          }
        }
        geo.computeVertexNormals();
        return geo;
      });
      const rampMat = getCachedMaterial('obs-platform-ramp-mat', () => new THREE.MeshPhongMaterial({ color: 0xdb2777 }));
      const wedge = new THREE.Mesh(wedgeGeo, rampMat);
      wedge.position.y = 4;
      group.add(wedge);
    } else if (type === 'swing_board') {
      const postGeo = getCachedGeometry('obs-swing-post-geo', () => new THREE.CylinderGeometry(0.6, 0.6, 24, 8));
      const postMat = getCachedMaterial('obs-swing-post-mat', () => new THREE.MeshPhongMaterial({ color: 0x475569 }));
      const postL = new THREE.Mesh(postGeo, postMat);
      postL.position.set(-14, 12, 0);
      group.add(postL);
      const postR = new THREE.Mesh(postGeo, postMat);
      postR.position.set(14, 12, 0);
      group.add(postR);

      const barGeo = getCachedGeometry('obs-swing-bar-geo', () => new THREE.CylinderGeometry(0.5, 0.5, 28, 8));
      const bar = new THREE.Mesh(barGeo, postMat);
      bar.rotation.z = Math.PI / 2;
      bar.position.set(0, 24, 0);
      group.add(bar);

      const signAssembly = new THREE.Group();
      signAssembly.position.set(0, 24, 0);
      signAssembly.name = 'signAssembly';
      const cordGeo = getCachedGeometry('obs-swing-cord-geo', () => new THREE.CylinderGeometry(0.15, 0.15, 8, 8));
      const cord = new THREE.Mesh(cordGeo, postMat);
      cord.position.y = -4;
      signAssembly.add(cord);

      const boardGeo = getCachedGeometry('obs-swing-board-geo', () => new THREE.BoxGeometry(12, 8, 1.5));
      const boardMat = getCachedMaterial('obs-swing-board-mat', () => new THREE.MeshPhongMaterial({ color: 0xdc2626 }));
      const board = new THREE.Mesh(boardGeo, boardMat);
      board.position.y = -10;
      signAssembly.add(board);
      group.add(signAssembly);
    } else if (type === 'dig_spot') {
      const soilGeo = getCachedGeometry('obs-dig-soil-geo', () => new THREE.SphereGeometry(8, 8, 8, 0, Math.PI * 2, 0, Math.PI / 2));
      const soilMat = getCachedMaterial('obs-dig-soil-mat', () => new THREE.MeshStandardMaterial({ color: 0x713f12, roughness: 0.9 }));
      const soil = new THREE.Mesh(soilGeo, soilMat);
      soil.scale.set(1.4, 0.35, 1.4);
      group.add(soil);

      const energyGeo = getCachedGeometry('obs-dig-energy-geo', () => new THREE.TorusGeometry(6, 0.4, 6, 16));
      const energyMat = getCachedMaterial('obs-dig-energy-mat', () => new THREE.MeshBasicMaterial({ color: 0xf59e0b }));
      const energyRing = new THREE.Mesh(energyGeo, energyMat);
      energyRing.position.y = 2.2;
      energyRing.rotation.x = Math.PI / 2;
      energyRing.name = 'energy_ring';
      group.add(energyRing);
    }

    group.traverse((n) => {
      if (n instanceof THREE.Mesh) {
        n.castShadow = true;
        n.receiveShadow = true;
      }
    });
    group.scale.set(0.7,0.7,0.7);
    return group;
  };

  const createCollectibleMesh = (type: string, powerUpType?: string): THREE.Object3D => {
    const group = new THREE.Group();
    if (type === 'bone' || type === 'rare_bone') {
      const isRare = type === 'rare_bone';
      const color = isRare ? 0xdb2777 : 0xfef3c7;
      const emissive = isRare ? 0x831843 : 0x78350f;
      const material = getCachedMaterial(`collect-bone-mat-${isRare ? 'rare' : 'normal'}`, () => new THREE.MeshPhongMaterial({ color, emissive, emissiveIntensity: 0.3 }));

      const shaftGeo = getCachedGeometry('collect-shaft-geo', () => new THREE.CylinderGeometry(0.8, 0.8, 6.5, 8));
      const shaft = new THREE.Mesh(shaftGeo, material);
      shaft.rotation.z = Math.PI / 2;
      group.add(shaft);

      const jointGeo = getCachedGeometry('collect-joint-geo', () => new THREE.SphereGeometry(1.3, 8, 8));
      const positions = [
        [-3.2, 1, 0.8],
        [-3.2, -1, -0.8],
        [3.2, 1, 0.8],
        [3.2, -1, -0.8],
      ];
      positions.forEach(([x, y, z]) => {
        const joint = new THREE.Mesh(jointGeo, material);
        joint.position.set(x, y, z);
        group.add(joint);
      });
    } else if (type === 'howl_token') {
      const coinGeo = getCachedGeometry('collect-token-geo', () => new THREE.CylinderGeometry(3.5, 3.5, 0.8, 16));
      const coinMat = getCachedMaterial('collect-token-mat', () => new THREE.MeshPhongMaterial({ color: 0xfbbbf24, emissive: 0xd97706, emissiveIntensity: 0.3 }));
      const coin = new THREE.Mesh(coinGeo, coinMat);
      coin.rotation.x = Math.PI / 2;
      group.add(coin);
    } else if (type === 'power_up') {
      const capsuleMat = getCachedMaterial('collect-pup-capsule-mat', () => new THREE.MeshPhongMaterial({ color: 0x8b5cf6, emissive: 0x5b21b6, emissiveIntensity: 0.4 }));
      const sphereGeo = getCachedGeometry('collect-pup-sphere-geo', () => new THREE.SphereGeometry(2.5, 8, 8));
      const stemGeo = getCachedGeometry('collect-pup-stem-geo', () => new THREE.CylinderGeometry(2.5, 2.5, 3, 8));

      const stem = new THREE.Mesh(stemGeo, capsuleMat);
      group.add(stem);
      const top = new THREE.Mesh(sphereGeo, capsuleMat);
      top.position.y = 1.5;
      group.add(top);
      const bot = new THREE.Mesh(sphereGeo, capsuleMat);
      bot.position.y = -1.5;
      group.add(bot);

      const ringGeo = getCachedGeometry('collect-pup-ring-geo', () => new THREE.TorusGeometry(3.8, 0.3, 4, 16));
      const ringMat = getCachedMaterial('collect-pup-ring-mat', () => new THREE.MeshBasicMaterial({ color: 0xffffff }));
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.name = 'ring';
      group.add(ring);
    }
    return group;
  };

  // Main canvas animation and physics engine
  useEffect(() => {
    GameAudio.startMusic();

    const canvas = canvasRef.current;
    if (!canvas) return;

    let animId: number;
    let isMounted = true;

    // Reset loop state parameters on mount
    stateRef.current.distance = 0;
    stateRef.current.speed = 13 + (evolution * 2); // No starting boost
    stateRef.current.hasShield = false;
    stateRef.current.invulnTimer = 0;
    stateRef.current.stumbleTimer = 0;
    stateRef.current.introActive = true;
    stateRef.current.introTime = 0;
    stateRef.current.bonesCollected = 0;
    stateRef.current.howlTokensCollected = 0;
    stateRef.current.xpEarned = 0;
    stateRef.current.combo = 1;
    stateRef.current.maxCombo = 1;
    stateRef.current.playerLane = 0;
    stateRef.current.playerVisualLane = 0;
    stateRef.current.playerY = 0;
    stateRef.current.playerVy = 0;
    stateRef.current.playerSlideTimer = 0;
    stateRef.current.isDigging = false;
    stateRef.current.activePowerUp = 'none';
    stateRef.current.powerUpTimer = 0;
    stateRef.current.obstacles = [];
    stateRef.current.collectibles = [];
    stateRef.current.particles = [];
    stateRef.current.isGameOver = false;
    stateRef.current.gameTime = 0;
    stateRef.current.lastSpawnZ = 120;
    stateRef.current.ghostFrameIndex = 0;
    stateRef.current.recordedFrames = [];

    // Setup ThreeJS WebGL 3D World
    const width = canvas.width;
    const height = canvas.height;
    const renderer = new THREE.WebGLRenderer({
      canvas: canvas,
      antialias: true,
      alpha: false,
      powerPreference: 'high-performance'
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0f172a); // slate-900
    scene.fog = new THREE.FogExp2(0x0f172a, 0.0035);

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.5, 1000);
    camera.position.set(0, 16, 32);
    camera.lookAt(0, 2, -40);

    // Dynamic Lighting System
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.65);
    scene.add(ambientLight);

    const stageLight = new THREE.DirectionalLight(0xffaa66, 1.35); // Stadium orange dusk overhead light
    stageLight.position.set(30, 90, 40);
    stageLight.castShadow = true;
    stageLight.shadow.mapSize.width = 1024;
    stageLight.shadow.mapSize.height = 1024;
    stageLight.shadow.camera.near = 0.5;
    stageLight.shadow.camera.far = 250;
    const sSize = 80;
    stageLight.shadow.camera.left = -sSize;
    stageLight.shadow.camera.right = sSize;
    stageLight.shadow.camera.top = sSize;
    stageLight.shadow.camera.bottom = -sSize;
    scene.add(stageLight);

    const flashLight = new THREE.PointLight(0x06b6d4, 1.5, 60); // Blue cyber core light
    flashLight.position.set(0, 8, 0);
    scene.add(flashLight);

    // 3D Grid Track Agility Runway Core Mesh
    const trackWidth = numLanes * 16;
    const trackGeo = new THREE.PlaneGeometry(trackWidth, 1200, 1, 1);
    const trackMat = new THREE.MeshStandardMaterial({
      color: 0x15803d, // rich grass green field
      roughness: 0.9,
      metalness: 0.05,
    });
    const track = new THREE.Mesh(trackGeo, trackMat);
    track.rotation.x = -Math.PI / 2;
    track.position.z = -500;
    track.receiveShadow = true;
    scene.add(track);

    // Authentic white solid boundary sidelines on track edges lying flat
    const borderLGeo = new THREE.BoxGeometry(0.5, 0.15, 1200);
    const borderRGeo = new THREE.BoxGeometry(0.5, 0.15, 1200);
    const borderMat = new THREE.MeshPhongMaterial({ color: 0xffffff, emissive: 0x888888, emissiveIntensity: 0.1 });
    const borderL = new THREE.Mesh(borderLGeo, borderMat);
    borderL.position.set(-trackWidth / 2 - 0.25, 0.08, -500);
    scene.add(borderL);
    const borderR = new THREE.Mesh(borderRGeo, borderMat);
    borderR.position.set(trackWidth / 2 + 0.25, 0.08, -500);
    scene.add(borderR);

    // White Lane dividers list
    const dividersGroup = new THREE.Group();
    scene.add(dividersGroup);
    if (numLanes > 1) {
      const lanesRange = numLanes === 5 ? [-1.5, -0.5, 0.5, 1.5] : [-0.5, 0.5];
      const divMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
      lanesRange.forEach((laneIdx) => {
        // pre-generate glowing dashed bars along lane bounds
        for (let hz = 0; hz > -700; hz -= 30) {
          const divGeo = new THREE.BoxGeometry(0.3, 0.1, 12);
          const divMesh = new THREE.Mesh(divGeo, divMat);
          divMesh.position.set(laneIdx * 16, 0.05, hz);
          dividersGroup.add(divMesh);
        }
      });
    }

    // Scenic pine trees borders caching list
    const treesGroup = new THREE.Group();
    scene.add(treesGroup);
    for (let tz = 0; tz > -800; tz -= 45) {
      // Left tree
      const treeL = createTreeMesh();
      treeL.position.set(-trackWidth / 2 - 12 - Math.random() * 8, 0, tz + (Math.random() - 0.5) * 10);
      treesGroup.add(treeL);

      // Right tree
      const treeR = createTreeMesh();
      treeR.position.set(trackWidth / 2 + 12 + Math.random() * 8, 0, tz + (Math.random() - 0.5) * 10);
      treesGroup.add(treeR);
    }

    // Twinkling stargrid background meshes
    const starsGroup = new THREE.Group();
    const starGeo = new THREE.SphereGeometry(0.25, 4, 4);
    const starMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    for (let s = 0; s < 50; s++) {
      const star = new THREE.Mesh(starGeo, starMat);
      star.position.set(
        (Math.random() - 0.5) * 500,
        30 + Math.random() * 120,
        -150 - Math.random() * 500
      );
      starsGroup.add(star);
    }
    scene.add(starsGroup);

    // Big glossy stadium sun/moon backdrop
    const sunGeo = new THREE.SphereGeometry(15, 16, 16);
    const sunMat = new THREE.MeshBasicMaterial({ color: 0xfef08a });
    const sunMesh = new THREE.Mesh(sunGeo, sunMat);
    sunMesh.position.set(50, 45, -450);
    scene.add(sunMesh);

    // Pre-create Player voxel group
    const player3D = createDogModel(activeBreed, evolution);
    scene.add(player3D.group);

    // Dynamic 3D Google Drive import engine
    const clock = new THREE.Clock();
    let customMixer: THREE.AnimationMixer | null = null;
    let customClips: THREE.AnimationClip[] = [];
    let activeAction: THREE.AnimationAction | null = null;
    let runIdx = -1;
    let idleIdx = -1;
    let jumpIdx = -1;
    let slideIdx = -1;

    if (customDogModelBuffer) {
      const gltfLoader = new GLTFLoader();
      gltfLoader.parse(
        customDogModelBuffer,
        '',
        (gltf) => {
          // Hide standard voxel geometries safely
          player3D.group.traverse((c) => {
            if (c !== player3D.group) {
              c.visible = false;
            }
          });

          const model = gltf.scene;
          model.traverse((child) => {
            if (child instanceof THREE.Mesh) {
              child.castShadow = true;
              child.receiveShadow = true;
              if (child.material) {
                if (Array.isArray(child.material)) {
                  child.material.forEach((m) => {
                    m.roughness = 0.55;
                    m.metalness = 0.12;
                  });
                } else {
                  child.material.roughness = 0.55;
                  child.material.metalness = 0.12;
                }
              }
            }
          });

          // Compute exact dimensions and scale seamlessly to fit the arena
          const bbox = new THREE.Box3().setFromObject(model);
          const size = bbox.getSize(new THREE.Vector3());
          const maxDim = Math.max(size.x, size.y, size.z);
          // Target scale matches roughly 2.5 unit frames of voxel models
          const targetScale = maxDim > 0 ? 2.5 / maxDim : 0.12;
          model.scale.set(targetScale, targetScale, targetScale);

          // Center offsets to run alignment
          const center = bbox.getCenter(new THREE.Vector3());
          model.position.set(-center.x * targetScale, -bbox.min.y * targetScale, -center.z * targetScale);

          player3D.group.add(model);

          if (gltf.animations && gltf.animations.length > 0) {
            customMixer = new THREE.AnimationMixer(model);
            customClips = gltf.animations;

            const lowerNames = gltf.animations.map(c => c.name.toLowerCase());
            runIdx = lowerNames.findIndex(n => n.includes('run') || n.includes('sprint') || n.includes('dash') || n.includes('play'));
            idleIdx = lowerNames.findIndex(n => n.includes('idle') || n.includes('stay') || n.includes('wait') || n.includes('pose'));
            jumpIdx = lowerNames.findIndex(n => n.includes('jump') || n.includes('leap') || n.includes('fly') || n.includes('air'));
            slideIdx = lowerNames.findIndex(n => n.includes('slide') || n.includes('duck') || n.includes('crawl'));

            const initialIdx = runIdx !== -1 ? runIdx : (idleIdx !== -1 ? idleIdx : 0);
            activeAction = customMixer.clipAction(customClips[initialIdx]);
            activeAction.play();
          }
        },
        (error) => {
          console.error('[TopDog] Error parsing custom GLB template:', error);
        }
      );
    }

    // Pre-create intro cinematic objects
    const introPerson = createPersonModel();
    scene.add(introPerson.group);

    const introFence = createFenceModel();
    scene.add(introFence);

    const introBallMesh = new THREE.Mesh(
      new THREE.SphereGeometry(0.8, 12, 12),
      new THREE.MeshStandardMaterial({ color: 0xeab308, emissive: 0xeab308, emissiveIntensity: 0.3, roughness: 0.5 })
    );
    scene.add(introBallMesh);

    // Pre-create Opponent Ghost translucent hologram voxel group
    const ghostDog3D = createDogModel(activeBreed, 1);
    ghostDog3D.group.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.material = new THREE.MeshPhongMaterial({
          color: 0x06b6d4,
          emissive: 0x06b6d4,
          transparent: true,
          opacity: 0.42,
          depthWrite: false,
        });
      }
    });
    ghostDog3D.group.visible = false;
    scene.add(ghostDog3D.group);

    // Main 3D cache maps
    const activeMeshCache = new Map<string, THREE.Object3D>();

    // Dynamic pre-allocated particle sphere objects pool (Max 30)
    const particlePoolGroup = new THREE.Group();
    scene.add(particlePoolGroup);
    const spherePartGeo = new THREE.SphereGeometry(0.35, 4, 4);
    const partsMeshList: THREE.Mesh[] = [];

    // Trigger initial onboarding bark
    setTimeout(() => {
      GameAudio.playBark(activeBreed === 'chihuahua');
    }, 400);

    const updatePhysics = () => {
      const state = stateRef.current;
      if (state.isGameOver || isPaused) return;

      state.gameTime += 1;

      if (state.invulnTimer > 0) state.invulnTimer -= 1;
      if (state.stumbleTimer > 0) state.stumbleTimer -= 1;

      // Intro cinematic timeline updating
      if (state.introActive) {
        state.introTime += 1;

        // Scenery only scroll when dog runs (introTime > 45)
        const isRunning = state.introTime > 45;
        if (isRunning) {
          const distanceGain = (state.speed / 60) * 0.55;
          state.distance += distanceGain;
        }

        const runTime = Math.max(0, state.introTime - 45);
        const introSpeed = 1.6; // Scroll speed back

        // 1. Person position (Starts stationary at Z=46 on the field, then scrolls back)
        const personZ = 46 - runTime * introSpeed;
        introPerson.group.position.set(-8, 0, convertZ(personZ));

        // 2. Fence position (Starts stationary on the field at Z=52, then scrolls back)
        const fenceZ = 52 - runTime * introSpeed;
        introFence.position.set(0, 0, convertZ(fenceZ));

        // 3. Person throw arm swinging (static human throwing ball at start)
        if (state.introTime < 15) {
          introPerson.armGroup.rotation.x = -0.5;
        } else if (state.introTime >= 15 && state.introTime < 35) {
          const throwProgress = (state.introTime - 15) / 20;
          introPerson.armGroup.rotation.x = -0.5 - throwProgress * Math.PI * 0.8;
        } else {
          introPerson.armGroup.rotation.x = -0.5 - Math.PI * 0.8;
        }

        // 4. Parabolic Ball Throw
        if (state.introTime >= 22 && state.introTime <= 55) {
          introBallMesh.visible = true;
          const ballT = (state.introTime - 22) / 33; // 0 to 1

          const targetZ_3D = -1.5; // mouth of dog
          const startZ_3D = convertZ(46);

          const ballX = -8 + 8.2 * ballT;
          const ballZ = startZ_3D + (targetZ_3D - startZ_3D) * ballT;
          const arcHeight = 11 * Math.sin(ballT * Math.PI);
          const ballY = 6.0 + (state.playerY * 0.22 + 2.5 - 6.0) * ballT + arcHeight;

          introBallMesh.position.set(ballX, ballY, ballZ);
          introBallMesh.rotation.y += 0.15;
          introBallMesh.rotation.x += 0.08;
        } else if (state.introTime > 55 && state.introTime < 115) {
          // Ball caught in mouth
          introBallMesh.visible = true;
          introBallMesh.position.set(
            state.playerVisualLane * 16,
            state.playerY * 0.22 + 4.2 + Math.sin(state.gameTime * 0.35) * 0.1,
            -1.5
          );
        } else {
          introBallMesh.visible = false;
        }

        // 5. Dog Jump & Leg states
        if (state.introTime >= 45 && state.introTime <= 68) {
          // Jumping over the fence
          const jumpT = (state.introTime - 45) / 23;
          state.playerY = Math.sin(jumpT * Math.PI) * 45;
          player3D.legs.forEach((lg) => { lg.rotation.x = -Math.PI / 4; });
        } else if (isRunning) {
          // Standard running state
          state.playerY = 0;
          const runAng1 = Math.sin(state.gameTime * 0.24) * 0.55;
          const runAng2 = -runAng1;
          player3D.legs[0].rotation.x = runAng1;
          player3D.legs[1].rotation.x = runAng2;
          player3D.legs[2].rotation.x = runAng2;
          player3D.legs[3].rotation.x = runAng1;
          player3D.tail.rotation.z = Math.sin(state.gameTime * 0.18) * 0.45;
          player3D.head.rotation.x = -0.1 + Math.sin(state.gameTime * 0.22) * 0.1;
        } else {
          // Stationary standing/sitting on the field before starting
          state.playerY = 0;
          player3D.legs.forEach((lg) => { lg.rotation.x = 0; });
          player3D.tail.rotation.z = Math.sin(state.gameTime * 0.06) * 0.15;
          player3D.head.rotation.x = -0.05 + Math.sin(state.gameTime * 0.04) * 0.05;
        }

        // Catch sound & burst
        if (state.introTime === 55) {
          GameAudio.playCollect(true, true);
          triggerDustBurst(325, 200, '#eab308', 22);
        }

        // Fading human and fence far behind
        if (state.introTime >= 100) {
          const fadeFactor = Math.max(0, 1 - (state.introTime - 100) / 25);
          introPerson.group.traverse((c) => {
            if (c instanceof THREE.Mesh && 'opacity' in c.material) {
              c.material.transparent = true;
              (c.material as any).opacity = fadeFactor;
            }
          });
          introFence.traverse((c) => {
            if (c instanceof THREE.Mesh && 'opacity' in c.material) {
              c.material.transparent = true;
              (c.material as any).opacity = fadeFactor;
            }
          });
        }

        // Conclude intro at 135 frames instead of 110!
        if (state.introTime >= 135) {
          state.introActive = false;
          state.distance = 0; // reset
          scene.remove(introPerson.group);
          scene.remove(introFence);
          scene.remove(introBallMesh);
        }

        // Skip normal physics updates during intro, only process visual lane transitions
        state.playerVisualLane += (state.playerLane - state.playerVisualLane) * 0.18;
        return;
      }

      // Handle digging state freeze
      if (state.isDigging) {
        state.digDuration -= 1;
        if (state.digDuration % 3 === 0) {
          triggerDustBurst(325, 320, '#78350f', 3);
        }
        if (state.digDuration <= 0) {
          state.isDigging = false;
        }
        return;
      }

      const activeSpeedForPhysics = state.stumbleTimer > 0 ? 4.8 : state.speed;
      const distanceGain = (activeSpeedForPhysics / 60);
      state.distance += distanceGain;

      const previousSpeedMilestone = Math.floor((state.distance - distanceGain) / 100);
      const currentSpeedMilestone = Math.floor(state.distance / 100);
      if (currentSpeedMilestone > previousSpeedMilestone) {
        state.speed += 1.5;
        GameAudio.playCollect(true, false);
      }

      // Smooth swerves of lanes
      state.playerVisualLane += (state.playerLane - state.playerVisualLane) * 0.18;

      if (state.playerY > 0) {
        state.playerVy -= 0.45;
        state.playerY += state.playerVy;
        if (state.playerY <= 0) {
          state.playerY = 0;
          state.playerVy = 0;
        }
      }

      if (state.playerSlideTimer > 0) {
        state.playerSlideTimer -= 1;
      }

      if (state.activePowerUp !== 'none') {
        state.powerUpTimer -= 1 / 60;
        if (state.powerUpTimer <= 0) {
          state.activePowerUp = 'none';
        }
      }

      // Spawn obstacles and collectibles periodically
      const visualDelta = 300;
      if (!state.introActive && state.distance * 10 - state.lastSpawnZ > 130) {
        const laneCount = numLanes;
        const availableLanes = laneCount === 5 ? [-2, -1, 0, 1, 2] : laneCount === 3 ? [-1, 0, 1] : [0];
        const chosenLane = availableLanes[Math.floor(Math.random() * availableLanes.length)];

        const rand = Math.random();
        if (rand < 0.45) {
          const types: ObstacleType[] = ['table', 'teeter', 'swing_board', 'large_hoop', 'small_hoop', 'slalom_gates', 'covered_tunnel', 'jump_platform'];
          if (state.activePowerUp !== 'tunnel') {
            types.push('dig_spot');
          }
          const chosenType = types[Math.floor(Math.random() * types.length)];
          state.obstacles.push({
            id: `obs-${state.gameTime}`,
            type: chosenType,
            lane: chosenLane,
            width: 30,
            height: chosenType === 'large_hoop' || chosenType === 'table' ? 45 : 25,
            z: visualDelta,
            passed: false,
            angle: chosenType === 'teeter' ? -15 : 0,
            swampSpeed: Math.random() * 0.1,
          });
        } else {
          const colTypes: Array<'bone' | 'rare_bone' | 'howl_token' | 'power_up'> = ['bone', 'rare_bone', 'power_up'];
          if (Math.random() > 0.9) colTypes.push('howl_token');

          const colType = colTypes[Math.floor(Math.random() * colTypes.length)];
          const powerUps: PowerUpType[] = ['magnet', 'superjump', 'collector', 'tunnel', 'nitro'];
          const chosenPUp = colType === 'power_up' ? powerUps[Math.floor(Math.random() * powerUps.length)] : undefined;

          state.collectibles.push({
            id: `col-${state.gameTime}`,
            type: colType,
            powerUpType: chosenPUp,
            lane: chosenLane,
            z: visualDelta,
            height: colType === 'power_up' || Math.random() > 0.5 ? 25 : 0,
            collected: false,
          });
        }
        state.lastSpawnZ = state.distance * 10;
      }

      const isNeural = linkType === 'neural';
      const magnetActive = state.activePowerUp === 'magnet' || state.activePowerUp === 'collector';

      state.obstacles.forEach((obs) => {
        obs.z -= activeSpeedForPhysics * 0.15;

        if (obs.type === 'teeter' && obs.z < 65 && obs.angle !== undefined) {
          obs.angle += (15 - obs.angle) * 0.15;
        }

        if (obs.type === 'swing_board' && obs.angle !== undefined && obs.swampSpeed !== undefined) {
          obs.angle = Math.sin(state.gameTime * obs.swampSpeed) * 30;
        }

        if (!obs.passed && obs.z < 25) {
          obs.passed = true;
          if (!state.isGameOver) {
            state.obstaclesAvoided += 1;
            state.combo += 1;
            state.maxCombo = Math.max(state.maxCombo, state.combo);
            state.xpEarned += Math.round((linkType === 'clicker' ? 3 : 2) * state.combo);
          }
        }
      });

      state.obstacles = state.obstacles.filter((o) => o.z > -10);

      const hasNearbyDigSpot = state.obstacles.some(
        (o) => o.type === 'dig_spot' && Math.abs(o.z - 45) < 30 && !o.passed
      );
      setShowDigAlert(hasNearbyDigSpot);

      state.collectibles.forEach((col) => {
        col.z -= activeSpeedForPhysics * 0.15;

        const pullsWithNeural = isNeural && col.z < 110;
        const activeMagnetPull = magnetActive || pullsWithNeural;

        if (activeMagnetPull && (col.type === 'bone' || col.type === 'rare_bone') && col.z < (isNeural ? 220 : 180)) {
          const dx = state.playerVisualLane - col.lane;
          col.lane += dx * (isNeural ? 0.32 : 0.22);
          const dy = state.playerY - col.height;
          col.height += dy * (isNeural ? 0.32 : 0.22);
        }

        const laneDelta = Math.abs(col.lane - state.playerVisualLane);
        const zDelta = Math.abs(col.z - 40);
        const yDelta = Math.abs(col.height - state.playerY);

        if (!col.collected && laneDelta < 0.6 && zDelta < 18 && yDelta < 25) {
          col.collected = true;

          triggerDustBurst(
            325 + col.lane * 110,
            240 - col.height * 1.5,
            col.type === 'howl_token' ? '#a78bfa' : col.type === 'rare_bone' ? '#f472b6' : '#fef08a',
            6
          );

          if (col.type === 'bone') {
            const bonesWorth = state.activePowerUp === 'collector' ? 3 : 1;
            state.bonesCollected += bonesWorth * state.combo;
            GameAudio.playCollect(false, false);
          } else if (col.type === 'rare_bone') {
            state.bonesCollected += 5 * state.combo;
            GameAudio.playCollect(true, false);
          } else if (col.type === 'howl_token') {
            state.howlTokensCollected += 1;
            GameAudio.playCollect(true, true);
          } else if (col.type === 'power_up' && col.powerUpType) {
            state.activePowerUp = col.powerUpType;
            state.powerUpTimer = col.powerUpType === 'nitro' ? 8.0 : 10.0;
            state.powerupsCollected += 1;
            GameAudio.playPowerup();
          }
        }
      });

      state.collectibles = state.collectibles.filter((c) => c.z > -10 && !c.collected);

      // Check obstacle collisions
      if (state.activePowerUp !== 'nitro' && state.activePowerUp !== 'tunnel') {
        state.obstacles.forEach((obs) => {
          if (obs.passed) return;

          const laneDelta = Math.abs(obs.lane - state.playerVisualLane);
          const zDelta = Math.abs(obs.z - 40);

          // Calibrate precise visual collision box based on current frame running speed
          const collisionZBox = Math.max(5.0, state.speed * 0.16);

          if (laneDelta < 0.65 && zDelta < collisionZBox) {
            let collided = true;

            if (obs.type === 'large_hoop') {
              if (state.playerY > 5 || state.playerSlideTimer > 0) collided = false;
            } else if (obs.type === 'small_hoop') {
              if (state.playerSlideTimer > 0) collided = false;
            } else if (obs.type === 'dig_spot') {
              collided = false;
            } else if (obs.type === 'covered_tunnel') {
              if (state.playerSlideTimer > 0) collided = false;
            } else if (obs.type === 'jump_platform') {
              if (state.playerY > 15) collided = false;
            } else {
              if (state.playerY > 15) collided = false;
            }

            if (collided) {
              if (linkType === 'bond' && state.invulnTimer > 0) {
                // Ignore
              } else if (linkType === 'bond' && state.hasShield) {
                state.hasShield = false;
                state.invulnTimer = 180;
                state.stumbleTimer = 120;
                GameAudio.playCrash();
                triggerDustBurst(325 + state.playerVisualLane * 110, 240, '#ec4899', 24);
                triggerDustBurst(325 + state.playerVisualLane * 110, 240, '#fbbf24', 12);
              } else {
                triggerGameOver();
              }
            }
          }
        });
      }

      if (state.gameTime % 2 === 0) {
        state.recordedFrames.push({
          z: state.distance,
          lane: state.playerLane,
          height: state.playerY,
          action: state.isDigging
            ? 'dig'
            : state.playerY > 0
            ? 'jump'
            : state.playerSlideTimer > 0
            ? 'slide'
            : 'run',
          isUnderground: state.activePowerUp === 'tunnel',
        });
      }

      setActivePowerUpUI(state.activePowerUp);
      setPowerUpTimeLeftUI(Math.max(0, state.powerUpTimer));
    };

    const triggerGameOver = () => {
      const state = stateRef.current;
      state.isGameOver = true;
      GameAudio.playCrash();

      triggerDustBurst(325, 200, '#ef4444', 35);
      triggerDustBurst(325, 230, '#fbbf24', 20);

      if (gameMode === 'ghost' || gameMode === 'single') {
        const storedGhostJSON = localStorage.getItem('topdog_best_gh_run');
        let shouldSave = true;
        if (storedGhostJSON) {
          const prevRun = JSON.parse(storedGhostJSON) as GhostRun;
          if (prevRun.totalDistance > state.distance) shouldSave = false;
        }
        if (shouldSave) {
          const runToStore: GhostRun = {
            id: `ghost-${Date.now()}`,
            breed: activeBreed,
            evolution,
            totalDistance: state.distance,
            frames: state.recordedFrames,
          };
          localStorage.setItem('topdog_best_gh_run', JSON.stringify(runToStore));
        }
      }

      setTimeout(() => {
        if (isMounted) {
          onGameEnd({
            distance: state.distance,
            bonesCollected: state.bonesCollected,
            howlTokensCollected: state.howlTokensCollected,
            xpEarned: state.xpEarned,
            maxCombo: state.maxCombo,
            obstaclesAvoided: state.obstaclesAvoided,
            powerupsCollected: state.powerupsCollected,
          });
        }
      }, 1500);
    };

    const convertZ = (gameplayZ: number) => -(gameplayZ - 40) * 1.5;

    // Direct ThreeJS rendering module
    const renderScene = () => {
      const state = stateRef.current;
      const isTunnelActive = state.activePowerUp === 'tunnel';

      // 1. Shift environment color and fog based on tunnel status
      if (isTunnelActive) {
        scene.background = new THREE.Color(0x321603); // underground safety soil brown
        scene.fog = new THREE.FogExp2(0x321603, 0.0075);
        track.material.color.setHex(0x5c2503);
        sunMesh.visible = false;
        starsGroup.visible = false;
      } else {
        scene.background = new THREE.Color(0x0f172a); // sunset space blue
        scene.fog = new THREE.FogExp2(0x0f172a, 0.0035);
        track.material.color.setHex(0x15803d); // rich grass green field
        sunMesh.visible = true;
        starsGroup.visible = true;
      }

      // 2. Animate background and scrolling lane boundary dividers to convey speed motion
      const speedOffset = (state.distance * 10) % 30;
      dividersGroup.position.z = speedOffset;

      // Scenic pines scrolling
      treesGroup.children.forEach((tree) => {
        tree.position.z += state.speed * 0.15 * 1.5;
        if (tree.position.z > 30) {
          tree.position.z = -750 - Math.random() * 20;
        }
      });

      // Twinkling stars
      starsGroup.children.forEach((star, sIdx) => {
        const meshStar = star as THREE.Mesh;
        if ((Math.floor(state.gameTime / 15) + sIdx) % 3 === 0) {
          meshStar.scale.setScalar(1.6);
        } else {
          meshStar.scale.setScalar(1.0);
        }
      });

      // 3. Process dynamic pre-allocated particle sphere objects pool
      state.particles = state.particles.filter((p) => p.life < p.maxLife);
      
      // Manage mesh occurrences
      while (partsMeshList.length < state.particles.length && partsMeshList.length < 30) {
        const material = new THREE.MeshBasicMaterial({ color: 0xffffff });
        const pSphere = new THREE.Mesh(spherePartGeo, material);
        particlePoolGroup.add(pSphere);
        partsMeshList.push(pSphere);
      }

      partsMeshList.forEach((mesh, index) => {
        if (index < state.particles.length) {
          const p = state.particles[index];
          mesh.visible = true;
          // map screen coords to handy scale
          mesh.position.set((p.x - 325) * 0.065, -(p.y - 200) * 0.065, -0.5);
          mesh.scale.setScalar(p.size * 0.18 * (1 - p.life / p.maxLife));
          const colorHex = p.color === '#cbd5e1' ? 0xcbd5e1 : p.color === '#f59e0b' ? 0xf59e0b : p.color === '#ec4899' ? 0xec4899 : 0xef4444;
          (mesh.material as THREE.MeshBasicMaterial).color.setHex(colorHex);
          p.life += 1;
          p.x += p.vx;
          p.y += p.vy;
        } else {
          mesh.visible = false;
        }
      });

      // 4. Syphon Obstacle meshes
      const currentObsIds = new Set(state.obstacles.map((o) => o.id));
      activeMeshCache.forEach((mesh, id) => {
        if (!currentObsIds.has(id) && !state.collectibles.some((c) => c.id === id)) {
          scene.remove(mesh);
          activeMeshCache.delete(id);
        }
      });

      state.obstacles.forEach((obs) => {
        let obsMesh = activeMeshCache.get(obs.id);
        if (!obsMesh) {
          obsMesh = createObstacleMesh(obs.type);
          scene.add(obsMesh);
          activeMeshCache.set(obs.id, obsMesh);
        }

        // Align coordinates
        obsMesh.position.x = obs.lane * 16;
        obsMesh.position.y = 0;
        obsMesh.position.z = convertZ(obs.z);

        // Tilt teeter plank
        if (obs.type === 'teeter') {
          const plank = obsMesh.getObjectByName('plank');
          if (plank) {
            plank.rotation.z = ((obs.angle || 0) * Math.PI) / 180;
          }
        }
        // Swing board pendulum
        if (obs.type === 'swing_board') {
          const signAssembly = obsMesh.getObjectByName('signAssembly');
          if (signAssembly) {
            signAssembly.rotation.z = ((obs.angle || 0) * Math.PI) / 180;
          }
        }
        // Rotate energy ring above digging spot
        if (obs.type === 'dig_spot') {
          const ring = obsMesh.getObjectByName('energy_ring');
          if (ring) {
            ring.rotation.z = state.gameTime * 0.08;
          }
        }
        
        obsMesh.visible = (obs.z >= 35);
      });

      // 5. Match Collectibles
      state.collectibles.forEach((col) => {
        let colMesh = activeMeshCache.get(col.id);
        if (!colMesh) {
          colMesh = createCollectibleMesh(col.type, col.powerUpType);
          scene.add(colMesh);
          activeMeshCache.set(col.id, colMesh);
        }

        const bob = Math.sin(state.gameTime * 0.12 + col.z) * 0.8;
        colMesh.position.x = col.lane * 16;
        colMesh.position.y = col.height * 0.12 + 2.5 + bob;
        colMesh.position.z = convertZ(col.z);

        // Spin collectibles
        colMesh.rotation.y = state.gameTime * 0.045;
        const pRing = colMesh.getObjectByName('ring');
        if (pRing) {
          pRing.rotation.x = state.gameTime * 0.08;
        }

        colMesh.visible = (col.z >= 35 && !col.collected);
      });

      // 6. Support Ghost Hologram mesh
      if (gameMode !== 'single' && ghostRunToRace) {
        const matchingFrameIdx = ghostRunToRace.frames.findIndex((f) => f.z >= state.distance);
        const ghostFrame = matchingFrameIdx !== -1 ? ghostRunToRace.frames[matchingFrameIdx] : null;
        if (ghostFrame) {
          ghostDog3D.group.visible = true;
          ghostDog3D.group.position.x = ghostFrame.lane * 16;
          ghostDog3D.group.position.y = ghostFrame.height * 0.22;
          ghostDog3D.group.position.z = 0; // Stationary focal line

          // Swing limbs
          const runAng1 = Math.sin(state.gameTime * 0.26) * 0.45;
          const runAng2 = -runAng1;
          ghostDog3D.legs[0].rotation.x = runAng1;
          ghostDog3D.legs[1].rotation.x = runAng2;
          ghostDog3D.legs[2].rotation.x = runAng2;
          ghostDog3D.legs[3].rotation.x = runAng1;
          ghostDog3D.tail.rotation.z = Math.sin(state.gameTime * 0.15) * 0.4;
        } else {
          ghostDog3D.group.visible = false;
        }
      } else {
        ghostDog3D.group.visible = false;
      }

      // 7. Render Player meshes and Leg Swing Animations
      if (!state.introActive) {
        player3D.group.position.x = state.playerVisualLane * 16;
        
        const isTunnelActive = state.activePowerUp === 'tunnel';
        if (state.isGameOver) {
          // High-fidelity tumbling crash sequence
          player3D.group.position.y = Math.max(0.5, (state.playerY * 0.22) - (state.gameTime % 2 ? 0.3 : 0));
          player3D.group.position.z -= 0.15; // slide back slightly
          player3D.group.rotation.z += 0.12; // spin sideways
          player3D.group.rotation.x += 0.08; // flip forward
          player3D.group.rotation.y += 0.05;
        } else if (isTunnelActive) {
          player3D.group.position.y = -2.2; // Sink dog deep into soil
          player3D.group.rotation.set(0.22 + Math.sin(state.gameTime * 0.25) * 0.05, 0, 0); // Shake/angle forward
          player3D.group.position.z = 0;
        } else {
          player3D.group.position.y = state.playerY * 0.22;
          player3D.group.rotation.set(0, 0, 0); // Flat on ground/mid-jump
          player3D.group.position.z = 0;
        }

        const action = state.isGameOver
          ? 'idle'
          : state.isDigging || isTunnelActive
          ? 'dig'
          : state.playerY > 0
          ? 'jump'
          : state.playerSlideTimer > 0
          ? 'slide'
          : 'run';

        if (action === 'slide') {
          player3D.torso.scale.set(1, 0.45, 1);
          player3D.torso.position.y = 0;
          player3D.legs.forEach((lg) => { lg.rotation.x = -Math.PI / 3; });
        } else {
          player3D.torso.scale.set(1, 1, 1);
          if (action === 'run') {
            player3D.torso.position.y = 0;
            const runFactor = state.activePowerUp === 'nitro' ? 0.38 : 0.24;
            const runAng1 = Math.sin(state.gameTime * runFactor) * 0.55;
            const runAng2 = -runAng1;
            player3D.legs[0].rotation.x = runAng1;
            player3D.legs[1].rotation.x = runAng2;
            player3D.legs[2].rotation.x = runAng2;
            player3D.legs[3].rotation.x = runAng1;

            player3D.tail.rotation.z = Math.sin(state.gameTime * 0.18) * 0.45;
            player3D.head.rotation.x = -0.1 + Math.sin(state.gameTime * 0.22) * 0.1;
          } else if (action === 'dig') {
            player3D.torso.position.y = Math.sin(state.gameTime * 0.8) * 0.25;
            player3D.legs[0].rotation.x = Math.sin(state.gameTime * 0.8) * 1.3;
            player3D.legs[1].rotation.x = -Math.sin(state.gameTime * 0.8) * 1.3;
            player3D.legs[2].rotation.x = -Math.sin(state.gameTime * 0.8) * 1.0;
            player3D.legs[3].rotation.x = Math.sin(state.gameTime * 0.8) * 1.0;
            player3D.tail.rotation.z = Math.sin(state.gameTime * 1.2) * 1.0;
            player3D.head.rotation.x = 0.35 + Math.sin(state.gameTime * 0.4) * 0.15;
          } else {
            // Jump or idle
            player3D.torso.position.y = 0;
            player3D.legs.forEach((lg) => { lg.rotation.x = 0; });
            player3D.tail.rotation.z = 0;
            player3D.head.rotation.x = 0;
          }
        }
      }

      // Rapid flashing when invulnerable or stumble crawl
      if (state.invulnTimer > 0) {
        player3D.group.visible = (Math.floor(state.gameTime / 4) % 2 === 0);
      } else {
        player3D.group.visible = true;
      }

      // Micro-scramble lawn-cut particles
      if (state.gameTime % 2 === 0 && !state.isGameOver) {
        let colTrail = '#cbd5e1';
        let particleSize = 4.0;
        const isTunnel = state.activePowerUp === 'tunnel';
        
        if (state.playerY === 0 && state.playerSlideTimer === 0) {
          colTrail = Math.random() > 0.45 ? '#22c55e' : '#713f12'; // grass green or soil brown
        }
        if (evolution === 2) colTrail = '#f59e0b';
        if (evolution === 3) colTrail = '#ec4899';
        if (state.activePowerUp === 'nitro') {
          colTrail = '#ef4444';
          particleSize = 7.0;
        }

        const pY_proj = 350 - state.playerY * 1.5;
        
        if (isTunnel || state.isDigging) {
          // Rapidly spray beautiful soil brown dirt clumps
          for (let pi = 0; pi < 3; pi++) {
            state.particles.push({
              x: 325 + state.playerVisualLane * 110 + (Math.random() - 0.5) * 20,
              y: 350 + Math.random() * 8, // dirt level
              vx: -(state.speed * 0.12 + 2 + Math.random() * 5),
              vy: -4 - Math.random() * 5, // fountain spray effect
              color: '#451a03', // rich dark mud
              life: 0,
              maxLife: 20 + Math.random() * 10,
              size: 5.5 + Math.random() * 4.0,
            });
          }
        } else {
          // Standard trail running particles
          state.particles.push({
            x: 325 + state.playerVisualLane * 110,
            y: pY_proj,
            vx: -state.speed * 0.15 - Math.random() * 2,
            vy: (Math.random() - 0.5) * 3,
            color: colTrail,
            life: 0,
            maxLife: 15,
            size: particleSize,
          });
        }
      }

      // 8. Dynamic Camera follows the dog moves smoothly
      const targetCamX = state.playerVisualLane * 16 * 0.42;
      const targetCamY = 14 + state.playerY * 0.22 * 0.32 + (state.activePowerUp === 'nitro' ? 1.5 : 0);
      const targetCamZ = 30 + (state.activePowerUp === 'nitro' ? -4 : 0);
      
      camera.position.x += (targetCamX - camera.position.x) * 0.15;
      camera.position.y += (targetCamY - camera.position.y) * 0.15;
      camera.position.z += (targetCamZ - camera.position.z) * 0.15;

      camera.lookAt(state.playerVisualLane * 16 * 0.5, 2.5 + state.playerY * 0.22 * 0.35, -45);

      // Light positioning follows players Core
      flashLight.position.x = state.playerVisualLane * 16;
      flashLight.position.y = 8 + state.playerY * 0.22;

      renderer.render(scene, camera);
    };

    // Render loop initiation
    animId = requestAnimationFrame(function tick() {
      if (!isMounted) return;
      const state = stateRef.current;
      updatePhysics();

      // Custom bone animator mechanics
      const delta = clock.getDelta();
      if (customMixer) {
        customMixer.update(delta);

        let animState: 'idle' | 'run' | 'jump' | 'slide' = 'run';
        if (state.introActive) {
          animState = state.introTime < 45 ? 'idle' : 'run';
        } else if (state.playerY > 0) {
          animState = 'jump';
        } else if (state.playerSlideTimer > 0 || state.isDigging) {
          animState = 'slide';
        }

        let targetIdx = -1;
        if (animState === 'run' && runIdx !== -1) targetIdx = runIdx;
        else if (animState === 'idle' && idleIdx !== -1) targetIdx = idleIdx;
        else if (animState === 'jump' && jumpIdx !== -1) targetIdx = jumpIdx;
        else if (animState === 'slide' && (slideIdx !== -1 || jumpIdx !== -1)) {
          targetIdx = slideIdx !== -1 ? slideIdx : jumpIdx;
        }

        if (targetIdx === -1 && customClips.length > 0) {
          targetIdx = 0;
        }

        if (targetIdx !== -1 && customClips[targetIdx]) {
          const targetClip = customClips[targetIdx];
          if (!activeAction || activeAction.getClip() !== targetClip) {
            const prevAction = activeAction;
            activeAction = customMixer.clipAction(targetClip);
            activeAction.reset();
            if (prevAction) {
              activeAction.play();
              prevAction.crossFadeTo(activeAction, 0.22, true);
            } else {
              activeAction.play();
            }
          }
        }
      }

      renderScene();
      if (!isPaused) {
        animId = requestAnimationFrame(tick);
      }
    });

    return () => {
      isMounted = false;
      cancelAnimationFrame(animId);
      GameAudio.stopMusic();

      // Custom animation uncache
      if (customMixer) {
        try {
          customMixer.uncacheRoot(customMixer.getRoot());
        } catch (e) {
          // ignore
        }
      }

      // Explicit ThreeJS manual resource disposal
      renderer.dispose();
      activeMeshCache.forEach((mesh) => {
        mesh.traverse((m) => {
          if (m instanceof THREE.Mesh) {
            m.geometry.dispose();
            if (Array.isArray(m.material)) m.material.forEach((mat) => mat.dispose());
            else m.material.dispose();
          }
        });
      });
      activeMeshCache.clear();
    };
  }, [activeBreed, evolution, numLanes, gameMode, isPaused, customDogModelBuffer]);

  const currentDistanceMeters = stateRef.current.distance;
  const collectedBonesCount = stateRef.current.bonesCollected;
  const currentLevelCombo = stateRef.current.combo;

  return (
    <div
      ref={containerRef}
      id="game-viewport-container"
      className="bg-slate-950 border border-slate-800 rounded-3xl p-4 flex flex-col items-center justify-center relative touch-none shadow-2xl h-full w-full overflow-hidden"
    >
      {/* 1. Header indicators dashboard details */}
      <div className="absolute top-6 inset-x-6 flex justify-between items-center z-20 pointer-events-none select-none">
        {/* Left indicators */}
        <div className="flex items-center gap-3">
          <div className="px-4 py-2 bg-slate-900/90 backdrop-blur-md rounded-2xl border border-slate-800 flex items-center gap-1.5 shadow-md">
            <span className="text-[10px] font-display font-extrabold text-slate-500 uppercase tracking-wider">
              DISTANCE:
            </span>
            <span className="font-mono text-sm font-extrabold text-indigo-400">
              {Math.floor(currentDistanceMeters)}m
            </span>
          </div>

          <div className="px-4 py-2 bg-slate-900/90 backdrop-blur-md rounded-2xl border border-slate-800 flex items-center gap-1.5 shadow-md">
            <Bone className="w-4 h-4 fill-amber-400 text-amber-500" />
            <span className="font-mono text-sm font-extrabold text-amber-500">
              {collectedBonesCount}
            </span>
          </div>
        </div>

        {/* Right indicators: Active Combo and Mode */}
        <div className="flex items-center gap-3">
          {currentLevelCombo > 1 && (
            <div className="px-3 py-1.5 bg-gradient-to-r from-orange-500 to-amber-500 rounded-xl text-white font-display font-black text-xs uppercase tracking-wider shadow-md animate-bounce flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5" />
              <span>{currentLevelCombo}x Combo</span>
            </div>
          )}

          <div className="px-3 py-1.5 bg-violet-600/20 text-violet-400 border border-violet-500/20 rounded-xl text-[10px] font-display font-bold uppercase tracking-wider">
            {gameMode === 'live1v1' ? 'Live VS AI' : gameMode === 'ghost' ? 'Ghost Hunt' : 'Endless Run'}
          </div>
        </div>
      </div>

      {/* 2. Primary Play Canvas element */}
      <div className="w-full h-[400px] flex items-center justify-center relative overflow-hidden rounded-2xl">
         <canvas
          ref={canvasRef}
          width={650}
          height={400}
          className="w-full h-full max-w-full bg-slate-900 block relative cursor-pointer"
          onMouseDown={(e) => handleCanvasStart(e.clientX, e.clientY)}
          onMouseUp={(e) => handleCanvasEnd(e.clientX, e.clientY)}
          onTouchStart={(e) => {
            if (e.touches[0]) handleCanvasStart(e.touches[0].clientX, e.touches[0].clientY);
          }}
          onTouchEnd={(e) => {
            if (e.changedTouches[0]) handleCanvasEnd(e.changedTouches[0].clientX, e.changedTouches[0].clientY);
          }}
        />

        {/* Big On-Screen Pause overlay button */}
        <button
          onClick={() => setIsPaused(!isPaused)}
          className="absolute top-6 left-1/2 -translate-x-1/2 p-2 bg-slate-900/80 backdrop-blur-md hover:bg-slate-850 text-slate-300 rounded-xl hover:scale-105 active:scale-95 transition-all text-xs font-display font-semibold border border-slate-800/80 pointer-events-auto cursor-pointer flex items-center gap-1"
        >
          <span>{isPaused ? '▶️ Resume Race' : '⏸️ Freeze Race'}</span>
        </button>

        {/* 3. Digging interactive alert notifier */}
        {showDigAlert && (
          <div className="absolute bottom-20 left-1/2 -translate-x-1/2 px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-500 rounded-full text-slate-950 font-display font-extrabold text-xs tracking-wider uppercase shadow-xl animate-pulse flex items-center gap-2 pointer-events-auto">
            <span>🐾 PRESS DUST DIGGING KEY [E] NOW!</span>
          </div>
        )}

        {/* 4. Active Power-Up countdown HUD overlay bar */}
        {activePowerUpUI !== 'none' && (
          <div className="absolute bottom-6 left-6 right-6 z-20 pointer-events-none select-none">
            <div className="bg-slate-900/90 backdrop-blur-md rounded-2xl border border-slate-800 p-3 shadow-xl">
              <div className="flex justify-between items-center text-[10px] font-display font-black tracking-wider uppercase mb-1.5">
                <span className="text-amber-400 flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>{activePowerUpUI} POWERUP ACTIVATED!</span>
                </span>
                <span className="font-mono text-xs text-slate-300">{powerUpTimeLeftUI.toFixed(1)}s</span>
              </div>
              <div className="w-full h-2 bg-slate-850 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-amber-400 to-orange-500 transition-all duration-100"
                  style={{ width: `${(powerUpTimeLeftUI / (activePowerUpUI === 'nitro' ? 8.0 : 10.0)) * 100}%` }}
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 5. Mobile / Tablet Interaction Virtual Control buttons rails */}
      <div className="w-full mt-4 grid grid-cols-3 gap-3 relative z-10 pointer-events-auto">
        <div className="flex items-center justify-start gap-2">
          {/* Virtual Lane changing Buttons */}
          <button
            onClick={() => {
              if (stateRef.current.playerLane > (numLanes === 5 ? -2 : numLanes === 3 ? -1 : 0)) {
                stateRef.current.playerLane -= 1;
                GameAudio.playCollect(false, false);
              }
            }}
            className="w-12 h-10 bg-slate-900 hover:bg-slate-850 text-slate-300 rounded-xl flex items-center justify-center shadow-lg border border-slate-800 pointer-events-auto cursor-pointer hover:scale-105 active:scale-95"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <button
            onClick={() => {
              if (stateRef.current.playerLane < (numLanes === 5 ? 2 : numLanes === 3 ? 1 : 0)) {
                stateRef.current.playerLane += 1;
                GameAudio.playCollect(false, false);
              }
            }}
            className="w-12 h-10 bg-slate-900 hover:bg-slate-850 text-slate-300 rounded-xl flex items-center justify-center shadow-lg border border-slate-800 pointer-events-auto cursor-pointer hover:scale-105 active:scale-95"
          >
            <ArrowRight className="w-5 h-5" />
          </button>
        </div>

        <div className="flex items-center justify-center">
          {showDigAlert ? (
            <button
              onClick={triggerDigAction}
              className="px-5 py-2.5 bg-gradient-to-r from-amber-400 to-orange-500 text-slate-950 font-display font-extrabold text-xs rounded-xl shadow-lg hover:scale-105 active:scale-95 transition-all outline-none"
            >
              🐾 DIG!
            </button>
          ) : (
            <div className="text-[10px] font-mono text-slate-400 uppercase tracking-tight text-center flex flex-col gap-0.5">
              <span>W-A-S-D or Tap/Swipe Screen</span>
              <span className="text-orange-400 font-bold">⬇️ Click/Swipe Down to Slide Tunnel! ⬇️</span>
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-2">
          {/* Jump / Slide Buttons */}
          <button
            onClick={() => {
              const state = stateRef.current;
              if (state.playerY === 0 && state.playerSlideTimer <= 0) {
                const jumpPower = state.activePowerUp === 'superjump' ? 14 : 9;
                state.playerVy = jumpPower;
                state.playerY = 0.1;
                GameAudio.playCollect(true, false);
              }
            }}
            className="px-4 h-10 bg-slate-900 hover:bg-slate-850 text-slate-300 rounded-xl flex items-center justify-center gap-1 shadow-lg border border-slate-800 pointer-events-auto cursor-pointer hover:scale-105 active:scale-95"
          >
            <ArrowUp className="w-4 h-4" />
            <span className="text-xs font-display font-bold">Leap</span>
          </button>
          <button
            onClick={() => {
              const state = stateRef.current;
              if (state.playerY === 0) {
                state.playerSlideTimer = 35;
                GameAudio.playCollect(false, false);
              }
            }}
            className="px-4 h-10 bg-slate-900 hover:bg-slate-850 text-slate-300 rounded-xl flex items-center justify-center gap-1 shadow-lg border border-slate-800 pointer-events-auto cursor-pointer hover:scale-105 active:scale-95"
          >
            <ArrowDown className="w-4 h-4" />
            <span className="text-xs font-display font-bold">Slide</span>
          </button>
        </div>
      </div>
    </div>
  );
};
