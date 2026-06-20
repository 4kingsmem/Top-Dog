/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Breed } from '../types';
import { Sparkles, Eye, ShieldAlert, Check, X, Shield, RotateCw } from 'lucide-react';
import { GameAudio } from '../utils/audio';

// Customization options
export const ROUND_ITEMS = [
  { id: 'none', name: 'Standard Collar', desc: 'No special neck attachments equipped.' },
  { id: 'leather', name: 'Leather Band', desc: 'Classic heavy tanned leather strap with golden brass buckle.' },
  { id: 'studs', name: 'Studded Ring', desc: 'Edgy punk-rock dark strap studded with solid silver pyramid spikes.' },
  { id: 'neon', name: 'Glowing Halo', desc: 'Sci-fi high-energy neon ring that projects a cyan electromagnetic field.' },
  { id: 'gold', name: 'Gold Chains', desc: 'Opulent heavy 24k polished gold chain links fit for a champion.' },
];

export const OTHER_ITEMS = [
  { id: 'none', name: 'Bare Face', desc: 'No facial accessories equipped.' },
  { id: 'goggles', name: 'Cyber Visor', desc: 'Futuristic polarized emerald-green laser tactical googles.' },
  { id: 'aviators', name: 'Golden Aviators', desc: 'Sleek luxury gold-rimmed dark pilot shades for high-flying stunts.' },
  { id: 'crown', name: 'Imperial Crown', desc: 'Majestic ruby-encrusted miniature golden crown of the Agility Arena.' },
  { id: 'horns', name: 'Neon Horns', desc: 'Glowing crimson energy horns that channel supreme high speeds.' },
];

interface CustomizationModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeBreed: Breed;
  customRound: string;
  customOther: string;
  onSave: (round: string, other: string) => void;
}

