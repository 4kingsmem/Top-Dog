/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { GameAchievement } from '../types';
import { Award, Trophy, CheckCircle2, Lock, Sparkles, Bone } from 'lucide-react';
import { GameAudio } from '../utils/audio';

interface AchievementsProps {
  achievements: GameAchievement[];
  onClaimReward: (achievementId: string, tokens: number) => void;
}

export const AchievementsPanel: React.FC<AchievementsProps> = ({ achievements, onClaimReward }) => {
  const handleClaim = (ach: GameAchievement) => {
    if (ach.completed && !ach.claimed) {
      GameAudio.playLevelUp();
      onClaimReward(ach.id, ach.rewardTokens);
    }
  };

  const completedCount = React.useMemo(() => {
    return achievements.filter(a => a.completed).length;
  }, [achievements]);

  return (
    <div id="achievements-section" className="bg-slate-900/60 backdrop-blur-md border border-slate-800/80 rounded-3xl p-6 shadow-2xl relative overflow-hidden">
      {/* Background flare */}
      <div className="absolute top-0 left-0 w-64 h-64 bg-orange-500/10 rounded-full blur-3xl -ml-24 -mt-24 pointer-events-none" />

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 relative z-10">
        <div>
          <h2 className="text-xl font-display font-black uppercase italic text-slate-100 tracking-tight flex items-center gap-2">
            Barking Achievements <Trophy className="w-5 h-5 text-orange-500 fill-orange-500/20" />
          </h2>
          <p className="text-slate-400 text-xs mt-0.5 font-medium">Show off your skills! Track your training milestones and earn extra reward Howl Tokens.</p>
        </div>

        <div className="px-4 py-2 bg-slate-950/80 border border-slate-800 rounded-full flex items-center gap-2 text-xs font-display font-bold text-slate-300">
          <span>Completed:</span>
          <span className="text-orange-400 font-mono text-sm">{completedCount}</span>
          <span className="text-slate-600">/</span>
          <span className="font-mono text-slate-400">{achievements.length}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 relative z-10">
        {achievements.map((ach) => {
          const percent = Math.min(100, Math.floor((ach.currentProgress / ach.target) * 100));

          return (
            <div
              key={ach.id}
              id={`achievement-card-${ach.id}`}
              className={`p-4 rounded-2xl border transition-all duration-300 flex items-start gap-4 ${
                ach.claimed
                  ? 'bg-slate-950/20 border-slate-900/60 opacity-60'
                  : ach.completed
                  ? 'bg-orange-950/20 border-orange-500/30 ring-1 ring-orange-500/20'
                  : 'bg-slate-955/40 border-slate-850 hover:border-slate-700'
              }`}
            >
              {/* Badge Icon */}
              <div className={`p-3 rounded-2xl flex-shrink-0 flex items-center justify-center ${
                ach.claimed
                  ? 'bg-slate-800 text-slate-500 shadow-inner'
                  : ach.completed
                  ? 'bg-gradient-to-br from-orange-500 to-red-500 text-slate-950 shadow-md'
                  : 'bg-slate-850 text-slate-500 border border-slate-800/80'
              }`}>
                {ach.claimed ? (
                  <CheckCircle2 className="w-6 h-6 text-emerald-400" />
                ) : ach.completed ? (
                  <Sparkles className="w-6 h-6 animate-pulse" />
                ) : (
                  <Lock className="w-6 h-6 text-slate-600" />
                )}
              </div>

              {/* Progress and information */}
              <div className="flex-grow min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="font-display font-bold text-sm tracking-tight text-slate-100 truncate uppercase">
                    {ach.title}
                  </h3>
                  <div className="flex items-center gap-1.5 flex-shrink-0 bg-slate-950/60 px-2 py-0.5 rounded border border-slate-850">
                    <Award className="w-3.5 h-3.5 text-orange-400" />
                    <span className="font-mono text-[11px] font-bold text-orange-400">+{ach.rewardTokens} HT</span>
                  </div>
                </div>

                <p className="text-slate-400 text-xs mt-1 leading-relaxed font-semibold">
                  {ach.description}
                </p>

                {/* Progress bar info */}
                <div className="mt-3">
                  <div className="flex items-center justify-between text-[10px] font-mono text-slate-500 mb-1">
                    <span>
                      {Math.floor(ach.currentProgress)} / {ach.target}
                    </span>
                    <span className="font-bold">{percent}%</span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-850 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        ach.claimed
                          ? 'bg-slate-750'
                          : ach.completed
                          ? 'bg-gradient-to-r from-orange-550 to-red-500'
                          : 'bg-gradient-to-r from-slate-600 to-slate-450'
                      }`}
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                </div>

                {/* Claim Reward Buttons */}
                {ach.completed && !ach.claimed && (
                  <button
                    onClick={() => handleClaim(ach)}
                    className="mt-3 cursor-pointer px-4 py-1.5 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-400 hover:to-amber-400 hover:scale-[1.03] active:scale-[0.97] transition-all text-slate-950 rounded-lg text-[10px] font-display font-black tracking-widest uppercase shadow-[0_0_15px_rgba(249,115,22,0.3)] flex items-center gap-1.5"
                  >
                    <Trophy className="w-3.5 h-3.5 fill-current" />
                    <span>Claim Bounty</span>
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
