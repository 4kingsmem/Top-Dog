/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Bone, Trophy, Users, Shield, Award, CheckCircle2, Star, Zap, Eye, Crosshair } from 'lucide-react';
import { GameAudio } from '../utils/audio';

interface LeaderboardPanelProps {
  userBones: number;
  userTokens: number;
  bestDistance: number;
}

// 1. Definition of the 10 related progressive tiers
export interface TierDef {
  level: number;
  name: string;
  minTrophies: number;
  color: string;
  glowColor: string;
  bonusMultiplier: string;
}

export const LEAGUE_TIERS: TierDef[] = [
  { level: 1, name: 'Wooden Training Paw', minTrophies: 0, color: '#b45309', glowColor: 'rgba(180, 83, 9, 0.2)', bonusMultiplier: '1.0x Base Bones' },
  { level: 2, name: 'Clay Park Paw', minTrophies: 100, color: '#ea580c', glowColor: 'rgba(234, 88, 12, 0.25)', bonusMultiplier: '1.1x Bones Boost' },
  { level: 3, name: 'Iron Arena Paw', minTrophies: 250, color: '#64748b', glowColor: 'rgba(100, 116, 139, 0.3)', bonusMultiplier: '1.2x Bones Boost' },
  { level: 4, name: 'Bronze Runner Paw', minTrophies: 450, color: '#ca8a04', glowColor: 'rgba(202, 138, 4, 0.35)', bonusMultiplier: '1.3x Bones Boost' },
  { level: 5, name: 'Silver Champion Paw', minTrophies: 700, color: '#cbd5e1', glowColor: 'rgba(203, 213, 225, 0.4)', bonusMultiplier: '1.5x Combo Gain' },
  { level: 6, name: 'Gold Medalist Paw', minTrophies: 1000, color: '#fbbf24', glowColor: 'rgba(251, 191, 36, 0.5)', bonusMultiplier: '1.7x Combo Gain' },
  { level: 7, name: 'Emerald Agility Paw', minTrophies: 1500, color: '#10b981', glowColor: 'rgba(16, 185, 129, 0.6)', bonusMultiplier: '2.0x Combo Gain' },
  { level: 8, name: 'Ruby Hurricane Paw', minTrophies: 2200, color: '#f43f5e', glowColor: 'rgba(244, 63, 94, 0.7)', bonusMultiplier: '2.5x Score Multiplier' },
  { level: 9, name: 'Diamond Apex Paw', minTrophies: 3000, color: '#06b6d4', glowColor: 'rgba(6, 182, 212, 0.8)', bonusMultiplier: '3.0x Score Multiplier' },
  { level: 10, name: 'Celestial Alpha-Paw', minTrophies: 4000, color: '#a855f7', glowColor: 'rgba(168, 85, 247, 0.95)', bonusMultiplier: '5.0x Supreme Ultimate Boost' },
];

