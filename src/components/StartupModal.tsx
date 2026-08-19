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
  const [selectedPersonalityId, setSelectedPersonalityId] = useState<AIPersonalityId>('tournament_player');
  const [selectedVariantId, setSelectedVariantId] = useState<string>('standard');
  const [selectedColor, setSelectedColor] = useState<PlayerColor>('w');

  if (!isOpen) return null;

  const handleFinishSetup = () => {
    const personality = AI_PERSONALITIES[selectedPersonalityId];
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xl animate-fade-in">
      <div className="w-full max-w-2xl bg-slate-900/95 border border-slate-700/70 rounded-2xl shadow-[0_25px_60px_-15px_rgba(0,0,0,0.8)] overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/50">
          <div className="flex items-center gap-2">
            <span className="text-xl">♟️</span>
            <div>
              <h2 className="text-lg font-bold text-slate-100 tracking-tight">
                Grandmaster AI Engine Setup
              </h2>
              <p className="text-xs text-slate-400">
                Step {currentStep} of 3 —{' '}
                {currentStep === 1 && 'Select AI Personality & Tactical Profile'}
                {currentStep === 2 && 'Choose Gameplay Variant or Board Setup'}
                {currentStep === 3 && 'Choose Your Side & Engine Mode'}
              </p>
            </div>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-200 text-sm px-2 py-1 rounded-md hover:bg-slate-800"
            >
              ✕
            </button>
          )}
        </div>

        {/* Step Indicator Progress Bar */}
        <div className="grid grid-cols-3 h-1 bg-slate-800">
          <div className={`h-full transition-all ${currentStep >= 1 ? 'bg-amber-400' : 'bg-transparent'}`} />
          <div className={`h-full transition-all ${currentStep >= 2 ? 'bg-amber-400' : 'bg-transparent'}`} />
          <div className={`h-full transition-all ${currentStep >= 3 ? 'bg-amber-400' : 'bg-transparent'}`} />
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-4">
          {/* STEP 1: SELECT AI PERSONALITY */}
          {currentStep === 1 && (
            <div className="space-y-3">
              <p className="text-xs text-slate-300 font-medium">
                Choose the neural playstyle and Stockfish UCI parameters for your AI opponent:
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {Object.values(AI_PERSONALITIES).map((p) => {
                  const isSelected = selectedPersonalityId === p.id;
                  return (
                    <div
                      key={p.id}
                      onClick={() => setSelectedPersonalityId(p.id)}
                      className={`p-3.5 rounded-xl border transition-all cursor-pointer relative flex flex-col justify-between ${
                        isSelected
                          ? `bg-slate-800/90 border-amber-400 ring-1 ring-amber-400/50 shadow-lg`
                          : `bg-slate-950/40 border-slate-800 hover:border-slate-700 hover:bg-slate-800/50`
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <div className="flex items-center gap-2">
                            <span className="text-xl">{p.icon}</span>
                            <div>
                              <h3 className="text-sm font-bold text-slate-100">{p.name}</h3>
                              <p className="text-[11px] text-slate-400">{p.subtitle}</p>
                            </div>
                          </div>
                          {isSelected && (
                            <span className="text-xs text-amber-400 font-bold bg-amber-400/10 px-2 py-0.5 rounded-full border border-amber-400/30">
                              Active
                            </span>
                          )}
                        </div>

                        <p className="text-xs text-slate-300 mb-2 leading-relaxed">
                          {p.description}
                        </p>
                      </div>

                      {/* UCI Parameters Pill Row */}
                      <div className="flex flex-wrap gap-1.5 pt-2 border-t border-slate-800/80 text-[10px] font-mono text-slate-400">
                        <span className="bg-slate-900 px-2 py-0.5 rounded border border-slate-700">
                          Skill: {p.skillLevel}
                        </span>
                        <span className="bg-slate-900 px-2 py-0.5 rounded border border-slate-700">
                          Depth: {p.depth}
                        </span>
                        {p.contempt !== 0 && (
                          <span className="bg-slate-900 px-2 py-0.5 rounded border border-rose-800/60 text-rose-300">
                            Contempt: {p.contempt}
                          </span>
                        )}
                        {p.moveTime && (
                          <span className="bg-slate-900 px-2 py-0.5 rounded border border-slate-700">
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
                      className={`p-3 rounded-xl border transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-slate-800 border-amber-400 ring-1 ring-amber-400/50 shadow-md'
                          : 'bg-slate-950/40 border-slate-800 hover:border-slate-700 hover:bg-slate-800/40'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-lg">{v.icon}</span>
                        <div className="flex-1">
                          <h3 className="text-sm font-semibold text-slate-200">{v.name}</h3>
                          <span className="text-[10px] uppercase font-mono text-amber-400/80 bg-amber-400/10 px-1.5 py-0.2 rounded">
                            {v.category}
                          </span>
                        </div>
                      </div>
                      <p className="text-xs text-slate-400 leading-tight">
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
                  className={`p-4 rounded-xl border transition-all cursor-pointer flex flex-col items-center justify-center text-center gap-2 ${
                    selectedColor === 'w'
                      ? 'bg-slate-800 border-amber-400 ring-1 ring-amber-400 shadow-md'
                      : 'bg-slate-950/40 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="w-12 h-12 rounded-full bg-slate-100 border-2 border-slate-300 flex items-center justify-center text-2xl shadow">
                    ♔
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-100">Play White</h4>
                    <p className="text-[11px] text-slate-400">You move first</p>
                  </div>
                </div>

                <div
                  onClick={() => setSelectedColor('b')}
                  className={`p-4 rounded-xl border transition-all cursor-pointer flex flex-col items-center justify-center text-center gap-2 ${
                    selectedColor === 'b'
                      ? 'bg-slate-800 border-amber-400 ring-1 ring-amber-400 shadow-md'
                      : 'bg-slate-950/40 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="w-12 h-12 rounded-full bg-slate-950 border-2 border-slate-700 flex items-center justify-center text-2xl shadow text-white">
                    ♚
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-100">Play Black</h4>
                    <p className="text-[11px] text-slate-400">AI moves first</p>
                  </div>
                </div>

                <div
                  onClick={() => setSelectedColor('both')}
                  className={`p-4 rounded-xl border transition-all cursor-pointer flex flex-col items-center justify-center text-center gap-2 ${
                    selectedColor === 'both'
                      ? 'bg-slate-800 border-amber-400 ring-1 ring-amber-400 shadow-md'
                      : 'bg-slate-950/40 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="w-12 h-12 rounded-full bg-gradient-to-r from-slate-100 to-slate-900 border-2 border-slate-500 flex items-center justify-center text-2xl shadow">
                    🔍
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-100">Analysis / Sandbox</h4>
                    <p className="text-[11px] text-slate-400">Play both sides freely</p>
                  </div>
                </div>
              </div>

              {/* Summary Overview */}
              <div className="bg-slate-950/70 p-4 rounded-xl border border-slate-800 text-xs space-y-1.5">
                <div className="text-slate-400 flex justify-between">
                  <span>Selected Opponent:</span>
                  <span className="font-bold text-amber-400">
                    {AI_PERSONALITIES[selectedPersonalityId].name} ({AI_PERSONALITIES[selectedPersonalityId].subtitle})
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
        <div className="px-6 py-4 border-t border-slate-800 bg-slate-950/60 flex items-center justify-between">
          <div>
            {currentStep > 1 && (
              <button
                onClick={() => setCurrentStep((prev) => (prev - 1) as 1 | 2 | 3)}
                className="px-4 py-2 text-xs font-semibold rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition"
              >
                ← Back
              </button>
            )}
          </div>

          <div className="flex items-center gap-3">
            {currentStep < 3 ? (
              <button
                onClick={() => setCurrentStep((prev) => (prev + 1) as 1 | 2 | 3)}
                className="px-5 py-2 text-xs font-bold rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-lg shadow-amber-500/20 transition flex items-center gap-1.5"
              >
                Continue to Step {currentStep + 1} →
              </button>
            ) : (
              <button
                onClick={handleFinishSetup}
                className="px-6 py-2.5 text-xs font-bold rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-lg shadow-emerald-500/20 transition flex items-center gap-1.5"
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
