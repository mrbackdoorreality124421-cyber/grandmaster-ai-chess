import { useState, useCallback, useRef, useEffect } from 'react';
import { Chess, Square, Move } from 'chess.js';
import confetti from 'canvas-confetti';
import { Trophy, RefreshCw, AlertCircle } from 'lucide-react';

import { LION_MODE } from './constants/chessData';
import { AIPersonality, MoveRecord, PlayerColor, PresetVariant } from './types/chess';
import {
  stockfishService,
  extractAnyValidMove,
  sanitizeAndValidateFen
} from './services/stockfishEngine';
import { playChessSound } from './utils/audio';

import { Header } from './components/Header';
import { ChessBoard } from './components/ChessBoard';
import { StartupModal } from './components/StartupModal';
import { SplashScreen } from './components/SplashScreen';

// ============================================================================
// 1. EMERGENCY TOP-LEVEL CACHE NUKE (OUTSIDE ALL COMPONENTS - ESCAPE DEATH LOOP)
// ============================================================================
try {
  localStorage.removeItem('gameState');
  localStorage.removeItem('chessState');
  localStorage.removeItem('chess_state');
  localStorage.removeItem('chess_game');
  localStorage.removeItem('savedFen');
  localStorage.removeItem('fen');
  localStorage.removeItem('chess_history');
} catch (e) {
  console.warn('Storage purge notice:', e);
}

const DEFAULT_STARTING_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

/**
 * Universal Move Applier (Executes SAN, UCI string, or Move object)
 */
function applyAnyMove(
  chess: Chess,
  moveInput: string | { from: string; to: string; promotion?: string }
): Move | null {
  if (!moveInput) return null;

  try {
    // 1. If string: Try direct SAN (e.g. 'Nxe5', 'e4', 'O-O')
    if (typeof moveInput === 'string') {
      const raw = moveInput.trim();
      try {
        const res = chess.move(raw);
        if (res) return res;
      } catch {}

      // 2. Try as UCI substring (e.g. 'e2e4' or 'e7e8q')
      if (raw.length >= 4) {
        try {
          const from = raw.substring(0, 2) as Square;
          const to = raw.substring(2, 4) as Square;
          const promotion = raw.length > 4 ? raw[4].toLowerCase() : 'q';
          const res = chess.move({ from, to, promotion });
          if (res) return res;
        } catch {}
      }

      // 3. Match against verbose legal moves
      try {
        const legals = chess.moves({ verbose: true });
        const matched = legals.find(
          (m) =>
            m.san.toLowerCase() === raw.toLowerCase() ||
            `${m.from}${m.to}${m.promotion || ''}`.toLowerCase() === raw.toLowerCase()
        );
        if (matched) {
          return chess.move(matched);
        }
      } catch {}
    } else {
      // 4. Object format
      try {
        const res = chess.move({
          from: moveInput.from,
          to: moveInput.to,
          promotion: moveInput.promotion || 'q'
        });
        if (res) return res;
      } catch {}
    }
  } catch (err) {
    console.warn('applyAnyMove notice:', err);
  }

  return null;
}

