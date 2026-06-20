/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Bone, Trophy, RefreshCw, LogOut, Award, Flame, Star, Compass } from 'lucide-react';
import { GameAudio } from '../utils/audio';

interface GameSummaryProps {
  distance: number;
  bonesCollected: number;
  howlTokensCollected: number;
  xpEarned: number;
  maxCombo: number;
  obstaclesAvoided: number;
  powerupsCollected: number;
  isNewHighscore: boolean;
  levelBefore: number;
  levelAfter: number;
  onRestart: () => void;
  onMainMenu: () => void;
}

export const GameSummary: React.FC<GameSummaryProps> = ({
  distance,
  bonesCollected,
  howlTokensCollected,
  xpEarned,
  maxCombo,
  obstaclesAvoided,
  powerupsCollected,
  isNewHighscore,
  levelBefore,
  levelAfter,
  onRestart,
  onMainMenu,
}) => {
  React.useEffect(() => {
    GameAudio.stopMusic();
    if (isNewHighscore) {
      GameAudio.playLevelUp();
    } else {
      GameAudio.playHowl();
    }
  }, [isNewHighscore]);

  const levelUpTriggered = levelAfter > levelBefore;

  return (
    <div id="game-summary-modal" className="fixed inset-0 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl relative overflow-hidden my-8">
        {/* Background glows */}
        <div className="absolute top-0 inset-x-0 h-[200px] bg-gradient-to-b from-amber-500/10 to-transparent pointer-events-none" />

        {/* Level Up Banner overlay */}
        {levelUpTriggered && (
          <div className="bg-gradient-to-r from-violet-600 via-indigo-600 to-fuchsia-600 border border-violet-500/30 text-white rounded-2xl p-4 text-center mb-6 relative overflow-hidden shadow-lg animate-pulse">
            <div className="absolute top-1/2 left-1/2 w-48 h-48 bg-white/10 rounded-full blur-2xl -translate-x-1/2 -translate-y-1/2" />
            <h3 className="font-display font-extrabold text-lg uppercase tracking-wider flex items-center justify-center gap-1.5">
              <Star className="w-5 h-5 fill-current animate-bounce" />
              <span>Level Up Milestone!</span>
              <Star className="w-5 h-5 fill-current animate-bounce delay-100" />
            </h3>
            <p className="text-slate-100 text-xs mt-1">
              Your pet's agility level ascended from <span className="font-mono font-bold text-amber-300">{levelBefore}</span> to <span className="font-mono font-bold text-amber-300">{levelAfter}</span>!
            </p>
          </div>
        )}

        <div className="text-center mb-6 relative z-10">
          <div className="text-[10px] uppercase font-display font-bold text-slate-500 tracking-widest">
            Run Terminated
          </div>
          <h2 className="text-3xl font-display font-extrabold text-slate-100 tracking-tight mt-1">
            Top Dog Summary
          </h2>
          {isNewHighscore && (
            <div className="mt-2 inline-flex items-center gap-1.5 px-3.5 py-1 bg-amber-500/10 text-amber-400 rounded-full border border-amber-500/20 text-xs font-display font-bold uppercase tracking-wider animate-bounce">
              <Trophy className="w-4 h-4 fill-amber-500/20" />
              <span>New Distance High Score!</span>
            </div>
          )}
        </div>

        {/* Big metrics displays */}
        <div className="grid grid-cols-2 gap-3 mb-6 relative z-10">
          <div className="bg-slate-950/60 p-4 rounded-2xl border border-slate-800 text-center flex flex-col justify-center">
            <span className="text-[9px] font-display font-bold text-slate-500 uppercase tracking-wider">
              Distance Traveled
            </span>
            <div className="text-3xl font-mono font-bold text-indigo-400 mt-1">
              {Math.floor(distance)}<span className="text-xs ml-0.5">m</span>
            </div>
          </div>

          <div className="bg-slate-950/60 p-4 rounded-2xl border border-slate-800 text-center flex flex-col justify-center">
            <span className="text-[9px] font-display font-bold text-slate-500 uppercase tracking-wider">
              Bones Earned
            </span>
            <div className="text-3xl font-mono font-bold text-amber-400 mt-1 flex items-center justify-center gap-1">
              <Bone className="w-5 h-5 fill-amber-400 inline-block" />
              <span>{bonesCollected}</span>
            </div>
          </div>
        </div>

        {/* Sub-statistics columns */}
        <div className="bg-slate-950/40 border border-slate-800/60 rounded-2xl p-4 space-y-3 mb-6 relative z-10">
          <h3 className="text-xs uppercase font-display font-bold text-slate-500 tracking-wider border-b border-slate-850 pb-2 mb-2">
            Session Analytics
          </h3>

          <div className="flex justify-between items-center text-xs font-medium">
            <span className="text-slate-400 flex items-center gap-1.5">
              <Award className="w-4 h-4 text-violet-400" />
              <span>Howl Tokens Found</span>
            </span>
            <span className="font-mono text-slate-200 font-bold">+{howlTokensCollected}</span>
          </div>

          <div className="flex justify-between items-center text-xs font-medium">
            <span className="text-slate-400 flex items-center gap-1.5">
              <Star className="w-4 h-4 text-amber-500" />
              <span>XP Experience Gained</span>
            </span>
            <span className="font-mono text-slate-200 font-bold">+{Math.floor(xpEarned)} XP</span>
          </div>

          <div className="flex justify-between items-center text-xs font-medium">
            <span className="text-slate-400 flex items-center gap-1.5">
              <Flame className="w-4 h-4 text-orange-500" />
              <span>Max Combo Multiplier</span>
            </span>
            <span className="font-mono text-slate-200 font-bold">{maxCombo}x</span>
          </div>

          <div className="flex justify-between items-center text-xs font-medium">
            <span className="text-slate-400 flex items-center gap-1.5">
              <Compass className="w-4 h-4 text-teal-400" />
              <span>Obstacles Evaded</span>
            </span>
            <span className="font-mono text-slate-200 font-bold">{obstaclesAvoided}</span>
          </div>

          <div className="flex justify-between items-center text-xs font-medium">
            <span className="text-slate-400 flex items-center gap-1.5">
              <Bone className="w-4 h-4 text-amber-400 fill-amber-400/20" />
              <span>Power-Ups Gathered</span>
            </span>
            <span className="font-mono text-slate-200 font-bold">{powerupsCollected}</span>
          </div>
        </div>

        {/* Navigation CTAs */}
        <div className="flex flex-col sm:flex-row gap-3 relative z-10">
          <button
            onClick={onRestart}
            className="flex-1 cursor-pointer py-3 px-5 bg-gradient-to-r from-amber-400 to-orange-500 hover:from-amber-300 hover:to-orange-400 hover:scale-[1.02] active:scale-[0.98] transition-all text-slate-950 font-display font-extrabold text-sm rounded-xl shadow-lg shadow-orange-500/10 flex items-center justify-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Race Again</span>
          </button>

          <button
            onClick={onMainMenu}
            className="flex-shrink-0 cursor-pointer py-3 px-5 bg-slate-805 hover:bg-slate-800 text-slate-300 border border-slate-800 rounded-xl font-display font-semibold text-sm transition-all flex items-center justify-center gap-2 hover:border-slate-700"
          >
            <LogOut className="w-4 h-4" />
            <span>Back to Kennel</span>
          </button>
        </div>
      </div>
    </div>
  );
};
