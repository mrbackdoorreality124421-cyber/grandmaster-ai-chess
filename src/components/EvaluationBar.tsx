import React from 'react';
import { EngineEvaluation } from '../types/chess';

interface EvaluationBarProps {
  evaluation: EngineEvaluation;
  isFlipped: boolean; // true if Black is at bottom
}

export const EvaluationBar: React.FC<EvaluationBarProps> = ({ evaluation, isFlipped }) => {
  const { scoreCp, mate } = evaluation;

  // Calculate percentage of bar for White (0% to 100%, 50% is equal)
  let whitePercent = 50;
  let label = '0.0';
  let isMate = false;

  if (mate !== null && mate !== undefined) {
    isMate = true;
    if (mate > 0) {
      whitePercent = 100;
      label = `M${mate}`;
    } else if (mate < 0) {
      whitePercent = 0;
      label = `-M${Math.abs(mate)}`;
    } else {
      whitePercent = 50;
      label = 'M0';
    }
  } else if (scoreCp !== null && scoreCp !== undefined) {
    // Standard logistic curve for centipawns conversion (-1000 to +1000)
    // Clipped between -1000 and +1000
    const clampedCp = Math.max(-1000, Math.min(1000, scoreCp));
    // Scale 0 to 100
    whitePercent = 50 + (50 * (2 / (1 + Math.exp(-0.00368208 * clampedCp)) - 1));
    whitePercent = Math.max(5, Math.min(95, whitePercent)); // Keep visible sliver

    const evalInPawns = (scoreCp / 100).toFixed(1);
    label = scoreCp > 0 ? `+${evalInPawns}` : evalInPawns;
  }

  // If flipped, top is White and bottom is Black. Standard: top is Black, bottom is White.
  const displayWhiteHeight = isFlipped ? 100 - whitePercent : whitePercent;

  return (
    <div className="flex flex-col items-center select-none w-7 md:w-8 h-full bg-slate-900 rounded-lg overflow-hidden border border-slate-700/60 shadow-xl relative group">
      {/* Top Section (Black by default, White if flipped) */}
      <div 
        className="w-full transition-all duration-300 ease-out bg-slate-950 flex flex-col justify-start items-center pt-1"
        style={{ height: `${100 - displayWhiteHeight}%` }}
      >
        {!isFlipped && (scoreCp !== null && scoreCp < 0 || (mate !== null && mate < 0)) && (
          <span className="text-[10px] md:text-xs font-mono font-bold text-slate-300 px-0.5 tracking-tighter">
            {label}
          </span>
        )}
      </div>

      {/* Center 0.0 marker line */}
      <div className="absolute top-1/2 left-0 w-full h-[1px] bg-amber-400/40 z-10 pointer-events-none" />

      {/* Bottom Section (White by default, Black if flipped) */}
      <div 
        className="w-full transition-all duration-300 ease-out bg-slate-100 flex flex-col justify-end items-center pb-1"
        style={{ height: `${displayWhiteHeight}%` }}
      >
        {(!isFlipped && (scoreCp !== null && scoreCp >= 0 && (mate === null || mate >= 0))) && (
          <span className="text-[10px] md:text-xs font-mono font-bold text-slate-900 px-0.5 tracking-tighter">
            {label}
          </span>
        )}
        {isFlipped && (scoreCp !== null && scoreCp < 0 || (mate !== null && mate < 0)) && (
          <span className="text-[10px] md:text-xs font-mono font-bold text-slate-900 px-0.5 tracking-tighter">
            {label}
          </span>
        )}
      </div>

      {/* Tooltip on hover */}
      <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute left-10 top-1/2 -translate-y-1/2 bg-slate-800 text-slate-200 text-xs px-2.5 py-1.5 rounded-md border border-slate-700 shadow-2xl z-30 pointer-events-none whitespace-nowrap">
        <p className="font-semibold text-amber-400">{isMate ? 'Checkmate Sequence' : 'Centipawn Evaluation'}</p>
        <p className="text-[11px] text-slate-300">Score: {label}</p>
        <p className="text-[11px] text-slate-400">White Win Chance: {Math.round(whitePercent)}%</p>
      </div>
    </div>
  );
};
