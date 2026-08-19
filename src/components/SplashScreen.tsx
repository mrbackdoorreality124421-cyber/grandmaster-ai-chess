import React, { useEffect, useState } from 'react';

interface SplashScreenProps {
  onComplete: () => void;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({ onComplete }) => {
  const [isFading, setIsFading] = useState<boolean>(false);

  useEffect(() => {
    const fadeTimer = setTimeout(() => {
      setIsFading(true);
    }, 1200);

    const doneTimer = setTimeout(() => {
      onComplete();
    }, 1500);

    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(doneTimer);
    };
  }, [onComplete]);

  return (
    <div
      className={`fixed inset-0 z-[100] flex flex-col items-center justify-center bg-[#02040a] transition-opacity duration-300 ${
        isFading ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
    >
      <div className="flex flex-col items-center gap-4 text-center px-4">
        <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-[#1c2846] to-[#0b101c] border-2 border-[#d4af37]/60 flex items-center justify-center text-5xl shadow-[0_0_40px_rgba(212,175,55,0.4)] animate-pulse">
          🦁
        </div>
        <h1 className="text-2xl md:text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-[#d4af37] to-yellow-500 tracking-wider font-serif uppercase">
          Grandmaster AI
        </h1>
        <p className="text-xs font-semibold text-amber-200/70 tracking-widest uppercase font-mono">
          🦁 LION APEX ENGINE • UNBEATABLE
        </p>
      </div>
    </div>
  );
};
