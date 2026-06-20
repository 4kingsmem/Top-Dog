/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Calendar, Gift, CheckCircle2, Bone, Award, Flame } from 'lucide-react';
import { DailyRewards } from '../types';
import { GameAudio } from '../utils/audio';

interface DailyRewardsProps {
  rewardsState: DailyRewards;
  onClaim: (bonuses: { bones?: number; tokens?: number; xp?: number }) => void;
}

export const DailyRewardsPanel: React.FC<DailyRewardsProps> = ({ rewardsState, onClaim }) => {
  const { lastClaimedDate, currentStreak, rewards } = rewardsState;

  // Let's check if they can claim today
  const canClaimToday = React.useMemo(() => {
    if (!lastClaimedDate) return true;
    const todayStr = new Date().toDateString();
    return lastClaimedDate !== todayStr;
  }, [lastClaimedDate]);

  const handleClaim = () => {
    if (!canClaimToday) return;

    // Retrieve active reward
    const rewardIndex = (currentStreak % 7); // 0 corresponds to day 1, etc., actually currentStreak tracks next claim or status
    // Simple logic: streak represents what day they are on to claim
    const todayRewardIndex = Math.min(6, currentStreak - (canClaimToday ? 0 : 1));
    const activeReward = rewards[canClaimToday ? currentStreak - 1 : todayRewardIndex];

    if (activeReward) {
      GameAudio.playPowerup();
      onClaim(activeReward);
    }
  };

  return (
    <div id="daily-rewards-section" className="bg-slate-900/60 backdrop-blur-md border border-slate-800/80 rounded-3xl p-6 shadow-2xl relative overflow-hidden">
      {/* Background radial highlight */}
      <div className="absolute top-0 right-0 w-48 h-48 bg-orange-500/10 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none" />

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 relative z-10">
        <div>
          <div className="flex items-center gap-2 text-orange-450 font-display font-black text-xs tracking-widest uppercase">
            <Flame className="w-4 h-4 fill-orange-500 text-orange-500 animate-pulse" />
            <span>Active Streak: {currentStreak} Days</span>
          </div>
          <h2 className="text-xl font-display font-black uppercase italic text-slate-100 tracking-tight mt-1 flex items-center gap-2">
            Daily Biscuits <Gift className="w-5 h-5 text-orange-500 animate-bounce" />
          </h2>
          <p className="text-slate-400 text-xs mt-0.5 font-semibold">Come back daily to unlock premium bones, XP multipliers, and rare Howl Tokens!</p>
        </div>

        <button
          id="claim-reward-btn"
          disabled={!canClaimToday}
          onClick={handleClaim}
          className={`px-5 py-2.5 rounded-full font-display font-black text-xs uppercase tracking-widest shadow-lg transition-all duration-300 flex items-center gap-2 relative ${
            canClaimToday
              ? 'bg-gradient-to-r from-orange-555 to-red-500 hover:from-orange-455 hover:to-red-455 text-white cursor-pointer hover:scale-105 active:scale-95 shadow-[0_0_15px_rgba(249,115,22,0.35)]'
              : 'bg-slate-800/80 text-slate-500 border border-slate-750 cursor-not-allowed'
          }`}
        >
          {canClaimToday ? (
            <>
              <Gift className="w-4 h-4" />
              <span>Claim Today's Reward</span>
            </>
          ) : (
            <>
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Claimed Today</span>
            </>
          )}
        </button>
      </div>

      <div className="grid grid-cols-2 xs:grid-cols-3 sm:grid-cols-4 md:grid-cols-7 gap-3 relative z-10">
        {rewards.map((reward) => {
          const isCompleted = reward.day < currentStreak || (reward.day === currentStreak && !canClaimToday);
          const isToday = reward.day === currentStreak && canClaimToday;
          const isLocked = reward.day > currentStreak;

          return (
            <div
              key={reward.day}
              id={`daily-day-${reward.day}`}
              className={`flex flex-col items-center p-3 rounded-2xl border text-center transition-all ${
                isCompleted
                  ? 'bg-emerald-950/15 border-emerald-500/20 text-emerald-300'
                  : isToday
                  ? 'bg-orange-950/30 border-orange-500 text-orange-200 ring-2 ring-orange-500/25 shadow-[0_0_12px_rgba(249,115,22,0.2)] animate-pulse'
                  : 'bg-slate-950/40 border-slate-850 text-slate-450 hover:border-slate-800 hover:bg-slate-950/60'
              }`}
            >
              <div className="text-xs font-display font-black tracking-widest mb-2 text-slate-400">
                DAY {reward.day}
              </div>

              {/* Reward Icon visual representation */}
              <div className={`w-10 h-10 rounded-full flex items-center justify-center mb-2 ${
                isCompleted
                  ? 'bg-emerald-500/10 text-emerald-400'
                  : isToday
                  ? 'bg-orange-500/15 text-orange-400'
                  : 'bg-slate-850 text-slate-600 border border-slate-800'
              }`}>
                {reward.tokens ? (
                  <Award className="w-5 h-5" />
                ) : reward.bones ? (
                  <Bone className="w-5 h-5 fill-current" />
                ) : (
                  <Calendar className="w-5 h-5" />
                )}
              </div>

              {/* Reward Info details */}
              <div className="text-sm font-mono font-black text-slate-200">
                {reward.bones && `+${reward.bones}`}
                {reward.tokens && `+${reward.tokens}`}
                {reward.xp && `+${reward.xp}`}
              </div>
              <div className="text-[9px] uppercase font-display font-bold tracking-wider text-slate-500">
                {reward.tokens ? 'Tokens' : reward.bones ? 'Bones' : 'XP'}
              </div>

              {/* Status badge */}
              {isCompleted && (
                <div className="mt-2 text-[10px] font-display font-bold text-emerald-400 flex items-center gap-1 leading-none">
                  <CheckCircle2 className="w-3 h-3" />
                  <span>Claimed</span>
                </div>
              )}
              {isToday && (
                <div className="mt-2 text-[10px] font-display font-black text-orange-400 text-center leading-none">
                  READY
                </div>
              )}
              {isLocked && (
                <div className="mt-2 text-[10px] font-display font-bold text-slate-600 leading-none">
                  LOCKED
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