export default function App() {
  // Splash Screen State
  const [showSplash, setShowSplash] = useState<boolean>(true);

  // Core Chess State with Safe Factory
  const [chess] = useState(() => {
    try {
      return new Chess();
    } catch {
      const c = new Chess();
      c.load(DEFAULT_STARTING_FEN);
      return c;
    }
  });

  const [fen, setFen] = useState<string>(() => {
    try {
      return chess.fen();
    } catch {
      return DEFAULT_STARTING_FEN;
    }
  });

  const [history, setHistory] = useState<MoveRecord[]>([]);
  const [gameFenHistory, setGameFenHistory] = useState<string[]>([DEFAULT_STARTING_FEN]);
  const gameFenHistoryRef = useRef<string[]>([DEFAULT_STARTING_FEN]);
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
  const [isBoardLocked, setIsBoardLocked] = useState<boolean>(false);
  const [statusText, setStatusText] = useState<string>('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // 2. STRICT MUTEX LOCK (useRef to prevent render loops & duplicate calls)
  const isEngineRunning = useRef<boolean>(false);
  const lastProcessedTurnFen = useRef<string>('');

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
    try {
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
    } catch (err) {
      console.warn('checkGameOver error:', err);
    }
    return false;
  }, [chess]);

  // =========================================================================
  // 🦁 LION AUTOMATIC MOVE EXECUTION (WITH STRICT MUTEX LOCK & FAILSAFE)
  // =========================================================================

  const executeBotMoveFor = useCallback(
    (targetColor: PlayerColor) => {
      // 2. STRICT MUTEX CHECK: Return immediately if already running
      if (isEngineRunning.current) return;
      if (chess.isGameOver()) return;

      const turn = chess.turn();
      if (targetColor !== 'both' && turn !== targetColor) return;

      // Lock engine mutex
      isEngineRunning.current = true;
      setIsBotThinking(true);
      setIsBoardLocked(true);

      const currentFen = sanitizeAndValidateFen(chess.fen());
      let isResolved = false;

      // 6-Second Timeout Watchdog (Never locks the app)
      const timeoutGuard = setTimeout(() => {
        if (!isResolved && isEngineRunning.current) {
          console.warn('Engine 6s timeout reached. Unlocking board.');
          isResolved = true;

          try {
            // Attempt emergency single move
            const possibleMoves = chess.moves({ verbose: true });
            if (possibleMoves.length > 0) {
              const emergencyMove = possibleMoves[0];
              const pieceOnFrom = chess.get(emergencyMove.from);
              const result = chess.move(emergencyMove);

              if (result) {
                const newFen = sanitizeAndValidateFen(chess.fen());
                gameFenHistoryRef.current = [...gameFenHistoryRef.current, newFen];
                setGameFenHistory(gameFenHistoryRef.current);
                setLastMove({ from: emergencyMove.from, to: emergencyMove.to });
                setBotArrow({ from: emergencyMove.from, to: emergencyMove.to });

                if (pieceOnFrom) {
                  setGhostPiece({
                    square: emergencyMove.from,
                    type: pieceOnFrom.type,
                    color: pieceOnFrom.color
                  });
                }

                playChessSound(result.captured ? 'capture' : 'move');

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
                setFen(newFen);
              }
            }
          } catch (err) {
            console.error('Emergency move error:', err);
          } finally {
            isEngineRunning.current = false;
            setIsBotThinking(false);
            setIsBoardLocked(false);
          }
        }
      }, 6000);

      try {
        stockfishService.calculateMove(
          currentFen,
          personality,
          gameFenHistoryRef.current,
          (bestMoveStr) => {
            if (isResolved) return;
            isResolved = true;
            clearTimeout(timeoutGuard);

            try {
              // 1. UNIFIED MOVE PARSER: Try applying the move directly (handles SAN + UCI)
              let result = applyAnyMove(chess, bestMoveStr);

              // If move failed, try regex/UCI converter
              if (!result) {
                const uciMove = extractAnyValidMove(currentFen, bestMoveStr);
                if (uciMove) {
                  result = applyAnyMove(chess, uciMove);
                }
              }

              // If still failed, try fast positional grandmaster move
              if (!result) {
                const gmMove = stockfishService.calculateGrandmasterMove(currentFen);
                if (gmMove) {
                  result = applyAnyMove(chess, gmMove);
                }
              }

              // 3. Ultimate non-blocking legal move fallback
              if (!result) {
                const possibleMoves = chess.moves({ verbose: true });
                if (possibleMoves.length > 0) {
                  result = chess.move(possibleMoves[0]);
                }
              }

              if (result) {
                const newFen = sanitizeAndValidateFen(chess.fen());
                gameFenHistoryRef.current = [...gameFenHistoryRef.current, newFen];
                setGameFenHistory(gameFenHistoryRef.current);
                setLastMove({ from: result.from, to: result.to });

                // Render single tactical arrow
                setBotArrow({ from: result.from, to: result.to });

                // Render ghost piece on origin square
                setGhostPiece({
                  square: result.from,
                  type: result.piece,
                  color: result.color
                });

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
              console.error('Error executing bot move:', err);
              // 3. DO NOT recursively retry. Unlock board and show clear message.
              setIsBoardLocked(false);
              setToastMessage('Engine Error: Please make a manual move for the bot.');
              setTimeout(() => setToastMessage(null), 4000);
            } finally {
              isEngineRunning.current = false;
              setIsBotThinking(false);
            }
          }
        );
      } catch (calcError) {
        console.error('Calculation initiation error:', calcError);
        clearTimeout(timeoutGuard);
        isEngineRunning.current = false;
        setIsBotThinking(false);
        setIsBoardLocked(false);
        setToastMessage('Engine Error: Please make a manual move for the bot.');
        setTimeout(() => setToastMessage(null), 4000);
      }
    },
    [chess, personality, checkGameOver]
  );

  // =========================================================================
  // 3. BREAK useEffect DEPENDENCY CYCLES (Strictly triggered once per distinct turn FEN)
  // =========================================================================

  useEffect(() => {
    if (isSetupModalOpen) return;
    if (chess.isGameOver()) return;

    const currentFen = chess.fen();
    const turn = chess.turn(); // 'w' or 'b'

    if (userColor !== 'both' && turn === userColor) {
      // Prevent duplicate triggers for the same position
      if (isEngineRunning.current || lastProcessedTurnFen.current === currentFen) {
        return;
      }
      lastProcessedTurnFen.current = currentFen;

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

      // Rule: User is NEVER allowed to move during bot's turn or while engine is calculating
      if (userColor !== 'both' && turn === userColor) {
        return false;
      }
      if (isEngineRunning.current) {
        return false;
      }

      try {
        const currentFen = sanitizeAndValidateFen(chess.fen());
        const result = applyAnyMove(chess, move);
        if (!result) return false;

        const newFen = sanitizeAndValidateFen(chess.fen());
        gameFenHistoryRef.current = [...gameFenHistoryRef.current, newFen];
        setGameFenHistory(gameFenHistoryRef.current);
        setLastMove({ from: result.from, to: result.to });
        setBotArrow(null);
        setGhostPiece(null);

        // Sound feedback
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

        const gameOver = checkGameOver();
        setFen(newFen);

        return !gameOver;
      } catch {
        playChessSound('illegal');
        return false;
      }
    },
    [chess, userColor, checkGameOver]
  );

  // God Mode FEN update handler
  const handleGodModeBoardChange = useCallback(
    (newFen: string) => {
      try {
        const sanitized = sanitizeAndValidateFen(newFen);
        chess.load(sanitized);
        gameFenHistoryRef.current = [...gameFenHistoryRef.current, sanitized];
        setGameFenHistory(gameFenHistoryRef.current);
        setFen(sanitized);
        setLastMove(null);
        setBotArrow(null);
        setGhostPiece(null);
        checkGameOver();
      } catch (err) {
        console.error('Failed to apply god mode change:', err);
      }
    },
    [chess, checkGameOver]
  );

  // Setup Modal Launch
  const handleStartGame = useCallback(
    (config: {
      personality: AIPersonality;
      variant: PresetVariant;
      playerColor: PlayerColor;
      startingFen: string;
    }) => {
      const sanitized = sanitizeAndValidateFen(config.startingFen);
      stockfishService.reset();
      chess.load(sanitized);

      setUserColor(config.playerColor);
      setIsFlipped(config.playerColor === 'b');

      setHistory([]);
      gameFenHistoryRef.current = [sanitized];
      setGameFenHistory([sanitized]);
      lastProcessedTurnFen.current = '';
      isEngineRunning.current = false;
      setLastMove(null);
      setBotArrow(null);
      setGhostPiece(null);
      setToastMessage(null);
      setGameOverInfo({ isOver: false, title: '', description: '', winner: null });
      setIsSetupModalOpen(false);

      // Trigger the reactive dispatcher
      setFen(sanitized);
    },
    [chess]
  );

  // Open Main Menu: Stop engine, reset state, and reopen setup modal
  const handleOpenMainMenu = useCallback(() => {
    stockfishService.reset();
    isEngineRunning.current = false;
    lastProcessedTurnFen.current = '';
    setIsBotThinking(false);
    setIsBoardLocked(false);
    setBotArrow(null);
    setGhostPiece(null);
    setToastMessage(null);
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
          {/* Toast Notification for Timeout / Recovery */}
          {toastMessage && (
            <div className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-amber-500/20 border border-amber-400/40 text-amber-200 text-xs font-semibold shadow-lg backdrop-blur-md animate-fade-in">
              <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
              <span>{toastMessage}</span>
            </div>
          )}

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

          {/* Minimal Status Hint Pill */}
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
