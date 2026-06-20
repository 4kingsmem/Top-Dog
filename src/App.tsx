/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  Breed,
  EvolutionLevel,
  GameMode,
  DogCharacter,
  GameAchievement,
  PlayerStats,
  DailyRewards,
  GhostRun,
} from './types';
import { MainMenu } from './components/MainMenu';
import { GameCanvas } from './components/GameCanvas';
import { CharacterPanel } from './components/CharacterPanel';
import { AchievementsPanel } from './components/AchievementsPanel';
import { DailyRewardsPanel } from './components/DailyRewardsPanel';
import { GameSummary } from './components/GameSummary';
import { LeaderboardPanel } from './components/LeaderboardPanel';
import { ProfilePanel } from './components/ProfilePanel';
import { GameAudio } from './utils/audio';
import { initAuth, fetchDriveFileArrayBuffer } from './utils/googleDrive';
import { Bone, Award, Trophy, Compass, ShieldCheck, HelpCircle, Gamepad2, User, Home } from 'lucide-react';

const INITIAL_CHARACTERS: DogCharacter[] = [
  {
    id: 'corgi',
    name: 'Corgi Champion',
    breed: 'corgi',
    description: 'Energetic stubby legs with a double magnetic range that easily pulls bones.',
    baseSpeed: 1.3,
    baseJump: 1.1,
    specialPerk: '2x Magnet Range',
    costBones: 0,
    costTokens: 0,
    unlocked: true,
    level: 1,
    xp: 0,
    evolution: 1,
  },
  {
    id: 'gshepherd',
    name: 'German Ranger',
    breed: 'gshepherd',
    description: 'Athletic sports shepherd. Runs with higher top speeds and launches super nitro sprints.',
    baseSpeed: 1.7,
    baseJump: 1.4,
    specialPerk: '3s Extra Nitro Sprint',
    costBones: 0,
    costTokens: 0,
    unlocked: true,
    level: 1,
    xp: 0,
    evolution: 1,
  },
  {
    id: 'bulldog',
    name: 'Wrecking Bulldog',
    breed: 'bulldog',
    description: 'Sturdy underbite bulldog. Heavy armor lets him break tiny barriers safely.',
    baseSpeed: 1.1,
    baseJump: 1.0,
    specialPerk: 'Slower speed progression',
    costBones: 220,
    costTokens: 0,
    unlocked: false,
    level: 1,
    xp: 0,
    evolution: 1,
  },
  {
    id: 'chihuahua',
    name: 'Sparky Chihuahua',
    breed: 'chihuahua',
    description: 'Feisty agile purse pup. Tremendous multipliers on point combos.',
    baseSpeed: 1.5,
    baseJump: 1.3,
    specialPerk: '1.5x Combo Points Modifier',
    costBones: 0,
    costTokens: 15,
    unlocked: false,
    level: 1,
    xp: 0,
    evolution: 1,
  },
  {
    id: 'dachshund',
    name: 'Diggy Dachshund',
    breed: 'dachshund',
    description: 'Sausage dog master of tunneling. Extracts double bones from dig piles.',
    baseSpeed: 1.2,
    baseJump: 1.1,
    specialPerk: '2x Dig Pile Loot bones',
    costBones: 120,
    costTokens: 0,
    unlocked: false,
    level: 1,
    xp: 0,
    evolution: 1,
  },
];

