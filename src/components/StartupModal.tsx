import React, { useState } from 'react';
import { AI_PERSONALITIES, PRESET_VARIANTS, LION_MODE } from '../constants/chessData';
import { AIPersonality, PlayerColor, PresetVariant } from '../types/chess';
import { generateChess960FEN } from '../utils/chess960';

interface StartupModalProps {
  isOpen: boolean;
  onStartGame: (config: {
    personality: AIPersonality;
    variant: PresetVariant;
    playerColor: PlayerColor;
    startingFen: string;
  }) => void;
  savedGameAvailable?: boolean;
  onResumeSavedGame?: () => void;
  onClose?: () => void;
}

export const StartupModal: React.FC<StartupModalProps> = ({
  isOpen,
  onStartGame,
  savedGameAvailable,
  onResumeSavedGame,
  onClose
}) => {
  const [selectedPersonality, setSelectedPersonality] = useState<AIPersonality>(LION_MODE);
  const [selectedVariantId, setSelectedVariantId] = useState<string>('standard');
  const [selectedColor, setSelectedColor] = useState<PlayerColor>('w');

  if (!isOpen) return null;

  const handleLaunch = () => {
    const variant = PRESET_VARIANTS.find((v) => v.id === selectedVariantId) || PRESET_VARIANTS[0];
    let fen = variant.fen;
    if (variant.id === 'chess960') {
      fen = generateChess960FEN();
    }

    onStartGame({
      personality: selectedPersonality,
      variant,
      playerColor: selectedColor,
      startingFen: fen
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-2xl animate-fade-in select-none">
      <div className="w-full max-w-xl max-h-[90vh] bg-[#060913]/98 border border-[#d4af37]/45 rounded-3xl shadow-[0_25px_80px_rgba(0,0,0,0.95)] overflow-hidden flex flex-col">
        {/* Modal Header */}
        <div className="relative p-4 sm:p-5 bg-gradient-to-b from-[#161f36] via-[#0d1424] to-[#060913] border-b border-[#d4af37]/30 text-center shrink-0">
          <div className="flex flex-col items-center gap-1.5">
            <h2 className="text-xl sm:text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-[#d4af37] to-yellow-500 tracking-wider font-serif">
              Grandmaster AI
            </h2>
            <p className="text-xs font-semibold text-amber-200/80 tracking-wide">
              Obsidian Gold Engine • 6 AI Personalities • Offline PWA Support
            </p>
          </div>

          {onClose && (
            <button
              onClick={onClose}
              className="absolute top-4 right-4 text-amber-200/60 hover:text-amber-200 text-sm px-2.5 py-1 rounded-lg hover:bg-slate-800/80 transition cursor-pointer"
            >
              ✕
            </button>
          )}
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-4 sm:p-5 space-y-5 overflow-y-auto scrollbar-thin scrollbar-thumb-[#d4af37]/30">
          {/* Saved Game Resume Card if available */}
          {savedGameAvailable && onResumeSavedGame && (
            <div className="p-3 rounded-2xl bg-amber-500/10 border border-[#d4af37]/60 flex items-center justify-between gap-3 shadow-md">
              <div className="space-y-0.5">
                <span className="text-xs font-black text-amber-300 font-serif uppercase tracking-wider block">
                  Saved Match Found
                </span>
                <span className="text-[11px] text-slate-300">
                  Resume your ongoing battle right where you left off.
                </span>
              </div>
              <button
                onClick={onResumeSavedGame}
                className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-[#d4af37] text-slate-950 font-black text-xs uppercase tracking-wider shadow-lg hover:brightness-110 active:scale-95 cursor-pointer font-serif whitespace-nowrap"
              >
                Resume
              </button>
            </div>
          )}

          {/* 1. SELECT AI PERSONALITY (6 Options) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-300 uppercase tracking-widest font-serif">
                1. Select AI Personality
              </h3>
              <span className="text-[11px] font-bold text-amber-400">
                {selectedPersonality.badge} ({selectedPersonality.rating} ELO)
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {AI_PERSONALITIES.map((personality) => {
                const isSelected = selectedPersonality.id === personality.id;
                return (
                  <button
                    key={personality.id}
                    onClick={() => setSelectedPersonality(personality)}
                    className={`p-2.5 rounded-xl border text-left transition-all duration-150 flex flex-col gap-1 cursor-pointer relative ${
                      isSelected
                        ? 'bg-gradient-to-b from-[#1c2744] to-[#0f172a] border-[#d4af37] shadow-[0_0_15px_rgba(212,175,55,0.3)] ring-1 ring-[#d4af37]'
                        : 'bg-[#090d18] border-slate-800 hover:border-slate-700 hover:bg-[#0e1424]'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-lg">{personality.icon}</span>
                      <span className="text-[10px] font-bold text-amber-300/80 font-mono">
                        {personality.rating}
                      </span>
                    </div>
                    <span className="text-xs font-black text-slate-100 font-serif leading-tight">
                      {personality.name}
                    </span>
                    <span className="text-[10px] text-slate-400 leading-tight line-clamp-1">
                      {personality.title}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 2. SELECT COLOR / MODE */}
          <div className="space-y-2">
            <h3 className="text-xs font-bold text-slate-300 uppercase tracking-widest font-serif">
              2. Which Color Should the Bot Play?
            </h3>

            <div className="grid grid-cols-3 gap-2">
              {/* White */}
              <button
                onClick={() => setSelectedColor('w')}
                className={`p-3 rounded-xl border text-center transition flex flex-col items-center gap-1.5 cursor-pointer ${
                  selectedColor === 'w'
                    ? 'bg-[#182340] border-[#d4af37] ring-1 ring-[#d4af37] shadow-md'
                    : 'bg-[#090d18] border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="w-8 h-8 rounded-full bg-slate-100 border border-[#d4af37] flex items-center justify-center text-lg text-black font-black">
                  ♔
                </div>
                <span className="text-xs font-bold text-slate-200">Bot is White</span>
                <span className="text-[10px] text-amber-300/70">Moves first</span>
              </button>

              {/* Black */}
              <button
                onClick={() => setSelectedColor('b')}
                className={`p-3 rounded-xl border text-center transition flex flex-col items-center gap-1.5 cursor-pointer ${
                  selectedColor === 'b'
                    ? 'bg-[#182340] border-[#d4af37] ring-1 ring-[#d4af37] shadow-md'
                    : 'bg-[#090d18] border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="w-8 h-8 rounded-full bg-[#02040a] border border-[#d4af37] flex items-center justify-center text-lg text-white font-black">
                  ♚
                </div>
                <span className="text-xs font-bold text-slate-200">Bot is Black</span>
                <span className="text-[10px] text-amber-300/70">You move first</span>
              </button>

              {/* Sandbox */}
              <button
                onClick={() => setSelectedColor('both')}
                className={`p-3 rounded-xl border text-center transition flex flex-col items-center gap-1.5 cursor-pointer ${
                  selectedColor === 'both'
                    ? 'bg-[#182340] border-[#d4af37] ring-1 ring-[#d4af37] shadow-md'
                    : 'bg-[#090d18] border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="w-8 h-8 rounded-full bg-slate-800 border border-[#d4af37]/40 flex items-center justify-center text-lg text-amber-400">
                  🔍
                </div>
                <span className="text-xs font-bold text-slate-200">Analysis Mode</span>
                <span className="text-[10px] text-amber-300/70">Two Players</span>
              </button>
            </div>
          </div>

          {/* 3. GAME VARIANT SELECTION */}
          <div className="space-y-2">
            <h3 className="text-xs font-bold text-slate-300 uppercase tracking-widest font-serif">
              3. Game Variant
            </h3>

            <div className="grid grid-cols-2 gap-2">
              {PRESET_VARIANTS.map((v) => (
                <button
                  key={v.id}
                  onClick={() => setSelectedVariantId(v.id)}
                  className={`p-2.5 rounded-xl border text-left transition cursor-pointer ${
                    selectedVariantId === v.id
                      ? 'bg-[#182340] border-[#d4af37] text-amber-200'
                      : 'bg-[#090d18] border-slate-800 hover:border-slate-700 text-slate-400'
                  }`}
                >
                  <span className="text-xs font-bold block text-slate-100">{v.name}</span>
                  <span className="text-[10px] text-slate-400 block line-clamp-1 mt-0.5">{v.description}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Modal Footer / Launch Button */}
        <div className="p-4 bg-[#060913] border-t border-[#d4af37]/20 shrink-0 flex items-center justify-between gap-3">
          <div className="text-[11px] text-slate-400">
            Playing against <strong className="text-amber-300">{selectedPersonality.name}</strong> ({selectedPersonality.badge})
          </div>

          <button
            onClick={handleLaunch}
            className="py-3 px-6 bg-gradient-to-r from-amber-500 via-[#d4af37] to-yellow-500 hover:brightness-110 active:scale-95 text-slate-950 font-black text-xs uppercase tracking-widest rounded-xl shadow-[0_0_20px_rgba(212,175,55,0.4)] transition cursor-pointer font-serif flex items-center gap-2"
          >
            <span>Start Match</span>
            <span>➔</span>
          </button>
        </div>
      </div>
    </div>
  );
};
