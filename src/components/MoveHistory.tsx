import React, { useState } from 'react';
import { MoveRecord } from '../types/chess';

interface MoveHistoryProps {
  history: MoveRecord[];
  currentMoveIndex: number;
  onNavigateHistory: (index: number) => void;
  fen: string;
  onLoadFen: (fen: string) => void;
}

export const MoveHistory: React.FC<MoveHistoryProps> = ({
  history,
  currentMoveIndex,
  onNavigateHistory,
  fen,
  onLoadFen
}) => {
  const [showFenModal, setShowFenModal] = useState(false);
  const [customFenInput, setCustomFenInput] = useState('');
  const [copiedNotification, setCopiedNotification] = useState<string | null>(null);

  // Group moves into pairs (White move, Black move)
  const movePairs: { num: number; white?: MoveRecord; black?: MoveRecord; whiteIdx?: number; blackIdx?: number }[] = [];
  for (let i = 0; i < history.length; i += 2) {
    movePairs.push({
      num: Math.floor(i / 2) + 1,
      white: history[i],
      whiteIdx: i,
      black: history[i + 1],
      blackIdx: i + 1 < history.length ? i + 1 : undefined
    });
  }

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedNotification(label);
    setTimeout(() => setCopiedNotification(null), 2000);
  };

  const generatePgnString = () => {
    return movePairs
      .map((pair) => `${pair.num}. ${pair.white?.san || ''} ${pair.black?.san || ''}`)
      .join(' ')
      .trim();
  };

  const handleApplyCustomFen = () => {
    if (customFenInput.trim()) {
      onLoadFen(customFenInput.trim());
      setShowFenModal(false);
      setCustomFenInput('');
    }
  };

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3.5 shadow-xl backdrop-blur-md flex flex-col h-full">
      {/* Header & Copy Actions */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-2">
        <div className="flex items-center gap-1.5">
          <span className="text-slate-300 font-bold text-xs uppercase tracking-wider">
            Move Notation & History
          </span>
          <span className="text-[10px] bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded font-mono">
            {history.length} plies
          </span>
        </div>

        <div className="flex items-center gap-1.5 text-xs">
          <button
            onClick={() => copyToClipboard(fen, 'FEN copied')}
            className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded border border-slate-700 transition"
            title="Copy current board FEN"
          >
            Copy FEN
          </button>
          <button
            onClick={() => copyToClipboard(generatePgnString(), 'PGN copied')}
            className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded border border-slate-700 transition"
            title="Copy game PGN"
          >
            Copy PGN
          </button>
          <button
            onClick={() => {
              setCustomFenInput(fen);
              setShowFenModal(true);
            }}
            className="px-2 py-1 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 rounded border border-amber-500/30 transition"
            title="Import custom FEN position"
          >
            Load FEN
          </button>
        </div>
      </div>

      {copiedNotification && (
        <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[11px] px-2 py-1 rounded mb-2 text-center animate-fade-in font-mono">
          ✓ {copiedNotification} to clipboard
        </div>
      )}

      {/* Move History Table / Ticker */}
      <div className="flex-1 overflow-y-auto max-h-[160px] md:max-h-[220px] pr-1 space-y-1 font-mono text-xs">
        {movePairs.length === 0 ? (
          <div className="text-slate-500 text-center py-6 italic text-xs">
            Game started. Make a move or let engine calculate...
          </div>
        ) : (
          movePairs.map((pair) => (
            <div
              key={pair.num}
              className="grid grid-cols-7 items-center py-1 px-2 rounded hover:bg-slate-800/40 text-slate-300"
            >
              <span className="col-span-1 text-slate-500 font-bold">{pair.num}.</span>

              {/* White Move */}
              <button
                onClick={() => pair.whiteIdx !== undefined && onNavigateHistory(pair.whiteIdx)}
                className={`col-span-3 text-left px-2 py-0.5 rounded transition ${
                  currentMoveIndex === pair.whiteIdx
                    ? 'bg-amber-400 text-slate-950 font-bold'
                    : 'hover:bg-slate-800 hover:text-slate-100'
                }`}
              >
                {pair.white?.san}
              </button>

              {/* Black Move */}
              {pair.black ? (
                <button
                  onClick={() => pair.blackIdx !== undefined && onNavigateHistory(pair.blackIdx)}
                  className={`col-span-3 text-left px-2 py-0.5 rounded transition ${
                    currentMoveIndex === pair.blackIdx
                      ? 'bg-amber-400 text-slate-950 font-bold'
                      : 'hover:bg-slate-800 hover:text-slate-100'
                  }`}
                >
                  {pair.black.san}
                </button>
              ) : (
                <span className="col-span-3"></span>
              )}
            </div>
          ))
        )}
      </div>

      {/* History Navigation Buttons */}
      <div className="flex items-center justify-center gap-2 pt-2 border-t border-slate-800 mt-2">
        <button
          onClick={() => onNavigateHistory(-1)}
          disabled={currentMoveIndex < 0}
          className="px-2.5 py-1 text-xs bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:pointer-events-none rounded border border-slate-700 text-slate-300 transition"
          title="First Move"
        >
          |◀
        </button>
        <button
          onClick={() => onNavigateHistory(Math.max(-1, currentMoveIndex - 1))}
          disabled={currentMoveIndex < 0}
          className="px-3 py-1 text-xs bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:pointer-events-none rounded border border-slate-700 text-slate-300 transition"
          title="Previous Move"
        >
          ◀
        </button>
        <button
          onClick={() => onNavigateHistory(Math.min(history.length - 1, currentMoveIndex + 1))}
          disabled={currentMoveIndex >= history.length - 1}
          className="px-3 py-1 text-xs bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:pointer-events-none rounded border border-slate-700 text-slate-300 transition"
          title="Next Move"
        >
          ▶
        </button>
        <button
          onClick={() => onNavigateHistory(history.length - 1)}
          disabled={currentMoveIndex >= history.length - 1}
          className="px-2.5 py-1 text-xs bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:pointer-events-none rounded border border-slate-700 text-slate-300 transition"
          title="Latest Move"
        >
          ▶|
        </button>
      </div>

      {/* Custom FEN Import Modal */}
      {showFenModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-700 rounded-xl p-5 max-w-lg w-full shadow-2xl space-y-3">
            <h3 className="text-sm font-bold text-slate-100">Load Custom FEN Position</h3>
            <p className="text-xs text-slate-400">
              Paste any standard Forsyth–Edwards Notation (FEN) string to evaluate or play:
            </p>
            <textarea
              rows={3}
              value={customFenInput}
              onChange={(e) => setCustomFenInput(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-xs text-slate-200 font-mono focus:border-amber-400 focus:outline-none"
              placeholder="e.g. rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowFenModal(false)}
                className="px-3 py-1.5 text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg border border-slate-700 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleApplyCustomFen}
                className="px-4 py-1.5 text-xs bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg transition"
              >
                Load Position
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