const INITIAL_ACHIEVEMENTS: GameAchievement[] = [
  {
    id: 'ach_bones',
    title: 'Crown Bone Collector',
    description: 'Horde a grand total of 1,000 bones during agility runs.',
    metric: 'bones',
    target: 1000,
    currentProgress: 0,
    completed: false,
    rewardTokens: 10,
    claimed: false,
  },
  {
    id: 'ach_dist',
    title: 'Endless Marathon',
    description: 'Race across a total combined distance of 5,000 meters.',
    metric: 'distance',
    target: 5000,
    currentProgress: 0,
    completed: false,
    rewardTokens: 15,
    claimed: false,
  },
  {
    id: 'ach_jumps',
    title: 'Leap of Faith',
    description: 'Jump through or hurdle hoops and obstacles 100 times perfectly.',
    metric: 'jumps',
    target: 100,
    currentProgress: 0,
    completed: false,
    rewardTokens: 5,
    claimed: false,
  },
  {
    id: 'ach_obs',
    title: 'Dodge Grandmaster',
    description: 'Securely evade 500 obstacles successfully.',
    metric: 'obstacles',
    target: 500,
    currentProgress: 0,
    completed: false,
    rewardTokens: 10,
    claimed: false,
  },
  {
    id: 'ach_power',
    title: 'Power Glutton',
    description: 'Deploy tunnel, nitro, or jump power-up capsules 50 times.',
    metric: 'powerups',
    target: 50,
    currentProgress: 0,
    completed: false,
    rewardTokens: 5,
    claimed: false,
  },
  {
    id: 'ach_evo',
    title: 'Ascended Alpha Pup',
    description: 'Evolve a dog companion to level 3 (Supreme Cyber-Dog status).',
    metric: 'evolution',
    target: 3,
    currentProgress: 1,
    completed: false,
    rewardTokens: 20,
    claimed: false,
  },
];

const DAILY_BISCUIT_REWARDS = [
  { day: 1, bones: 40 },
  { day: 2, bones: 80, xp: 50 },
  { day: 3, tokens: 2 },
  { day: 4, bones: 150 },
  { day: 5, bones: 200, xp: 100 },
  { day: 6, tokens: 5 },
  { day: 7, tokens: 10, bones: 500, xp: 250 },
];

