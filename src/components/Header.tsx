import React from 'react';
import { AIPersonality, PlayerColor } from '../types/chess';

interface HeaderProps {
  personality: AIPersonality;
  playerColor: PlayerColor;
  activeTurn: 'w' | 'b';
  isEngineThinking: boolean;
  onOpenMainMenu: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  personality,
  playerColor,
  activeTurn,
  isEngineThinking,
  onOpenMainMenu
}) => {
  const isUserColor = (playerColor === 'w' && activeTurn === 'w') || (playerColor === 'b' && activeTurn === 'b');

  return (
    <header className="w-full max-w-4xl mx-auto px-4 py-3 flex items-center justify-between z-30 select-none">
      {/* Brand Wordmark & Mode Pill */}
      <div className="flex items-center gap-2.5">
        <h1 className="text-base md:text-lg font-black tracking-wider text-slate-100 uppercase font-serif">
          Grandmaster<span className="text-[#d4af37]">AI</span>
        </h1>
        <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#0b101c]/90 border border-[#d4af37]/30 text-[11px] font-medium text-amber-200/90 shadow-[0_0_12px_rgba(212,175,55,0.15)]">
          <span>{personality.icon}</span>
          <span className="font-semibold">{personality.name}</span>
        </div>
      </div>

      {/* Live Turn Status Banner */}
      <div className="flex items-center gap-2">
        <div className="px-3.5 py-1.5 rounded-full bg-[#0b101c]/90 border border-[#d4af37]/25 shadow-md flex items-center gap-2">
          <span
            className={`w-2 h-2 rounded-full ${
              isEngineThinking
                ? 'bg-amber-400 animate-ping'
                : activeTurn === 'w'
                ? 'bg-white shadow-[0_0_8px_rgba(255,255,255,0.8)]'
                : 'bg-amber-500/60'
            }`}
          />
          <span className="text-xs font-bold text-slate-200">
            {isEngineThinking
              ? 'Bot Thinking...'
              : isUserColor
              ? `Your Turn (${playerColor === 'w' ? 'White' : 'Black'})`
              : `Opponent (${activeTurn === 'w' ? 'White' : 'Black'})`}
          </span>
        </div>
      </div>

      {/* Single Prominent Main Menu Button */}
      <div className="flex items-center">
        <button
          id="mainMenuBtn"
          onClick={onOpenMainMenu}
          className="px-3.5 py-1.5 md:px-4 md:py-2 rounded-xl bg-gradient-to-b from-[#161f36] to-[#0c1222] hover:from-[#1c2846] hover:to-[#0f172a] active:scale-[0.96] text-[#d4af37] hover:text-amber-300 font-bold text-xs md:text-sm border border-[#d4af37]/40 hover:border-[#d4af37]/80 transition-all shadow-[0_0_15px_rgba(212,175,55,0.12)] flex items-center gap-1.5 cursor-pointer"
          title="Return to Main Menu & Mode Setup"
        >
          <span>⚙️</span>
          <span>Main Menu</span>
        </button>
      </div>
    </header>
  );
};
