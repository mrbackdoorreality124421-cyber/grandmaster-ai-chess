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
    <header className="w-full max-w-4xl mx-auto px-4 py-3.5 flex items-center justify-between z-30 select-none">
      {/* Brand Wordmark & Mode Pill */}
      <div className="flex items-center gap-2.5">
        <h1 className="text-base md:text-lg font-black tracking-wider text-slate-100 uppercase">
          Grandmaster<span className="text-amber-400">AI</span>
        </h1>
        <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-900/90 border border-slate-800 text-[11px] font-medium text-slate-300 shadow-sm">
          <span>{personality.icon}</span>
          <span className="font-semibold text-slate-200">{personality.name}</span>
        </div>
      </div>

      {/* Live Turn Status Banner */}
      <div className="flex items-center gap-2">
        <div className="px-3.5 py-1.5 rounded-full bg-slate-900/90 border border-slate-800/80 shadow-md flex items-center gap-2">
          <span
            className={`w-2 h-2 rounded-full ${
              isEngineThinking
                ? 'bg-amber-400 animate-ping'
                : activeTurn === 'w'
                ? 'bg-white shadow-[0_0_8px_rgba(255,255,255,0.8)]'
                : 'bg-slate-400'
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
          className="px-3.5 py-1.5 md:px-4 md:py-2 rounded-xl bg-slate-900 hover:bg-slate-800 active:scale-95 text-amber-400 hover:text-amber-300 font-bold text-xs md:text-sm border border-slate-700 hover:border-amber-400/60 transition-all shadow-md flex items-center gap-1.5 cursor-pointer"
          title="Return to Main Menu & Mode Setup"
        >
          <span>⚙️</span>
          <span>Main Menu</span>
        </button>
      </div>
    </header>
  );
};
