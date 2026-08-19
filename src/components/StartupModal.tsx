import React, { useState } from 'react';
import { AI_PERSONALITIES, PRESET_VARIANTS } from '../constants/chessData';
import { AIPersonality, AIPersonalityId, PlayerColor, PresetVariant } from '../types/chess';
import { generateChess960FEN } from '../utils/chess960';

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
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);
  const [selectedPersonalityId, setSelectedPersonalityId] = useState<AIPersonalityId>('lion_mode');
  const [selectedVariantId, setSelectedVariantId] = useState<string>('standard');
  const [selectedColor, setSelectedColor] = useState<PlayerColor>('w');

  if (!isOpen) return null;

  const handleFinishSetup = () => {
    const personality = AI_PERSONALITIES[selectedPersonalityId] || AI_PERSONALITIES.lion_mode;
    const variant = PRESET_VARIANTS.find((v) => v.id === selectedVariantId) || PRESET_VARIANTS[0];
    
    let startingFen = variant.fen;
    if (variant.id === 'chess960') {
      startingFen = generateChess960FEN();
    }

    onStartGame({
      personality,
      variant,
      playerColor: selectedColor,
      startingFen
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-2xl animate-fade-in">
      <div className="w-full max-w-2xl bg-[#060913]/95 border border-[#d4af37]/40 rounded-3xl shadow-[0_25px_70px_rgba(0,0,0,0.95)] overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-[#d4af37]/20 flex items-center justify-between bg-[#03060f]/80">
          <div className="flex items-center gap-3">
            <span className="text-2xl filter drop-shadow-[0_0_8px_rgba(212,175,55,0.6)]">🦁</span>
            <div>
              <h2 className="text-lg font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-[#d4af37] to-yellow-500 tracking-wide font-serif">
                Grandmaster AI Engine Setup
              </h2>
              <p className="text-xs text-amber-200/60 font-medium">
                Step {currentStep} of 3 —{' '}
                {currentStep === 1 && 'Select AI Personality & Engine Profile'}
                {currentStep === 2 && 'Choose Gameplay Variant or Board Setup'}
                {currentStep === 3 && 'Choose Your Side & Master Mode'}
              </p>
            </div>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="text-amber-200/60 hover:text-amber-200 text-sm px-2.5 py-1.5 rounded-lg hover:bg-slate-800/80 transition"
            >
              ✕
            </button>
          )}
        </div>

        {/* Step Indicator Progress Bar */}
        <div className="grid grid-cols-3 h-1.5 bg-[#0b101c]">
          <div className={`h-full transition-all ${currentStep >= 1 ? 'bg-gradient-to-r from-amber-500 to-[#d4af37]' : 'bg-transparent'}`} />
          <div className={`h-full transition-all ${currentStep >= 2 ? 'bg-gradient-to-r from-amber-500 to-[#d4af37]' : 'bg-transparent'}`} />
          <div className={`h-full transition-all ${currentStep >= 3 ? 'bg-gradient-to-r from-amber-500 to-[#d4af37]' : 'bg-transparent'}`} />
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-4">
          {/* STEP 1: SELECT AI PERSONALITY */}
          {currentStep === 1 && (
            <div className="space-y-3">
              <p className="text-xs text-slate-300 font-medium">
                Choose the neural playstyle and Stockfish UCI parameters for your AI engine:
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {Object.values(AI_PERSONALITIES).map((p) => {
                  const isSelected = selectedPersonalityId === p.id;
                  const isLionMode = p.id === 'lion_mode';
                  const isGodMode = p.id === 'god_mode';

                  return (
                    <div
                      key={p.id}
                      onClick={() => setSelectedPersonalityId(p.id)}
                      className={`p-3.5 rounded-2xl border transition-all cursor-pointer relative flex flex-col justify-between active:scale-[0.97] ${
                        isSelected
                          ? `bg-[#0f172a]/95 border-[#d4af37] ring-1 ring-[#d4af37] shadow-[0_0_20px_rgba(212,175,55,0.25)]`
                          : isLionMode
                          ? `bg-gradient-to-br from-[#12192c] to-[#0a0f1d] border-amber-500/50 hover:border-amber-400`
                          : isGodMode
                          ? `bg-[#0b101c] border-yellow-500/35 hover:border-yellow-400/60`
                          : `bg-[#060a14]/60 border-slate-800/80 hover:border-slate-700 hover:bg-slate-900/40`
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <div className="flex items-center gap-2.5">
                            <span className="text-2xl filter drop-shadow">{p.icon}</span>
                            <div>
                              <h3 className="text-sm font-bold text-slate-100 font-serif">{p.name}</h3>
                              <p className="text-[11px] text-amber-200/70">{p.subtitle}</p>
                            </div>
                          </div>
                          {isSelected ? (
                            <span className="text-xs text-amber-400 font-bold bg-amber-400/15 px-2.5 py-0.5 rounded-full border border-amber-400/40 shadow-sm">
                              Active
                            </span>
                          ) : isLionMode ? (
                            <span className="text-[10px] text-amber-300 font-bold bg-amber-500/20 px-2 py-0.5 rounded-full border border-amber-500/40">
                              Apex
                            </span>
                          ) : null}
                        </div>

                        <p className="text-xs text-slate-300 mb-2 leading-relaxed">
                          {p.description}
                        </p>
                      </div>

                      {/* UCI Parameters Pill Row */}
                      <div className="flex flex-wrap gap-1.5 pt-2 border-t border-slate-800/80 text-[10px] font-mono text-slate-400">
                        <span className="bg-[#03060f] px-2 py-0.5 rounded border border-slate-800 text-amber-300/90">
                          Skill: {p.skillLevel}
                        </span>
                        <span className="bg-[#03060f] px-2 py-0.5 rounded border border-slate-800 text-amber-300/90">
                          Depth: {p.depth}
                        </span>
                        {p.contempt !== 0 && (
                          <span className="bg-[#03060f] px-2 py-0.5 rounded border border-rose-900/60 text-rose-300">
                            Contempt: {p.contempt}
                          </span>
                        )}
                        {p.moveTime && (
                          <span className="bg-[#03060f] px-2 py-0.5 rounded border border-slate-800 text-slate-300">
                            Time: {p.moveTime}ms
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* STEP 2: GAMEPLAY STYLES & VARIANTS */}
          {currentStep === 2 && (
            <div className="space-y-3">
              <p className="text-xs text-slate-300 font-medium">
                Select your game starting position, standard opening, tactical puzzle, or custom board:
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 max-h-[50vh] overflow-y-auto pr-1">
                {PRESET_VARIANTS.map((v) => {
                  const isSelected = selectedVariantId === v.id;
                  return (
                    <div
                      key={v.id}
                      onClick={() => setSelectedVariantId(v.id)}
                      className={`p-3.5 rounded-2xl border transition-all cursor-pointer active:scale-[0.98] ${
                        isSelected
                          ? 'bg-[#0f172a] border-[#d4af37] ring-1 ring-[#d4af37]/60 shadow-[0_0_15px_rgba(212,175,55,0.2)]'
                          : 'bg-[#060a14]/60 border-slate-800 hover:border-slate-700 hover:bg-slate-900/40'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 mb-1">
                        <span className="text-xl">{v.icon}</span>
                        <div className="flex-1">
                          <h3 className="text-sm font-semibold text-slate-200 font-serif">{v.name}</h3>
                          <span className="text-[10px] uppercase font-mono text-amber-400/90 bg-amber-400/10 px-2 py-0.5 rounded border border-amber-400/20">
                            {v.category}
                          </span>
                        </div>
                      </div>
                      <p className="text-xs text-slate-400 leading-tight mt-1">
                        {v.description}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* STEP 3: CHOOSE COLOR & MODE */}
          {currentStep === 3 && (
            <div className="space-y-4">
              <p className="text-xs text-slate-300 font-medium">
                Choose your play side or activate Master Analysis Mode:
              </p>
              <div className="grid grid-cols-3 gap-3">
                <div
                  onClick={() => setSelectedColor('w')}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer flex flex-col items-center justify-center text-center gap-2 active:scale-95 ${
                    selectedColor === 'w'
                      ? 'bg-[#0f172a] border-[#d4af37] ring-1 ring-[#d4af37] shadow-[0_0_15px_rgba(212,175,55,0.2)]'
                      : 'bg-[#060a14]/60 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="w-12 h-12 rounded-full bg-slate-100 border-2 border-[#d4af37]/60 flex items-center justify-center text-2xl shadow">
                    ♔
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-100 font-serif">Play White</h4>
                    <p className="text-[11px] text-amber-200/60">You move first</p>
                  </div>
                </div>

                <div
                  onClick={() => setSelectedColor('b')}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer flex flex-col items-center justify-center text-center gap-2 active:scale-95 ${
                    selectedColor === 'b'
                      ? 'bg-[#0f172a] border-[#d4af37] ring-1 ring-[#d4af37] shadow-[0_0_15px_rgba(212,175,55,0.2)]'
                      : 'bg-[#060a14]/60 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="w-12 h-12 rounded-full bg-[#02040a] border-2 border-[#d4af37]/60 flex items-center justify-center text-2xl shadow text-white">
                    ♚
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-100 font-serif">Play Black</h4>
                    <p className="text-[11px] text-amber-200/60">AI moves first</p>
                  </div>
                </div>

                <div
                  onClick={() => setSelectedColor('both')}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer flex flex-col items-center justify-center text-center gap-2 active:scale-95 ${
                    selectedColor === 'both'
                      ? 'bg-[#0f172a] border-[#d4af37] ring-1 ring-[#d4af37] shadow-[0_0_15px_rgba(212,175,55,0.2)]'
                      : 'bg-[#060a14]/60 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="w-12 h-12 rounded-full bg-gradient-to-r from-slate-100 via-amber-200 to-slate-900 border-2 border-[#d4af37] flex items-center justify-center text-2xl shadow">
                    🔍
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-100 font-serif">Analysis / Sandbox</h4>
                    <p className="text-[11px] text-amber-200/60">Play both sides freely</p>
                  </div>
                </div>
              </div>

              {/* Summary Overview */}
              <div className="bg-[#03060f] p-4 rounded-2xl border border-[#d4af37]/25 text-xs space-y-1.5">
                <div className="text-slate-400 flex justify-between">
                  <span>Selected Opponent:</span>
                  <span className="font-bold text-[#d4af37]">
                    {AI_PERSONALITIES[selectedPersonalityId]?.name} ({AI_PERSONALITIES[selectedPersonalityId]?.subtitle})
                  </span>
                </div>
                <div className="text-slate-400 flex justify-between">
                  <span>Starting Variant:</span>
                  <span className="font-bold text-slate-200">
                    {PRESET_VARIANTS.find((v) => v.id === selectedVariantId)?.name}
                  </span>
                </div>
                <div className="text-slate-400 flex justify-between">
                  <span>God Mode Status:</span>
                  <span className="font-bold text-emerald-400">
                    Ready (Long-press 500ms on any piece to free drag/delete)
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer Controls */}
        <div className="px-6 py-4 border-t border-[#d4af37]/20 bg-[#03060f]/90 flex items-center justify-between">
          <div>
            {currentStep > 1 && (
              <button
                onClick={() => setCurrentStep((prev) => (prev - 1) as 1 | 2 | 3)}
                className="px-4 py-2 text-xs font-semibold rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700 transition active:scale-95"
              >
                ← Back
              </button>
            )}
          </div>

          <div className="flex items-center gap-3">
            {currentStep < 3 ? (
              <button
                onClick={() => setCurrentStep((prev) => (prev + 1) as 1 | 2 | 3)}
                className="px-5 py-2.5 text-xs font-bold rounded-xl bg-gradient-to-r from-amber-500 to-[#d4af37] hover:brightness-110 text-slate-950 shadow-lg shadow-amber-500/20 transition flex items-center gap-1.5 active:scale-95 cursor-pointer font-serif"
              >
                Continue to Step {currentStep + 1} →
              </button>
            ) : (
              <button
                onClick={handleFinishSetup}
                className="px-6 py-2.5 text-xs font-bold rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 hover:brightness-110 text-slate-950 shadow-lg shadow-emerald-500/20 transition flex items-center gap-1.5 active:scale-95 cursor-pointer font-serif"
              >
                🚀 Launch Game & Engine
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
