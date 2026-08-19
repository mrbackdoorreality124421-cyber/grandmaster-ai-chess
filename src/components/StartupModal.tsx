import React from 'react';
import { LION_MODE, PRESET_VARIANTS } from '../constants/chessData';
import { AIPersonality, PlayerColor, PresetVariant } from '../types/chess';

interface StartupModalProps {
  isOpen: boolean;
  onStartGame: (config: {
    personality: AIPersonality;
    variant: PresetVariant;
    playerColor: PlayerColor;
    startingFen: string;
  }) => void;
  onClose?: () => void;
}

export const StartupModal: React.FC<StartupModalProps> = ({
  isOpen,
  onStartGame,
  onClose
}) => {
  if (!isOpen) return null;

  const handleLaunch = (color: PlayerColor) => {
    onStartGame({
      personality: LION_MODE,
      variant: PRESET_VARIANTS[0],
      playerColor: color,
      startingFen: PRESET_VARIANTS[0].fen
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-2xl animate-fade-in">
      <div className="w-full max-w-lg bg-[#060913]/95 border border-[#d4af37]/45 rounded-3xl shadow-[0_25px_80px_rgba(0,0,0,0.95)] overflow-hidden flex flex-col">
        {/* Golden Lion Banner */}
        <div className="relative p-6 bg-gradient-to-b from-[#161f36] via-[#0d1424] to-[#060913] border-b border-[#d4af37]/30 text-center overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-[#d4af37]/10 to-transparent -translate-x-full animate-[shimmer_2s_infinite]" />

          <div className="relative flex flex-col items-center gap-3">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-500/20 to-yellow-600/30 border border-[#d4af37]/50 flex items-center justify-center text-4xl shadow-[0_0_25px_rgba(212,175,55,0.3)] animate-pulse">
              🦁
            </div>

            <div>
              <h2 className="text-xl md:text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-[#d4af37] to-yellow-500 tracking-wider font-serif">
                🦁 LION MODE — Always Winner
              </h2>
              <p className="text-xs font-semibold text-amber-200/80 tracking-wide mt-1">
                Apex NNUE Engine • Depth 28–30+ • GM Book • Blunder-Proof
              </p>
            </div>
          </div>

          {onClose && (
            <button
              onClick={onClose}
              className="absolute top-4 right-4 text-amber-200/60 hover:text-amber-200 text-sm px-2.5 py-1.5 rounded-lg hover:bg-slate-800/80 transition cursor-pointer"
            >
              ✕
            </button>
          )}
        </div>

        {/* Modal Body: Which color is the bot helping */}
        <div className="p-6 space-y-5">
          <div className="text-center">
            <h3 className="text-sm font-bold text-slate-200 uppercase tracking-widest font-serif">
              Which Color Should the Bot Play?
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Select your color so Lion Bot automatically calculates winning moves for your side.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3.5">
            {/* Play White Button */}
            <button
              onClick={() => handleLaunch('w')}
              className="group p-4 rounded-2xl border border-slate-700/80 hover:border-[#d4af37] bg-gradient-to-b from-[#11192e] to-[#090e1b] hover:from-[#182340] hover:to-[#0d1424] transition-all duration-200 flex flex-col items-center justify-center gap-2.5 shadow-lg active:scale-95 cursor-pointer"
            >
              <div className="w-13 h-13 rounded-full bg-slate-100 border-2 border-[#d4af37] flex items-center justify-center text-3xl shadow-[0_0_15px_rgba(255,255,255,0.4)] group-hover:scale-105 transition-transform">
                ♔
              </div>
              <div className="text-center">
                <span className="block text-sm font-black text-slate-100 font-serif">Bot Plays White</span>
                <span className="text-[11px] text-amber-300/80 font-medium">Bot moves 1st immediately</span>
              </div>
            </button>

            {/* Play Black Button */}
            <button
              onClick={() => handleLaunch('b')}
              className="group p-4 rounded-2xl border border-slate-700/80 hover:border-[#d4af37] bg-gradient-to-b from-[#11192e] to-[#090e1b] hover:from-[#182340] hover:to-[#0d1424] transition-all duration-200 flex flex-col items-center justify-center gap-2.5 shadow-lg active:scale-95 cursor-pointer"
            >
              <div className="w-13 h-13 rounded-full bg-[#02040a] border-2 border-[#d4af37] flex items-center justify-center text-3xl text-white shadow-[0_0_15px_rgba(212,175,55,0.3)] group-hover:scale-105 transition-transform">
                ♚
              </div>
              <div className="text-center">
                <span className="block text-sm font-black text-slate-100 font-serif">Bot Plays Black</span>
                <span className="text-[11px] text-amber-300/80 font-medium">Input Opponent's White move</span>
              </div>
            </button>
          </div>

          {/* Sandbox Option */}
          <div className="pt-1">
            <button
              onClick={() => handleLaunch('both')}
              className="w-full py-2.5 px-4 rounded-xl bg-[#060a14] hover:bg-[#0c1222] border border-slate-800 hover:border-[#d4af37]/40 text-xs font-semibold text-slate-400 hover:text-amber-200 transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-[0.98]"
            >
              <span>🔍</span>
              <span>Open Analysis / Two-Player Sandbox</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
