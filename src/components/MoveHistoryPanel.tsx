import React, { useRef, useEffect } from 'react';
import { MoveRecord } from '../types/chess';
import { Copy, Lightbulb, Play, RotateCcw, Volume2, VolumeX, Eye } from 'lucide-react';

interface MoveHistoryPanelProps {
  history: MoveRecord[];
  activeMoveIndex: number | null; // null means live current position
  onSelectMoveIndex: (index: number | null) => void;
  onCopyPgn: () => void;
  onRequestHint: () => void;
  onFlipBoard: () => void;
  isSoundOn: boolean;
  onToggleSound: () => void;
  showArrows: boolean;
  onToggleArrows: () => void;
  isGodMode: boolean;
  onToggleGodMode: () => void;
  isThinking: boolean;
  isGameOver: boolean;
}

export const MoveHistoryPanel = React.memo<MoveHistoryPanelProps>(({
  history,
  activeMoveIndex,
  onSelectMoveIndex,
  onCopyPgn,
  onRequestHint,
  onFlipBoard,
  isSoundOn,
  onToggleSound,
  showArrows,
  onToggleArrows,
  isGodMode,
  onToggleGodMode,
  isThinking,
  isGameOver
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new moves if watching live
  useEffect(() => {
    if (activeMoveIndex === null && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [history.length, activeMoveIndex]);

  // Group moves in pairs (White, Black)
  const movePairs: { moveNumber: number; white?: { san: string; index: number }; black?: { san: string; index: number } }[] = [];
  for (let i = 0; i < history.length; i += 2) {
    const moveNumber = Math.floor(i / 2) + 1;
    movePairs.push({
      moveNumber,
      white: { san: history[i].san, index: i },
      black: history[i + 1] ? { san: history[i + 1].san, index: i + 1 } : undefined
    });
  }

  return (
    <div className="w-full bg-[#060913]/90 border border-[#d4af37]/30 rounded-2xl p-3 sm:p-4 flex flex-col gap-3 shadow-xl backdrop-blur-md">
      {/* Control Buttons Bar */}
      <div className="flex items-center justify-between gap-1.5 pb-2 border-b border-[#d4af37]/20 flex-wrap">
        <div className="flex items-center gap-1.5">
          {/* Hint Button */}
          <button
            onClick={onRequestHint}
            disabled={isThinking || isGameOver || activeMoveIndex !== null}
            className="px-2.5 py-1.5 rounded-lg bg-[#0d1424] hover:bg-[#16213b] disabled:opacity-40 border border-[#d4af37]/40 text-amber-200 text-xs font-semibold flex items-center gap-1 transition cursor-pointer active:scale-95 shadow-sm"
            title="Get tactical move recommendation"
          >
            <Lightbulb className="w-3.5 h-3.5 text-amber-400" />
            <span>Hint</span>
          </button>

          {/* Copy PGN Button */}
          <button
            onClick={onCopyPgn}
            disabled={history.length === 0}
            className="px-2.5 py-1.5 rounded-lg bg-[#0d1424] hover:bg-[#16213b] disabled:opacity-40 border border-slate-700 hover:border-[#d4af37]/40 text-slate-300 hover:text-amber-200 text-xs font-semibold flex items-center gap-1 transition cursor-pointer active:scale-95"
            title="Copy game PGN to clipboard"
          >
            <Copy className="w-3.5 h-3.5 text-slate-400" />
            <span>PGN</span>
          </button>

          {/* Flip Board Button */}
          <button
            onClick={onFlipBoard}
            className="px-2.5 py-1.5 rounded-lg bg-[#0d1424] hover:bg-[#16213b] border border-slate-700 hover:border-[#d4af37]/40 text-slate-300 hover:text-amber-200 text-xs font-semibold flex items-center gap-1 transition cursor-pointer active:scale-95"
            title="Flip Board Orientation"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Flip</span>
          </button>
        </div>

        {/* Quick Toggles (Sound, Arrows, God Mode) */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={onToggleSound}
            className={`p-1.5 rounded-lg border transition cursor-pointer ${
              isSoundOn
                ? 'bg-amber-500/20 border-[#d4af37]/50 text-[#d4af37]'
                : 'bg-slate-900 border-slate-800 text-slate-500'
            }`}
            title={isSoundOn ? 'Sound: ON' : 'Sound: OFF'}
          >
            {isSoundOn ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
          </button>

          <button
            onClick={onToggleArrows}
            className={`p-1.5 rounded-lg border transition cursor-pointer text-xs font-bold ${
              showArrows
                ? 'bg-amber-500/20 border-[#d4af37]/50 text-[#d4af37]'
                : 'bg-slate-900 border-slate-800 text-slate-500'
            }`}
            title={showArrows ? 'Tactical Arrows: ON' : 'Tactical Arrows: OFF'}
          >
            <Eye className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={onToggleGodMode}
            className={`px-2 py-1 rounded-lg border text-[11px] font-bold transition cursor-pointer ${
              isGodMode
                ? 'bg-amber-500/30 border-[#d4af37] text-amber-300 shadow-[0_0_8px_rgba(212,175,55,0.4)]'
                : 'bg-slate-900 border-slate-800 text-slate-500'
            }`}
            title="God Mode: freely drag or delete any piece"
          >
            ⚡ God
          </button>
        </div>
      </div>

      {/* Historical Inspection Alert Pill */}
      {activeMoveIndex !== null && (
        <div className="flex items-center justify-between px-3 py-1.5 rounded-xl bg-amber-500/20 border border-amber-400/50 text-amber-200 text-xs animate-fade-in">
          <span className="font-medium">
            Viewing move {activeMoveIndex + 1} (Read Only)
          </span>
          <button
            onClick={() => onSelectMoveIndex(null)}
            className="px-2 py-0.5 rounded-md bg-amber-500 text-slate-950 font-bold text-[10px] uppercase hover:brightness-110 cursor-pointer flex items-center gap-1"
          >
            <Play className="w-2.5 h-2.5 fill-current" />
            Live
          </button>
        </div>
      )}

      {/* Scrollable Move History Table */}
      <div
        ref={scrollRef}
        className="max-h-24 sm:max-h-28 overflow-y-auto pr-1 space-y-1 scrollbar-thin scrollbar-thumb-[#d4af37]/30 text-xs font-mono select-none"
      >
        {movePairs.length === 0 ? (
          <div className="text-center py-4 text-slate-500 text-xs italic font-sans">
            No moves played yet. Start by making your first move.
          </div>
        ) : (
          movePairs.map((pair) => (
            <div key={pair.moveNumber} className="grid grid-cols-12 gap-1 items-center py-0.5 px-1 rounded hover:bg-slate-800/40">
              <span className="col-span-2 text-slate-500 text-right pr-1 font-sans">
                {pair.moveNumber}.
              </span>

              {/* White Move */}
              <button
                onClick={() => onSelectMoveIndex(pair.white?.index ?? null)}
                className={`col-span-5 text-left px-1.5 py-0.5 rounded transition cursor-pointer ${
                  activeMoveIndex === pair.white?.index
                    ? 'bg-[#d4af37] text-slate-950 font-bold'
                    : 'text-amber-100/90 hover:bg-[#d4af37]/20'
                }`}
              >
                {pair.white?.san || ''}
              </button>

              {/* Black Move */}
              <button
                onClick={() => onSelectMoveIndex(pair.black?.index ?? null)}
                className={`col-span-5 text-left px-1.5 py-0.5 rounded transition cursor-pointer ${
                  activeMoveIndex === pair.black?.index
                    ? 'bg-[#d4af37] text-slate-950 font-bold'
                    : 'text-amber-100/70 hover:bg-[#d4af37]/20'
                }`}
              >
                {pair.black?.san || ''}
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
});
