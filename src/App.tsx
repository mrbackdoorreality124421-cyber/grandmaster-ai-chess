import React, { useState, useCallback, useRef } from 'react';
import { Chess, Square } from 'chess.js';
import confetti from 'canvas-confetti';
import { Trophy, RefreshCw } from 'lucide-react';

import { AI_PERSONALITIES, PRESET_VARIANTS } from './constants/chessData';
import { AIPersonality, MoveRecord, PlayerColor, PresetVariant } from './types/chess';
import { stockfishService } from './services/stockfishEngine';
import { playChessSound } from './utils/audio';

import { Header } from './components/Header';
import { ChessBoard } from './components/ChessBoard';
import { StartupModal } from './components/StartupModal';
import { SplashScreen } from './components/SplashScreen';

export default function App() {
  // Splash Screen State
  const [showSplash, setShowSplash] = useState<boolean>(true);

  // Core Chess State
  const [chess] = useState(() => new Chess());
  const [history, setHistory] = useState<MoveRecord[]>([]);
  const [gameFenHistory, setGameFenHistory] = useState<string[]>([]);
  const [lastMove, setLastMove] = useState<{ from: string; to: string } | null>(null);

  // Bot Visual Indicators
  const [botArrow, setBotArrow] = useState<{ from: string; to: string } | null>(null);
  const [ghostPiece, setGhostPiece] = useState<{ square: string; type: string; color: 'w' | 'b' } | null>(null);

  // Configuration
  const [personality, setPersonality] = useState<AIPersonality>(AI_PERSONALITIES.lion_mode);
  const [activeVariant, setActiveVariant] = useState<PresetVariant>(PRESET_VARIANTS[0]);
  const [playerColor, setPlayerColor] = useState<PlayerColor>('w');
  const [isFlipped, setIsFlipped] = useState<boolean>(false);
  const [isSetupModalOpen, setIsSetupModalOpen] = useState<boolean>(true);

  // Bot State
  const [isBotTurn, setIsBotTurn] = useState<boolean>(false);
  const isBotThinkingRef = useRef<boolean>(false);

  // God Mode State
  const [isGodModeUnlocked, setIsGodModeUnlocked] = useState<boolean>(false);

  // Game Over Modal State
  const [gameOverInfo, setGameOverInfo] = useState<{
    isOver: boolean;
    title: string;
    description: string;
    winner: 'w' | 'b' | 'draw' | null;
  }>({ isOver: false, title: '', description: '', winner: null });

  // Game status check
  const checkGameOver = useCallback((): boolean => {
    if (chess.isCheckmate()) {
      const winner = chess.turn() === 'w' ? 'b' : 'w';
      const winnerName = winner === 'w' ? 'White' : 'Black';
      setGameOverInfo({
        isOver: true,
        title: `CHECKMATE! ${winnerName} Wins!`,
        description: `Victory achieved through checkmate.`,
        winner
      });
      playChessSound('win');
      confetti({
        particleCount: 160,
        spread: 85,
        origin: { y: 0.55 },
        colors: ['#d4af37', '#f59e0b', '#fbbf24', '#ffffff', '#e2e8f0']
      });
      return true;
    } else if (chess.isDraw()) {
      let desc = 'The game ended in a draw.';
      if (chess.isStalemate()) desc = 'Draw by Stalemate (no legal moves).';
      else if (chess.isThreefoldRepetition()) desc = 'Draw by Threefold Repetition.';
      else if (chess.isInsufficientMaterial()) desc = 'Draw by Insufficient Material.';
      setGameOverInfo({
        isOver: true,
        title: 'DRAW!',
        description: desc,
        winner: 'draw'
      });
      return true;
    }
    return false;
  }, [chess]);

  // =========================================================================
  // BOT COUNTER-MOVE EXECUTION (WITH FEN BLACKLIST FILTER)
  // =========================================================================

  const executeBotCounterMove = useCallback(
    (currentFenHistory?: string[]) => {
      if (chess.isGameOver() || isBotThinkingRef.current) return;

      isBotThinkingRef.current = true;
      setIsBotTurn(true);

      const currentFen = chess.fen();
      const activeFenHistory = currentFenHistory || gameFenHistory;

      stockfishService.calculateMove(
        currentFen,
        personality,
        activeFenHistory,
        (bestMoveStr) => {
          if (!bestMoveStr || bestMoveStr.length < 4) {
            isBotThinkingRef.current = false;
            setIsBotTurn(false);
            return;
          }

          try {
            const from = bestMoveStr.substring(0, 2) as Square;
            const to = bestMoveStr.substring(2, 4) as Square;
            const promotion = bestMoveStr.length > 4 ? bestMoveStr[4] : undefined;

            const pieceOnFrom = chess.get(from);

            // Execute the recommended move for our side
            const result = chess.move({ from, to, promotion });
            if (result) {
              const newFen = chess.fen();
              setGameFenHistory((prev) => [...prev, newFen]);
              setLastMove({ from, to });

              // Render single tactical arrow
              setBotArrow({ from, to });

              // Render ghost piece on origin square
              if (pieceOnFrom) {
                setGhostPiece({
                  square: from,
                  type: pieceOnFrom.type,
                  color: pieceOnFrom.color
                });
              }

              // Play audio feedback
              if (chess.inCheck()) {
                playChessSound('check');
              } else if (result.captured) {
                playChessSound('capture');
              } else {
                playChessSound('move');
              }

              // Update move history
              const record: MoveRecord = {
                san: result.san,
                from: result.from,
                to: result.to,
                piece: result.piece,
                color: result.color,
                captured: result.captured,
                promotion: result.promotion,
                flags: result.flags,
                fenBefore: currentFen,
                fenAfter: newFen
              };
              setHistory((prev) => [...prev, record]);

              checkGameOver();
            }
          } catch (err) {
            console.error('Error applying bot move:', err);
          } finally {
            isBotThinkingRef.current = false;
            setIsBotTurn(false);
          }
        }
      );
    },
    [chess, personality, gameFenHistory, checkGameOver]
  );

  // =========================================================================
  // USER INPUT (OPPONENT MOVES)
  // =========================================================================

  const handleOpponentMove = useCallback(
    (move: { from: string; to: string; promotion?: string }): boolean => {
      if (isBotThinkingRef.current || isBotTurn) return false;

      try {
        const currentFen = chess.fen();
        const result = chess.move(move);
        if (!result) return false;

        const newFen = chess.fen();
        const updatedFenHistory = [...gameFenHistory, newFen];
        setGameFenHistory(updatedFenHistory);
        setLastMove({ from: move.from, to: move.to });

        // Clear previous bot indicators
        setBotArrow(null);
        setGhostPiece(null);

        // Sound Feedback
        if (chess.inCheck()) {
          playChessSound('check');
        } else if (result.captured) {
          playChessSound('capture');
        } else {
          playChessSound('move');
        }

        // Record history
        const record: MoveRecord = {
          san: result.san,
          from: result.from,
          to: result.to,
          piece: result.piece,
          color: result.color,
          captured: result.captured,
          promotion: result.promotion,
          flags: result.flags,
          fenBefore: currentFen,
          fenAfter: newFen
        };
        setHistory((prev) => [...prev, record]);

        const isOver = checkGameOver();

        // If game continues, immediately trigger the assistant's counter-move!
        if (!isOver) {
          setTimeout(() => {
            executeBotCounterMove(updatedFenHistory);
          }, 150);
        }

        return true;
      } catch (err) {
        console.error('Move validation error:', err);
        return false;
      }
    },
    [chess, isBotTurn, gameFenHistory, checkGameOver, executeBotCounterMove]
  );

  // God Mode direct board mutation
  const handleGodModeBoardChange = useCallback(
    (newFen: string) => {
      try {
        chess.load(newFen);
        setGameFenHistory((prev) => [...prev, newFen]);
        setBotArrow(null);
        setGhostPiece(null);
        checkGameOver();

        // If it's the assistant's turn after manual board change, calculate best move
        const isBotColor =
          (playerColor === 'w' && chess.turn() === 'w') ||
          (playerColor === 'b' && chess.turn() === 'b');
        if (isBotColor && !chess.isGameOver()) {
          setTimeout(() => {
            executeBotCounterMove();
          }, 200);
        }
      } catch (err) {
        console.error('God Mode Board update error:', err);
      }
    },
    [chess, playerColor, checkGameOver, executeBotCounterMove]
  );

  // Setup / Start Game Trigger
  const handleStartGame = useCallback(
    (config: {
      personality: AIPersonality;
      variant: PresetVariant;
      playerColor: PlayerColor;
      startingFen: string;
    }) => {
      stockfishService.reset();
      chess.load(config.startingFen);

      setPersonality(config.personality);
      setActiveVariant(config.variant);
      setPlayerColor(config.playerColor);
      setIsFlipped(config.playerColor === 'b');

      setHistory([]);
      setGameFenHistory([config.startingFen]);
      setLastMove(null);
      setBotArrow(null);
      setGhostPiece(null);
      setGameOverInfo({ isOver: false, title: '', description: '', winner: null });
      setIsSetupModalOpen(false);

      // If user chose Black, bot moves first immediately
      if (config.playerColor === 'b' && chess.turn() === 'w') {
        setTimeout(() => {
          executeBotCounterMove([config.startingFen]);
        }, 300);
      }
    },
    [chess, executeBotCounterMove]
  );

  // Open Main Menu: Stop engine, reset state, and reopen setup modal
  const handleOpenMainMenu = useCallback(() => {
    stockfishService.reset();
    isBotThinkingRef.current = false;
    setIsBotTurn(false);
    setBotArrow(null);
    setGhostPiece(null);
    setGameOverInfo({ isOver: false, title: '', description: '', winner: null });
    setIsSetupModalOpen(true);
  }, []);

  return (
    <div className="relative min-h-screen bg-[#02040a] text-slate-100 flex flex-col justify-between overflow-x-hidden font-sans select-none">
      {/* 1.5s Animated Splash Screen */}
      {showSplash && <SplashScreen onComplete={() => setShowSplash(false)} />}

      {/* Subtle Ambient Golden Particles Background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute top-[-10%] left-[20%] w-[500px] h-[500px] rounded-full bg-amber-500/5 blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[15%] w-[450px] h-[450px] rounded-full bg-[#d4af37]/5 blur-[100px]" />
      </div>

      {/* Sleek Minimalist Top Status Bar with Single Main Menu Button */}
      <Header
        personality={personality}
        playerColor={playerColor}
        activeTurn={chess.turn()}
        isEngineThinking={isBotTurn}
        onOpenMainMenu={handleOpenMainMenu}
      />

      {/* Main Focus Chess Arena */}
      <main className="flex-1 flex flex-col items-center justify-center p-3 md:p-6 select-none z-10">
        <div className="w-full max-w-[540px] flex flex-col items-center gap-3">
          {/* Interactive 64-Square Chessboard */}
          <ChessBoard
            chess={chess}
            isFlipped={isFlipped}
            onOpponentMove={handleOpponentMove}
            onGodModeBoardChange={handleGodModeBoardChange}
            lastMove={lastMove}
            botArrow={botArrow}
            ghostPiece={ghostPiece}
            isBotTurn={isBotTurn}
            isGameOver={gameOverInfo.isOver}
            isGodModeUnlocked={isGodModeUnlocked}
            setIsGodModeUnlocked={setIsGodModeUnlocked}
          />

          {/* Minimal Status Hint Pill */}
          <div className="w-full flex items-center justify-between px-4 py-2 rounded-2xl bg-[#0b101c]/80 border border-[#d4af37]/20 text-xs text-amber-100/70 shadow-md backdrop-blur-md">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
              <span>
                Helping <strong className="text-[#d4af37]">{playerColor === 'w' ? 'White' : 'Black'}</strong>. Input opponent's move.
              </span>
            </div>
            <div className="text-[11px] text-amber-200/50 hidden sm:block">
              Hold piece 500ms for God Mode
            </div>
          </div>
        </div>
      </main>

      {/* Luxury Obsidian Gold Game Over Modal */}
      {gameOverInfo.isOver && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl animate-fade-in">
          <div className="bg-[#060913]/95 border border-[#d4af37]/50 p-6 md:p-8 rounded-3xl max-w-sm w-full text-center space-y-5 shadow-[0_0_50px_rgba(212,175,55,0.25)]">
            <div className="w-16 h-16 rounded-2xl bg-amber-500/15 border border-[#d4af37]/40 flex items-center justify-center mx-auto text-[#d4af37] shadow-[0_0_20px_rgba(212,175,55,0.3)] animate-bounce">
              <Trophy className="w-8 h-8" />
            </div>

            <div>
              <h2 className="text-xl md:text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-[#d4af37] to-yellow-500 uppercase tracking-wide font-serif">
                {gameOverInfo.title}
              </h2>
              <p className="text-xs md:text-sm text-slate-300 mt-1.5 leading-relaxed">
                {gameOverInfo.description}
              </p>
            </div>

            <div className="flex flex-col gap-2.5 pt-2">
              <button
                onClick={handleOpenMainMenu}
                className="w-full py-3 px-4 bg-gradient-to-r from-amber-500 to-[#d4af37] hover:brightness-110 active:scale-[0.98] text-slate-950 font-black text-xs uppercase tracking-wider rounded-xl shadow-lg transition flex items-center justify-center gap-2 cursor-pointer font-serif"
              >
                <RefreshCw className="w-4 h-4" />
                Play Again
              </button>

              <button
                onClick={() => setGameOverInfo((prev) => ({ ...prev, isOver: false }))}
                className="w-full py-2.5 px-4 bg-slate-900/90 hover:bg-slate-800 text-slate-300 text-xs font-semibold rounded-xl border border-slate-700/60 transition cursor-pointer active:scale-98"
              >
                Review Board
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Startup & Setup Glassmorphism Modal */}
      <StartupModal
        isOpen={isSetupModalOpen}
        onStartGame={handleStartGame}
        onClose={history.length > 0 ? () => setIsSetupModalOpen(false) : undefined}
      />
    </div>
  );
}
