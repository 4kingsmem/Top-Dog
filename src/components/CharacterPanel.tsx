/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { DogCharacter, Breed } from '../types';
import { Bone, Award, Flame, CheckCircle2, Shield, Lock, RotateCw, Sparkles, Paintbrush, RefreshCw, FolderOpen, AlertOctagon } from 'lucide-react';
import { GameAudio } from '../utils/audio';
import { CustomizationModal } from './CustomizationModal';
import { DriveFile, listDriveFiles } from '../utils/googleDrive';

interface CharacterPanelProps {
  characters: DogCharacter[];
  activeCharacterId: Breed;
  userBones: number;
  userTokens: number;
  customRound: string;
  customOther: string;
  onSelect: (breed: Breed) => void;
  onUnlock: (breed: Breed, currency: 'bones' | 'tokens') => void;
  onEvolve: (breed: Breed) => void;
  onSaveCustomizations: (round: string, other: string) => void;
  gdriveToken?: string | null;
  customDogSkin?: string;
  onSelectCustomSkin?: (name: string, fileId: string) => void;
  onClearCustomSkin?: () => void;
}

export const CharacterPanel: React.FC<CharacterPanelProps> = ({
  characters,
  activeCharacterId,
  userBones,
  userTokens,
  customRound,
  customOther,
  onSelect,
  onUnlock,
  onEvolve,
  onSaveCustomizations,
  gdriveToken = null,
  customDogSkin = '',
  onSelectCustomSkin,
  onClearCustomSkin,
}) => {
  const [selectedPreviewId, setSelectedPreviewId] = React.useState<Breed>(activeCharacterId);
  const [previewAnimation, setPreviewAnimation] = React.useState<'idle' | 'walk' | 'run' | 'howl'>('idle');
  const [rotationAngle, setRotationAngle] = React.useState<number>(0);
  const [isCustomizerOpen, setIsCustomizerOpen] = useState<boolean>(false);

  // Google Drive custom model skin selection states
  const [driveGlbFiles, setDriveGlbFiles] = useState<DriveFile[]>([]);
  const [isDriveLoading, setIsDriveLoading] = useState<boolean>(false);
  const [selectedCustomFile, setSelectedCustomFile] = useState<DriveFile | null>(null);

  // Try to load any initial selected file on startup or token refresh
  useEffect(() => {
    const fetchGlbFiles = async () => {
      if (!gdriveToken) {
        setDriveGlbFiles([]);
        return;
      }
      setIsDriveLoading(true);
      try {
        const allFiles = await listDriveFiles(gdriveToken);
        const glbFiles = allFiles.filter(f => f.name.toLowerCase().endsWith('.glb') || f.name.toLowerCase().endsWith('.gltf'));
        setDriveGlbFiles(glbFiles);
        
        if (customDogSkin) {
          const matchedFile = glbFiles.find(f => f.name === customDogSkin);
          if (matchedFile) {
            setSelectedCustomFile(matchedFile);
          }
        }
      } catch (err) {
        console.error('[TopDog] CharacterPanel failed loading GLBs:', err);
      } finally {
        setIsDriveLoading(false);
      }
    };
    fetchGlbFiles();
  }, [gdriveToken, customDogSkin]);

  const activePreviewChar = React.useMemo(() => {
    return characters.find((c) => c.id === selectedPreviewId)!;
  }, [characters, selectedPreviewId]);

  // Rotator effect
  const rotatePreview = () => {
    setRotationAngle((prev) => (prev + 90) % 360);
    GameAudio.playCollect(false, false);
  };

  const handleHowl = () => {
    setPreviewAnimation('howl');
    GameAudio.playHowl();
    setTimeout(() => {
      setPreviewAnimation('idle');
    }, 1900);
  };

  const handleWalk = () => {
    setPreviewAnimation('walk');
    GameAudio.playBark(activePreviewChar.id === 'chihuahua');
    setTimeout(() => {
      setPreviewAnimation('idle');
    }, 1500);
  };

  const handleRun = () => {
    setPreviewAnimation('run');
    setTimeout(() => {
      setPreviewAnimation('idle');
    }, 2000);
  };

  // Helper to draw procedural previews of dogs inside the selector
  // We can use beautiful HTML vector-styled containers for each dog to show off high craftsmanship!
  const renderDogVector = (breed: Breed, anim: 'idle' | 'walk' | 'run' | 'howl', size: number = 80, rot: number = 0) => {
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

    // Bounce and leg-swing keyframes modeled procedurally based on anim
    const beat = Date.now() / 150;
    const bodyY = anim === 'run' ? Math.sin(beat) * 5 : anim === 'walk' ? Math.sin(beat * 0.8) * 3 : 0;
    const legAngle1 = anim === 'run' ? Math.sin(beat) * 25 : anim === 'walk' ? Math.sin(beat * 0.8) * 15 : 0;
    const legAngle2 = anim === 'run' ? -Math.sin(beat) * 25 : anim === 'walk' ? -Math.sin(beat * 0.8) * 15 : 0;
    const headRot = anim === 'howl' ? -35 : 0;

    return (
      <div
        className="relative transition-transform duration-500 flex items-center justify-center"
        style={{
          width: `${size}px`,
          height: `${size}px`,
          transform: `rotate(${rot}deg)`,
        }}
      >
        <svg viewBox="0 0 100 100" className="w-full h-full select-none">
          {/* Shadow */}
          <ellipse cx="50" cy="85" rx="30" ry="6" fill="black" opacity="0.25" />

          {/* Group that positions the dog coordinates */}
          <g transform={`translate(0, ${bodyY})`}>
            {/* Long low back of Dachshund / stocky of Bulldog / short of Corgi */}
            <g id="dog-back-legs">
              {/* Back Legs */}
              <g transform={`translate(${isDachshund ? 25 : isBulldog ? 35 : 30}, 65) rotate(${legAngle1})`}>
                <rect x="-4" y="0" width="8" height="15" rx="3" fill={accentColor} />
              </g>
              <g transform={`translate(${isDachshund ? 65 : isBulldog ? 60 : 55}, 65) rotate(${legAngle2})`}>
                <rect x="-4" y="0" width="8" height="15" rx="3" fill={accentColor} />
              </g>
            </g>

            {/* Main Body */}
            {isDachshund && (
              <rect x="22" y="42" width="54" height="22" rx="10" fill={bodyColor} />
            )}
            {isBulldog && (
              <rect x="28" y="38" width="44" height="28" rx="12" fill={bodyColor} />
            )}
            {isCorgi && (
              <rect x="25" y="44" width="46" height="20" rx="9" fill={bodyColor} />
            )}
            {isChihuahua && (
              <circle cx="50" cy="50" r="16" fill={bodyColor} />
            )}
            {isGShepherd && (
              <rect x="26" y="40" width="45" height="24" rx="8" fill={bodyColor} />
            )}

            {/* Chest patch */}
            {isCorgi && (
              <path d="M 25 48 Q 40 45 42 62 Q 28 62 25 48" fill={secondaryColor} />
            )}
            {isGShepherd && (
              <rect x="30" y="42" width="12" height="18" rx="4" fill={accentColor} />
            )}
            {isChihuahua && (
              <circle cx="48" cy="52" r="10" fill={secondaryColor} />
            )}

            {/* Head and features Group */}
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
              {isDachshund && (
                <path d="M 22 28 C 16 28 16 48 24 48 C 24 48 24 40 24 35 Z" fill={accentColor} />
              )}

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

              {/* COLLAR (THE ROUND) OVERLAY */}
              {breed === activeCharacterId && (
                <>
                  {customRound === 'leather' && (
                    <g>
                      <path d="M 23,45 Q 38,43 40,58" stroke="#8b5a2b" strokeWidth="4.5" fill="none" strokeLinecap="round" />
                      <circle cx="28" cy="47" r="3" fill="#fbbf24" />
                    </g>
                  )}
                  {customRound === 'studs' && (
                    <g>
                      <path d="M 23,45 Q 38,43 40,58" stroke="#334155" strokeWidth="4.5" fill="none" strokeLinecap="round" />
                      <circle cx="25" cy="44" r="1.5" fill="#e2e8f0" />
                      <circle cx="30" cy="46" r="1.5" fill="#e2e8f0" />
                      <circle cx="35" cy="49" r="1.5" fill="#e2e8f0" />
                    </g>
                  )}
                  {customRound === 'neon' && (
                    <g className="animate-pulse">
                      <path d="M 21,44 Q 38,41 42,59" stroke="#22d3ee" strokeWidth="5.5" fill="none" strokeLinecap="round" opacity="0.9" />
                      <path d="M 21,44 Q 38,41 42,59" stroke="#ffffff" strokeWidth="2.5" fill="none" strokeLinecap="round" />
                    </g>
                  )}
                  {customRound === 'gold' && (
                    <g>
                      <path d="M 23,45 Q 38,43 40,58" stroke="#fbbf24" strokeWidth="5" fill="none" strokeLinecap="round" />
                      <circle cx="24" cy="44" r="2.2" fill="#f59e0b" />
                      <circle cx="29" cy="46" r="2.2" fill="#f59e0b" />
                      <circle cx="34" cy="49" r="2.2" fill="#f59e0b" />
                    </g>
                  )}
                </>
              )}

              {/* Eyes */}
              {!(breed === activeCharacterId && (customOther === 'goggles' || customOther === 'aviators')) ? (
                <>
                  <circle cx={isBulldog ? '44' : '30'} cy="32" r={isChihuahua ? '3.5' : '2.5'} fill="#000000" />
                  <circle cx={isBulldog ? '56' : '40'} cy="32" r={isChihuahua ? '3.5' : '2.5'} fill="#000000" />
                  {/* Eye sparkle */}
                  <circle cx={isBulldog ? '45' : '31'} cy="31" r="1" fill="#ffffff" />
                </>
              ) : null}

              {/* ACCESSORIES (THE OTHER THING) OVERLAYS */}
              {breed === activeCharacterId && (
                <>
                  {customOther === 'goggles' && (
                    <g className="filter drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]">
                      <rect x={isBulldog ? '28' : '16'} y="26" width={isBulldog ? '44' : '33'} height="9" rx="3.5" fill="#04f57c" opacity="0.85" />
                      <rect x={isBulldog ? '32' : '19'} y="28" width={isBulldog ? '36' : '27'} height="3.5" rx="1.5" fill="#ffffff" />
                      <line x1={isBulldog ? '28' : '16'} y1="30" x2={isBulldog ? '18' : '10'} y2="30" stroke="#000" strokeWidth="2.5" />
                    </g>
                  )}

                  {customOther === 'crown' && (
                    <g>
                      <polygon 
                        points={isBulldog ? '37,24 43,12 50,19 57,12 63,24' : '25,24 31,12 37,19 43,12 49,24'} 
                        fill="#fbbf24" 
                        stroke="#b45309" 
                        strokeWidth="1" 
                      />
                      <circle cx={isBulldog ? '43' : '31'} cy="11" r="2" fill="#ef4444" />
                      <circle cx={isBulldog ? '50' : '37'} cy="18" r="1.5" fill="#3b82f6" />
                      <circle cx={isBulldog ? '57' : '43'} cy="11" r="2" fill="#ef4444" />
                    </g>
                  )}

                  {customOther === 'horns' && (
                    <g>
                      <path d={isBulldog ? 'M 35,26 Q 28,10 24,14 Q 30,22 36,25' : 'M 25,26 Q 18,10 14,14 Q 20,22 26,25'} fill="#ef4444" stroke="#7f1d1d" strokeWidth="0.8" />
                      <path d={isBulldog ? 'M 65,26 Q 72,10 76,14 Q 70,22 64,25' : 'M 47,26 Q 54,10 58,14 Q 52,22 46,25'} fill="#ef4444" stroke="#7f1d1d" strokeWidth="0.8" />
                    </g>
                  )}

                  {customOther === 'aviators' && (
                    <g>
                      <line x1={isBulldog ? '34' : '22'} y1="29" x2={isBulldog ? '66' : '48'} y2="29" stroke="#fbbf24" strokeWidth="1.8" />
                      <path d={isBulldog ? 'M 36,28 C 45,28 47,40 40,43 C 34,42 33,35 36,28 Z' : 'M 22,28 C 29,28 31,40 26,42 C 20,41 19,34 22,28 Z'} fill="#1e293b" stroke="#fbbf24" strokeWidth="1.5" />
                      <path d={isBulldog ? 'M 54,28 C 63,28 65,40 58,43 C 52,42 51,35 54,28 Z' : 'M 36,28 C 43,28 45,40 40,42 C 34,41 33,34 36,28 Z'} fill="#1e293b" stroke="#fbbf24" strokeWidth="1.5" />
                    </g>
                  )}
                </>
              )}
            </g>

            {/* Front leg set */}
            <g id="dog-front-legs">
              <g transform={`translate(${isDachshund ? 32 : isBulldog ? 42 : 36}, 65) rotate(${legAngle2})`}>
                <rect x="-4" y="0" width="8" height="15" rx="3" fill={bodyColor} />
              </g>
              <g transform={`translate(${isDachshund ? 60 : isBulldog ? 54 : 48}, 65) rotate(${legAngle1})`}>
                <rect x="-4" y="0" width="8" height="15" rx="3" fill={bodyColor} />
              </g>
            </g>

            {/* Tail */}
            <g transform={`translate(${isDachshund ? '76' : isBulldog ? '68' : '65'}, 46) rotate(${anim === 'run' ? 10 : Math.sin(Date.now() / 80) * 20})`}>
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

  const activeEvoName = (evolution: number) => {
    if (evolution === 2) return 'Alpha Hound';
    if (evolution === 3) return 'Supreme Cyber-Dog';
    return 'Standard Pup';
  };

  const handleCharUnlock = (breed: Breed, costBones: number, costTokens: number) => {
    if (userBones >= costBones && costBones > 0) {
      onUnlock(breed, 'bones');
    } else if (userTokens >= costTokens && costTokens > 0) {
      onUnlock(breed, 'tokens');
    } else {
      GameAudio.playCrash(); // low buzzer sound or rejection sound
    }
  };

  return (
    <div id="character-panel-container" className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* 1. Left selection sidebar (Browse gallery) */}
      <div className="lg:col-span-4 bg-slate-900/60 backdrop-blur-md border border-slate-800/80 rounded-3xl p-5 flex flex-col justify-between max-h-[600px] overflow-y-auto">
        <div>
          <h2 className="text-lg font-display font-black text-slate-100 uppercase italic tracking-tight mb-4 flex items-center gap-2">
            Companion Gallery <Flame className="w-5 h-5 text-orange-500 fill-orange-500/10" />
          </h2>

          <div className="flex flex-col gap-3">
            {characters.map((char) => {
              const isSelected = char.id === selectedPreviewId;
              const isActive = char.id === activeCharacterId;

              return (
                <button
                  key={char.id}
                  id={`comp-select-${char.id}`}
                  onClick={() => {
                    setSelectedPreviewId(char.id);
                    setSelectedCustomFile(null);
                    setRotationAngle(0);
                    GameAudio.playCollect && GameAudio.playCollect(false, false);
                  }}
                  className={`w-full p-3 rounded-2xl border text-left flex items-center gap-3 transition-all relative overflow-hidden group cursor-pointer ${
                    isSelected
                      ? 'bg-orange-950/20 border-orange-500 ring-1 ring-orange-500/25 shadow-[0_0_12px_rgba(249,115,22,0.15)]'
                      : 'bg-slate-950/40 border-slate-800/60 hover:bg-slate-950 hover:border-slate-700'
                  }`}
                >
                  {/* Miniature Circle */}
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 relative ${
                    char.unlocked ? 'bg-slate-900 border border-slate-800' : 'bg-slate-950 text-slate-650'
                  }`}>
                    {renderDogVector(char.breed, 'idle', 40)}
                    {!char.unlocked && (
                      <div className="absolute inset-0 bg-slate-950/80 rounded-xl flex items-center justify-center">
                        <Lock className="w-4 h-4 text-slate-500" />
                      </div>
                    )}
                  </div>

                  {/* Character Name & Level details */}
                  <div className="flex-grow min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="font-display font-bold text-sm tracking-tight text-slate-200 truncate">
                        {char.name}
                      </span>
                      {char.unlocked && (
                        <span className="px-1.5 py-0.5 bg-orange-500/10 border border-orange-500/10 rounded text-[9px] font-mono font-bold text-orange-400">
                          LVL {char.level}
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-slate-500 block truncate font-semibold">
                      {char.unlocked ? activeEvoName(char.evolution) : 'Locked Companion'}
                    </span>
                  </div>

                  {/* Badges */}
                  {isActive && (
                    <span className="absolute top-2 right-2 flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Google Drive GLB Skins Section */}
          {gdriveToken && (
            <div className="mt-6 pt-4 border-t border-slate-800">
              <span className="text-[10px] uppercase font-display font-black text-slate-500 tracking-widest block mb-3">
                Google Drive 3D Skins ({driveGlbFiles.length})
              </span>
              
              {isDriveLoading ? (
                <div className="flex justify-center py-4">
                  <RefreshCw className="w-5 h-5 text-cyan-400 animate-spin" />
                </div>
              ) : driveGlbFiles.length === 0 ? (
                <div className="p-3 bg-slate-950/40 text-center border border-slate-850/60 rounded-xl leading-relaxed">
                  <p className="text-[10px] text-slate-500 font-mono">No custom .glb files found.</p>
                  <p className="text-[8px] text-slate-600 font-mono mt-1 leading-snug">Generate sample templates in your profile tab to preview custom skins!</p>
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  {driveGlbFiles.map((file) => {
                    const isSelected = selectedCustomFile?.id === file.id;
                    const isEquipped = customDogSkin === file.name;
                    return (
                      <button
                        key={file.id}
                        onClick={() => {
                          setSelectedCustomFile(file);
                          if (GameAudio.playCollect) GameAudio.playCollect(false, false);
                        }}
                        className={`w-full p-2.5 rounded-xl border text-left flex items-center gap-2.5 transition-all relative overflow-hidden group cursor-pointer ${
                          isSelected
                            ? 'bg-cyan-950/20 border-cyan-500 ring-1 ring-cyan-500/25 shadow-[0_0_12px_rgba(34,211,238,0.15)]'
                            : 'bg-slate-950/40 border-slate-900 hover:bg-slate-900/30 hover:border-slate-800'
                        }`}
                      >
                        <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 bg-slate-900 border border-slate-800 text-cyan-400`}>
                          <Sparkles className="w-4.5 h-4.5" />
                        </div>
                        <div className="min-w-0 flex-grow">
                          <span className="font-display font-bold text-xs tracking-tight text-slate-200 truncate block">
                            {file.name}
                          </span>
                          <span className="text-[9px] font-mono text-slate-550 block">
                            {file.size ? (parseInt(file.size)/1024/1024).toFixed(2)+' MB' : '3D Model'}
                          </span>
                        </div>
                        {isEquipped && (
                          <span className="absolute top-2 right-2 flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500"></span>
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Currency balances indicators at bottom */}
        <div className="mt-4 border-t border-slate-805 pb-1 pt-4 flex justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 px-3 py-2 bg-slate-950/80 border border-slate-850 rounded-xl flex-grow justify-center font-mono font-bold text-orange-400">
            <Bone className="w-4 h-4 fill-orange-500 text-orange-500" />
            <span>{userBones}</span>
          </div>
          <div className="flex items-center gap-2 px-3 py-2 bg-slate-950/80 border border-slate-850 rounded-xl flex-grow justify-center font-mono font-bold text-cyan-400">
            <Award className="w-4 h-4" />
            <span>{userTokens} HT</span>
          </div>
        </div>
      </div>

      {/* 2. Right preview and actions desk */}
      <div className="lg:col-span-8 bg-slate-900/60 backdrop-blur-md border border-slate-800/80 rounded-3xl p-6 flex flex-col justify-between overflow-hidden relative">
        {/* Fancy star shine */}
        <div className="absolute top-1/2 left-1/2 w-[350px] h-[350px] bg-orange-500/5 rounded-full blur-3xl pointer-events-none -translate-x-1/2 -translate-y-1/2" />

        <div className="relative z-10">
          {/* Header */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-slate-800 pb-4 mb-4">
            {selectedCustomFile ? (
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 bg-cyan-500/10 text-cyan-400 rounded-full text-[10px] font-display font-bold border border-cyan-500/20 tracking-wider uppercase flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-cyan-400" />
                    <span>Google Drive 3D Model</span>
                  </span>
                  {customDogSkin === selectedCustomFile.name && (
                    <span className="px-2 bg-emerald-500/10 text-emerald-400 rounded-full text-[9px] font-mono font-bold uppercase border border-emerald-500/10">
                      EQUIPPED SKIN
                    </span>
                  )}
                </div>
                <h1 className="text-2xl font-display font-black italic uppercase text-slate-100 tracking-tight mt-1">
                  {selectedCustomFile.name}
                </h1>
              </div>
            ) : (
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 bg-orange-500/10 text-orange-400 rounded-full text-[10px] font-display font-bold border border-orange-500/20 tracking-wider uppercase">
                    {activePreviewChar.id}
                  </span>

                  {activePreviewChar.evolution > 1 && (
                    <span className="px-2.5 py-0.5 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-full text-[9px] font-display font-black uppercase flex items-center gap-1 shadow-sm">
                      <Sparkles className="w-2.5 h-2.5 animate-spin-slow" />
                      <span>{activeEvoName(activePreviewChar.evolution)}</span>
                    </span>
                  )}
                </div>
                <h1 className="text-2xl font-display font-black italic uppercase text-slate-100 tracking-tight mt-1">
                  {activePreviewChar.name}
                </h1>
              </div>
            )}

            {/* Quick procedural animator controls for default dogs */}
            {!selectedCustomFile && (
              <div className="flex items-center gap-2">
                <button
                  onClick={rotatePreview}
                  className="p-2 cursor-pointer bg-slate-850 hover:bg-slate-800 border border-slate-800 text-slate-350 rounded-xl hover:scale-105 active:scale-95 transition-all"
                  title="Rotate dog"
                >
                  <RotateCw className="w-4 h-4" />
                </button>
                <button
                  onClick={handleWalk}
                  className="px-3 py-1.5 cursor-pointer bg-slate-850 hover:bg-slate-800 border border-slate-800 text-slate-350 text-xs font-display font-bold rounded-xl hover:scale-105 active:scale-95 transition-all"
                >
                  Bark
                </button>
                <button
                  onClick={handleHowl}
                  className="px-3 py-1.5 cursor-pointer bg-slate-850 hover:bg-slate-800 border border-slate-800 text-slate-350 text-xs font-display font-bold rounded-xl hover:scale-105 active:scale-95 transition-all"
                >
                  Howl
                </button>
                <button
                  onClick={handleRun}
                  className="px-3 py-1.5 cursor-pointer bg-slate-950 border border-orange-500/25 hover:border-orange-500 hover:bg-slate-900 text-orange-455 text-xs font-display font-bold rounded-xl hover:scale-105 active:scale-95 transition-all"
                >
                  Watch Run
                </button>
                {activePreviewChar.unlocked && activePreviewChar.id === activeCharacterId && (
                  <button
                    onClick={() => setIsCustomizerOpen(true)}
                    className="px-3 py-1.5 cursor-pointer bg-gradient-to-r from-yellow-500/10 to-orange-500/10 hover:from-yellow-500/25 hover:to-orange-500/25 border border-orange-500/40 text-orange-400 text-xs font-display font-extrabold rounded-xl hover:scale-105 active:scale-95 transition-all flex items-center gap-1.5"
                  >
                    <Paintbrush className="w-3.5 h-3.5" />
                    <span>Customize Style</span>
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Interactive render viewport */}
          {selectedCustomFile ? (
            <div className="w-full h-48 bg-slate-950 rounded-2xl flex flex-col items-center justify-center p-4 border border-cyan-500/20 shadow-[inset_0_2px_20px_rgba(6,182,212,0.08),0_0_30px_rgba(6,182,212,0.04)] relative overflow-hidden">
              <div className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(15,23,42,0)_60%,rgba(15,23,42,0.95)_100%)] z-10 pointer-events-none" />
              
              {/* Circular radar mesh */}
              <div className="absolute w-36 h-36 rounded-full border border-dashed border-cyan-500/20 animate-spin-slow flex items-center justify-center">
                <div className="w-28 h-28 rounded-full border border-dashed border-cyan-500/10" />
              </div>

              <Sparkles className="w-12 h-12 text-cyan-400 animate-pulse relative z-10 drop-shadow-[0_0_15px_rgba(34,211,238,0.5)]" />
              
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-center pointer-events-none z-20 w-full px-4">
                <span className="text-[9px] font-mono font-bold text-cyan-400 tracking-widest uppercase animate-pulse">
                  3D GLB HOLOGRAPHIC PARTNER
                </span>
                <span className="text-xs text-slate-300 font-semibold block mt-0.5 truncate max-w-[280px] mx-auto">
                  {selectedCustomFile.name}
                </span>
              </div>
            </div>
          ) : (
            <div className="w-full h-48 bg-slate-950 rounded-2xl flex items-center justify-center p-4 border border-orange-500/20 shadow-[inset_0_2px_20px_rgba(249,115,22,0.08),0_0_30px_rgba(249,115,22,0.04)] relative overflow-hidden">
              <div className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(15,23,42,0)_60%,rgba(15,23,42,0.95)_100%)] z-10 pointer-events-none" />
              <div className="absolute bottom-6 w-32 h-2.5 bg-black/40 rounded-full blur-md" opacity="0.35" />

              {renderDogVector(activePreviewChar.breed, previewAnimation, 140, rotationAngle)}
            </div>
          )}

          {/* Perks & Technical Attributes list */}
          {selectedCustomFile ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6">
              <div className="bg-slate-950/60 p-4 rounded-2xl border border-slate-850/80">
                <span className="text-[10px] uppercase font-display font-black text-slate-500 tracking-widest block font-bold">
                  Google Drive 3D Skin Specs
                </span>
                <p className="text-cyan-400 text-sm font-extrabold tracking-tight mt-1 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-cyan-405 flex-shrink-0" />
                  <span>Custom Asset Mesh</span>
                </p>
                <p className="text-slate-400 text-xs mt-1.5 italic font-medium leading-relaxed">
                  "Directly loaded from Google Drive. Renders in the agility run with real-time 3D physics, rotations, and full collision bounds."
                </p>
              </div>

              <div className="bg-slate-950/60 p-4 rounded-2xl border border-slate-850/80 flex flex-col justify-between">
                <div>
                  <span className="text-[10px] uppercase font-display font-black text-slate-500 tracking-widest block mb-2 font-bold">
                    Partner Integration
                  </span>
                  <p className="text-slate-400 text-xs font-semibold leading-relaxed">
                    Wraps your active partner <span className="text-orange-400 font-bold">{activePreviewChar.name}</span> in this custom 3D appearance so you retain all your current highscores, level progress, speed, and jump perks!
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6">
              <div className="bg-slate-950/60 p-4 rounded-2xl border border-slate-850/80">
                <span className="text-[10px] uppercase font-display font-black text-slate-500 tracking-widest block">
                  Special Ability & Perk
                </span>
                <p className="text-orange-455 text-sm font-extrabold tracking-tight mt-1 flex items-center gap-2">
                  <Shield className="w-4 h-4 text-orange-505 flex-shrink-0" />
                  <span>{activePreviewChar.specialPerk}</span>
                </p>
                <p className="text-slate-400 text-xs mt-1.5 italic font-medium leading-relaxed">
                  "{activePreviewChar.description}"
                </p>
              </div>

              <div className="bg-slate-950/60 p-4 rounded-2xl border border-slate-850/80 flex flex-col justify-between">
                {/* Stats progress bars */}
                <div>
                  <span className="text-[10px] uppercase font-display font-black text-slate-500 tracking-widest block mb-2.5">
                    Training Attributes
                  </span>

                  <div className="space-y-3">
                    <div>
                      <div className="flex justify-between items-center text-[10px] font-mono text-slate-400 mb-0.5 font-bold">
                        <span>RUNNING SPEED</span>
                        <span className="font-extrabold text-orange-500">{(activePreviewChar.baseSpeed * 10).toFixed(1)} km/h</span>
                      </div>
                      <div className="w-full h-1.5 bg-slate-850 rounded-full overflow-hidden">
                        <div className="h-full bg-orange-500 rounded-full shadow-[0_0_8px_#f97316]" style={{ width: `${activePreviewChar.baseSpeed * 50}%` }} />
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between items-center text-[10px] font-mono text-slate-400 mb-0.5 font-bold">
                        <span>JUMPING HEIGHT</span>
                        <span className="font-extrabold text-cyan-400">{(activePreviewChar.baseJump * 3).toFixed(1)}m</span>
                      </div>
                      <div className="w-full h-1.5 bg-slate-850 rounded-full overflow-hidden">
                        <div className="h-full bg-cyan-400 rounded-full shadow-[0_0_8px_#22d3ee]" style={{ width: `${activePreviewChar.baseJump * 50}%` }} />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 3. Bottom primary CTA button: Select, Buy, Upgrade, Evolve */}
        <div className="border-t border-slate-800 pt-5 mt-6 flex flex-col sm:flex-row justify-between items-center gap-4 relative z-10">
          {selectedCustomFile ? (
            customDogSkin === selectedCustomFile.name ? (
              <>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-cyan-400" />
                  <span className="text-slate-300 text-xs font-bold uppercase tracking-wide">3D GLB Model Currently Active & Injected!</span>
                </div>
                <button
                  onClick={() => {
                    if (onClearCustomSkin) {
                      onClearCustomSkin();
                      setSelectedCustomFile(null);
                      if (GameAudio.playCollect) GameAudio.playCollect(false, false);
                    }
                  }}
                  className="px-5 py-2 cursor-pointer bg-red-500/10 hover:bg-red-500/20 border border-red-500/15 text-red-400 text-xs uppercase font-extrabold rounded-full transition-all"
                >
                  Clear Custom Skin
                </button>
              </>
            ) : (
              <>
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-cyan-400" />
                  <span className="text-slate-300 text-xs font-semibold">Ready to equip this 3D model skin direct from Drive:</span>
                </div>
                <button
                  onClick={() => {
                    if (onSelectCustomSkin) {
                      onSelectCustomSkin(selectedCustomFile.name, selectedCustomFile.id);
                    }
                  }}
                  className="px-6 py-2.5 cursor-pointer bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-white rounded-full text-xs uppercase tracking-widest font-display font-black transition-all shadow-[0_0_15px_rgba(6,182,212,0.3)] animate-pulse"
                >
                  Equip Custom 3D Model
                </button>
              </>
            )
          ) : activePreviewChar.unlocked ? (
            <>
              {/* Evolve Option */}
              <div className="flex items-center gap-4">
                <div>
                  <div className="text-[9px] uppercase font-display font-black text-slate-500 tracking-wider">
                    Evolution Progress
                  </div>
                  <div className="text-slate-350 font-display font-bold text-xs mt-0.5">
                    {activePreviewChar.evolution === 3 ? (
                      <span className="text-emerald-400 flex items-center gap-1 font-bold">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Supreme Ascension Reached</span>
                      </span>
                    ) : (
                      <span>Evolve to {activeEvoName(activePreviewChar.evolution + 1)}</span>
                    )}
                  </div>
                </div>
                {activePreviewChar.evolution < 3 && (
                  <button
                    disabled={activePreviewChar.level < (activePreviewChar.evolution === 1 ? 3 : 6)}
                    onClick={() => {
                      GameAudio.playLevelUp && GameAudio.playLevelUp();
                      onEvolve(activePreviewChar.id);
                    }}
                    className={`px-4 py-2 rounded-xl text-xs font-display font-bold tracking-wider uppercase transition-all shadow-md ${
                      activePreviewChar.level >= (activePreviewChar.evolution === 1 ? 3 : 6)
                        ? 'bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-400 hover:to-red-400 shadow-[0_0_15px_rgba(249,115,22,0.3)] text-white cursor-pointer hover:scale-105 active:scale-95'
                        : 'bg-slate-800/80 text-slate-500 border border-slate-750 cursor-not-allowed'
                    }`}
                    title={activePreviewChar.level < (activePreviewChar.evolution === 1 ? 3 : 6) ? `Requires level ${activePreviewChar.evolution === 1 ? 3 : 6} to evolve!` : ''}
                  >
                    🚀 Evolve (Lvl {activePreviewChar.evolution === 1 ? '3' : '6'})
                  </button>
                )}
              </div>

              {/* Select Active Companion */}
              {activeCharacterId === activePreviewChar.id ? (
                <div className="px-5 py-2.5 bg-emerald-950/20 text-emerald-400 rounded-full border border-emerald-500/20 text-xs uppercase tracking-widest font-display font-black flex items-center gap-1.5 shadow-sm">
                  <CheckCircle2 className="w-4 h-4 text-emerald-405" />
                  <span>Licensed Partner</span>
                </div>
              ) : (
                <button
                  onClick={() => {
                    GameAudio.playBark && GameAudio.playBark(activePreviewChar.id === 'chihuahua');
                    onSelect(activePreviewChar.id);
                  }}
                  className="px-6 py-2.5 cursor-pointer bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-400 hover:to-amber-400 text-slate-950 rounded-full text-xs uppercase tracking-widest font-display font-black transition-all shadow-[0_0_15px_rgba(249,115,22,0.3)]"
                >
                  Equip {activePreviewChar.name}
                </button>
              )}
            </>
          ) : (
            <>
              {/* Locked options */}
              <div className="flex items-center gap-2">
                <Lock className="w-4 h-4 text-slate-500" />
                <span className="text-slate-400 text-xs font-semibold">Spend training currencies to unlock {activePreviewChar.name}:</span>
              </div>

              <div className="flex items-center gap-3">
                {activePreviewChar.costBones > 0 && (
                  <button
                    disabled={userBones < activePreviewChar.costBones}
                    onClick={() => handleCharUnlock(activePreviewChar.id, activePreviewChar.costBones, 0)}
                    className={`px-5 py-2 rounded-full cursor-pointer transition-all hover:scale-105 active:scale-95 text-xs font-display font-bold shadow-md flex items-center gap-1.5 ${
                      userBones >= activePreviewChar.costBones
                        ? 'bg-amber-500 hover:bg-amber-400 text-slate-950'
                        : 'bg-slate-800 text-slate-600 border border-slate-700 cursor-not-allowed'
                    }`}
                  >
                    <Bone className="w-3.5 h-3.5 fill-current" />
                    <span>Unlock: {activePreviewChar.costBones}</span>
                  </button>
                )}

                {activePreviewChar.costTokens > 0 && (
                  <button
                    disabled={userTokens < activePreviewChar.costTokens}
                    onClick={() => handleCharUnlock(activePreviewChar.id, 0, activePreviewChar.costTokens)}
                    className={`px-5 py-2 rounded-full cursor-pointer transition-all hover:scale-105 active:scale-95 text-xs font-display font-bold shadow-md flex items-center gap-1.5 ${
                      userTokens >= activePreviewChar.costTokens
                        ? 'bg-cyan-500 hover:bg-cyan-400 text-slate-950'
                        : 'bg-slate-800 text-slate-600 border border-slate-700 cursor-not-allowed'
                    }`}
                  >
                    <Award className="w-3.5 h-3.5" />
                    <span>Unlock: {activePreviewChar.costTokens} HT</span>
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      <CustomizationModal
        isOpen={isCustomizerOpen}
        onClose={() => setIsCustomizerOpen(false)}
        activeBreed={activeCharacterId}
        customRound={customRound}
        customOther={customOther}
        onSave={onSaveCustomizations}
      />
    </div>
  );
};
