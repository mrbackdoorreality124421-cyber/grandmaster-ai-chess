import React from 'react';
import { AIPersonality, EngineEvaluation } from '../types/chess';

interface EngineAnalysisPanelProps {
  evaluation: EngineEvaluation;
  personality: AIPersonality;
  onAutoPlayMove: () => void;
  onDeepSolve: () => void;
  isEngineThinking: boolean;
  activeTurn: 'w' | 'b';
}

export const EngineAnalysisPanel: React.FC<EngineAnalysisPanelProps> = ({
  evaluation,
  personality,
  onAutoPlayMove,
  onDeepSolve,
  isEngineThinking,
  activeTurn
}) => {
  const { scoreCp, mate, depth, nps, nodes, bestMove, pv } = evaluation;

  let evalFormatted = '0.0';
  if (mate !== null && mate !== undefined) {
    evalFormatted = mate > 0 ? `+M${mate}` : `-M${Math.abs(mate)}`;
  } else if (scoreCp !== null && scoreCp !== undefined) {
    const cp = (scoreCp / 100).toFixed(2);
    evalFormatted = scoreCp > 0 ? `+${cp}` : cp;
  }

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 shadow-xl backdrop-blur-md flex flex-col gap-3">
      {/* Title & Engine Status */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-2">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-xs font-bold text-slate-200 uppercase tracking-wider">
            Stockfish Wasm Live Engine
          </span>
        </div>
        <div className="flex items-center gap-1 text-[11px] font-mono text-slate-400">
          <span>Target Depth:</span>
          <span className="text-amber-400 font-bold">{personality.depth}</span>
        </div>
      </div>

      {/* Primary Metrics Grid */}
      <div className="grid grid-cols-3 gap-2 text-center">
        {/* Evaluation Score */}
        <div className="bg-slate-950/70 p-2.5 rounded-lg border border-slate-800">
          <span className="text-[10px] text-slate-400 block font-medium uppercase">Eval Score</span>
          <span
            className={`text-base font-black font-mono tracking-tight ${
              mate !== null
                ? 'text-amber-400'
                : (scoreCp ?? 0) > 50
                ? 'text-emerald-400'
                : (scoreCp ?? 0) < -50
                ? 'text-rose-400'
                : 'text-slate-200'
            }`}
          >
            {evalFormatted}
          </span>
        </div>

        {/* Calculation Depth */}
        <div className="bg-slate-950/70 p-2.5 rounded-lg border border-slate-800">
          <span className="text-[10px] text-slate-400 block font-medium uppercase">Depth / Seldepth</span>
          <span className="text-base font-black font-mono text-slate-200">
            {depth || 0} <span className="text-xs text-slate-500 font-normal">ply</span>
          </span>
        </div>

        {/* Speed / NPS */}
        <div className="bg-slate-950/70 p-2.5 rounded-lg border border-slate-800">
          <span className="text-[10px] text-slate-400 block font-medium uppercase">Speed (NPS)</span>
          <span className="text-base font-black font-mono text-slate-200">
            {nps ? `${Math.round(nps / 1000)}k` : 'Idle'}
          </span>
        </div>
      </div>

      {/* Best Move & PV String */}
      <div className="bg-slate-950/60 p-3 rounded-lg border border-slate-800/80 space-y-1.5 font-mono text-xs">
        <div className="flex items-center justify-between">
          <span className="text-slate-400">Best Recommended Move:</span>
          <span className="font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
            {bestMove || 'Calculating...'}
          </span>
        </div>

        {pv && pv.length > 0 && (
          <div className="text-[11px] text-slate-400 truncate">
            <span className="text-slate-500">PV Line: </span>
            <span className="text-slate-300 font-mono">{pv.slice(0, 6).join(' ')}</span>
          </div>
        )}
      </div>

      {/* Swag / Hacker Mode Psychological Pressure */}
      {personality.id === 'hacker_extreme' && (
        <div className="bg-rose-950/30 border border-rose-900/50 p-2.5 rounded-lg text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-base">🕶️</span>
            <div>
              <p className="font-bold text-rose-300 text-[11px]">Hacker Contempt Factor: +100</p>
              <p className="text-[10px] text-rose-400">Sacrificing material for maximum psychological panic</p>
            </div>
          </div>
          <span className="px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 font-mono font-bold text-[10px]">
            CHAOS MODE
          </span>
        </div>
      )}

      {/* Fast Action Buttons */}
      <div className="grid grid-cols-2 gap-2 pt-1">
        <button
          onClick={onAutoPlayMove}
          disabled={!bestMove || isEngineThinking}
          className="px-3 py-2 bg-emerald-500/10 hover:bg-emerald-500/20 active:scale-95 disabled:opacity-40 disabled:pointer-events-none text-emerald-400 font-bold text-xs rounded-lg border border-emerald-500/30 transition flex items-center justify-center gap-1.5"
        >
          <span>⚡</span> Play Engine Move
        </button>

        <button
          onClick={onDeepSolve}
          className="px-3 py-2 bg-amber-500/10 hover:bg-amber-500/20 active:scale-95 text-amber-400 font-bold text-xs rounded-lg border border-amber-500/30 transition flex items-center justify-center gap-1.5"
        >
          <span>🔍</span> Deep Solve (Depth 20+)
        </button>
      </div>
    </div>
  );
};