// Helper component to render the beautiful high-quality related SVG symbols!
export const TierSymbol: React.FC<{ level: number; size?: number; className?: string }> = ({ level, size = 64, className = "" }) => {
  const tier = LEAGUE_TIERS.find(t => t.level === level) || LEAGUE_TIERS[0];
  
  // Custom definitions for wings, stars, shields based on related progression level
  return (
    <svg 
      width={size} 
      height={size} 
      viewBox="0 0 100 100" 
      className={`select-none filter drop-shadow-[0_4px_6px_rgba(0,0,0,0.5)] ${className}`}
    >
      <defs>
        {/* Gradients matching materials */}
        <linearGradient id={`grad-tier-${level}`} x1="0%" y1="0%" x2="100%" y2="100%">
          {level === 1 && <><stop offset="0%" stopColor="#78350f" /><stop offset="100%" stopColor="#b45309" /></>}
          {level === 2 && <><stop offset="0%" stopColor="#9a3412" /><stop offset="100%" stopColor="#ea580c" /></>}
          {level === 3 && <><stop offset="0%" stopColor="#475569" /><stop offset="100%" stopColor="#94a3b8" /></>}
          {level === 4 && <><stop offset="0%" stopColor="#854d0e" /><stop offset="100%" stopColor="#eab308" /></>}
          {level === 5 && <><stop offset="0%" stopColor="#94a3b8" /><stop offset="100%" stopColor="#f1f5f9" /></>}
          {level === 6 && <><stop offset="0%" stopColor="#b45309" /><stop offset="50%" stopColor="#fbbf24" /><stop offset="100%" stopColor="#fef08a" /></>}
          {level === 7 && <><stop offset="0%" stopColor="#047857" /><stop offset="50%" stopColor="#10b981" /><stop offset="100%" stopColor="#a7f3d0" /></>}
          {level === 8 && <><stop offset="0%" stopColor="#9f1239" /><stop offset="50%" stopColor="#f43f5e" /><stop offset="100%" stopColor="#fecdd3" /></>}
          {level === 9 && <><stop offset="0%" stopColor="#0e7490" /><stop offset="50%" stopColor="#06b6d4" /><stop offset="100%" stopColor="#cffafe" /></>}
          {level === 10 && <><stop offset="0%" stopColor="#6b21a8" /><stop offset="50%" stopColor="#a855f7" /><stop offset="100%" stopColor="#f3e8ff" /></>}
        </linearGradient>
      </defs>

      {/* BACKGROUND SHIELD/RING FRAME (More detailed as level rises) */}
      {level >= 3 && (
        <polygon 
          points="50,5 90,25 90,75 50,95 10,75 10,25" 
          fill="none" 
          stroke={tier.color} 
          strokeWidth={level >= 7 ? "4" : "2"} 
          opacity="0.8"
        />
      )}

      {/* PROGRESSIVE Related Side Wings */}
      {level >= 5 && (
        <g opacity="0.95">
          {/* Left Wing */}
          <path 
            d="M 28,50 Q 8,40 5,25 Q 12,32 25,48 Q 5,42 12,55 Q 22,50 28,53 Q 10,58 18,68 Q 26,58 30,55" 
            fill={`url(#grad-tier-${level})`} 
            stroke="#000" 
            strokeWidth="1.5" 
          />
          {/* Right Wing */}
          <path 
            d="M 72,50 Q 92,40 95,25 Q 88,32 75,48 Q 95,42 88,55 Q 78,50 72,53 Q 90,58 82,68 Q 74,58 70,55" 
            fill={`url(#grad-tier-${level})`} 
            stroke="#000" 
            strokeWidth="1.5" 
          />
        </g>
      )}

      {/* Double Divine Wings for Celestial and Apex levels */}
      {level >= 9 && (
        <g opacity="0.85" transform="scale(1.2) translate(-8, -8)" className="origin-center">
          {/* Secondary smaller wings */}
          <path d="M 25,58 Q 5,55 2,42 Q 10,48 23,56" fill="#fff" stroke={tier.color} strokeWidth="1" />
          <path d="M 75,58 Q 95,55 98,42 Q 90,48 77,56" fill="#fff" stroke={tier.color} strokeWidth="1" />
        </g>
      )}

      {/* MAIN MATERIAL MEDALLION OR SHIELD */}
      <circle cx="50" cy="50" r="28" fill={`url(#grad-tier-${level})`} stroke="#1e293b" strokeWidth="2.5" />

      {/* Golden or metal inner borders for extra premium finish */}
      {level >= 4 && (
        <circle cx="50" cy="50" r="23" fill="none" stroke={level >= 6 ? "#fef08a" : "#cbd5e1"} strokeWidth="1.5" opacity="0.6" />
      )}

      {/* THE INNER CORE SYMBOL: Every single level has the iconic Agility dog paw 🐾 to prove they belong to the same family! */}
      <g transform="translate(35, 34) scale(0.6)" fill={level >= 6 ? "#0f172a" : "#ffffff"}>
        {/* Main pad */}
        <path d="M25,45 C35,42 39,42 41,45 C46,51 46,57 41,61 C34,67 16,67 9,61 C4,57 4,51 9,45 C11,42 15,42 25,45 Z" />
        {/* 4 Toes */}
        <circle cx="10" cy="27" r="7.5" />
        <circle cx="23" cy="18" r="8" />
        <circle cx="39" cy="20" r="8" />
        <circle cx="49" cy="31" r="7.5" />
      </g>

      {/* PROGRESS FLOURISHES (Stars, crowns, halos based on progress status) */}
      {level === 10 && (
        <>
          {/* Halo ring */}
          <ellipse cx="50" cy="16" rx="20" ry="5" fill="none" stroke="#fbbf24" strokeWidth="2.5" className="animate-pulse" />
          {/* Triple crown points */}
          <polygon points="40,24 50,12 60,24" fill="#fbbf24" stroke="#000" strokeWidth="1" />
          <circle cx="40" cy="24" r="1.5" fill="#fff" />
          <circle cx="50" cy="12" r="1.5" fill="#fff" />
          <circle cx="60" cy="24" r="1.5" fill="#fff" />
        </>
      )}

      {level === 9 && (
        <polygon points="50,12 53,20 62,20 55,25 57,33 50,28 43,33 45,25 38,20 47,20" fill="#22d3ee" stroke="#000" strokeWidth="1" />
      )}

      {level === 8 && (
        <g fill="#ec4899">
          <circle cx="30" cy="16" r="3" />
          <circle cx="50" cy="12" r="3.5" />
          <circle cx="70" cy="16" r="3" />
        </g>
      )}

      {level === 7 && (
        <circle cx="50" cy="14" r="4.5" fill="#10b981" stroke="#fff" strokeWidth="1" />
      )}

      {level === 6 && (
        <circle cx="50" cy="15" r="3.5" fill="#f59e0b" />
      )}
    </svg>
  );
};

