/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type Breed = 'corgi' | 'gshepherd' | 'bulldog' | 'chihuahua' | 'dachshund';

export type EvolutionLevel = 1 | 2 | 3;

export type GameMode = 'single' | 'ghost' | 'relay' | 'live1v1';

export type PowerUpType = 'none' | 'magnet' | 'superjump' | 'collector' | 'tunnel' | 'nitro';

export interface DogCharacter {
  id: Breed;
  name: string;
  breed: Breed;
  description: string;
  baseSpeed: number;
  baseJump: number;
  specialPerk: string;
  costBones: number;
  costTokens: number;
  unlocked: boolean;
  level: number;
  xp: number;
  evolution: EvolutionLevel;
}

export type ObstacleType =
  | 'table'
  | 'teeter'
  | 'swing_board'
  | 'large_hoop'
  | 'small_hoop'
  | 'slalom_gates'
  | 'covered_tunnel'
  | 'jump_platform'
  | 'dig_spot';

export interface ObstacleInstance {
  id: string;
  type: ObstacleType;
  lane: number; // 0-indexed center lane, relative to total lanes
  width: number;
  height: number;
  z: number; // Distance ahead of player along the track
  passed: boolean;
  angle?: number; // Teeter angle
  swampSpeed?: number; // Swing board frequency
}

export interface CollectibleInstance {
  id: string;
  type: 'bone' | 'rare_bone' | 'howl_token' | 'power_up';
  powerUpType?: PowerUpType;
  lane: number;
  z: number;
  height: number;
  collected: boolean;
  angle?: number; // Rotating angle
}

export interface GameAchievement {
  id: string;
  title: string;
  description: string;
  metric: 'bones' | 'distance' | 'jumps' | 'obstacles' | 'powerups' | 'evolution';
  target: number;
  currentProgress: number;
  completed: boolean;
  rewardTokens: number;
  claimed: boolean;
}

export interface PlayerStats {
  bonesCount: number;
  howlTokensCount: number;
  totDistance: number;
  maxCombo: number;
  xpTotal: number;
  level: number;
}

export interface GhostFrame {
  z: number;
  lane: number;
  height: number;
  action: 'run' | 'jump' | 'slide' | 'dig' | 'howl';
  isUnderground: boolean;
}

export interface GhostRun {
  id: string;
  breed: Breed;
  evolution: EvolutionLevel;
  totalDistance: number;
  frames: GhostFrame[];
}

export interface DailyRewards {
  lastClaimedDate: string | null;
  currentStreak: number; // 1 to 7
  rewards: Array<{
    day: number;
    bones?: number;
    tokens?: number;
    xp?: number;
  }>;
}
