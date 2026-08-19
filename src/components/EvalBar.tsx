import React from 'react';

interface EvalBarProps {
  scoreCp: number; // Positive = White is winning, Negative = Black is winning
  isFlipped: boolean;
}

export const EvalBar: React.FC<EvalBarProps> = ({ scoreCp, isFlipped }) => {
  // Convert centipawns (-1500 to +1500 range) to percentage (0% to 100% for White)
  const cappedCP = Math.max(-1500, Math.min(1500, scoreCp));
  let whitePercentage = 100 / (1 + Math.exp(-0.004 * cappedCP));
  whitePercentage = Math.max(5, Math.min(95, whitePercentage));

  const displayPercentage = isFlipped ? 100 - whitePercentage : whitePercentage;

  const formatEvalText = () => {
    if (Math.abs(scoreCp) >= 9000) {
      const mateIn = Math.round((10000 - Math.abs(scoreCp)) / 100);
      return scoreCp > 0 ? `+M${Math.max(1, mateIn)}` : `-M${Math.max(1, mateIn)}`;
    }
    const val = (scoreCp / 100).toFixed(1);
    return scoreCp > 0 ? `+${val}` : `${val}`;
  };

  const isWhiteAdvantage = scoreCp >= 0;

  return (
    <div className="relative flex flex-col items-center w-5 sm:w-6 h-full min-h-[280px] max-h-[480px] rounded-xl overflow-hidden bg-[#070b14] border border-[#d4af37]/35 shadow-[0_4px_20px_rgba(0,0,0,0.6)] select-none">
      {/* Top Half / Black side */}
      <div
        className="w-full bg-[#111726] transition-all duration-500 ease-out flex items-start justify-center pt-1"
        style={{ height: `${100 - displayPercentage}%` }}
      >
        {!isWhiteAdvantage && (
          <span className="text-[10px] font-black text-amber-200/90 font-mono scale-90">
            {formatEvalText()}
          </span>
        )}
      </div>

      {/* Evaluation Divider Line */}
      <div className="w-full h-0.5 bg-[#d4af37]/70 shadow-[0_0_6px_rgba(212,175,55,0.8)] z-10 shrink-0" />

      {/* Bottom Half / White side (Gold Obsidian Gradient) */}
      <div
        className="w-full bg-gradient-to-t from-amber-500 via-[#d4af37] to-amber-200 transition-all duration-500 ease-out flex items-end justify-center pb-1"
        style={{ height: `${displayPercentage}%` }}
      >
        {isWhiteAdvantage && (
          <span className="text-[10px] font-black text-slate-950 font-mono scale-90">
            {formatEvalText()}
          </span>
        )}
      </div>
    </div>
  );
};
