import React, { useEffect, useState } from 'react';

interface SplashScreenProps {
  onComplete: () => void;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({ onComplete }) => {
  const [isFading, setIsFading] = useState(false);

  useEffect(() => {
    const fadeTimer = setTimeout(() => {
      setIsFading(true);
    }, 1250);

    const finishTimer = setTimeout(() => {
      onComplete();
    }, 1600);

    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(finishTimer);
    };
  }, [onComplete]);

  return (
    <div
      className={`fixed inset-0 z-[100] flex flex-col items-center justify-center bg-[#02040a] transition-opacity duration-300 select-none ${
        isFading ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
    >
      {/* Background ambient golden aura */}
      <div className="absolute w-96 h-96 rounded-full bg-amber-500/10 blur-3xl pointer-events-none animate-pulse" />

      {/* Gold Lion & Knight Crest */}
      <div className="relative flex flex-col items-center gap-5">
        <div className="relative w-28 h-28 rounded-3xl bg-gradient-to-br from-slate-900 via-slate-950 to-amber-950/40 p-[2px] shadow-[0_0_50px_rgba(212,175,55,0.25)] border border-amber-500/40 overflow-hidden">
          {/* Gold sweep shine effect */}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-amber-300/30 to-transparent -translate-x-full animate-[shimmer_1.4s_infinite]" />
          
          <div className="w-full h-full rounded-[22px] bg-[#050814] flex items-center justify-center">
            <span className="text-5xl filter drop-shadow-[0_0_15px_rgba(245,158,11,0.6)] animate-bounce">
              🦁
            </span>
          </div>
        </div>

        {/* Title in Luxury Serif Font */}
        <div className="text-center space-y-1">
          <h1 className="text-2xl md:text-3xl font-black tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-yellow-400 to-amber-500 uppercase font-serif drop-shadow-md">
            Grandmaster AI
          </h1>
          <p className="text-xs font-semibold tracking-widest text-amber-300/70 uppercase">
            Obsidian Gold Edition • Lion Apex
          </p>
        </div>

        {/* Minimal loading bar */}
        <div className="w-44 h-1 bg-slate-900 rounded-full overflow-hidden border border-amber-500/20">
          <div className="h-full bg-gradient-to-r from-amber-500 to-yellow-300 rounded-full animate-[progress_1.3s_ease-in-out_forwards]" />
        </div>
      </div>
    </div>
  );
};