export const CustomizationModal: React.FC<CustomizationModalProps> = ({
  isOpen,
  onClose,
  activeBreed,
  customRound,
  customOther,
  onSave,
}) => {
  const [selectedRound, setSelectedRound] = React.useState(customRound);
  const [selectedOther, setSelectedOther] = React.useState(customOther);
  const [previewRotation, setPreviewRotation] = React.useState(0);
  const [previewTick, setPreviewTick] = React.useState(0);

  // Periodic wave effect for rendering micro animations locally
  React.useEffect(() => {
    if (!isOpen) return;
    const interval = setInterval(() => {
      setPreviewTick((prev) => prev + 1);
    }, 150);
    return () => clearInterval(interval);
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSave = () => {
    onSave(selectedRound, selectedOther);
    GameAudio.playLevelUp && GameAudio.playLevelUp();
    onClose();
  };

  // Dedicated 2D high fidelity preview of dog vector containing custom accessories
  const renderPreviewDog = (breed: Breed, round: string, other: string, rot: number) => {
    const isChihuahua = breed === 'chihuahua';
    const isCorgi = breed === 'corgi';
    const isBulldog = breed === 'bulldog';
    const isGShepherd = breed === 'gshepherd';
    const isDachshund = breed === 'dachshund';

    let bodyColor = '#d97706'; 
    let accentColor = '#78350f'; 
    let secondaryColor = '#fef3c7'; 

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

    const legBob = Math.sin(previewTick * 0.4) * 2.5;

    return (
      <div 
        className="relative transition-transform duration-300 w-44 h-44 flex items-center justify-center bg-slate-950/80 border border-slate-750/50 rounded-2xl p-4 shadow-[0_0_20px_rgba(249,115,22,0.15)]"
        style={{ transform: `rotate(${rot}deg)` }}
      >
        {/* Shadow floor disk */}
        <ellipse cx="88" cy="148" rx="55" ry="9" fill="black" opacity="0.3" className="absolute" />

        <svg viewBox="0 0 100 100" className="w-full h-full select-none">
          {/* Main body Group */}
          <g transform={`translate(0, ${Math.sin(previewTick * 0.2) * 1.5})`}>
            {/* Back legs */}
            <g transform={`translate(${isDachshund ? 25 : isBulldog ? 35 : 30}, 65)`}>
              <rect x="-4" y="0" width="8" height="15" rx="3" fill={accentColor} transform={`rotate(${legBob})`} />
            </g>
            <g transform={`translate(${isDachshund ? 65 : isBulldog ? 60 : 55}, 65)`}>
              <rect x="-4" y="0" width="8" height="15" rx="3" fill={accentColor} transform={`rotate(${-legBob})`} />
            </g>

            {/* Torso core */}
            {isDachshund && <rect x="22" y="42" width="54" height="22" rx="10" fill={bodyColor} />}
            {isBulldog && <rect x="28" y="38" width="44" height="28" rx="12" fill={bodyColor} />}
            {isCorgi && <rect x="25" y="44" width="46" height="20" rx="9" fill={bodyColor} />}
            {isChihuahua && <circle cx="50" cy="50" r="16" fill={bodyColor} />}
            {isGShepherd && <rect x="26" y="40" width="45" height="24" rx="8" fill={bodyColor} />}

            {/* Chest overlay */}
            {isCorgi && <path d="M 25 48 Q 40 45 42 62 Q 28 62 25 48" fill={secondaryColor} />}
            {isChihuahua && <circle cx="48" cy="52" r="10" fill={secondaryColor} />}

            {/* "THE ROUND" COLLAR CUSTOM OVERLAYS */}
            {round === 'leather' && (
              <g>
                <path d="M 23,45 Q 38,43 40,58" stroke="#8b5a2b" strokeWidth="4.5" fill="none" strokeLinecap="round" />
                <circle cx="28" cy="47" r="3" fill="#fbbf24" /> {/* Buckle */}
              </g>
            )}
            {round === 'studs' && (
              <g>
                <path d="M 23,45 Q 38,43 40,58" stroke="#334155" strokeWidth="4.5" fill="none" strokeLinecap="round" />
                <circle cx="25" cy="44" r="1.5" fill="#e2e8f0" />
                <circle cx="30" cy="46" r="1.5" fill="#e2e8f0" />
                <circle cx="35" cy="49" r="1.5" fill="#e2e8f0" />
              </g>
            )}
            {round === 'neon' && (
              <g className="animate-pulse">
                <path d="M 21,44 Q 38,41 42,59" stroke="#22d3ee" strokeWidth="5.5" fill="none" strokeLinecap="round" opacity="0.9" />
                <path d="M 21,44 Q 38,41 42,59" stroke="#ffffff" strokeWidth="2.5" fill="none" strokeLinecap="round" />
              </g>
            )}
            {round === 'gold' && (
              <g>
                <path d="M 23,45 Q 38,43 40,58" stroke="#fbbf24" strokeWidth="5" fill="none" strokeLinecap="round" />
                {/* Gold bead highlights */}
                <circle cx="24" cy="44" r="2.2" fill="#f59e0b" />
                <circle cx="29" cy="46" r="2.2" fill="#f59e0b" />
                <circle cx="34" cy="49" r="2.2" fill="#f59e0b" />
              </g>
            )}
            {round === 'none' && (
              <path d="M 24,46 Q 38,44 40,57" stroke="#ef4444" strokeWidth="3" fill="none" strokeLinecap="round" />
            )}

            {/* Front legs */}
            <g transform={`translate(${isDachshund ? 32 : isBulldog ? 42 : 36}, 65)`}>
              <rect x="-4" y="0" width="8" height="15" rx="3" fill={bodyColor} transform={`rotate(${-legBob})`} />
            </g>
            <g transform={`translate(${isDachshund ? 60 : isBulldog ? 54 : 48}, 65)`}>
              <rect x="-4" y="0" width="8" height="15" rx="3" fill={bodyColor} transform={`rotate(${legBob})`} />
            </g>

            {/* Head group */}
            <g transform="translate(0, 0)">
              {/* Ears */}
              {isGShepherd && <polygon points="25,18 35,32 20,32" fill={accentColor} />}
              {isCorgi && <path d="M 24 23 Q 30 14 36 26 Z" fill={accentColor} />}
              {isChihuahua && <path d="M 32 24 Q 35 10 43 28 Z" fill={bodyColor} />}
              {isBulldog && (
                <>
                  <ellipse cx="36" cy="30" rx="6" ry="4" fill={accentColor} />
                  <ellipse cx="64" cy="30" rx="6" ry="4" fill={accentColor} />
                </>
              )}
              {isDachshund && <path d="M 22 28 C 16 28 16 48 24 48 C 24 48 24 40 24 35 Z" fill={accentColor} />}

              {/* Head base */}
              <circle cx={isBulldog ? '50' : '36'} cy="36" r={isBulldog ? '16' : '13'} fill={bodyColor} />

              {/* Snout */}
              {isBulldog ? (
                <rect x="42" y="38" width="16" height="12" rx="4" fill={accentColor} />
              ) : (
                <ellipse cx="26" cy="38" rx="8" ry="6" fill={secondaryColor} />
              )}
              <circle cx={isBulldog ? '50' : '20'} cy={isBulldog ? '40' : '38'} r="2.5" fill="#000000" />

              {/* Standard Eyes (rendered if custom visor/googles do not block) */}
              {other !== 'goggles' && other !== 'aviators' && (
                <>
                  <circle cx={isBulldog ? '44' : '30'} cy="32" r="2.5" fill="#000000" />
                  <circle cx={isBulldog ? '45' : '31'} cy="31" r="0.8" fill="#ffffff" />
                  <circle cx={isBulldog ? '56' : '40'} cy="32" r="2.5" fill="#000000" />
                  <circle cx={isBulldog ? '57' : '41'} cy="31" r="0.8" fill="#ffffff" />
                </>
              )}

              {/* "THE OTHER THING" OUTLINE ACCESSORY OVERLAYS */}
              {other === 'goggles' && (
                <g className="filter drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]">
                  {/* Glowing neon green cyber tactical visor */}
                  <rect x={isBulldog ? '28' : '16'} y="26" width={isBulldog ? '44' : '33'} height="9" rx="3.5" fill="#04f57c" opacity="0.85" />
                  <rect x={isBulldog ? '32' : '19'} y="28" width={isBulldog ? '36' : '27'} height="3.5" rx="1.5" fill="#ffffff" />
                  {/* Visor strap */}
                  <line x1={isBulldog ? '28' : '16'} y1="30" x2={isBulldog ? '18' : '10'} y2="30" stroke="#000" strokeWidth="2.5" />
                </g>
              )}

              {/* Royal Crown on Head center */}
              {other === 'crown' && (
                <g>
                  {/* 3 point crown */}
                  <polygon 
                    points={isBulldog ? '37,24 43,12 50,19 57,12 63,24' : '25,24 31,12 37,19 43,12 49,24'} 
                    fill="#fbbf24" 
                    stroke="#b45309" 
                    strokeWidth="1" 
                  />
                  {/* Gems */}
                  <circle cx={isBulldog ? '43' : '31'} cy="11" r="2" fill="#ef4444" />
                  <circle cx={isBulldog ? '50' : '37'} cy="18" r="1.5" fill="#3b82f6" />
                  <circle cx={isBulldog ? '57' : '43'} cy="11" r="2" fill="#ef4444" />
                </g>
              )}

              {/* Devil Horns on Left/Right forehead */}
              {other === 'horns' && (
                <g>
                  {/* Left Horn */}
                  <path d={isBulldog ? 'M 35,26 Q 28,10 24,14 Q 30,22 36,25' : 'M 25,26 Q 18,10 14,14 Q 20,22 26,25'} fill="#ef4444" stroke="#7f1d1d" strokeWidth="0.8" />
                  {/* Right Horn */}
                  <path d={isBulldog ? 'M 65,26 Q 72,10 76,14 Q 70,22 64,25' : 'M 47,26 Q 54,10 58,14 Q 52,22 46,25'} fill="#ef4444" stroke="#7f1d1d" strokeWidth="0.8" />
                </g>
              )}

              {/* Golden Aviators */}
              {other === 'aviators' && (
                <g>
                  {/* Gold frame bridge line */}
                  <line x1={isBulldog ? '34' : '22'} y1="29" x2={isBulldog ? '66' : '48'} y2="29" stroke="#fbbf24" strokeWidth="1.8" />
                  
                  {/* Left lens aviator drop design */}
                  <path d={isBulldog ? 'M 36,28 C 45,28 47,40 40,43 C 34,42 33,35 36,28 Z' : 'M 22,28 C 29,28 31,40 26,42 C 20,41 19,34 22,28 Z'} fill="#1e293b" stroke="#fbbf24" strokeWidth="1.5" />
                  
                  {/* Right lens aviator drop design */}
                  <path d={isBulldog ? 'M 54,28 C 63,28 65,40 58,43 C 52,42 51,35 54,28 Z' : 'M 36,28 C 43,28 45,40 40,42 C 34,41 33,34 36,28 Z'} fill="#1e293b" stroke="#fbbf24" strokeWidth="1.5" />
                </g>
              )}
            </g>

            {/* Tail */}
            <g transform={`translate(${isDachshund ? '76' : isBulldog ? '68' : '65'}, 46) rotate(${Math.sin(previewTick * 0.4) * 15})`}>
              {isCorgi ? <circle cx="2" cy="0" r="4" fill={bodyColor} /> : <path d="M 0 0 Q 15 -10 20 -2 Q 22 5 15 4 Z" fill={accentColor} />}
            </g>
          </g>
        </svg>
      </div>
    );
  };

  return (
    <div id="custom-modal-overlay" className="fixed inset-0 z-[120] bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-gradient-to-b from-slate-900 via-slate-950 to-slate-900 border border-slate-800 rounded-[2.5rem] p-6 max-w-4xl w-full grid grid-cols-1 lg:grid-cols-12 gap-6 relative shadow-[0_10px_50px_rgba(0,0,0,0.8)]">
        
        {/* Absolute exit cross */}
        <button 
          onClick={onClose}
          className="absolute top-5 right-5 p-2 bg-slate-950 hover:bg-slate-900 border border-slate-800 text-slate-400 hover:text-white rounded-full transition-all cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Column Left: Visual holographic chamber containing real time accessory preview */}
        <div className="lg:col-span-5 flex flex-col items-center justify-between bg-slate-950/20 p-5 rounded-3xl border border-slate-850/60 relative overflow-hidden">
          {/* Subtle grid backdrop for sci-fi look */}
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#0f172a_1px,transparent_1px),linear-gradient(to_bottom,#0f172a_1px,transparent_1px)] bg-[size:16px_16px] opacity-25" />
          
          <div className="text-center relative z-10 w-full">
            <span className="px-3 py-0.5 bg-orange-500/10 text-orange-400 font-mono text-[9px] font-bold tracking-widest uppercase rounded-full border border-orange-500/15">
              Holo Fitting Chamber
            </span>
            <h3 className="text-xl font-display font-black text-slate-200 mt-2 uppercase tracking-wide">
              Style Customizer
            </h3>
            <p className="text-[10px] text-slate-500 font-mono mt-0.5">
              Configure and fit modular accessory parameters
            </p>
          </div>

          <div className="my-6 relative z-10 flex flex-col items-center justify-center">
            {renderPreviewDog(activeBreed, selectedRound, selectedOther, previewRotation)}

            {/* Quick angle rotater */}
            <button
              onClick={() => {
                setPreviewRotation((prev) => (prev + 90) % 360);
                GameAudio.playCollect && GameAudio.playCollect(false, false);
              }}
              className="mt-4 flex items-center gap-2 px-3 py-1.5 bg-slate-900 hover:bg-slate-850 border border-slate-800 text-slate-400 hover:text-slate-200 rounded-xl text-[10px] font-mono uppercase tracking-wider font-bold transition-all cursor-pointer"
            >
              <RotateCw className="w-3.5 h-3.5" />
              <span>Rotate View</span>
            </button>
          </div>

          <div className="text-center relative z-10 w-full text-[10px] text-slate-500 font-medium">
            Active Breed: <span className="text-orange-400 capitalize font-bold font-mono">{activeBreed}</span>
          </div>
        </div>

        {/* Column Right: Customisation Category Panels ("The Round" and "The Other Thing") */}
        <div className="lg:col-span-7 flex flex-col justify-between max-h-[500px] lg:max-h-[550px] overflow-y-auto pr-1">
          <div>
            {/* Category A: The Round Neckwear Accessory */}
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-3">
                <span className="w-5 h-5 rounded-full bg-orange-500 text-slate-950 flex items-center justify-center font-display font-black text-xs font-mono">○</span>
                <span className="text-xs font-display font-extrabold text-slate-200 uppercase tracking-widest leading-none">
                  Customize Neckwear ("The Round")
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {ROUND_ITEMS.map((item) => {
                  const isSel = selectedRound === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        setSelectedRound(item.id);
                        GameAudio.playCollect && GameAudio.playCollect(false, false);
                      }}
                      className={`text-left p-2.5 px-3.5 rounded-2xl border transition-all flex flex-col justify-between h-20 group relative cursor-pointer ${
                        isSel
                          ? 'bg-orange-500/10 border-orange-500/80 shadow-[0_0_15px_rgba(249,115,22,0.1)] ring-1 ring-orange-500/30'
                          : 'bg-slate-950/40 border-slate-900 hover:bg-slate-900/30 hover:border-slate-800'
                      }`}
                    >
                      <div className="flex justify-between items-center w-full">
                        <span className={`text-[11px] font-display font-extrabold uppercase ${isSel ? 'text-orange-400 font-bold' : 'text-slate-350'}`}>
                          {item.name}
                        </span>
                        {isSel && (
                          <div className="w-4 h-4 rounded-full bg-orange-500 flex items-center justify-center">
                            <Check className="w-3 h-3 text-slate-950 stroke-[3px]" />
                          </div>
                        )}
                      </div>
                      <p className="text-[9px] text-slate-500 leading-tight group-hover:text-slate-400 transition-colors">
                        {item.desc}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Category B: The Other Thing Eyewear Accessory */}
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-3">
                <span className="w-5 h-5 rounded-full bg-orange-500 text-slate-950 flex items-center justify-center font-display font-black text-xs">★</span>
                <span className="text-xs font-display font-extrabold text-slate-200 uppercase tracking-widest leading-none">
                  Customize Accessories ("The Other Thing")
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {OTHER_ITEMS.map((item) => {
                  const isSel = selectedOther === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        setSelectedOther(item.id);
                        GameAudio.playCollect && GameAudio.playCollect(false, false);
                      }}
                      className={`text-left p-2.5 px-3.5 rounded-2xl border transition-all flex flex-col justify-between h-20 group relative cursor-pointer ${
                        isSel
                          ? 'bg-orange-500/10 border-orange-500/80 shadow-[0_0_15px_rgba(249,115,22,0.1)] ring-1 ring-orange-500/30'
                          : 'bg-slate-950/40 border-slate-900 hover:bg-slate-900/30 hover:border-slate-800'
                      }`}
                    >
                      <div className="flex justify-between items-center w-full">
                        <span className={`text-[11px] font-display font-extrabold uppercase ${isSel ? 'text-orange-400 font-bold' : 'text-slate-350'}`}>
                          {item.name}
                        </span>
                        {isSel && (
                          <div className="w-4 h-4 rounded-full bg-orange-500 flex items-center justify-center">
                            <Check className="w-3 h-3 text-slate-950 stroke-[3px]" />
                          </div>
                        )}
                      </div>
                      <p className="text-[9px] text-slate-500 leading-tight group-hover:text-slate-400 transition-colors">
                        {item.desc}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Action triggers */}
          <div className="flex gap-3 border-t border-slate-900/80 pt-4 mt-2">
            <button
              onClick={onClose}
              className="flex-1 py-3 text-xs bg-slate-900 hover:bg-slate-850 text-slate-400 hover:text-slate-200 rounded-2xl border border-slate-800 transition-all font-display font-medium uppercase tracking-widest cursor-pointer text-center"
            >
              Cancel Mod
            </button>
            <button
              onClick={handleSave}
              className="flex-[2] py-3 text-xs bg-gradient-to-r from-yellow-400 via-orange-500 to-amber-500 text-slate-950 hover:scale-[1.01] active:scale-[0.99] rounded-2xl font-display font-black uppercase tracking-widest cursor-pointer text-center shadow-lg shadow-orange-500/20"
            >
              Lock In Selection
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
