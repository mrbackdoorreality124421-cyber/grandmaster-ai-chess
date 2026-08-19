import React from 'react';
import { ChessPieceSvg } from './ChessPieceSvg';

interface PiecePaletteProps {
  onAddPiece: (pieceType: string, color: 'w' | 'b') => void;
  onClearBoard: () => void;
  onResetStandard: () => void;
  onFlipTurn: () => void;
  activeTurn: 'w' | 'b';
  isGodMode: boolean;
}

export const PiecePalette: React.FC<PiecePaletteProps> = ({
  onAddPiece,
  onClearBoard,
  onResetStandard,
  onFlipTurn,
  activeTurn
}) => {
  const pieces = ['q', 'r', 'b', 'n', 'p', 'k'];

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3 shadow-xl backdrop-blur-md flex flex-col gap-3">
      <div className="flex items-center justify-between border-b border-slate-800 pb-2">
        <div className="flex items-center gap-2">
          <span className="text-amber-400 font-bold text-xs uppercase tracking-wider flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
            God Mode & Piece Palette
          </span>
        </div>
        <button
          onClick={onFlipTurn}
          className="px-2.5 py-1 text-xs rounded bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition flex items-center gap-1"
          title="Toggle side to move in FEN"
        >
          Side to Move: <span className="font-bold text-amber-400">{activeTurn === 'w' ? 'White' : 'Black'}</span>
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {/* White Pieces */}
        <div className="bg-slate-950/60 p-2 rounded-lg border border-slate-800/80">
          <span className="text-[11px] font-semibold text-slate-400 mb-1.5 block">White Pieces (Click to Add)</span>
          <div className="grid grid-cols-6 gap-1">
            {pieces.map((type) => (
              <button
                key={`w-${type}`}
                onClick={() => onAddPiece(type, 'w')}
                className="w-8 h-8 md:w-9 md:h-9 bg-slate-800/80 hover:bg-slate-700 active:scale-95 rounded border border-slate-700/60 flex items-center justify-center hover:border-amber-400/50 transition shadow-sm cursor-pointer"
                title={`Add White ${type.toUpperCase()}`}
              >
                <ChessPieceSvg type={type} color="w" className="w-6 h-6 md:w-7 md:h-7 pointer-events-none" />
              </button>
            ))}
          </div>
        </div>

        {/* Black Pieces */}
        <div className="bg-slate-950/60 p-2 rounded-lg border border-slate-800/80">
          <span className="text-[11px] font-semibold text-slate-400 mb-1.5 block">Black Pieces (Click to Add)</span>
          <div className="grid grid-cols-6 gap-1">
            {pieces.map((type) => (
              <button
                key={`b-${type}`}
                onClick={() => onAddPiece(type, 'b')}
                className="w-8 h-8 md:w-9 md:h-9 bg-slate-800/80 hover:bg-slate-700 active:scale-95 rounded border border-slate-700/60 flex items-center justify-center hover:border-amber-400/50 transition shadow-sm cursor-pointer"
                title={`Add Black ${type.toUpperCase()}`}
              >
                <ChessPieceSvg type={type} color="b" className="w-6 h-6 md:w-7 md:h-7 pointer-events-none" />
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Control Buttons */}
      <div className="flex items-center justify-between gap-2 pt-1">
        <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
          <span className="text-amber-400 font-bold">God Mode:</span> Hold any piece 500ms to free-drag anywhere or drop off board to delete.
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onClearBoard}
            className="px-2.5 py-1 text-xs rounded bg-rose-950/50 hover:bg-rose-900/60 text-rose-300 border border-rose-800/60 transition"
          >
            Clear Board
          </button>
          <button
            onClick={onResetStandard}
            className="px-2.5 py-1 text-xs rounded bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition"
          >
            Standard Setup
          </button>
        </div>
      </div>
    </div>
  );
};
