import { useState, useCallback, useRef, useEffect } from 'react';
import { Chess, Square, Move } from 'chess.js';
import confetti from 'canvas-confetti';
import { Trophy, RefreshCw, AlertCircle, Sparkles } from 'lucide-react';

import { AI_PERSONALITIES, LION_MODE, PRESET_VARIANTS } from './constants/chessData';
import { AIPersonality, MoveRecord, PlayerColor, PresetVariant, SavedGameState } from './types/chess';
import {
  engineService,
  extractAnyValidMove,
  sanitizeAndValidateFen,
  DEFAULT_STARTING_FEN
} from './services/lionEngine';
import { playChessSound, setSoundEnabled, isSoundEnabled } from './utils/audio';

import { Header } from './components/Header';
import { ChessBoard } from './components/ChessBoard';
import { EvalBar } from './components/EvalBar';
import { MoveHistoryPanel } from './components/MoveHistoryPanel';
import { StartupModal } from './components/StartupModal';
import { SplashScreen } from './components/SplashScreen';

const SAVED_GAME_KEY = 'gma_saved_state_v1';

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

  // Core Live Chess State with Safe Factory
  const [liveChess] = useState(() => {
    try {
      return new Chess();
    } catch {
      const c = new Chess();
      c.load(DEFAULT_STARTING_FEN);
      return c;
    }
  });

  const [fen, setFen] = useState<string>(DEFAULT_STARTING_FEN);
  const [history, setHistory] = useState<MoveRecord[]>([]);
  const [gameFenHistory, setGameFenHistory] = useState<string[]>([DEFAULT_STARTING_FEN]);
  const gameFenHistoryRef = useRef<string[]>([DEFAULT_STARTING_FEN]);
  const [lastMove, setLastMove] = useState<{ from: string; to: string } | null>(null);

  // Live Position Inspector State (Read-only historical inspection)
  const [inspectedMoveIndex, setInspectedMoveIndex] = useState<number | null>(null);
  const [displayChess, setDisplayChess] = useState<Chess>(liveChess);

  // Visual Move & Tactical Indicators
  const [botArrow, setBotArrow] = useState<{ from: string; to: string } | null>(null);
  const [ghostPiece, setGhostPiece] = useState<{ square: string; type: string; color: 'w' | 'b' } | null>(null);
  const [evalScoreCp, setEvalScoreCp] = useState<number>(0);

  // Configuration & Personality
  const [personality, setPersonality] = useState<AIPersonality>(LION_MODE);
  const [userColor, setUserColor] = useState<PlayerColor>('w'); // The color AI plays for
  const [isFlipped, setIsFlipped] = useState<boolean>(false);
  const [isSetupModalOpen, setIsSetupModalOpen] = useState<boolean>(true);
  const [savedGameAvailable, setSavedGameAvailable] = useState<boolean>(false);

  // Settings Toggles
  const [isSoundOn, setIsSoundOn] = useState<boolean>(true);
  const [showArrows, setShowArrows] = useState<boolean>(true);
  const [isGodMode, setIsGodMode] = useState<boolean>(false);

  // Engine Calculation & Lock States
  const [isBotThinking, setIsBotThinking] = useState<boolean>(false);
  const [isBoardLocked, setIsBoardLocked] = useState<boolean>(false);
  const [statusText, setStatusText] = useState<string>('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Strict Mutex Lock
  const isEngineRunning = useRef<boolean>(false);
  const lastProcessedTurnFen = useRef<string>('');

  // Game Over Modal State
  const [gameOverInfo, setGameOverInfo] = useState<{
    isOver: boolean;
    title: string;
    description: string;
    winner: 'w' | 'b' | 'draw' | null;
  }>({ isOver: false, title: '', description: '', winner: null });

  // 5. SAFE RESUME & INITIAL STORAGE VALIDATION
  useEffect(() => {
    try {
      const savedRaw = localStorage.getItem(SAVED_GAME_KEY);
      if (savedRaw) {
        const parsed: SavedGameState = JSON.parse(savedRaw);
        if (parsed && parsed.fen && parsed.version === 1) {
          const validated = sanitizeAndValidateFen(parsed.fen);
          if (validated && parsed.history && parsed.history.length > 0) {
            setSavedGameAvailable(true);
          }
        }
      }
    } catch {
      localStorage.removeItem(SAVED_GAME_KEY);
    }
  }, []);

  // Save current game state on every move
  const persistGameState = useCallback(
    (currentFen: string, currentHistory: MoveRecord[], currentPersonality: AIPersonality, currentColor: PlayerColor) => {
      try {
        if (currentHistory.length === 0) return;
        const state: SavedGameState = {
          version: 1,
          fen: currentFen,
          history: currentHistory,
          personalityId: currentPersonality.id,
          userColor: currentColor,
          isFlipped,
          timestamp: Date.now()
        };
        localStorage.setItem(SAVED_GAME_KEY, JSON.stringify(state));
      } catch (err) {
        console.warn('Failed to persist game state:', err);
      }
    },
    [isFlipped]
  );

  // Resume saved match
  const handleResumeSavedGame = useCallback(() => {
    try {
      const savedRaw = localStorage.getItem(SAVED_GAME_KEY);
      if (!savedRaw) return;
      const parsed: SavedGameState = JSON.parse(savedRaw);
      const sanitized = sanitizeAndValidateFen(parsed.fen);

      const foundPersonality = AI_PERSONALITIES.find((p) => p.id === parsed.personalityId) || LION_MODE;
      setPersonality(foundPersonality);
      setUserColor(parsed.userColor);
      setIsFlipped(parsed.isFlipped ?? parsed.userColor === 'b');

      liveChess.load(sanitized);
      setFen(sanitized);
      setDisplayChess(liveChess);
      setHistory(parsed.history || []);

      const reconstructedHistory = [DEFAULT_STARTING_FEN, ...(parsed.history || []).map((h) => h.fenAfter)];
      gameFenHistoryRef.current = reconstructedHistory;
      setGameFenHistory(reconstructedHistory);

      if (parsed.history && parsed.history.length > 0) {
        const last = parsed.history[parsed.history.length - 1];
        setLastMove({ from: last.from, to: last.to });
      }

      setIsSetupModalOpen(false);
      setToastMessage('Match resumed successfully.');
      setTimeout(() => setToastMessage(null), 3000);
    } catch (err) {
      console.warn('Failed to resume saved game:', err);
      localStorage.removeItem(SAVED_GAME_KEY);
      setSavedGameAvailable(false);
    }
  }, [liveChess]);

  // Connect live evaluation callback from Lion Engine
  useEffect(() => {
    engineService.setEvalCallback((cp) => {
      setEvalScoreCp(cp);
    });
    return () => {
      engineService.setEvalCallback(null);
    };
  }, []);

  // Update Display Chess instance when inspecting history vs live
  useEffect(() => {
    if (inspectedMoveIndex === null) {
      setDisplayChess(liveChess);
    } else if (history[inspectedMoveIndex]) {
      try {
        const inspectFen = history[inspectedMoveIndex].fenAfter;
        const temp = new Chess(inspectFen);
        setDisplayChess(temp);
      } catch {
        setDisplayChess(liveChess);
      }
    }
  }, [inspectedMoveIndex, history, liveChess, fen]);

  // Game status check
  const checkGameOver = useCallback((): boolean => {
    try {
      if (liveChess.isCheckmate()) {
        const winner = liveChess.turn() === 'w' ? 'b' : 'w';
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
      } else if (liveChess.isDraw()) {
        let desc = 'The game ended in a draw.';
        if (liveChess.isStalemate()) desc = 'Draw by Stalemate (no legal moves).';
        else if (liveChess.isThreefoldRepetition()) desc = 'Draw by Threefold Repetition.';
        else if (liveChess.isInsufficientMaterial()) desc = 'Draw by Insufficient Material.';
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
  }, [liveChess]);

  // =========================================================================
  // 🦁 AI MOVE EXECUTION (WITH SMARTER LOCAL FALLBACK)
  // =========================================================================

  const executeBotMoveFor = useCallback(
    (targetColor: PlayerColor) => {
      // 2. STRICT MUTEX CHECK
      if (isEngineRunning.current) return;
      if (liveChess.isGameOver()) return;

      const turn = liveChess.turn();
      if (targetColor !== 'both' && turn !== targetColor) return;

      isEngineRunning.current = true;
      setIsBotThinking(true);
      setIsBoardLocked(true);

      const currentFen = sanitizeAndValidateFen(liveChess.fen());
      let isResolved = false;

      // 3. SMARTER LOCAL ENGINE 6-SECOND WATCHDOG TIMEOUT
      const timeoutGuard = setTimeout(() => {
        if (!isResolved && isEngineRunning.current) {
          console.warn('Engine 6s timeout reached. Executing smarter alpha-beta fallback.');
          isResolved = true;

          try {
            // Run random fallback since emergency
            let emergencyMoveStr = '';
            const legals = liveChess.moves({ verbose: true });
            if (legals.length > 0) {
              const randIdx = Math.floor(Math.random() * legals.length);
              emergencyMoveStr = `${legals[randIdx].from}${legals[randIdx].to}${legals[randIdx].promotion || ''}`;
            }

            if (emergencyMoveStr) {
              const result = applyAnyMove(liveChess, emergencyMoveStr);
              if (result) {
                const newFen = sanitizeAndValidateFen(liveChess.fen());
                gameFenHistoryRef.current = [...gameFenHistoryRef.current, newFen];
                setGameFenHistory(gameFenHistoryRef.current);
                setLastMove({ from: result.from, to: result.to });
                setBotArrow({ from: result.from, to: result.to });
                setEvalScoreCp(0);

                const pieceOnFrom = liveChess.get(result.to);
                if (pieceOnFrom) {
                  setGhostPiece({
                    square: result.from,
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
                setHistory((prev) => {
                  const updated = [...prev, record];
                  persistGameState(newFen, updated, personality, userColor);
                  return updated;
                });
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
        engineService.syncGameHistory(gameFenHistoryRef.current);
        engineService.calculateMove(
          currentFen,
          personality,
          (bestMoveStr, scoreCp) => {
            if (isResolved) return;
            isResolved = true;
            clearTimeout(timeoutGuard);

            try {
              // 1. Unified Move Parser (SAN + UCI)
              let result = applyAnyMove(liveChess, bestMoveStr);

              // If move failed, try regex/UCI converter
              if (!result) {
                const uciMove = extractAnyValidMove(currentFen, bestMoveStr);
                if (uciMove) {
                  result = applyAnyMove(liveChess, uciMove);
                }
              }

              // Ultimate non-blocking legal move fallback
              if (!result) {
                const possibleMoves = liveChess.moves({ verbose: true });
                if (possibleMoves.length > 0) {
                  result = liveChess.move(possibleMoves[0]);
                }
              }

              if (result) {
                const newFen = sanitizeAndValidateFen(liveChess.fen());
                gameFenHistoryRef.current = [...gameFenHistoryRef.current, newFen];
                setGameFenHistory(gameFenHistoryRef.current);
                setLastMove({ from: result.from, to: result.to });
                setBotArrow({ from: result.from, to: result.to });

                if (typeof scoreCp === 'number') {
                  setEvalScoreCp(scoreCp);
                }

                // Render ghost piece on origin square
                setGhostPiece({
                  square: result.from,
                  type: result.piece,
                  color: result.color
                });

                // Audio feedback
                if (liveChess.inCheck()) {
                  playChessSound('check');
                } else if (result.captured) {
                  playChessSound('capture');
                } else {
                  playChessSound('move');
                }

                // Update move history & persist state
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
                setHistory((prev) => {
                  const updated = [...prev, record];
                  persistGameState(newFen, updated, personality, userColor);
                  return updated;
                });

                checkGameOver();
                setFen(newFen);
              }
            } catch (err) {
              console.error('Error executing bot move:', err);
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
    [liveChess, personality, userColor, checkGameOver, persistGameState]
  );

  // =========================================================================
  // SURGICAL REACTIVE TURN DISPATCHER
  // =========================================================================

  useEffect(() => {
    if (isSetupModalOpen) return;
    if (liveChess.isGameOver()) return;

    const currentFen = liveChess.fen();
    const turn = liveChess.turn(); // 'w' or 'b'

    if (userColor !== 'both' && turn === userColor) {
      if (isEngineRunning.current || lastProcessedTurnFen.current === currentFen) {
        return;
      }
      lastProcessedTurnFen.current = currentFen;

      setIsBoardLocked(true);
      setStatusText(`${personality.name} thinking for ${userColor === 'w' ? 'White' : 'Black'}`);
      executeBotMoveFor(userColor);
    } else {
      isEngineRunning.current = false;
      setIsBotThinking(false);
      setIsBoardLocked(false);
      setStatusText(`Your turn — input ${userColor === 'w' ? 'Black' : 'White'}'s move`);
    }
  }, [fen, userColor, isSetupModalOpen, liveChess, personality, executeBotMoveFor]);

  // =========================================================================
  // USER INPUT (OPPONENT MOVES ONLY)
  // =========================================================================

  const handleOpponentMove = useCallback(
    (move: { from: string; to: string; promotion?: string }): boolean => {
      const turn = liveChess.turn();

      if (userColor !== 'both' && turn === userColor) {
        return false;
      }
      if (isEngineRunning.current || inspectedMoveIndex !== null) {
        return false;
      }

      try {
        const currentFen = sanitizeAndValidateFen(liveChess.fen());
        const result = applyAnyMove(liveChess, move);
        if (!result) return false;

        const newFen = sanitizeAndValidateFen(liveChess.fen());
        gameFenHistoryRef.current = [...gameFenHistoryRef.current, newFen];
        setGameFenHistory(gameFenHistoryRef.current);
        setLastMove({ from: result.from, to: result.to });
        setBotArrow(null);
        setGhostPiece(null);

        // Audio feedback
        if (liveChess.inCheck()) {
          playChessSound('check');
        } else if (result.captured) {
          playChessSound('capture');
        } else {
          playChessSound('move');
        }

        // Record history & persist state
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
        setHistory((prev) => {
          const updated = [...prev, record];
          persistGameState(newFen, updated, personality, userColor);
          return updated;
        });

        const gameOver = checkGameOver();
        setFen(newFen);

        return !gameOver;
      } catch {
        playChessSound('illegal');
        return false;
      }
    },
    [liveChess, userColor, inspectedMoveIndex, checkGameOver, persistGameState, personality]
  );

  // God Mode FEN update handler
  const handleGodModeBoardChange = useCallback(
    (newFen: string) => {
      try {
        const sanitized = sanitizeAndValidateFen(newFen);
        liveChess.load(sanitized);
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
    [liveChess, checkGameOver]
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
      engineService.restartWorker();
      liveChess.load(sanitized);

      setPersonality(config.personality);
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
      setEvalScoreCp(0);
      setInspectedMoveIndex(null);
      setToastMessage(null);
      setGameOverInfo({ isOver: false, title: '', description: '', winner: null });
      setIsSetupModalOpen(false);

      // Save initial fresh state
      localStorage.removeItem(SAVED_GAME_KEY);

      // Trigger the reactive dispatcher
      setFen(sanitized);
    },
    [liveChess]
  );

  // Open Main Menu: Stop engine, reset state, and reopen setup modal
  const handleOpenMainMenu = useCallback(() => {
    engineService.restartWorker();
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

  // 5. PGN Export Helper
  const handleCopyPgn = useCallback(() => {
    if (history.length === 0) return;
    try {
      const lines: string[] = [];
      lines.push('[Event "Grandmaster AI Match"]');
      lines.push(`[White "${userColor === 'w' ? personality.name : 'Human'}"]`);
      lines.push(`[Black "${userColor === 'b' ? personality.name : 'Human'}"]`);
      lines.push(`[Result "${gameOverInfo.isOver ? (gameOverInfo.winner === 'w' ? '1-0' : gameOverInfo.winner === 'b' ? '0-1' : '1/2-1/2') : '*'}"]`);
      lines.push('');

      let moveText = '';
      for (let i = 0; i < history.length; i += 2) {
        const moveNumber = Math.floor(i / 2) + 1;
        const wMove = history[i].san;
        const bMove = history[i + 1]?.san || '';
        moveText += `${moveNumber}. ${wMove} ${bMove} `;
      }
      lines.push(moveText.trim());

      const fullPgn = lines.join('\n');
      navigator.clipboard.writeText(fullPgn);

      setToastMessage('PGN copied to clipboard.');
      setTimeout(() => setToastMessage(null), 2500);
    } catch (err) {
      console.warn('PGN copy failed:', err);
    }
  }, [history, userColor, personality, gameOverInfo]);

  // 5. On-Demand Hint Generator
  const handleRequestHint = useCallback(() => {
    if (isBotThinking || isBoardLocked) return;
    try {
      const currentFen = sanitizeAndValidateFen(liveChess.fen());
      engineService.getTacticalHint(currentFen).then((searchResult) => {
        if (searchResult.move && searchResult.move.length >= 4) {
          const from = searchResult.move.substring(0, 2);
          const to = searchResult.move.substring(2, 4);
          setBotArrow({ from, to });
          setToastMessage(`Hint: ${from.toUpperCase()} ➔ ${to.toUpperCase()}`);
          setTimeout(() => setToastMessage(null), 3500);
        }
      });
    } catch (err) {
      console.warn('Hint generation notice:', err);
    }
  }, [isBotThinking, isBoardLocked, liveChess]);

  // Toggle Sound Setting
  const handleToggleSound = useCallback(() => {
    const next = !isSoundOn;
    setIsSoundOn(next);
    setSoundEnabled(next);
  }, [isSoundOn]);

  return (
    <div className="relative min-h-screen bg-[#02040a] text-slate-100 flex flex-col justify-between overflow-x-hidden font-sans select-none">
      {/* 1.5s Animated Splash Screen */}
      {showSplash && <SplashScreen onComplete={() => setShowSplash(false)} />}

      {/* Subtle Ambient Golden Particles Background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute top-[-10%] left-[20%] w-[500px] h-[500px] rounded-full bg-amber-500/5 blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[15%] w-[450px] h-[450px] rounded-full bg-[#d4af37]/5 blur-[100px]" />
      </div>

      {/* Top Header Status Bar */}
      <Header
        personality={personality}
        userColor={userColor}
        activeTurn={liveChess.turn()}
        isEngineThinking={isBotThinking}
        onOpenMainMenu={handleOpenMainMenu}
      />

      {/* Main Focus Chess Arena */}
      <main className="flex-1 flex flex-col items-center justify-center p-2 sm:p-4 md:p-6 select-none z-10">
        <div className="w-full max-w-[560px] flex flex-col items-center gap-3">
          {/* Toast Notification for Timeout / PGN / Recovery */}
          {toastMessage && (
            <div className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-amber-500/20 border border-amber-400/40 text-amber-200 text-xs font-semibold shadow-lg backdrop-blur-md animate-fade-in">
              <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
              <span>{toastMessage}</span>
            </div>
          )}

          {/* Board & Live Eval Bar Container */}
          <div className="w-full flex items-stretch justify-center gap-2 sm:gap-3">
            {/* Live Gold Evaluation Bar */}
            <EvalBar
              scoreCp={evalScoreCp}
              isFlipped={isFlipped}
            />

            {/* Interactive 64-Square Chessboard */}
            <div className="flex-1 max-w-[460px]">
              <ChessBoard
                chess={displayChess}
                isFlipped={isFlipped}
                onOpponentMove={handleOpponentMove}
                onGodModeBoardChange={handleGodModeBoardChange}
                lastMove={lastMove}
                botArrow={botArrow}
                ghostPiece={ghostPiece}
                isBotTurn={isBoardLocked}
                isGameOver={gameOverInfo.isOver}
                isGodMode={isGodMode}
                onToggleGodMode={() => setIsGodMode((prev) => !prev)}
                isReadOnly={inspectedMoveIndex !== null}
                showArrows={showArrows}
              />
            </div>
          </div>

          {/* Move History, PGN & Settings Controls Panel */}
          <MoveHistoryPanel
            history={history}
            activeMoveIndex={inspectedMoveIndex}
            onSelectMoveIndex={setInspectedMoveIndex}
            onCopyPgn={handleCopyPgn}
            onRequestHint={handleRequestHint}
            onFlipBoard={() => setIsFlipped((prev) => !prev)}
            isSoundOn={isSoundOn}
            onToggleSound={handleToggleSound}
            showArrows={showArrows}
            onToggleArrows={() => setShowArrows((prev) => !prev)}
            isGodMode={isGodMode}
            onToggleGodMode={() => setIsGodMode((prev) => !prev)}
            isThinking={isBotThinking}
            isGameOver={gameOverInfo.isOver}
          />
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
        savedGameAvailable={savedGameAvailable}
        onResumeSavedGame={handleResumeSavedGame}
        onClose={history.length > 0 ? () => setIsSetupModalOpen(false) : undefined}
      />
    </div>
  );
}