// Simulated high scores global runners
const INITIAL_LEADERBOARD_RUNNERS = [
  { rank: 1, name: 'SlayerRex 🐾', clanName: 'Golden Retrievers', level: 68, trophies: 4890, activeBreed: 'gshepherd' },
  { rank: 2, name: 'BonesMuncher', clanName: 'Speed Demons', level: 45, trophies: 3670, activeBreed: 'bulldog' },
  { rank: 3, name: 'TailsPaws', clanName: 'Pawsome Pack', level: 52, trophies: 3210, activeBreed: 'corgi' },
  { rank: 4, name: 'ChihuahuahPower', clanName: 'Nacho Alliance', level: 31, trophies: 2315, activeBreed: 'chihuahua' },
  { rank: 5, name: 'FastDachshund', clanName: 'Golden Retrievers', level: 29, trophies: 1680, activeBreed: 'dachshund' },
  { rank: 6, name: 'CyberWoof', clanName: '', level: 24, trophies: 1210, activeBreed: 'gshepherd' },
  { rank: 7, name: 'AlphaTrainer_99', clanName: 'Speed Demons', level: 18, trophies: 850, activeBreed: 'corgi' },
  { rank: 8, name: 'BiscuitHunter', clanName: 'Pawsome Pack', level: 12, trophies: 550, activeBreed: 'bulldog' },
  { rank: 9, name: 'PippinSprint', clanName: '', level: 10, trophies: 310, activeBreed: 'corgi' },
];

const INITIAL_CLANS_LIST = [
  { id: 'clan-1', name: 'Golden Retrievers', tag: 'GOLD', description: 'Elite runners chasing the shining gold trophy! Open for active players only.', members: 48, trophies: 12450, bannerColor: '#f59e0b', requireLevel: 10 },
  { id: 'clan-2', name: 'Speed Demons', tag: 'DEMO', description: 'Blazing speed over hurdles. We hold the underground nitro records!', members: 32, trophies: 9810, bannerColor: '#ef4444', requireLevel: 15 },
  { id: 'clan-3', name: 'Pawsome Pack', tag: 'PAWS', description: 'A cozy sanctuary for corgis, dachshunds, and chihuahua enthusiasts! Let us dig high combos.', members: 25, trophies: 5410, bannerColor: '#10b981', requireLevel: 1 },
  { id: 'clan-4', name: 'Nacho Alliance', tag: 'TACO', description: 'Spicy little chihuahua runners of the West Turf park! 🌮🐾', members: 19, trophies: 3210, bannerColor: '#ac94fa', requireLevel: 5 },
];

