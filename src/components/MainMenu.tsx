/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { GameMode, DogCharacter, Breed } from '../types';
import { Play, Flame, Award, Trophy, Users, Shield, BookOpen, Volume2, VolumeX, Swords, Settings, CheckCircle2, Compass } from 'lucide-react';
import { GameAudio } from '../utils/audio';

interface MainMenuProps {
  characters: DogCharacter[];
  activeBreed: Breed;
  bestDistance: number;
  userBones: number;
  userTokens: number;
  onStartGame: (mode: GameMode, lanesCount: 1 | 3 | 5, linkType: string) => void;
  onOpenAchievements: () => void;
  onOpenKennel: () => void;
  onOpenDaily: () => void;
  onSelectCharacter: (breed: Breed) => void;
  onUnlockCharacter: (breed: Breed, currency: 'bones' | 'tokens') => void;
}

export const MainMenu: React.FC<MainMenuProps> = ({
  characters,
  activeBreed,
  bestDistance,
  userBones,
  userTokens,
  onStartGame,
  onOpenAchievements,
  onOpenKennel,
  onOpenDaily,
  onSelectCharacter,
  onUnlockCharacter,
}) => {
  const [chosenMode, setChosenMode] = useState<GameMode>('single');
  const [chosenLanes, setChosenLanes] = useState<1 | 3 | 5>(3);
  const [muted, setMuted] = useState(GameAudio.getMuted());

  // Carousel slider index state management
  const [carouselIndex, setCarouselIndex] = useState(() => {
    const idx = characters.findIndex((c) => c.breed === activeBreed);
    return idx >= 0 ? idx : 0;
  });

  useEffect(() => {
    const idx = characters.findIndex((c) => c.breed === activeBreed);
    if (idx >= 0 && idx !== carouselIndex) {
      setCarouselIndex(idx);
    }
  }, [activeBreed, characters]);

  const handlePrevCharacter = (e: React.MouseEvent) => {
    e.stopPropagation();
    const nextIdx = (carouselIndex - 1 + characters.length) % characters.length;
    setCarouselIndex(nextIdx);
    const nextBreed = characters[nextIdx].breed;
    if (characters[nextIdx].unlocked) {
      onSelectCharacter(nextBreed);
    }
    GameAudio.playCollect && GameAudio.playCollect(false, false);
  };

  const handleNextCharacter = (e: React.MouseEvent) => {
    e.stopPropagation();
    const nextIdx = (carouselIndex + 1) % characters.length;
    setCarouselIndex(nextIdx);
    const nextBreed = characters[nextIdx].breed;
    if (characters[nextIdx].unlocked) {
      onSelectCharacter(nextBreed);
    }
    GameAudio.playCollect && GameAudio.playCollect(false, false);
  };

  // Prerequisite Window states
  const [isPrereqOpen, setIsPrereqOpen] = useState(false);
  const [selectedGameType, setSelectedGameType] = useState<GameMode | ''>(''); // starts unselected
  const [selectedLinkType, setSelectedLinkType] = useState<string>(''); // starts unselected

  // Animation states for humans and dog chasing ball
  const [isThrowing, setIsThrowing] = useState(false);
  const [animProgress, setAnimProgress] = useState(0); // 0 to 100
  const [tick, setTick] = useState(0);

  const activeChar = characters.find((c) => c.breed === activeBreed) || characters[0];
  const previewChar = characters[carouselIndex] || activeChar;

  // Silky smooth tick animation for tail wags and leg swings
  useEffect(() => {
    let animId: number;
    const updateTick = () => {
      setTick((prev) => prev + 1);
      animId = requestAnimationFrame(updateTick);
    };
    animId = requestAnimationFrame(updateTick);
    return () => cancelAnimationFrame(animId);
  }, []);

  // Ball throw progress simulator
  useEffect(() => {
    if (!isThrowing) return;

    let progress = 0;
    const interval = setInterval(() => {
      progress += 2;
      setAnimProgress(progress);

      if (progress >= 100) {
        clearInterval(interval);
        // Delay slightly before transitioning to the actual game canvas run
        setTimeout(() => {
          const finalMode = (selectedGameType || chosenMode) as GameMode;
          onStartGame(finalMode, chosenLanes, 'none');
          setIsThrowing(false);
          setAnimProgress(0);
        }, 300);
      }
    }, 30);

    return () => clearInterval(interval);
  }, [isThrowing, chosenMode, selectedGameType, chosenLanes, onStartGame]);

  const toggleMute = () => {
    const isMuted = !muted;
    setMuted(isMuted);
    GameAudio.setMuted(isMuted);
    if (!isMuted) {
      GameAudio.playCollect(false, false);
      GameAudio.startMusic();
    } else {
      GameAudio.stopMusic();
    }
  };

  const startChasingSequence = () => {
    if (isThrowing) return;
    if (!selectedGameType) {
      // Prerequisite choice window must be satisfied
      setIsPrereqOpen(true);
      return;
    }
    GameAudio.playBark(activeBreed === 'chihuahua');
    // Power up chime representing ball launch
    setTimeout(() => {
      GameAudio.playCollect && GameAudio.playCollect(true, false);
    }, 200);
    setIsThrowing(true);
    setAnimProgress(0);
  };

  // Helper to draw cute procedural dog matching CharacterPanel
  const renderDogVectorLocal = (breed: Breed, anim: 'idle' | 'walk' | 'run' | 'howl', size: number = 80, rot: number = 0) => {
    const isChihuahua = breed === 'chihuahua';
    const isCorgi = breed === 'corgi';
    const isBulldog = breed === 'bulldog';
    const isGShepherd = breed === 'gshepherd';
    const isDachshund = breed === 'dachshund';

    let bodyColor = '#d97706'; // Tan
    let accentColor = '#78350f'; // Dark brown
    let secondaryColor = '#fef3c7'; // Cream

    if (isGShepherd) {
      bodyColor = '#3e2723';
      accentColor = '#211107';
      secondaryColor = '#d7ccc8';
    } else if (isBulldog) {
      bodyColor = '#94a3b8';
      accentColor = '#475569';
      secondaryColor = '#e2e8f0';
    } else if (isCorgi) {
      bodyColor = '#f59e0b';
      accentColor = '#b45309';
      secondaryColor = '#ffffff';
    } else if (isChihuahua) {
      bodyColor = '#fbbf24';
      accentColor = '#78350f';
      secondaryColor = '#fef3c7';
    } else if (isDachshund) {
      bodyColor = '#7c2d12';
      accentColor = '#3f1105';
      secondaryColor = '#fed7aa';
    }

    const beat = tick / 4;
    const bodyY = anim === 'run' ? Math.sin(beat) * 4 : anim === 'walk' ? Math.sin(beat * 0.8) * 2.5 : 0;
    const legAngle1 = anim === 'run' ? Math.sin(beat) * 25 : anim === 'walk' ? Math.sin(beat * 0.8) * 15 : 0;
    const legAngle2 = anim === 'run' ? -Math.sin(beat) * 25 : anim === 'walk' ? -Math.sin(beat * 0.8) * 15 : 0;
    const headRot = anim === 'howl' ? -35 : 0;

    return (
      <div
        className="transition-transform duration-100 flex items-center justify-center pointer-events-none"
        style={{
          width: `${size}px`,
          height: `${size}px`,
          transform: `rotate(${rot}deg)`,
        }}
      >
        <svg viewBox="0 0 100 100" className="w-full h-full select-none">
          {/* Shadow */}
          <ellipse cx="50" cy="85" rx="28" ry="5.5" fill="black" opacity="0.25" />

          {/* Group positioning */}
          <g transform={`translate(0, ${bodyY})`}>
            {/* Back Legs */}
            <g id="local-dog-back-legs">
              <g transform={`translate(${isDachshund ? 25 : isBulldog ? 35 : 30}, 65) rotate(${legAngle1})`}>
                <rect x="-4" y="0" width="8" height="15" rx="3" fill={accentColor} />
              </g>
              <g transform={`translate(${isDachshund ? 65 : isBulldog ? 60 : 55}, 65) rotate(${legAngle2})`}>
                <rect x="-4" y="0" width="8" height="15" rx="3" fill={accentColor} />
              </g>
            </g>

            {/* Main Body */}
            {isDachshund && <rect x="22" y="42" width="54" height="22" rx="10" fill={bodyColor} />}
            {isBulldog && <rect x="28" y="38" width="44" height="28" rx="12" fill={bodyColor} />}
            {isCorgi && <rect x="25" y="44" width="46" height="20" rx="9" fill={bodyColor} />}
            {isChihuahua && <circle cx="50" cy="50" r="16" fill={bodyColor} />}
            {isGShepherd && <rect x="26" y="40" width="45" height="24" rx="8" fill={bodyColor} />}

            {/* Chest patch */}
            {isCorgi && <path d="M 25 48 Q 40 45 42 62 Q 28 62 25 48" fill={secondaryColor} />}
            {isGShepherd && <rect x="30" y="42" width="12" height="18" rx="4" fill={accentColor} />}
            {isChihuahua && <circle cx="48" cy="52" r="10" fill={secondaryColor} />}

            {/* Head and features */}
            <g transform={`translate(0, 0) rotate(${headRot}, 50, 40)`}>
              {/* Ears */}
              {isGShepherd && (
                <>
                  <polygon points="25,18 35,32 20,32" fill={accentColor} />
                  <polygon points="28,21 33,31 23,31" fill="#ec4899" opacity="0.3" />
                </>
              )}
              {isCorgi && (
                <>
                  <path d="M 24 23 Q 30 14 36 26 Z" fill={accentColor} />
                  <path d="M 27 25 Q 31 18 34 26 Z" fill="#ec4899" opacity="0.3" />
                </>
              )}
              {isChihuahua && (
                <>
                  <path d="M 32 24 Q 35 10 43 28 Z" fill={bodyColor} />
                  <path d="M 35 25 Q 37 15 41 28 Z" fill="#ec4899" opacity="0.4" />
                </>
              )}
              {isBulldog && (
                <>
                  <ellipse cx="36" cy="30" rx="6" ry="4" fill={accentColor} />
                  <ellipse cx="64" cy="30" rx="6" ry="4" fill={accentColor} />
                </>
              )}
              {isDachshund && <path d="M 22 28 C 16 28 16 48 24 48 C 24 48 24 40 24 35 Z" fill={accentColor} />}

              {/* Head Base */}
              <circle cx={isBulldog ? '50' : '36'} cy="36" r={isBulldog ? '16' : '13'} fill={bodyColor} />

              {/* Snout */}
              {isBulldog ? (
                <rect x="42" y="38" width="16" height="12" rx="4" fill={accentColor} />
              ) : (
                <ellipse cx="26" cy="38" rx="8" ry="6" fill={secondaryColor} />
              )}

              {/* Nose */}
              <circle cx={isBulldog ? '50' : '20'} cy={isBulldog ? '40' : '38'} r="2.5" fill="#000000" />

              {/* Eyes */}
              <circle cx={isBulldog ? '44' : '30'} cy="32" r={isChihuahua ? '3.5' : '2.5'} fill="#000000" />
              <circle cx={isBulldog ? '56' : '40'} cy="32" r={isChihuahua ? '3.5' : '2.5'} fill="#000000" />
              <circle cx={isBulldog ? '45' : '31'} cy="31" r="1" fill="#ffffff" />
            </g>

            {/* Front legs */}
            <g id="local-dog-front-legs">
              <g transform={`translate(${isDachshund ? 32 : isBulldog ? 42 : 36}, 65) rotate(${legAngle2})`}>
                <rect x="-4" y="0" width="8" height="15" rx="3" fill={bodyColor} />
              </g>
              <g transform={`translate(${isDachshund ? 60 : isBulldog ? 54 : 48}, 65) rotate(${legAngle1})`}>
                <rect x="-4" y="0" width="8" height="15" rx="3" fill={bodyColor} />
              </g>
            </g>

            {/* Tail */}
            <g transform={`translate(${isDachshund ? '76' : isBulldog ? '68' : '65'}, 46) rotate(${anim === 'run' ? 10 : Math.sin(tick / 1.5) * 20})`}>
              {isCorgi ? (
                <circle cx="2" cy="0" r="4" fill={bodyColor} />
              ) : (
                <path d="M 0 0 Q 15 -10 20 -2 Q 22 5 15 4 Z" fill={accentColor} />
              )}
            </g>
          </g>
        </svg>
      </div>
    );
  };

  // Compute Ball trajectory coordinates
  const ballAlpha = animProgress / 100;
  // Arc parameter (parabolic throw) starting from human hand (approx x: 18%, y: 55%) to park center field (x: 48%, y: 36%)
  const ballX = 18 + ballAlpha * 30;
  // Parabolic equation: y starts high, arches higher then drops down
  const ballY = 55 - ballAlpha * 20 - Math.sin(ballAlpha * Math.PI) * 28;

  // Compute chase dog position & scale coordinates
  let dogX = 35;
  let dogY = 62;
  let dogScale = 120;
  let dogRot = 0;
  let currentDogAnim: 'idle' | 'run' = 'idle';

  if (isThrowing) {
    currentDogAnim = 'run';
    // Dog starts chasing when the ball makes progress
    if (ballAlpha < 0.2) {
      // Waiting/excitement posture
      dogX = 35;
      dogY = 62;
    } else {
      // Dog runs toward the focal point of the field lanes
      const runAlpha = (ballAlpha - 0.2) / 0.8; // 0 to 1
      dogX = 35 + runAlpha * 13; // Converging slightly to center field
      dogY = 62 - runAlpha * 26; // Running up into the horizon perspective
      dogScale = 120 - runAlpha * 95; // Shrinking 3D style down to 25px
      dogRot = 5; // Tilted slightly forward
    }
  }

  return (
    <div id="subway-surfers-lobby" className="max-w-6xl w-full mx-auto flex flex-col gap-5 relative z-10 select-none">
      
      {/* 2F. Turf Deployment Prerequisite Modal Overlay */}
      {isPrereqOpen && (
        <div id="prerequisite-overlay" className="fixed inset-0 z-[100] bg-slate-950/95 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-gradient-to-b from-slate-900 via-slate-950 to-slate-900 border-2 border-orange-500/85 rounded-3xl p-5 md:p-7 max-w-2xl w-full shadow-[0_0_50px_rgba(249,115,22,0.25)] animate-in fade-in zoom-in duration-200">
            {/* Header */}
            <div className="text-center mb-5 border-b border-slate-800/80 pb-3">
              <span className="px-3 py-1 bg-orange-500/20 text-orange-400 font-mono text-[10px] font-bold uppercase tracking-widest rounded-full border border-orange-500/30">
                Pre-run Config Required
              </span>
              <h2 className="text-2xl sm:text-3xl font-display font-black text-slate-100 uppercase tracking-wide mt-2">
                Launch Preparation
              </h2>
              <p className="text-xs text-slate-400 mt-1 font-mono">
                Select your athlete and establish Turf parameters
              </p>
            </div>

            {/* Step 1: Select/Choose Character */}
            <div className="mb-5">
              <div className="flex items-center gap-2 mb-2.5">
                <span className="w-5 h-5 rounded-full bg-orange-500 text-slate-950 flex items-center justify-center font-display font-black text-xs">1</span>
                <label className="text-sm font-display font-black text-slate-200 uppercase tracking-widest">
                  Choose Athlete <span className="text-red-500">*</span>
                </label>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                {characters.map((char) => {
                  const isLocked = !char.unlocked;
                  const isEq = char.breed === activeBreed;

                  return (
                    <button
                      key={char.id}
                      disabled={isLocked}
                      onClick={() => {
                        if (!isLocked) {
                          onSelectCharacter(char.breed);
                          GameAudio.playBark && GameAudio.playBark(char.breed === 'chihuahua');
                        }
                      }}
                      className={`text-left p-2 rounded-xl border transition-all flex flex-col justify-between h-34 ${
                        isEq
                          ? 'bg-gradient-to-br from-orange-500/20 to-amber-500/5 border-orange-500 shadow-[0_0_12px_rgba(249,115,22,0.15)] ring-1 ring-orange-400 cursor-pointer'
                          : isLocked
                          ? 'bg-slate-950/20 border-slate-900 opacity-40 cursor-not-allowed'
                          : 'bg-slate-950/40 border-slate-800 hover:border-slate-700 hover:bg-slate-900/30 cursor-pointer'
                      }`}
                    >
                      <div className="flex justify-between items-start w-full">
                        <span className={`text-[8px] font-mono px-1 py-0.5 rounded leading-none ${
                        isEq ? 'bg-orange-500/30 text-orange-200' : 'bg-slate-800 text-slate-400'
                        }`}>
                          LVL {char.level}
                        </span>
                        {isEq && <div className="w-2 h-2 rounded-full bg-orange-400 animate-ping" />}
                      </div>

                      {/* Micro canine silhouette */}
                      <div className="my-1.5 flex justify-center w-full">
                        {renderDogVectorLocal(char.breed, 'idle', 45)}
                      </div>

                      <div className="text-left w-full">
                        <h4 className={`text-[10px] font-display font-black uppercase truncate ${isEq ? 'text-orange-400' : 'text-slate-300'}`}>
                          {char.name.split(' ')[0]}
                        </h4>
                        <p className="text-[8px] text-slate-500 leading-none mt-0.5 truncate font-mono">
                          {char.specialPerk}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Step 2: Select Game Mode (Game Type) */}
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-2.5">
                <span className="w-5 h-5 rounded-full bg-orange-500 text-slate-950 flex items-center justify-center font-display font-black text-xs">2</span>
                <label className="text-sm font-display font-black text-slate-200 uppercase tracking-widest">
                  Choose Game Type (Ruleset) <span className="text-red-500">*</span>
                </label>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                {[
                  { id: 'single', name: 'Solo Trial', desc: 'Run alone in the park to collect bones, score combos and test agility speeds.', icon: Play },
                  { id: 'ghost', name: 'Ghost Duel', desc: 'Race against your personal best run visualised as a translucent ghost tracker.', icon: Compass },
                  { id: 'versus', name: 'Versus CPU', desc: 'Compete face-to-face against robot target hounds running in parallel lanes.', icon: Swords },
                ].map((mode) => {
                  const Icon = mode.icon;
                  const isSel = selectedGameType === mode.id;
                  return (
                    <button
                      key={mode.id}
                      onClick={() => {
                        setSelectedGameType(mode.id as GameMode);
                        GameAudio.playCollect && GameAudio.playCollect(false, false);
                      }}
                      className={`cursor-pointer text-left p-3 rounded-xl border transition-all flex flex-col justify-between h-28 ${
                        isSel 
                          ? 'bg-gradient-to-br from-orange-500/20 to-amber-500/5 border-orange-500 shadow-[0_0_15px_rgba(249,115,22,0.15)] ring-1 ring-orange-400'
                          : 'bg-slate-950/40 border-slate-800 hover:border-slate-700 hover:bg-slate-900/30'
                      }`}
                    >
                      <div className="flex justify-between items-center w-full">
                        <Icon className={`w-4 h-4 ${isSel ? 'text-orange-400' : 'text-slate-500'}`} />
                        {isSel && <div className="w-2 h-2 rounded-full bg-orange-400 animate-ping" />}
                      </div>
                      <div>
                        <h4 className={`text-[10px] font-display font-black uppercase ${isSel ? 'text-orange-400' : 'text-slate-300'}`}>
                          {mode.name}
                        </h4>
                        <p className="text-[9px] text-slate-400 leading-tight mt-0.5 line-clamp-2 font-medium">
                          {mode.desc}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Submit / Actions */}
            <div className="flex flex-col sm:flex-row gap-2 pt-3 border-t border-slate-900/60">
              <button
                onClick={() => setIsPrereqOpen(false)}
                className="cursor-pointer flex-1 py-2.5 text-xs bg-slate-900 border border-slate-800 hover:bg-slate-850 text-slate-400 hover:text-slate-200 rounded-xl transition-all font-display font-medium uppercase tracking-widest"
              >
                Cancel Setup
              </button>
              <button
                disabled={!selectedGameType}
                onClick={() => {
                  setIsPrereqOpen(false);
                  setChosenMode(selectedGameType as GameMode);
                  startChasingSequence();
                }}
                className={`flex-[2] py-2.5 text-xs rounded-xl transition-all font-display font-black uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg ${
                  selectedGameType
                    ? 'cursor-pointer bg-gradient-to-r from-yellow-400 via-orange-500 to-amber-500 text-slate-950 font-black shadow-[0_4px_15px_rgba(249,115,22,0.35)] hover:scale-[1.02] active:scale-[0.98]'
                    : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700/50'
                }`}
              >
                {selectedGameType ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-slate-950 fill-current" />
                    <span>Unleash Partner Run!</span>
                  </>
                ) : (
                  <span>Choose Game Type</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 1. TOP BAR: Subway Surfers style layout with Missions, Daily rewards, Balances and Settings */}
      <div id="lobby-top-bar" className="flex justify-between items-center bg-sky-900/90 border-2 border-sky-400 rounded-3xl px-4 py-3 shadow-[0_4px_15px_rgba(14,165,233,0.3)]">
        {/* Left triggers */}
        <div className="flex gap-2">
          <button
            id="bar-btn-missions"
            onClick={onOpenAchievements}
            className="cursor-pointer group px-4 py-2 bg-gradient-to-b from-sky-400 to-sky-600 hover:from-sky-350 hover:to-sky-500 text-white font-display font-black text-xs tracking-wider uppercase rounded-2xl border-b-4 border-sky-800 hover:scale-105 active:scale-95 transition-all flex items-center gap-2 shadow"
          >
            <Trophy className="w-4 h-4 text-yellow-300 fill-yellow-300/10 group-hover:animate-bounce" />
            <span>Missions</span>
          </button>
          <button
            id="bar-btn-daily"
            onClick={onOpenDaily}
            className="cursor-pointer group px-4 py-2 bg-gradient-to-b from-emerald-400 to-emerald-600 hover:from-emerald-350 hover:to-emerald-500 text-white font-display font-black text-xs tracking-wider uppercase rounded-2xl border-b-4 border-emerald-800 hover:scale-105 active:scale-95 transition-all flex items-center gap-2 shadow"
          >
            <Flame className="w-4 h-4 text-orange-300 fill-orange-300/10 group-hover:animate-pulse" />
            <span>Daily Bonus</span>
          </button>
        </div>

        {/* Right Balances / Settings */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-950/80 border border-slate-800 rounded-2xl">
            <Award className="w-4 h-4 text-cyan-400 animate-spin-slow" />
            <span className="font-mono text-xs font-black text-cyan-400">{userTokens} HT</span>
          </div>

          <button
            id="bar-settings-toggle"
            onClick={toggleMute}
            className="cursor-pointer p-2.5 bg-gradient-to-b from-slate-700 to-slate-900 border-b-4 border-slate-950 text-slate-300 rounded-2xl hover:scale-105 active:scale-95 transition-all text-sm shadow"
            title={muted ? 'Unmute music' : 'Mute music'}
          >
            {muted ? <VolumeX className="w-4.5 h-4.5 text-rose-400" /> : <Volume2 className="w-4.5 h-4.5 text-emerald-400" />}
          </button>
        </div>
      </div>

      {/* 2. THE MAIN FIELD HERO VIEWPORT (On a green field/park backdrop with perspective agility trails) */}
      <div 
        id="lobby-field-viewport" 
        className="w-full h-[380px] sm:h-[460px] relative rounded-[2.5rem] border-4 border-emerald-500/80 shadow-[0_8px_30px_rgba(0,0,0,0.6)] overflow-hidden bg-gradient-to-b from-teal-900 via-emerald-900 to-emerald-950"
      >
        
        {/* PARALLEL VIEWPORT GRAPHICS (Trees, hills, path perspective) */}
        <div className="absolute inset-0 pointer-events-none">
          {/* Sunset sky gradient top half */}
          <div className="absolute top-0 inset-x-0 h-1/2 bg-gradient-to-b from-violet-950 via-orange-500/20 to-teal-900" />
          
          {/* Golden sun silhouette in the perfect middle horizon */}
          <div className="absolute top-[32%] left-1/2 w-32 h-32 bg-amber-400/20 rounded-full blur-2xl -translate-x-1/2" />
          
          {/* Mountains outline far backdrop */}
          <svg className="absolute bottom-[48%] inset-x-0 w-full h-16 opacity-30 text-emerald-950" viewBox="0 0 1000 100" preserveAspectRatio="none">
            <path d="M 0,100 L 120,40 L 250,85 L 420,10 L 600,75 L 780,20 L 910,90 L 1000,100 Z" fill="currentColor" />
          </svg>

          {/* Far off park green hills */}
          <div className="absolute bottom-0 inset-x-0 h-1/2 bg-gradient-to-b from-emerald-800 to-emerald-950" />

          {/* Perspective chalk agility lines converging to focal point on horizon */}
          <svg className="absolute bottom-0 inset-x-0 w-full h-[52%] text-emerald-400/20" viewBox="0 0 1000 200" preserveAspectRatio="none">
            {/* Outline the center lane */}
            <path d="M 500,0 L 400,200 M 500,0 L 600,200" stroke="currentColor" strokeWidth="3" strokeDasharray="6,4" />
            {/* Outline left & right lanes */}
            <path d="M 500,0 L 150,200 M 500,0 L 850,200" stroke="currentColor" strokeWidth="4" />
            
            {/* Agility hurdles/signs silhouetted in background park */}
            <rect x="480" y="2" width="40" height="15" rx="3" fill="#f59e0b" opacity="0.15" />
            <polygon points="220,130 235,160 205,160" fill="#ef4444" opacity="0.1" />
            <polygon points="780,130 795,160 765,160" fill="#ef4444" opacity="0.1" />
            <circle cx="150" cy="80" r="12" fill="#22d3ee" opacity="0.08" />
            <circle cx="850" cy="80" r="12" fill="#22d3ee" opacity="0.08" />
          </svg>

          {/* Beautiful side field turf lines, mimicking Subway Surfers lanes but green grass! */}
          <div className="absolute bottom-[10%] left-4 flex flex-col gap-1 items-start text-emerald-400 text-xs font-mono opacity-25">
            <span>🏟️ PARK SECTION C</span>
            <span>📍 AGILITY FIELD OUT</span>
          </div>

          {/* Soccer goals / cones on the beautiful green field margins */}
          <div className="absolute bottom-[40%] left-10 w-16 h-8 border-2 border-slate-100/30 border-b-0 rounded-t-lg bg-slate-900/10" />
          <div className="absolute bottom-[40%] right-10 w-16 h-8 border-2 border-slate-100/30 border-b-0 rounded-t-lg bg-slate-900/10" />
          
          {/* Orange traffic training cone vector bottom right */}
          <svg className="absolute bottom-[10%] right-[8%] w-10 h-10 text-orange-500 opacity-60" viewBox="0 0 100 100">
            <polygon points="50,10 20,90 80,90" fill="currentColor" />
            <ellipse cx="50" cy="90" rx="35" ry="6" fill="#713f12" />
            <polygon points="45,40 55,40 58,50 42,50" fill="white" />
            <rect x="35" y="70" width="30" height="10" fill="white" />
          </svg>

          {/* Glowing particle stars hovering on the field */}
          <div className="absolute bottom-16 left-1/3 w-2.5 h-2.5 bg-yellow-400 rounded-full animate-ping opacity-75" />
          <div className="absolute bottom-28 right-1/4 w-2 h-2 bg-yellow-400 rounded-full animate-pulse opacity-60" />
          <div className="absolute bottom-8 right-1/3 w-3 h-3 bg-cyan-400 rounded-full animate-ping opacity-50" />
        </div>

        {/* 2A. SUBWAY SURFERS LOGO: "TOP DOG PARK SURFERS" Curved, tilted, graffiti styled text outline */}
        <div className="absolute top-5 inset-x-0 flex flex-col items-center pointer-events-none z-10 scale-90 sm:scale-100">
          <div className="transform -rotate-2 flex flex-col items-center filter drop-shadow-[0_6px_8px_rgba(0,0,0,0.8)]">
            {/* Top Text "TOP DOG" inside bright yellow puffy retro graffiti style */}
            <h1 className="text-4xl sm:text-5xl font-display font-black tracking-tight uppercase text-transparent bg-clip-text bg-gradient-to-b from-yellow-300 via-yellow-400 to-amber-500 stroke-4 stroke-slate-950 font-black" style={{ WebkitTextStroke: '2px #000' }}>
              TOP DOG
            </h1>
            
            {/* Sub-text "PARK SURFERS" overlapping slightly in spray paint typography */}
            <h2 className="text-2xl sm:text-3xl font-display font-black tracking-widest uppercase italic text-transparent bg-clip-text bg-gradient-to-r from-orange-400 via-red-500 to-amber-500 scale-y-110 -mt-2 -rotate-1" style={{ WebkitTextStroke: '1.5px #000' }}>
              PARK SURFERS
            </h2>

            {/* Subtitle banner */}
            <div className="px-3 py-0.5 mt-1.5 bg-amber-500 text-slate-950 rounded-md text-[9px] font-mono font-black uppercase tracking-widest">
              Agility Cup Turf Edition
            </div>
          </div>
        </div>

        {/* 2B. HUMAN TRAINER COACH "Dan" (Waving and throwing the ball) */}
        <div 
          id="actor-human-trainer" 
          className="absolute bottom-[2%] left-[10%] w-32 h-52 z-20 pointer-events-none transition-all duration-300"
        >
          <svg className="w-full h-full" viewBox="0 0 100 160">
            {/* Shadow under human */}
            <ellipse cx="50" cy="148" rx="20" ry="4" fill="black" opacity="0.3" />

            {/* Left pivoting arm that THROWS the ball */}
            <g transform={isThrowing ? `translate(65, 75) rotate(-140)` : `translate(65, 75) rotate(0)`} className="transition-all duration-200">
              {/* Arm segment */}
              <rect x="-6" y="-35" width="12" height="40" rx="6" fill="#3b82f6" />
              {/* Arm hand holding tennis ball or releasing */}
              <circle cx="0" cy="-36" r="6" fill="#ef4444" />
              {!isThrowing && (
                <circle cx="0" cy="-36" r="5" fill="#a3e635" className="animate-pulse" /> // tennis ball
              )}
            </g>

            {/* Jeans Legs */}
            <rect x="36" y="105" width="11" height="35" rx="3" fill="#1e3a8a" />
            <rect x="51" y="105" width="11" height="35" rx="3" fill="#1e3a8a" />
            
            {/* Sneakers */}
            <path d="M 33 140 L 47 140 Q 48 144 40 144 Z" fill="#ffffff" />
            <path d="M 49 140 L 63 140 Q 64 144 56 144 Z" fill="#ffffff" />

            {/* Red Hoodie & Shoulders */}
            <rect x="28" y="55" width="44" height="55" rx="14" fill="#3b82f6" />
            {/* Hoodie stripes/zipper */}
            <line x1="50" y1="58" x2="50" y2="108" stroke="#ffffff" strokeWidth="2.5" />
            <circle cx="43" cy="62" r="2.5" fill="#ffffff" />
            <circle cx="57" cy="62" r="2.5" fill="#ffffff" />

            {/* Head inside the Hoodie cap */}
            <circle cx="50" cy="40" r="16" fill="#3b82f6" />
            <circle cx="50" cy="42" r="12" fill="#fed7aa" />

            {/* Hair and Cap visor */}
            <polygon points="36,46 52,30 64,46" fill="#172554" />
            <rect x="42" y="27" width="18" height="6" rx="2" fill="#ef4444" /> {/* Red snapback visor */}

            {/* Waving Right arm */}
            <g transform={`rotate(${Math.sin(tick / 5) * 12}, 30, 75)`} className="origin-[30px_75px]">
              <rect x="22" y="55" width="10" height="35" rx="5" fill="#3b82f6" />
              <circle cx="27" cy="92" r="5" fill="#fed7aa" />
            </g>

            {/* Smiling Faces features */}
            <circle cx="45" cy="40" r="1.5" fill="#000000" />
            <circle cx="55" cy="40" r="1.5" fill="#000000" />
            <path d="M 44 47 Q 50 51 56 47" stroke="#000" strokeWidth="1.5" fill="none" />
          </svg>
        </div>

        {/* 2C. ANIMATED TENNIS DOG BALL FLIGHT (Arcs across sky when throw is triggered) */}
        {isThrowing && (
          <div 
            id="actor-tennis-ball"
            className="absolute rounded-full bg-lime-400 border border-slate-950 shadow-[0_4px_10px_#a3e635] flex items-center justify-center animate-spin"
            style={{
              left: `${ballX}%`,
              bottom: `${ballY}%`,
              width: `${16 - (animProgress/100) * 8}px`,
              height: `${16 - (animProgress/100) * 8}px`,
              pointerEvents: 'none',
              zIndex: 25,
            }}
          >
            <div className="w-full h-0.5 bg-white scale-x-90" />
          </div>
        )}

        {/* 2D. THE ACTIVE COMPANION DOG RACER CAROUSEL (Choose, equip, unlock companion characters on-the-fly) */}
        <div 
          id="actor-dog-racer" 
          className="absolute z-20 pointer-events-none transition-all duration-75"
          style={{
            left: `${dogX}%`,
            bottom: `${dogY}%`,
            transform: `scale(${dogScale / 100})`,
          }}
        >
          {renderDogVectorLocal(isThrowing ? activeBreed : previewChar.breed, currentDogAnim, 100, dogRot)}
        </div>

        {/* Floating Carousel Arrows & CTA buttons on the field */}
        {!isThrowing && (
          <div className="absolute inset-x-0 bottom-24 sm:bottom-28 overflow-visible flex flex-col items-center justify-center gap-2 z-40 px-4">
            {/* Control Pod wrapper */}
            <div className="flex items-center justify-between w-full max-w-[310px] bg-slate-950/95 backdrop-blur-md px-3.5 py-2 rounded-2xl border border-slate-800 shadow-[0_8px_32px_rgba(0,0,0,0.5)]">
              {/* Previous index button */}
              <button
                onClick={handlePrevCharacter}
                className="cursor-pointer p-2 px-3 bg-slate-900 border border-slate-700/80 hover:bg-slate-800 text-slate-100 rounded-xl leading-none text-xs font-black transition-all transform active:scale-95"
                title="View previous breed"
              >
                ◀
              </button>

              {/* Character Details in center */}
              <div className="text-center flex-grow mx-1 min-w-0">
                <span className="text-xs font-bold text-orange-400 block uppercase tracking-widest truncate">
                  {previewChar.name}
                </span>
                <span className="text-[10px] text-slate-400 block font-mono mt-0.5 mt-1 truncate">
                  Perk: {previewChar.specialPerk}
                </span>
              </div>

              {/* Next index button */}
              <button
                onClick={handleNextCharacter}
                className="cursor-pointer p-2 px-3 bg-slate-900 border border-slate-700/80 hover:bg-slate-800 text-slate-100 rounded-xl leading-none text-xs font-black transition-all transform active:scale-95"
                title="View next breed"
              >
                ▶
              </button>
            </div>

            {/* Equip or Unlock controls */}
            <div className="flex justify-center w-full max-w-[310px] z-50">
              {!previewChar.unlocked ? (
                <div className="flex gap-2 w-full">
                  {previewChar.costBones > 0 && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (userBones >= previewChar.costBones) {
                          onUnlockCharacter(previewChar.breed, 'bones');
                          onSelectCharacter(previewChar.breed);
                        } else {
                          alert(`You need ${previewChar.costBones} bones to adopt this athlete! Try a few more Solo Trials.`);
                        }
                      }}
                      className={`cursor-pointer flex-1 py-1.5 px-3 rounded-xl text-xs font-display font-black uppercase tracking-wider flex items-center justify-center gap-1.5 shadow border transition-all ${
                        userBones >= previewChar.costBones
                          ? 'bg-gradient-to-r from-orange-500 to-amber-500 hover:scale-105 border-orange-400 text-slate-950 font-black'
                          : 'bg-slate-900/90 text-slate-500 border-slate-850'
                      }`}
                    >
                      <span>Adopt ({previewChar.costBones} Bones)</span>
                    </button>
                  )}
                  {previewChar.costTokens > 0 && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (userTokens >= previewChar.costTokens) {
                          onUnlockCharacter(previewChar.breed, 'tokens');
                          onSelectCharacter(previewChar.breed);
                        } else {
                          alert(`Requires ${previewChar.costTokens} howl tokens! Visit "Missions" or "Daily Bonus" to earn rewards.`);
                        }
                      }}
                      className={`cursor-pointer flex-1 py-1.5 px-3 rounded-xl text-xs font-display font-black uppercase tracking-wider flex items-center justify-center gap-1.5 shadow border transition-all ${
                        userTokens >= previewChar.costTokens
                          ? 'bg-gradient-to-r from-cyan-400 to-cyan-500 hover:scale-105 border-cyan-400 text-slate-950 font-black'
                          : 'bg-slate-900/90 text-slate-400 border-slate-850'
                      }`}
                    >
                      <span>Unlock ({previewChar.costTokens} HT)</span>
                    </button>
                  )}
                </div>
              ) : previewChar.breed !== activeBreed ? (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectCharacter(previewChar.breed);
                    GameAudio.playCollect && GameAudio.playCollect(true, false);
                  }}
                  className="cursor-pointer w-full py-1.5 bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500 text-indigo-300 font-display font-black text-xs uppercase tracking-widest rounded-xl transition-all shadow"
                >
                  Equip Companion
                </button>
              ) : (
                <span className="text-[10px] px-3.5 py-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-lg font-mono font-bold uppercase tracking-widest block leading-none shadow">
                  Active Equipped
                </span>
              )}
            </div>
          </div>
        )}

        {/* 2E. TAP TO PLAY BUTTON INTERACTIVE GRID (Huge blinking touch area to start run game) */}
        <div 
          id="interactive-start-trigger"
          onClick={startChasingSequence}
          disabled={isThrowing}
          className="absolute inset-x-0 bottom-4 flex flex-col items-center justify-center cursor-pointer z-30 group"
        >
          {!isThrowing ? (
            <div className="flex flex-col items-center gap-1 transform hover:scale-105 active:scale-95 transition-all">
              {/* Subway Surfers "Tap to Play" style pulsing banner */}
              <div className="px-8 py-3 bg-gradient-to-r from-yellow-400 via-orange-500 to-yellow-500 text-slate-950 font-display font-black text-sm uppercase tracking-[0.2em] rounded-full border-b-4 border-amber-800 shadow-[0_5px_20px_rgba(249,115,22,0.4)] animate-pulse flex items-center gap-2">
                <Play className="w-5 h-5 fill-current text-slate-950" />
                <span>Tap to Play</span>
              </div>
            </div>
          ) : (
            <div className="px-6 py-2 bg-slate-950/95 border-2 border-orange-500 rounded-full shadow-lg">
              <span className="text-xs font-display font-black uppercase tracking-widest text-orange-400 animate-pulse flex items-center gap-2">
                <Swords className="w-4 h-4 animate-spin-slow" />
                <span>Launching Turf Run...</span>
              </span>
            </div>
          )}
        </div>

      </div>

      {/* 3. SUBWAY SURFERS LOBBY BOTTOM NAVIGATION TABS: Friends, Me, Shop */}
      <div id="lobby-bottom-navbar" className="grid grid-cols-3 gap-3.5 mt-1 sm:mt-2 scale-95 sm:scale-100">
        
        {/* TAB 1: FRIENDS (Opens Kennel to purchase or equip gorgeous dog breed companions!) */}
        <button
          id="nav-tab-friends"
          onClick={onOpenKennel}
          className="cursor-pointer group flex flex-col items-center justify-between p-3.5 bg-gradient-to-b from-purple-500 via-indigo-600 to-indigo-800 text-white rounded-[2rem] border-b-8 border-indigo-950 shadow-[0_5px_15px_rgba(79,70,229,0.3)] hover:scale-105 active:scale-95 transition-all relative overflow-hidden"
        >
          {/* Decorative shine strip */}
          <div className="absolute top-0 inset-x-0 h-1.5 bg-purple-300" />
          
          <div className="flex justify-center items-center h-12 w-14 bg-indigo-900/60 rounded-2xl group-hover:animate-bounce shadow-inner">
            <svg viewBox="0 0 100 100" className="w-9 h-9 text-yellow-300 fill-current">
              <path d="M20 50 A 15 15 0 1 1 50 50 A 15 15 0 1 1 80 50 L 80 75 Q 80 85 70 85 L 30 85 Q 20 85 20 75 Z" opacity="0.35" />
              <circle cx="35" cy="40" r="12" />
              <circle cx="65" cy="40" r="12" />
              <path d="M 20 80 Q 50 65 80 80" stroke="currentColor" strokeWidth="4" fill="none" />
            </svg>
          </div>

          <span className="text-yellow-300 font-display font-black text-xs sm:text-sm uppercase tracking-wide mt-2">
            Friends / Kennel
          </span>
        </button>

        {/* TAB 2: ME (Customizes and inspects active evolved stats & levels) */}
        <button
          id="nav-tab-me"
          onClick={onOpenKennel}
          className="cursor-pointer group flex flex-col items-center justify-between p-3.5 bg-gradient-to-b from-amber-400 via-orange-500 to-orange-700 text-slate-950 rounded-[2rem] border-b-8 border-orange-950 shadow-[0_5px_15px_rgba(249,115,22,0.35)] hover:scale-105 active:scale-95 transition-all relative overflow-hidden"
        >
          {/* Decorative shine strip */}
          <div className="absolute top-0 inset-x-0 h-1.5 bg-amber-300" />

          <div className="flex justify-center items-center h-12 w-14 bg-orange-950/20 rounded-2xl group-hover:scale-110 shadow-inner">
            {renderDogVectorLocal(activeBreed, 'idle', 45)}
          </div>

          <span className="text-white font-display font-black text-xs sm:text-sm uppercase tracking-wide mt-2">
            Me / Stats
          </span>
        </button>

        {/* TAB 3: SHOP (Switches to the achievements badges rewards bounty terminal) */}
        <button
          id="nav-tab-shop"
          onClick={onOpenAchievements}
          className="cursor-pointer group flex flex-col items-center justify-between p-3.5 bg-gradient-to-b from-teal-400 via-emerald-500 to-emerald-700 text-slate-950 rounded-[2rem] border-b-8 border-emerald-950 shadow-[0_5px_15px_rgba(16,185,129,0.3)] hover:scale-105 active:scale-95 transition-all relative overflow-hidden"
        >
          {/* Decorative shine strip */}
          <div className="absolute top-0 inset-x-0 h-1.5 bg-teal-300" />

          <div className="flex justify-center items-center h-12 w-14 bg-emerald-950/20 rounded-2xl group-hover:animate-bounce shadow-inner">
            <svg viewBox="0 0 100 100" className="w-9 h-9 text-yellow-300 fill-current">
              <path d="M 12 35 L 88 35 L 80 85 L 20 85 Z" opacity="0.45" />
              <rect x="25" y="45" width="50" height="25" rx="5" fill="currentColor" />
              <circle cx="50" cy="57" r="6" fill="#065f46" />
              <path d="M 30 35 Q 50 10 70 35" stroke="currentColor" strokeWidth="6" fill="none" />
            </svg>
          </div>

          <span className="text-yellow-300 font-display font-black text-xs sm:text-sm uppercase tracking-wide mt-2">
            Shop / Badges
          </span>
        </button>

      </div>

    </div>
  );
};
