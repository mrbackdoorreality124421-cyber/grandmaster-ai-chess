import React from 'react';
import { AIPersonality, PlayerColor } from '../types/chess';
import { Settings } from 'lucide-react';

interface HeaderProps {
  personality: AIPersonality;
  userColor: PlayerColor;
  activeTurn: 'w' | 'b';
  isEngineThinking: boolean;
  onOpenMainMenu: () => void;
}

export const Header = React.memo<HeaderProps>(({
  personality,
  userColor,
  activeTurn,
  isEngineThinking,
  onOpenMainMenu
}) => {
  const isBotTurn = userColor === activeTurn;
  const botColorName = userColor === 'w' ? 'White' : 'Black';
  const oppColorName = activeTurn === 'w' ? 'White' : 'Black';

  return (
    <header className="w-full max-w-4xl mx-auto px-3 sm:px-4 py-2.5 sm:py-3 flex items-center justify-between z-30 select-none">
      {/* Brand Wordmark & AI Badge */}
      <div className="flex items-center gap-2">
        <h1 className="text-base sm:text-lg font-black tracking-wider text-slate-100 uppercase font-serif">
          Grandmaster<span className="text-[#d4af37]">AI</span>
        </h1>
        <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#0b101c]/90 border border-[#d4af37]/35 text-[11px] font-medium text-amber-200/90 shadow-[0_0_10px_rgba(212,175,55,0.15)]">
          <span>{personality.icon}</span>
          <span className="font-bold">{personality.name}</span>
          <span className="text-[10px] text-amber-400/80 font-mono hidden sm:inline">({personality.rating})</span>
        </div>
      </div>

      {/* Live Turn Status Banner */}
      <div className="hidden md:flex items-center gap-2">
        <div className="px-3 py-1 rounded-full bg-[#0b101c]/90 border border-[#d4af37]/25 shadow-md flex items-center gap-2">
          <span
            className={`w-2.5 h-2.5 rounded-full ${
              isBotTurn
                ? 'bg-amber-400 animate-ping shadow-[0_0_10px_rgba(251,191,36,0.9)]'
                : 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]'
            }`}
          />
          <span className="text-xs font-bold text-slate-200 whitespace-nowrap">
            {isEngineThinking
              ? `${personality.name} is calculating for ${botColorName}...`
              : isBotTurn
              ? `${personality.name} is moving for ${botColorName}`
              : `Your turn — input ${oppColorName}'s move`}
          </span>
        </div>
      </div>

      {/* Main Menu Button */}
      <div className="flex items-center gap-1.5">
        <button
          id="mainMenuBtn"
          onClick={onOpenMainMenu}
          className="px-3 py-1.5 rounded-xl bg-gradient-to-b from-[#161f36] to-[#0c1222] hover:from-[#1c2846] hover:to-[#0f172a] active:scale-[0.96] text-[#d4af37] hover:text-amber-300 font-bold text-xs border border-[#d4af37]/40 hover:border-[#d4af37]/80 transition-all shadow-[0_0_15px_rgba(212,175,55,0.12)] flex items-center gap-1.5 cursor-pointer font-serif"
          title="Change personality, game variant, or color"
        >
          <Settings className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Setup / Menu</span>
          <span className="sm:hidden">Menu</span>
        </button>
      </div>
    </header>
  );
});
