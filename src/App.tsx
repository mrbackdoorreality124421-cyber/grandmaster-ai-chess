import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Chess, Square } from 'chess.js';
import confetti from 'canvas-confetti';
import { Trophy, RefreshCw } from 'lucide-react';

import { LION_MODE, PRESET_VARIANTS } from './constants/chessData';
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
  const [fen, setFen] = useState<string>(chess.fen());
  const [history, setHistory] = useState<MoveRecord[]>([]);
  const [gameFenHistory, setGameFenHistory] = useState<string[]>([chess.fen()]);
  const gameFenHistoryRef = useRef<string[]>([chess.fen()]);
  const [lastMove, setLastMove] = useState<{ from: string; to: string } | null>(null);

  // Visual Move Indicators
  const [botArrow, setBotArrow] = useState<{ from: string; to: string } | null>(null);
  const [ghostPiece, setGhostPiece] = useState<{ square: string; type: string; color: 'w' | 'b' } | null>(null);

  // Configuration
  const [personality] = useState<AIPersonality>(LION_MODE);
  const [userColor, setUserColor] = useState<PlayerColor>('w'); // The color LION plays for
  const [isFlipped, setIsFlipped] = useState<boolean>(false);
  const [isSetupModalOpen, setIsSetupModalOpen] = useState<boolean>(true);

  // Engine Calculation & Lock States
  const [isBotThinking, setIsBotThinking] = useState<boolean>(false);
  const isBotThinkingRef = useRef<boolean>(false);
  const [isBoardLocked, setIsBoardLocked] = useState<boolean>(false);
  const [statusText, setStatusText] = useState<string>('');

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
  // 🦁 LION AUTOMATIC MOVE EXECUTION (PLAYS ONLY FOR targetColor)
  // =========================================================================

  const executeBotMoveFor = useCallback(
    (targetColor: PlayerColor) => {
      if (chess.isGameOver() || isBotThinkingRef.current) return;
      const turn = chess.turn();
      if (targetColor !== 'both' && turn !== targetColor) return;

      isBotThinkingRef.current = true;
      setIsBotThinking(true);

      const currentFen = chess.fen();
      stockfishService.calculateMove(
        currentFen,
        personality,
        gameFenHistoryRef.current,
        (bestMoveStr) => {
          try {
            if (!bestMoveStr || bestMoveStr.length < 4) {
              return;
            }

            const from = bestMoveStr.substring(0, 2) as Square;
            const to = bestMoveStr.substring(2, 4) as Square;
            const promotion = bestMoveStr.length > 4 ? bestMoveStr[4] : undefined;

            const pieceOnFrom = chess.get(from);

            // Execute the winning move for targetColor
            const result = chess.move({ from, to, promotion });
            if (result) {
              const newFen = chess.fen();
              gameFenHistoryRef.current = [...gameFenHistoryRef.current, newFen];
              setGameFenHistory(gameFenHistoryRef.current);
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

              // Trigger state update to dispatch next reactive turn
              setFen(newFen);
            }
          } catch (err) {
            console.error('Error executing Lion move:', err);
          } finally {
            isBotThinkingRef.current = false;
            setIsBotThinking(false);
          }
        }
      );
    },
    [chess, personality, checkGameOver]
  );

  // =========================================================================
  // SURGICAL REACTIVE TURN DISPATCHER
  // =========================================================================

  useEffect(() => {
    if (isSetupModalOpen) return;
    if (chess.isGameOver()) return;

    const turn = chess.turn(); // 'w' or 'b'
    if (userColor !== 'both' && turn === userColor) {
      setIsBoardLocked(true);
      setStatusText("🦁 LION thinking for " + (userColor === 'w' ? 'White' : 'Black'));
      executeBotMoveFor(userColor);
    } else {
      setIsBoardLocked(false);
      setStatusText("Your turn — input " + (userColor === 'w' ? 'Black' : 'White') + "'s move");
    }
  }, [fen, userColor, isSetupModalOpen, chess, executeBotMoveFor]);

  // =========================================================================
  // USER INPUT (OPPONENT MOVES ONLY)
  // =========================================================================

  const handleOpponentMove = useCallback(
    (move: { from: string; to: string; promotion?: string }): boolean => {
      const turn = chess.turn();

      // Rule: User is NEVER allowed to move their own color
      if (userColor !== 'both' && turn === userColor) {
        return false;
      }
      if (isBotThinkingRef.current) {
        return false;
      }

      try {
        const currentFen = chess.fen();
        const result = chess.move(move);
        if (!result) return false;

        const newFen = chess.fen();
        gameFenHistoryRef.current = [...gameFenHistoryRef.current, newFen];
        setGameFenHistory(gameFenHistoryRef.current);
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

        checkGameOver();

        // Updating fen triggers the reactive turn dispatcher
        setFen(newFen);

        return true;
      } catch (err) {
        console.error('Opponent move error:', err);
        return false;
      }
    },
    [chess, userColor, checkGameOver]
  );

  // God Mode direct board mutation
  const handleGodModeBoardChange = useCallback(
    (newFen: string) => {
      try {
        chess.load(newFen);
        gameFenHistoryRef.current = [...gameFenHistoryRef.current, newFen];
        setGameFenHistory(gameFenHistoryRef.current);
        setBotArrow(null);
        setGhostPiece(null);
        checkGameOver();
        setFen(newFen);
      } catch (err) {
        console.error('God Mode Board update error:', err);
      }
    },
    [chess, checkGameOver]
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

      setUserColor(config.playerColor);
      setIsFlipped(config.playerColor === 'b'); // Flip board so user's color is at the bottom

      setHistory([]);
      gameFenHistoryRef.current = [config.startingFen];
      setGameFenHistory([config.startingFen]);
      setLastMove(null);
      setBotArrow(null);
      setGhostPiece(null);
      setGameOverInfo({ isOver: false, title: '', description: '', winner: null });
      setIsSetupModalOpen(false);

      // Trigger the reactive dispatcher
      setFen(config.startingFen);
    },
    [chess]
  );

  // Open Main Menu: Stop engine, reset state, and reopen setup modal
  const handleOpenMainMenu = useCallback(() => {
    stockfishService.reset();
    isBotThinkingRef.current = false;
    setIsBotThinking(false);
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
        userColor={userColor}
        activeTurn={chess.turn()}
        isEngineThinking={isBotThinking}
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
            isBotTurn={isBoardLocked}
            isGameOver={gameOverInfo.isOver}
            isGodModeUnlocked={isGodModeUnlocked}
            setIsGodModeUnlocked={setIsGodModeUnlocked}
          />

          {/* Minimal Status Hint Pill - ABSOLUTE TRUTH */}
          <div className="w-full flex items-center justify-between px-4 py-2.5 rounded-2xl bg-[#0b101c]/80 border border-[#d4af37]/20 text-xs text-amber-100/70 shadow-md backdrop-blur-md">
            <div className="flex items-center gap-2">
              <span
                className={`w-2.5 h-2.5 rounded-full ${
                  isBoardLocked
                    ? 'bg-amber-400 animate-ping'
                    : 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]'
                }`}
              />
              <span className="font-medium text-amber-200/90">
                {statusText}
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