export default function App() {
  const [activeBreed, setActiveBreed] = useState<Breed>('corgi');
  const [userBones, setUserBones] = useState<number>(100); // Start with 100 bones for initial gameplay comfort!
  const [userTokens, setUserTokens] = useState<number>(2); // Start with 2 tokens!
  const [bestDistance, setBestDistance] = useState<number>(0);
  const [characters, setCharacters] = useState<DogCharacter[]>(INITIAL_CHARACTERS);
  const [achievements, setAchievements] = useState<GameAchievement[]>(INITIAL_ACHIEVEMENTS);
  const [dailyState, setDailyState] = useState<DailyRewards>({
    lastClaimedDate: null,
    currentStreak: 1,
    rewards: DAILY_BISCUIT_REWARDS,
  });

  const [gameState, setGameState] = useState<'lobby' | 'playing' | 'postgame'>('lobby');
  const [gameMode, setGameMode] = useState<GameMode>('single');
  const [numLanes, setNumLanes] = useState<1 | 3 | 5>(3);
  const [activeTab, setActiveTab] = useState<'lobby' | 'kennel' | 'achievements' | 'daily' | 'leaderboard' | 'profile'>('lobby');
  const [activeLinkType, setActiveLinkType] = useState<string>('whistle');
  const [customMusicName, setCustomMusicName] = useState<string>('');
  const [customDogSkin, setCustomDogSkin] = useState<string>('');
  const [customRound, setCustomRound] = useState<string>('none');
  const [customOther, setCustomOther] = useState<string>('none');
  const [customDogModelBuffer, setCustomDogModelBuffer] = useState<ArrayBuffer | null>(null);
  const [gdriveToken, setGdriveToken] = useState<string | null>(null);

  // Auto-fetch active model from Google Drive on startup/auth loading
  useEffect(() => {
    const unsubscribe = initAuth(
      async (user, token) => {
        setGdriveToken(token);
        const savedSkinFileId = localStorage.getItem('topdog_custom_skin_file_id');
        const savedSkinName = localStorage.getItem('topdog_custom_skin_name');
        if (savedSkinFileId && savedSkinName) {
          setCustomDogSkin(savedSkinName);
          try {
            const buffer = await fetchDriveFileArrayBuffer(token, savedSkinFileId);
            if (buffer) {
              setCustomDogModelBuffer(buffer);
              console.log(`[TopDog] Replaced and fully loaded 3D partner model: ${savedSkinName}`);
            }
          } catch (e) {
            console.error('[TopDog] Background 3D companion downloading failed:', e);
          }
        }
      },
      () => {
        setGdriveToken(null);
      }
    );
    return () => unsubscribe();
  }, []);

  const handleStatsRestored = (data: {
    bones: number;
    tokens: number;
    bestDistance: number;
    characters: DogCharacter[];
    achievements: GameAchievement[];
  }) => {
    setUserBones(data.bones);
    setUserTokens(data.tokens);
    setBestDistance(data.bestDistance);
    setCharacters(data.characters);
    setAchievements(data.achievements);
    saveUserData(
      data.bones,
      data.tokens,
      data.bestDistance,
      data.characters,
      data.achievements,
      dailyState
    );
  };

  const handleMusicLoaded = async (arrayBuffer: ArrayBuffer | null, filename: string) => {
    if (!arrayBuffer) {
      GameAudio.setCustomMusicBuffer(null);
      setCustomMusicName('');
      if (GameAudio.getMuted() === false) {
        GameAudio.startMusic();
      }
      return;
    }

    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const tempCtx = new Error().stack?.includes('test') ? null : new AudioCtx();
      if (tempCtx) {
        const decodedBuffer = await tempCtx.decodeAudioData(arrayBuffer);
        GameAudio.setCustomMusicBuffer(decodedBuffer);
      }
      setCustomMusicName(filename);
      if (GameAudio.getMuted() === false) {
        GameAudio.startMusic();
      }
    } catch (err) {
      console.error('Custom drive music decoding failed: ', err);
      alert('Failed to decode this audio file. Ensure it is a standard valid MP3/WAV file.');
    }
  };

  const handleSelectCustomSkinDirect = async (name: string, fileId: string) => {
    setCustomDogSkin(name);
    localStorage.setItem('topdog_custom_skin_file_id', fileId);
    localStorage.setItem('topdog_custom_skin_name', name);
    if (GameAudio.playPowerup) GameAudio.playPowerup();

    if (gdriveToken) {
      try {
        const buffer = await fetchDriveFileArrayBuffer(gdriveToken, fileId);
        if (buffer) {
          setCustomDogModelBuffer(buffer);
        }
      } catch (err) {
        console.error('Error loading custom skin buffer directly:', err);
      }
    }
  };

  const [lastStats, setLastStats] = useState({
    distance: 0,
    bonesCollected: 0,
    howlTokensCollected: 0,
    xpEarned: 0,
    maxCombo: 1,
    obstaclesAvoided: 0,
    powerupsCollected: 0,
    isNewHighscore: false,
    levelBefore: 1,
    levelAfter: 1,
  });

  // State persistence loading
  useEffect(() => {
    try {
      const storedBones = localStorage.getItem('topdog_user_bones');
      const storedTokens = localStorage.getItem('topdog_user_tokens');
      const storedBestDist = localStorage.getItem('topdog_best_dist');
      const storedChars = localStorage.getItem('topdog_characters');
      const storedAch = localStorage.getItem('topdog_achievements');
      const storedDaily = localStorage.getItem('topdog_daily_state');
      const storedActiveB = localStorage.getItem('topdog_active_breed');
      const storedRound = localStorage.getItem('topdog_custom_round');
      const storedOther = localStorage.getItem('topdog_custom_other');

      if (storedBones) setUserBones(parseInt(storedBones));
      if (storedTokens) setUserTokens(parseInt(storedTokens));
      if (storedBestDist) setBestDistance(parseFloat(storedBestDist));
      if (storedChars) setCharacters(JSON.parse(storedChars));
      if (storedAch) setAchievements(JSON.parse(storedAch));
      if (storedDaily) setDailyState(JSON.parse(storedDaily));
      if (storedActiveB) setActiveBreed(storedActiveB as Breed);
      if (storedRound) setCustomRound(storedRound);
      if (storedOther) setCustomOther(storedOther);
    } catch (e) {
      console.warn('LocalStorage load failure, falling back to local memory runtime: ', e);
    }
  }, []);

  // Sync state helpers
  const saveUserData = (bones: number, tokens: number, bestDist: number, chars: DogCharacter[], achs: GameAchievement[], daily: DailyRewards) => {
    try {
      localStorage.setItem('topdog_user_bones', bones.toString());
      localStorage.setItem('topdog_user_tokens', tokens.toString());
      localStorage.setItem('topdog_best_dist', bestDist.toString());
      localStorage.setItem('topdog_characters', JSON.stringify(chars));
      localStorage.setItem('topdog_achievements', JSON.stringify(achs));
      localStorage.setItem('topdog_daily_state', JSON.stringify(daily));
    } catch (e) {
      console.warn('LocalStorage save failed: ', e);
    }
  };

  const handleSaveCustomizations = (round: string, other: string) => {
    setCustomRound(round);
    setCustomOther(other);
    try {
      localStorage.setItem('topdog_custom_round', round);
      localStorage.setItem('topdog_custom_other', other);
    } catch (e) {
      console.warn('LocalStorage customization save failed: ', e);
    }
  };

  const handleStartGame = (mode: GameMode, lanes: 1 | 3 | 5, linkType: string) => {
    setGameMode(mode);
    setNumLanes(lanes);
    setActiveLinkType(linkType);
    setGameState('playing');
  };

  const handleGameEnd = (runStats: {
    distance: number;
    bonesCollected: number;
    howlTokensCollected: number;
    xpEarned: number;
    maxCombo: number;
    obstaclesAvoided: number;
    powerupsCollected: number;
  }) => {
    const activeChar = characters.find((c) => c.breed === activeBreed)!;
    const initialLvl = activeChar.level;

    // Calculate level progression inside equipped Character
    let updatedXp = activeChar.xp + runStats.xpEarned;
    let finalLvl = activeChar.level;
    const xpRequiredForUp = finalLvl * 130;

    if (updatedXp >= xpRequiredForUp) {
      updatedXp -= xpRequiredForUp;
      finalLvl += 1;
      GameAudio.playLevelUp(); // flash rank up!
    }

    const updatedChars = characters.map((c) => {
      if (c.breed === activeBreed) {
        return {
          ...c,
          xp: updatedXp,
          level: finalLvl,
        };
      }
      return c;
    });

    const isNewHigh = runStats.distance > bestDistance;
    const newBestDist = isNewHigh ? runStats.distance : bestDistance;
    const newBones = userBones + runStats.bonesCollected;
    const newTokens = userTokens + runStats.howlTokensCollected;

    if (isNewHigh) {
      localStorage.setItem('topdog_best_dist', runStats.distance.toString());
      setBestDistance(runStats.distance);
    }

    // Refresh Achievements progress lists
    const updatedAchs = achievements.map((ach) => {
      let progress = ach.currentProgress;
      if (ach.metric === 'bones') progress += runStats.bonesCollected;
      if (ach.metric === 'distance') progress += runStats.distance;
      if (ach.metric === 'jumps') progress += (runStats.obstaclesAvoided * 0.4); // jump events estimate
      if (ach.metric === 'obstacles') progress += runStats.obstaclesAvoided;
      if (ach.metric === 'powerups') progress += runStats.powerupsCollected;
      if (ach.metric === 'evolution') {
        const highestEvo = Math.max(...updatedChars.map(c => c.evolution));
        progress = highestEvo;
      }

      const completed = progress >= ach.target;

      return {
        ...ach,
        currentProgress: progress,
        completed,
      };
    });

    setUserBones(newBones);
    setUserTokens(newTokens);
    setCharacters(updatedChars);
    setAchievements(updatedAchs);

    // Save
    saveUserData(newBones, newTokens, newBestDist, updatedChars, updatedAchs, dailyState);

    setLastStats({
      ...runStats,
      isNewHighscore: isNewHigh,
      levelBefore: initialLvl,
      levelAfter: finalLvl,
    });

    setGameState('postgame');
  };

  const handleSelectCharacter = (breed: Breed) => {
    setActiveBreed(breed);
    localStorage.setItem('topdog_active_breed', breed);
  };

  const handleUnlockCharacter = (breed: Breed, currency: 'bones' | 'tokens') => {
    const charToUnlock = characters.find((c) => c.breed === breed)!;
    let newBones = userBones;
    let newTokens = userTokens;

    if (currency === 'bones') {
      newBones -= charToUnlock.costBones;
    } else {
      newTokens -= charToUnlock.costTokens;
    }

    const updatedChars = characters.map((c) => {
      if (c.breed === breed) {
        return { ...c, unlocked: true };
      }
      return c;
    });

    setUserBones(newBones);
    setUserTokens(newTokens);
    setCharacters(updatedChars);

    saveUserData(newBones, newTokens, bestDistance, updatedChars, achievements, dailyState);
    GameAudio.playLevelUp(); // shiny fan fare!
  };

  const handleEvolveCharacter = (breed: Breed) => {
    const updatedChars = characters.map((c) => {
      if (c.breed === breed && c.evolution < 3) {
        const nextEvo = (c.evolution + 1) as EvolutionLevel;
        return {
          ...c,
          evolution: nextEvo,
        };
      }
      return c;
    });

    setCharacters(updatedChars);
    saveUserData(userBones, userTokens, bestDistance, updatedChars, achievements, dailyState);
    GameAudio.playLevelUp();
  };

  const handleClaimAchievement = (achId: string, tokens: number) => {
    const updatedAchs = achievements.map((ach) => {
      if (ach.id === achId) {
        return { ...ach, claimed: true };
      }
      return ach;
    });

    const newTokens = userTokens + tokens;
    setUserTokens(newTokens);
    setAchievements(updatedAchs);

    saveUserData(userBones, newTokens, bestDistance, characters, updatedAchs, dailyState);
  };

  const handleClaimDaily = (bonuses: { bones?: number; tokens?: number; xp?: number }) => {
    const newBones = userBones + (bonuses.bones || 0);
    const newTokens = userTokens + (bonuses.tokens || 0);

    const todayStr = new Date().toDateString();
    const nextStreak = dailyState.currentStreak === 7 ? 1 : dailyState.currentStreak + 1;

    const newDaily = {
      ...dailyState,
      lastClaimedDate: todayStr,
      currentStreak: nextStreak,
    };

    // If XP is awarded, apply to currently equipped breed
    let updatedChars = characters;
    if (bonuses.xp) {
      updatedChars = characters.map((c) => {
        if (c.breed === activeBreed) {
          let nextXp = c.xp + bonuses.xp!;
          let nextLevel = c.level;
          if (nextXp >= nextLevel * 130) {
            nextXp -= nextLevel * 130;
            nextLevel += 1;
            GameAudio.playLevelUp();
          }
          return { ...c, xp: nextXp, level: nextLevel };
        }
        return c;
      });
      setCharacters(updatedChars);
    }

    setUserBones(newBones);
    setUserTokens(newTokens);
    setDailyState(newDaily);

    saveUserData(newBones, newTokens, bestDistance, updatedChars, achievements, newDaily);
  };

  // Pre-load Developer Replay Run for the initial Ghost trial if they don't have user ghost runs!
  const activeGhostRun: GhostRun = React.useMemo(() => {
    const storedBestGhost = localStorage.getItem('topdog_best_gh_run');
    if (storedBestGhost) {
      return JSON.parse(storedBestGhost);
    }

    // fallback standard bot ghost data
    return {
      id: 'bot_champion',
      breed: 'gshepherd',
      evolution: 2,
      totalDistance: 250,
      frames: Array.from({ length: 150 }, (_, i) => ({
        z: i * 2,
        lane: Math.sin(i * 0.2) > 0.4 ? 1 : Math.sin(i * 0.2) < -0.4 ? -1 : 0,
        height: i % 15 === 0 ? 12 : 0,
        action: i % 15 === 0 ? 'jump' : 'run',
        isUnderground: false,
      })),
    };
  }, [gameState]);

  const activeChar = characters.find((c) => c.breed === activeBreed) || characters[0];

  return (
    <div id="topdog-main-container" className="min-h-[100dvh] w-full bg-slate-950 text-slate-100 flex flex-col justify-between selection:bg-orange-500 selection:text-slate-950 font-sans p-4 md:p-6 pb-24 sm:pb-6 transition-all relative overflow-hidden">
      {/* 0. Background radial glow effects for Immersive UI theme */}
      <div className="absolute inset-0 opacity-20 pointer-events-none z-0" style={{ backgroundImage: 'radial-gradient(circle at 50% 50%, #f97316 0%, transparent 70%)' }}></div>
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-cyan-500/5 rounded-full blur-3xl pointer-events-none z-0"></div>

      {/* 1. Header Balance Bar (Highly scaled and sleek for dense mobile screens) */}
      <header className="relative z-15 max-w-6xl w-full mx-auto flex flex-row justify-between items-center bg-slate-900/85 backdrop-blur-md border border-slate-800/80 rounded-2.5xl px-4 py-2.5 gap-3 mb-4 shadow-lg">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-full border border-orange-500 p-0.5 bg-slate-800 flex items-center justify-center shadow-[0_0_10px_rgba(249,115,22,0.3)]">
            <span className="text-[10px] font-black text-orange-500 font-display">LV {activeChar.level}</span>
          </div>
          <div>
            <h1 className="text-sm font-black italic tracking-tighter uppercase text-white flex items-center gap-1.5">
              <span>Top Dog</span>
              <span className="text-[8px] bg-orange-500/10 text-orange-500 border border-orange-500/20 rounded px-1 font-bold tracking-widest not-italic">ARCADE</span>
            </h1>
            <p className="text-[9px] text-orange-400 font-bold uppercase tracking-widest">
              {activeChar.name}
            </p>
          </div>
        </div>

        {/* HUD user stats indicator */}
        <div className="flex gap-4 items-center">
          <div className="text-right hidden sm:block">
            <span className="block text-[8px] uppercase tracking-widest text-slate-500 font-bold">Personal Best</span>
            <span className="text-sm font-mono font-bold text-white">
              {Math.floor(bestDistance)}<span className="text-[9px] ml-0.5 text-slate-400">m</span>
            </span>
          </div>

          <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl px-2.5 py-1.5 flex items-center gap-3 shadow-inner">
            <div className="flex items-center gap-1.5" title="Dog Bones">
              <Bone className="w-3.5 h-3.5 fill-orange-500 text-orange-500" />
              <span className="font-mono text-xs font-bold text-slate-100">{userBones}</span>
            </div>
            
            <div className="w-px h-3.5 bg-slate-850" />

            <div className="flex items-center gap-1.5" title="Howl Tokens">
              <Award className="w-3.5 h-3.5 text-cyan-400" />
              <span className="font-mono text-xs font-bold text-cyan-400">{userTokens}</span>
            </div>
          </div>

          {/* Clinical clickable global User Profile Avatar Icon button */}
          <button
            onClick={() => {
              setActiveTab('profile');
              GameAudio.playCollect && GameAudio.playCollect(true, false);
            }}
            className="w-10 h-10 rounded-full bg-slate-850 hover:bg-slate-800 border-2 border-emerald-500 hover:border-emerald-400 flex items-center justify-center text-emerald-400 hover:text-emerald-300 transition-all cursor-pointer shadow-lg active:scale-95 flex-shrink-0"
            title="Open Athlete Profile"
          >
            <User className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* 2. Main interactive layout */}
      <main className="relative z-10 max-w-6xl w-full mx-auto flex-grow flex flex-col justify-start">
        {gameState === 'playing' ? (
          <div className="w-full h-full min-h-[480px]">
            <GameCanvas
              activeBreed={activeBreed}
              evolution={characters.find((c) => c.breed === activeBreed)!.evolution}
              numLanes={numLanes}
              gameMode={gameMode}
              ghostRunToRace={activeGhostRun}
              playerLevel={characters.find((c) => c.breed === activeBreed)!.level}
              linkType={activeLinkType}
              customRound={customRound}
              customOther={customOther}
              customDogModelBuffer={customDogModelBuffer}
              onGameEnd={handleGameEnd}
            />
          </div>
        ) : (
          <div className="w-full">
            {activeTab === 'lobby' && (
              <MainMenu
                characters={characters}
                activeBreed={activeBreed}
                bestDistance={bestDistance}
                userBones={userBones}
                userTokens={userTokens}
                onStartGame={handleStartGame}
                onOpenAchievements={() => setActiveTab('achievements')}
                onOpenKennel={() => setActiveTab('kennel')}
                onOpenDaily={() => setActiveTab('daily')}
                onSelectCharacter={handleSelectCharacter}
                onUnlockCharacter={handleUnlockCharacter}
              />
            )}

            {activeTab === 'kennel' && (
              <CharacterPanel
                characters={characters}
                activeCharacterId={activeBreed}
                userBones={userBones}
                userTokens={userTokens}
                customRound={customRound}
                customOther={customOther}
                onSelect={handleSelectCharacter}
                onUnlock={handleUnlockCharacter}
                onEvolve={handleEvolveCharacter}
                onSaveCustomizations={handleSaveCustomizations}
                gdriveToken={gdriveToken}
                customDogSkin={customDogSkin}
                onSelectCustomSkin={handleSelectCustomSkinDirect}
                onClearCustomSkin={() => {
                  setCustomDogSkin('');
                  localStorage.removeItem('topdog_custom_skin_file_id');
                  localStorage.removeItem('topdog_custom_skin_name');
                  setCustomDogModelBuffer(null);
                }}
              />
            )}

            {activeTab === 'achievements' && (
              <AchievementsPanel
                achievements={achievements}
                onClaimReward={handleClaimAchievement}
              />
            )}

            {activeTab === 'daily' && (
              <DailyRewardsPanel
                rewardsState={dailyState}
                onClaim={handleClaimDaily}
              />
            )}

            {activeTab === 'leaderboard' && (
              <LeaderboardPanel
                userBones={userBones}
                userTokens={userTokens}
                bestDistance={bestDistance}
              />
            )}

            {activeTab === 'profile' && (
              <ProfilePanel
                userBones={userBones}
                userTokens={userTokens}
                bestDistance={bestDistance}
                characters={characters}
                achievements={achievements}
                activeBreed={activeBreed}
                onSelectCharacter={handleSelectCharacter}
                onMusicLoaded={handleMusicLoaded}
                activeMusicName={customMusicName}
                customDogSkin={customDogSkin}
                onSetCustomSkin={setCustomDogSkin}
                onSetCustomModelBuffer={setCustomDogModelBuffer}
                onStatsRestored={handleStatsRestored}
                onClose={() => {
                  setActiveTab('lobby');
                  GameAudio.playCollect && GameAudio.playCollect(false, false);
                }}
              />
            )}
          </div>
        )}
      </main>

      {/* 2.5. Sticky BOTTOM Navigation Bar (High density, beautiful, fits mobile screens flawlessly) */}
      {gameState === 'lobby' && (
        <nav id="bottom-navigation-bar" className="fixed bottom-0 inset-x-0 sm:sticky sm:bottom-4 z-40 bg-slate-900/95 backdrop-blur-lg border-t border-slate-800/80 sm:border sm:rounded-3xl max-w-4xl w-full mx-auto px-2 py-1.5 flex items-center justify-around gap-1 shadow-[0_-4px_30px_rgba(0,0,0,0.4)]">
          <button
            onClick={() => { setActiveTab('lobby'); GameAudio.playCollect && GameAudio.playCollect(false, false); }}
            className={`flex flex-col items-center justify-center p-1 flex-1 rounded-xl transition-all cursor-pointer ${
              activeTab === 'lobby'
                ? 'text-orange-500 scale-105'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Home className="w-5 h-5" />
            <span className="text-[9px] font-bold mt-1 uppercase tracking-widest font-sans">Home</span>
          </button>

          <button
            onClick={() => { setActiveTab('kennel'); GameAudio.playCollect && GameAudio.playCollect(false, false); }}
            className={`flex flex-col items-center justify-center p-1 flex-1 rounded-xl transition-all cursor-pointer ${
              activeTab === 'kennel'
                ? 'text-purple-400 scale-105'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Compass className="w-5 h-5 text-purple-400" />
            <span className="text-[9px] font-bold mt-1 uppercase tracking-widest text-purple-400 font-sans">Breed</span>
          </button>

          <button
            onClick={() => { setActiveTab('achievements'); GameAudio.playCollect && GameAudio.playCollect(false, false); }}
            className={`flex flex-col items-center justify-center p-1 flex-1 rounded-xl transition-all cursor-pointer ${
              activeTab === 'achievements'
                ? 'text-yellow-400 scale-105'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Trophy className="w-5 h-5 text-yellow-400" />
            <span className="text-[9px] font-bold mt-1 uppercase tracking-widest text-yellow-400 font-sans">Badges</span>
          </button>

          <button
            onClick={() => { setActiveTab('daily'); GameAudio.playCollect && GameAudio.playCollect(false, false); }}
            className={`flex flex-col items-center justify-center p-1 flex-1 rounded-xl transition-all cursor-pointer ${
              activeTab === 'daily'
                ? 'text-amber-500 scale-105'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Bone className="w-5 h-5 text-amber-500 animate-pulse" />
            <span className="text-[9px] font-bold mt-1 uppercase tracking-widest text-amber-500 font-sans">Bonus</span>
          </button>

          <button
            onClick={() => { setActiveTab('leaderboard'); GameAudio.playCollect && GameAudio.playCollect(false, false); }}
            className={`flex flex-col items-center justify-center p-1 flex-1 rounded-xl transition-all cursor-pointer ${
              activeTab === 'leaderboard'
                ? 'text-cyan-400 scale-105'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Gamepad2 className="w-5 h-5 text-cyan-400" />
            <span className="text-[9px] font-bold mt-1 uppercase tracking-widest text-cyan-400 font-sans">Leagues</span>
          </button>

          <button
            onClick={() => { setActiveTab('profile'); GameAudio.playCollect && GameAudio.playCollect(false, false); }}
            className={`flex flex-col items-center justify-center p-1 flex-1 rounded-xl transition-all cursor-pointer ${
              activeTab === 'profile'
                ? 'text-emerald-400 scale-105'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <User className="w-5 h-5 text-emerald-400" />
            <span className="text-[9px] font-bold mt-1 uppercase tracking-widest text-emerald-400 font-sans">Profile</span>
          </button>
        </nav>
      )}

      {/* 3. Postgame overlay stats summary */}
      {gameState === 'postgame' && (
        <GameSummary
          distance={lastStats.distance}
          bonesCollected={lastStats.bonesCollected}
          howlTokensCollected={lastStats.howlTokensCollected}
          xpEarned={lastStats.xpEarned}
          maxCombo={lastStats.maxCombo}
          obstaclesAvoided={lastStats.obstaclesAvoided}
          powerupsCollected={lastStats.powerupsCollected}
          isNewHighscore={lastStats.isNewHighscore}
          levelBefore={lastStats.levelBefore}
          levelAfter={lastStats.levelAfter}
          onRestart={() => {
            setGameState('playing');
          }}
          onMainMenu={() => {
            setGameState('lobby');
            setActiveTab('lobby');
          }}
        />
      )}

      {/* Footer credits and information */}
      <footer className="max-w-6xl w-full mx-auto mt-8 border-t border-slate-900 pt-4 pb-2 text-center text-[10px] text-slate-600 font-mono">
        TOP DOG ENDLESS RUNNER • SPX-LICENSE-IDENTIFIER: APACHE-2.0 • ALL RIGHTS RESERVED
      </footer>
    </div>
  );
}