export const LeaderboardPanel: React.FC<LeaderboardPanelProps> = ({
  userBones,
  userTokens,
  bestDistance,
}) => {
  const [activeTab, setActiveTab] = useState<'players' | 'clans' | 'tiers'>('players');
  
  // Clans state
  const [clanList, setClanList] = useState<typeof INITIAL_CLANS_LIST>(INITIAL_CLANS_LIST);
  const [userClan, setUserClan] = useState<string>(''); // empty string means none
  const [clanSearch, setClanSearch] = useState<string>('');
  
  // Custom clan builder
  const [isCreatingClan, setIsCreatingClan] = useState(false);
  const [newClanName, setNewClanName] = useState('');
  const [newClanTag, setNewClanTag] = useState('');
  const [newClanDesc, setNewClanDesc] = useState('');
  const [newClanColor, setNewClanColor] = useState('#fbbf24');
  const [newClanReqLevel, setNewClanReqLevel] = useState(1);

  // Dynamic user trophies
  // 1 trophy is earned for each full meter of personal best run distance!
  const userTrophies = Math.floor(bestDistance);
  
  // Compute user tier level
  const userTier = LEAGUE_TIERS.slice().reverse().find(t => userTrophies >= t.minTrophies) || LEAGUE_TIERS[0];

  // Persist Clan Affiliation localState
  useEffect(() => {
    const savedClan = localStorage.getItem('topdog_user_clan');
    if (savedClan) {
      setUserClan(savedClan);
    }
    const savedClansList = localStorage.getItem('topdog_clans_list');
    if (savedClansList) {
      setClanList(JSON.parse(savedClansList));
    }
  }, []);

  // Update dynamic user row inside runners list
  const runnersList = React.useMemo(() => {
    const userRow = {
      rank: 0, // Assigned below
      name: 'You (Champion) ',
      clanName: userClan || 'No Clan',
      level: 12, // Default estimated level
      trophies: userTrophies,
      activeBreed: 'corgi' as const,
      isUser: true,
    };

    const combined = [...INITIAL_LEADERBOARD_RUNNERS, userRow];
    combined.sort((a, b) => b.trophies - a.trophies);
    
    // Assign ranks
    return combined.map((runner, index) => ({
      ...runner,
      rank: index + 1,
    }));
  }, [userTrophies, userClan]);

  const handleJoinClan = (clanName: string) => {
    setUserClan(clanName);
    localStorage.setItem('topdog_user_clan', clanName);
    GameAudio.playCollect && GameAudio.playCollect(true, false);
  };

  const handleLeaveClan = () => {
    setUserClan('');
    localStorage.removeItem('topdog_user_clan');
    GameAudio.playCrash && GameAudio.playCrash();
  };

  const handleCreateClan = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClanName.trim() || !newClanTag.trim()) return;

    const created = {
      id: `clan-custom-${Date.now()}`,
      name: newClanName,
      tag: newClanTag.toUpperCase().slice(0, 4),
      description: newClanDesc || 'Our custom training turf academy.',
      members: 1, // Only you
      trophies: userTrophies,
      bannerColor: newClanColor,
      requireLevel: newClanReqLevel,
    };

    const updatedList = [created, ...clanList];
    setClanList(updatedList);
    localStorage.setItem('topdog_clans_list', JSON.stringify(updatedList));

    setUserClan(newClanName);
    localStorage.setItem('topdog_user_clan', newClanName);

    // Reset fields
    setNewClanName('');
    setNewClanTag('');
    setNewClanDesc('');
    setIsCreatingClan(false);
    GameAudio.playLevelUp && GameAudio.playLevelUp();
  };

  const filteredClans = clanList.filter(c => 
    c.name.toLowerCase().includes(clanSearch.toLowerCase()) || 
    c.tag.toLowerCase().includes(clanSearch.toLowerCase())
  );

  return (
    <div id="leaderboard-panel-co-clan" className="relative bg-slate-900/90 backdrop-blur-md border-2 border-slate-850 rounded-[2.5rem] p-5 sm:p-7 shadow-[0_15px_40px_rgba(0,0,0,0.6)] text-slate-100 font-sans max-w-4xl mx-auto flex flex-col gap-6">
      
      {/* HEADER SECTION WITH CLASH OF CLANS WOOD & METAL TEXTURE */}
      <div className="flex flex-col md:flex-row justify-between items-center bg-slate-950/80 border border-slate-800 rounded-3xl p-5 mb-1 gap-4 shadow-inner">
        <div className="flex items-center gap-4.5">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-b from-amber-400 to-amber-600 flex items-center justify-center border-2 border-amber-300 shadow-[0_0_15px_rgba(251,191,36,0.25)]">
            <Trophy className="w-10 h-10 text-slate-950 fill-slate-950/20" />
          </div>
          <div>
            <h2 className="text-2xl sm:text-3xl font-display font-black tracking-tighter uppercase italic text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-yellow-300 to-orange-500">
              League Alliances & Clans
            </h2>
            <p className="text-xs text-slate-400 font-bold tracking-wider mt-0.5 uppercase flex items-center gap-1.5">
              <span>ACTIVE SEASON CONTENDER</span>
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping"></span>
            </p>
          </div>
        </div>

        {/* CONTENDER CARD PREVIEW */}
        <div className="flex items-center gap-4.5 bg-slate-900 border border-slate-800 px-5 py-3 rounded-2xl w-full md:w-auto">
          <TierSymbol level={userTier.level} size={50} />
          <div>
            <span className="block text-[10px] uppercase font-bold text-slate-500 tracking-wider">CURRENT DIVISION ({userTier.level}/10)</span>
            <span className="block text-sm font-black text-amber-400 leading-none mt-0.5">{userTier.name}</span>
            <span className="text-xs font-mono text-slate-300 font-semibold flex items-center gap-1 mt-1">
              ⭐ <span className="text-yellow-400 text-sm font-bold">{userTrophies}</span> Trophies
            </span>
          </div>
        </div>
      </div>

      {/* CLASH OF CLANS 3-TABS CONTROL DECK */}
      <div className="flex bg-slate-950/80 border border-slate-800 p-1.5 rounded-2xl">
        <button
          onClick={() => { setActiveTab('players'); GameAudio.playCollect && GameAudio.playCollect(false, false); }}
          className={`flex-1 py-3 px-2 rounded-xl text-xs sm:text-sm font-display font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 ${
            activeTab === 'players'
              ? 'bg-gradient-to-r from-orange-500 via-amber-500 to-yellow-500 text-slate-950 shadow-[0_0_15px_rgba(249,115,22,0.3)]'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/30'
          }`}
        >
          <Trophy className="w-4 h-4 fill-current" />
          <span>Top Players</span>
        </button>

        <button
          onClick={() => { setActiveTab('clans'); GameAudio.playCollect && GameAudio.playCollect(false, false); }}
          className={`flex-1 py-3 px-2 rounded-xl text-xs sm:text-sm font-display font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 ${
            activeTab === 'clans'
              ? 'bg-gradient-to-r from-orange-500 via-amber-500 to-yellow-500 text-slate-950 shadow-[0_0_15px_rgba(249,115,22,0.3)]'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/30'
          }`}
        >
          <Users className="w-4 h-4 fill-current" />
          <span>Top Clans</span>
        </button>

        <button
          onClick={() => { setActiveTab('tiers'); GameAudio.playCollect && GameAudio.playCollect(false, false); }}
          className={`flex-1 py-3 px-2 rounded-xl text-xs sm:text-sm font-display font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 ${
            activeTab === 'tiers'
              ? 'bg-gradient-to-r from-orange-500 via-amber-500 to-yellow-500 text-slate-950 shadow-[0_0_15px_rgba(249,115,22,0.3)]'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/30'
          }`}
        >
          <Award className="w-4 h-4 fill-current" />
          <span>Division Tiers</span>
        </button>
      </div>

      {/* TAB SUB-VIEWS PANEL */}
      <div className="bg-slate-950/40 border border-slate-900 rounded-[2rem] p-4 sm:p-6 min-h-[360px] flex flex-col justify-start">
        
        {/* -- TAB 1: TOP PLAYERS SCOREBOARD -- */}
        {activeTab === 'players' && (
          <div className="flex flex-col gap-4">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3 text-xs uppercase font-bold text-slate-500 tracking-wider">
              <span>Runner CONTENDERS</span>
              <span>TROPHIES</span>
            </div>

            <div className="flex flex-col gap-2 max-h-[380px] overflow-y-auto pr-1">
              {runnersList.map((runner) => {
                const isUser = runner.isUser;
                const runnerTierLevel = LEAGUE_TIERS.slice().reverse().find(t => runner.trophies >= t.minTrophies)?.level || 1;
                
                return (
                  <div
                    key={`${runner.name}-${runner.rank}`}
                    className={`flex items-center justify-between px-4 py-3 rounded-2xl border transition-all ${
                      isUser
                        ? 'bg-amber-500/10 border-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.1)]'
                        : 'bg-slate-900/50 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      {/* Rank Indicator */}
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center font-display font-black text-sm italic ${
                        runner.rank === 1 ? 'bg-yellow-400 text-slate-900' :
                        runner.rank === 2 ? 'bg-slate-300 text-slate-900' :
                        runner.rank === 3 ? 'bg-amber-600 text-white' : 'text-slate-400'
                      }`}>
                        #{runner.rank}
                      </div>

                      {/* Small Division Symbol */}
                      <TierSymbol level={runnerTierLevel} size={30} />

                      {/* Runner info */}
                      <div>
                        <div className="flex items-center gap-2">
                          <span className={`font-bold text-sm sm:text-base ${isUser ? 'text-amber-400 font-extrabold' : 'text-white'}`}>
                            {runner.name}
                          </span>
                          <span className="text-[10px] bg-slate-800 text-slate-400 border border-slate-700 rounded px-1.5 font-mono font-bold">
                            LV {runner.level}
                          </span>
                        </div>
                        {runner.clanName && (
                          <span className="text-xs text-sky-400 font-display font-bold flex items-center gap-1 mt-0.5">
                            <Shield className="w-3 h-3 fill-sky-400/20" /> {runner.clanName}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Trophy Score */}
                    <div className="flex items-center gap-1 px-3 py-1.5 bg-slate-950 border border-slate-850 rounded-xl font-mono text-sm font-black text-amber-400">
                      <span>🏆</span>
                      <span>{runner.trophies}</span>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="text-center text-[10px] text-slate-500 font-mono mt-4">
              ✨ TROPHY SCORES REFLECT YOUR HIGHEST EVER RACED PERSPECTIVE METERS IN SINGLE SESSION AGILITY RUNS.
            </div>
          </div>
        )}

        {/* -- TAB 2: TOP CLANS / ALLIANCE HUB -- */}
        {activeTab === 'clans' && (
          <div className="flex flex-col gap-5">
            
            {/* User current clan banner */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4.5 flex flex-col sm:flex-row justify-between items-center gap-4 shadow">
              <div className="flex items-center gap-4">
                <div className="w-11 h-11 rounded-full bg-sky-950 border border-sky-500 flex items-center justify-center">
                  <Shield className="w-6 h-6 text-sky-400 fill-sky-400/10" />
                </div>
                <div>
                  <span className="text-[9px] uppercase font-bold text-slate-500 block leading-tight">Your active alliance</span>
                  <span className="text-base font-black text-white">
                    {userClan ? `${userClan} Alliance` : 'Unregistered Lone Contender'}
                  </span>
                </div>
              </div>

              {userClan ? (
                <button
                  onClick={handleLeaveClan}
                  className="px-5 py-1.5 bg-rose-500/15 border border-rose-500/30 text-rose-400 rounded-xl hover:bg-rose-500 hover:text-slate-950 hover:font-bold transition-all text-xs font-semibold cursor-pointer"
                >
                  🚪 Leave Clan
                </button>
              ) : (
                <button
                  onClick={() => setIsCreatingClan(true)}
                  className="px-5 py-2 bg-gradient-to-r from-sky-400 to-sky-600 text-white font-display font-black rounded-xl border-b-4 border-sky-800 hover:scale-105 active:scale-95 transition-all text-xs uppercase tracking-wide cursor-pointer flex items-center gap-1.5"
                >
                  <Users className="w-4 h-4 fill-white/10" />
                  <span>Create Clan</span>
                </button>
              )}
            </div>

            {/* CREATE CLAN DIALOG MODAL LAYOUT */}
            {isCreatingClan && (
              <form onSubmit={handleCreateClan} className="bg-slate-950 border-2 border-sky-500 p-5 rounded-2xl flex flex-col gap-4 shadow-lg animate-fadeIn">
                <h3 className="text-base font-display font-black uppercase text-sky-400 flex items-center justify-between border-b border-slate-800 pb-2">
                  <span>🛠️ REGISTER CUSTOM TURF CLAN</span>
                  <button 
                    type="button" 
                    onClick={() => setIsCreatingClan(false)} 
                    className="text-slate-500 hover:text-white"
                  >
                    ✕
                  </button>
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">CLAN NAME *</label>
                    <input
                      type="text"
                      maxLength={18}
                      placeholder="e.g. Corgi Express"
                      value={newClanName}
                      onChange={(e) => setNewClanName(e.target.value)}
                      required
                      className="w-full bg-slate-900 border border-slate-800 focus:border-sky-500 outline-none rounded-xl px-4 py-2 text-sm text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">CLAN TAG (4 CHARS) *</label>
                    <input
                      type="text"
                      maxLength={4}
                      placeholder="e.g. CORE"
                      value={newClanTag}
                      onChange={(e) => setNewClanTag(e.target.value)}
                      required
                      className="w-full bg-slate-900 border border-slate-800 focus:border-sky-500 outline-none rounded-xl px-4 py-2 text-sm text-white"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">DESCRIPTION</label>
                    <textarea
                      placeholder="Outline your companion synergy rules..."
                      value={newClanDesc}
                      onChange={(e) => setNewClanDesc(e.target.value)}
                      rows={2}
                      className="w-full bg-slate-900 border border-slate-800 focus:border-sky-500 outline-none rounded-xl px-4 py-2 text-sm text-white resize-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">BANNER THEME COLOR</label>
                    <select
                      value={newClanColor}
                      onChange={(e) => setNewClanColor(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 outline-none rounded-xl p-2.5 text-sm text-white font-semibold"
                    >
                      <option value="#f59e0b">💛 Golden Honey</option>
                      <option value="#ef4444">❤️ Speed Ruby</option>
                      <option value="#10b981">💚 Emerald Park</option>
                      <option value="#3b82f6">💙 Royal Cobalt</option>
                      <option value="#a855f7">💜 Twilight Cosmic</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">REQUIRED MIN LEVEL TO JOIN</label>
                    <input
                      type="number"
                      min={1}
                      max={100}
                      value={newClanReqLevel}
                      onChange={(e) => setNewClanReqLevel(parseInt(e.target.value) || 1)}
                      className="w-full bg-slate-900 border border-slate-800 outline-none rounded-xl px-4 py-2 text-sm text-white font-mono"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-3.5 mt-3 border-t border-slate-900 pt-3">
                  <button
                    type="button"
                    onClick={() => setIsCreatingClan(false)}
                    className="px-4 py-2 rounded-xl border border-slate-800 text-slate-400 hover:text-white transition-all text-xs"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2 bg-gradient-to-r from-emerald-400 to-emerald-600 text-slate-950 font-display font-black uppercase text-xs rounded-xl border-b-4 border-emerald-800"
                  >
                    Establish Clan
                  </button>
                </div>
              </form>
            )}

            {/* Clans browse search input bar */}
            <div className="relative">
              <input
                type="text"
                placeholder="Search dog runner clans by name or tag..."
                value={clanSearch}
                onChange={(e) => setClanSearch(e.target.value)}
                className="w-full bg-slate-950/80 border border-slate-800 focus:border-amber-500 outline-none rounded-2xl pl-11 pr-4 py-3 text-sm text-slate-100 placeholder:text-slate-500"
              />
              <span className="absolute left-4 top-3.5 text-slate-500">🔍</span>
            </div>

            {/* List and Join cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredClans.map((clan) => {
                const isActive = userClan === clan.name;
                
                return (
                  <div
                    key={clan.id}
                    className={`bg-slate-900/40 border-[1.5px] rounded-3xl p-4.5 flex flex-col justify-between gap-4 transition-all relative overflow-hidden ${
                      isActive ? 'border-sky-500 bg-sky-950/5' : 'border-slate-800 hover:border-slate-750'
                    }`}
                  >
                    {/* Color Banner side ribbon */}
                    <div className="absolute top-0 left-0 w-2 h-full" style={{ backgroundColor: clan.bannerColor }} />

                    <div className="pl-3.5">
                      <div className="flex items-center gap-2">
                        <span className="font-display font-black text-sm uppercase text-slate-100">
                          {clan.name}
                        </span>
                        <span className="text-[9px] font-mono font-bold bg-slate-800 text-slate-400 rounded px-1.5 py-0.5 border border-slate-705">
                          #{clan.tag}
                        </span>
                      </div>

                      <p className="text-xs text-slate-400 mt-1.5 leading-relaxed min-h-[40px]">
                        {clan.description}
                      </p>

                      <div className="grid grid-cols-3 gap-2 border-t border-slate-900 pt-3 mt-3 text-[10px] text-slate-400 font-mono">
                        <div>
                          <span className="block text-[8px] text-slate-500 uppercase">MEMBERS</span>
                          <span className="font-bold text-slate-200">{clan.members}/50</span>
                        </div>
                        <div>
                          <span className="block text-[8px] text-slate-500 uppercase">TIER ACCUM</span>
                          <span className="font-bold text-yellow-500 flex items-center gap-0.5">🏆 {clan.trophies}</span>
                        </div>
                        <div>
                          <span className="block text-[8px] text-slate-500 uppercase">MIN REQ LVL</span>
                          <span className="font-bold text-slate-200">LV {clan.requireLevel}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-2.5 pl-3.5 pt-2 border-t border-slate-900/50">
                      {isActive ? (
                        <div className="w-full text-center py-2 px-3 bg-sky-500/10 border border-sky-500/30 text-sky-400 rounded-xl text-xs font-bold uppercase flex items-center justify-center gap-1.5">
                          <CheckCircle2 className="w-4 h-4" />
                          <span>Active Member</span>
                        </div>
                      ) : (
                        <button
                          onClick={() => handleJoinClan(clan.name)}
                          disabled={userClan !== ''}
                          className={`w-full py-2 px-3 rounded-xl text-xs font-display font-black uppercase text-center cursor-pointer transition-all ${
                            userClan !== ''
                              ? 'bg-slate-900 text-slate-600 border border-slate-850 cursor-not-allowed'
                              : 'bg-slate-900 border border-slate-850 text-slate-300 hover:border-slate-700 hover:bg-slate-850'
                          }`}
                        >
                          {userClan !== '' ? 'Leave active first' : 'Request to Join'}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* -- TAB 3: MY LEAGUES / ALL 10 TIERS LIST -- */}
        {activeTab === 'tiers' && (
          <div className="flex flex-col gap-6">
            <div className="text-center bg-slate-900/50 border border-slate-800 rounded-2xl p-4">
              <h3 className="text-sm font-display font-extrabold uppercase text-amber-400">AGILITY PRO-LEAGUE DIVISION SCHEMES</h3>
              <p className="text-xs text-slate-400 max-w-lg mx-auto mt-1 leading-relaxed">
                Run further distances in any single game session to compile personal best trophies. Reach next levels to activate powerful continuous multipliers and rewards!
              </p>
            </div>

            <div className="flex flex-col gap-4 max-h-[420px] overflow-y-auto pr-1">
              {LEAGUE_TIERS.map((tier) => {
                const isActive = userTier.level === tier.level;
                const progressToNext = userTrophies >= tier.minTrophies;
                
                return (
                  <div
                    key={tier.level}
                    className={`flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-2xl border transition-all gap-4 ${
                      isActive
                        ? 'bg-gradient-to-r from-slate-900 via-amber-500/5 to-slate-900 border-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.1)]'
                        : 'bg-slate-900/30 border-slate-850'
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      {/* Related symbols container */}
                      <div className="relative">
                        <TierSymbol level={tier.level} size={54} />
                        {isActive && (
                          <span className="absolute -top-1.5 -right-1 text-xs bg-amber-500 text-slate-950 font-black rounded-full px-1 py-0.2 uppercase font-display scale-90 border border-slate-950">
                            YOU
                          </span>
                        )}
                      </div>

                      <div>
                        <div className="flex items-center gap-2">
                          <span className={`font-display font-extrabold text-sm sm:text-base ${isActive ? 'text-amber-400' : 'text-slate-200'}`}>
                            {tier.name}
                          </span>
                          <span className="text-[9px] bg-slate-950 text-slate-400 border border-slate-800 rounded px-1.5 font-bold">
                            TIER {tier.level}
                          </span>
                        </div>

                        <span className="text-xs font-mono text-slate-400 font-semibold mt-1 block">
                          Requirement: 🌟 <span className="text-yellow-400 font-black">{tier.minTrophies}</span> trophies
                        </span>

                        <span className="text-[11px] font-bold text-cyan-400 flex items-center gap-1.5 mt-1">
                          <Zap className="w-3.5 h-3.5" /> <span>{tier.bonusMultiplier}</span>
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center">
                      {progressToNext ? (
                        <div className="px-4 py-1.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-black rounded-xl uppercase tracking-wider flex items-center gap-1">
                          <span>✓ Verified</span>
                        </div>
                      ) : (
                        <div className="px-3 py-1.5 bg-slate-950 text-slate-500 text-xs font-bold rounded-xl border border-slate-850 uppercase font-mono">
                          Need {tier.minTrophies - userTrophies} More
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
