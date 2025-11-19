import React from 'react';
import { TargetZone, GameState } from '../types';

interface GameTrackProps {
  cursorPosition: number;
  targets: TargetZone[];
  gameState: GameState;
  onTrackClick: () => void;
}

export const GameTrack: React.FC<GameTrackProps> = ({ 
  cursorPosition, 
  targets, 
  gameState,
  onTrackClick 
}) => {
  
  const isPunished = gameState === GameState.PUNISHED;

  return (
    <div 
      className="relative w-full max-w-3xl h-24 cursor-crosshair select-none touch-manipulation"
      onClick={onTrackClick}
    >
      {/* Track Background */}
      <div className={`
        absolute inset-0 border-2 transition-colors duration-300
        ${isPunished ? 'border-red-600 bg-red-950/20' : 'border-slate-600 bg-black/60'}
        shadow-[inset_0_0_20px_rgba(0,0,0,0.8)]
        backdrop-blur-sm
      `}>
        {/* Grid Lines */}
        <div className="absolute inset-0 opacity-20 bg-[linear-gradient(90deg,transparent_0%,transparent_49%,rgba(255,255,255,0.1)_50%,transparent_51%,transparent_100%)] bg-[length:20px_100%]" />
      </div>

      {/* Center Line */}
      <div className="absolute top-1/2 left-0 w-full h-0.5 bg-white/10 -translate-y-1/2" />

      {/* Target Zones */}
      {targets.map((target) => (
        <div
          key={target.id}
          style={{ 
            left: `${target.start}%`, 
            width: `${target.width}%` 
          }}
          className={`
            absolute top-2 bottom-2 border-l border-r transition-all duration-200
            ${target.hit 
              ? 'bg-gray-600/20 border-gray-500/30' // Inactive/Hit state
              : isPunished 
                ? 'bg-red-900/30 border-red-500/30 blur-[1px]' // Punished state
                : 'bg-green-500/20 border-green-400 animate-pulse shadow-[0_0_15px_rgba(57,255,20,0.4)]' // Active state
            }
          `}
        >
          {!target.hit && !isPunished && (
            <div className="absolute inset-0 bg-green-400/10 animate-ping opacity-20" />
          )}
        </div>
      ))}

      {/* Cursor */}
      <div
        style={{ left: `${cursorPosition}%` }}
        className={`
          absolute top-0 bottom-0 w-1 -ml-0.5 z-20 transition-transform duration-75 ease-linear will-change-transform
          ${isPunished ? 'bg-red-500 shadow-[0_0_15px_#ff0000]' : 'bg-white shadow-[0_0_15px_#ffffff]'}
        `}
      >
        {/* Cursor Head */}
        <div className={`
          absolute -top-2 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[8px]
          ${isPunished ? 'border-t-red-500' : 'border-t-cyan-400'}
        `} />
        
        {/* Cursor Tail */}
        <div className={`
          absolute -bottom-2 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-b-[8px]
          ${isPunished ? 'border-b-red-500' : 'border-b-cyan-400'}
        `} />
      </div>

      {/* Click Area Hint */}
      <div className="absolute -bottom-8 w-full text-center text-xs text-gray-500 font-mono tracking-widest">
        [ CLICK TO SYNC ]
      </div>
    </div>
  );
};