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

export default function App() {
  // Core Chess State
  const [chess] = useState(() => new Chess());
  const [history, setHistory] = useState<MoveRecord[]>([]);
  const [gameFenHistory, setGameFenHistory] = useState<string[]>([]);
  const [lastMove, setLastMove] = useState<{ from: string; to: string } | null>(null);

  // Bot Visual Indicators
  const [botArrow, setBotArrow] = useState<{ from: string; to: string } | null>(null);
  const [ghostPiece, setGhostPiece] = useState<{ square: string; type: string; color: 'w' | 'b' } | null>(null);

  // Configuration
  const [personality, setPersonality] = useState<AIPersonality>(AI_PERSONALITIES.tournament_player);
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
      confetti({ particleCount: 150, spread: 80, origin: { y: 0.55 } });
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

  const executeBotCounterMove = useCallback((currentFenHistory?: string[]) => {
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

        const from = bestMoveStr.substring(0, 2) as Square;
        const to = bestMoveStr.substring(2, 4) as Square;
        const promotion = bestMoveStr.length > 4 ? bestMoveStr[4] : undefined;

        const movingPiece = chess.get(from);

        try {
          const moveResult = chess.move({ from, to, promotion });
          if (moveResult) {
            if (moveResult.captured) {
              playChessSound('capture');
            } else if (moveResult.flags.includes('k') || moveResult.flags.includes('q')) {
              playChessSound('castle');
            } else if (moveResult.flags.includes('p')) {
              playChessSound('promote');
            } else if (chess.inCheck()) {
              playChessSound('check');
            } else {
              playChessSound('move');
            }

            setLastMove({ from, to });
            setBotArrow({ from, to });
            if (movingPiece) {
              setGhostPiece({ square: from, type: movingPiece.type, color: movingPiece.color });
            }

            const nextFen = chess.fen();
            const newRecord: MoveRecord = {
              san: moveResult.san,
              from,
              to,
              piece: moveResult.piece,
              color: moveResult.color,
              captured: moveResult.captured,
              promotion: moveResult.promotion,
              flags: moveResult.flags,
              fenBefore: currentFen,
              fenAfter: nextFen
            };

            setHistory((prev) => [...prev, newRecord]);
            setGameFenHistory((prev) => [...prev, nextFen]);
            checkGameOver();
          }
        } catch (err) {
          console.warn('Bot move error caught:', err);
        } finally {
          isBotThinkingRef.current = false;
          setIsBotTurn(false);
        }
      }
    );
  }, [chess, personality, gameFenHistory, checkGameOver]);

  // =========================================================================
  // USER INPUTS OPPONENT MOVE
  // =========================================================================

  const handleOpponentMove = useCallback(
    (move: { from: string; to: string; promotion?: string }): boolean => {
      if (isBotThinkingRef.current || gameOverInfo.isOver) return false;

      try {
        const fenBefore = chess.fen();
        const moveResult = chess.move({
          from: move.from as Square,
          to: move.to as Square,
          promotion: move.promotion || 'q'
        });

        if (!moveResult) return false;

        if (moveResult.captured) {
          playChessSound('capture');
        } else if (moveResult.flags.includes('k') || moveResult.flags.includes('q')) {
          playChessSound('castle');
        } else if (moveResult.flags.includes('p')) {
          playChessSound('promote');
        } else if (chess.inCheck()) {
          playChessSound('check');
        } else {
          playChessSound('move');
        }

        const nextFen = chess.fen();
        setLastMove({ from: move.from, to: move.to });
        setBotArrow(null);
        setGhostPiece(null);

        const newRecord: MoveRecord = {
          san: moveResult.san,
          from: move.from,
          to: move.to,
          piece: moveResult.piece,
          color: moveResult.color,
          captured: moveResult.captured,
          promotion: moveResult.promotion,
          flags: moveResult.flags,
          fenBefore,
          fenAfter: nextFen
        };

        const updatedHistory = [...history, newRecord];
        const updatedFenHistory = [...gameFenHistory, nextFen];
        setHistory(updatedHistory);
        setGameFenHistory(updatedFenHistory);

        const isOver = checkGameOver();
        if (!isOver) {
          setTimeout(() => {
            executeBotCounterMove(updatedFenHistory);
          }, 180);
        }

        return true;
      } catch {
        return false;
      }
    },
    [chess, history, gameFenHistory, gameOverInfo.isOver, checkGameOver, executeBotCounterMove]
  );

  // God Mode direct FEN manipulation (500ms long press on board)
  const handleGodModeBoardChange = useCallback(
    (newFen: string) => {
      try {
        chess.load(newFen);
        setLastMove(null);
        setBotArrow(null);
        setGhostPiece(null);
        setGameFenHistory((prev) => [...prev, newFen]);
        checkGameOver();
      } catch {}
    },
    [chess, checkGameOver]
  );

  // =========================================================================
  // MAIN MENU HANDLER
  // =========================================================================

  const handleOpenMainMenu = useCallback(() => {
    isBotThinkingRef.current = false;
    setIsBotTurn(false);
    stockfishService.reset();

    chess.reset();
    setHistory([]);
    setGameFenHistory([]);
    setLastMove(null);
    setBotArrow(null);
    setGhostPiece(null);
    setGameOverInfo({ isOver: false, title: '', description: '', winner: null });
    setIsSetupModalOpen(true);
  }, [chess]);

  // Launch Game from Setup Modal
  const handleStartGame = (config: {
    personality: AIPersonality;
    variant: PresetVariant;
    playerColor: PlayerColor;
    startingFen: string;
  }) => {
    setPersonality(config.personality);
    setActiveVariant(config.variant);
    setPlayerColor(config.playerColor);

    const userIsBlack = config.playerColor === 'b';
    setIsFlipped(userIsBlack);

    stockfishService.reset();

    const startingFen = config.startingFen || 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
    try {
      chess.load(startingFen);
    } catch {
      chess.reset();
    }

    setHistory([]);
    setGameFenHistory([startingFen]);
    setLastMove(null);
    setBotArrow(null);
    setGhostPiece(null);
    setGameOverInfo({ isOver: false, title: '', description: '', winner: null });
    setIsSetupModalOpen(false);

    // If User chose White, bot plays White's opening move immediately
    if (config.playerColor === 'w' && chess.turn() === 'w') {
      setTimeout(() => {
        executeBotCounterMove([startingFen]);
      }, 350);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-amber-500 selection:text-slate-950">
      {/* Sleek Minimalist Top Status Bar with Single Main Menu Button */}
      <Header
        personality={personality}
        playerColor={playerColor}
        activeTurn={chess.turn()}
        isEngineThinking={isBotTurn}
        onOpenMainMenu={handleOpenMainMenu}
      />

      {/* Main Focus Chess Arena */}
      <main className="flex-1 flex flex-col items-center justify-center p-3 md:p-6 select-none">
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
          <div className="w-full flex items-center justify-between px-3.5 py-2 rounded-xl bg-slate-900/70 border border-slate-800/80 text-xs text-slate-400 shadow-sm backdrop-blur-md">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              <span>
                Helping <strong className="text-amber-400">{playerColor === 'w' ? 'White' : 'Black'}</strong>. Input opponent's move.
              </span>
            </div>
            <div className="text-[11px] text-slate-400 hidden sm:block">
              Hold piece 500ms for God Mode
            </div>
          </div>
        </div>
      </main>

      {/* Clean Glassmorphic Game Over Modal */}
      {gameOverInfo.isOver && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
          <div className="bg-slate-900/90 border border-slate-700/80 p-6 md:p-8 rounded-3xl max-w-sm w-full text-center space-y-5 shadow-2xl">
            <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mx-auto text-amber-400">
              <Trophy className="w-8 h-8" />
            </div>

            <div>
              <h2 className="text-xl md:text-2xl font-black text-slate-100 uppercase tracking-wide">
                {gameOverInfo.title}
              </h2>
              <p className="text-xs md:text-sm text-slate-400 mt-1.5">
                {gameOverInfo.description}
              </p>
            </div>

            <div className="flex flex-col gap-2 pt-2">
              <button
                onClick={handleOpenMainMenu}
                className="w-full py-3 px-4 bg-amber-500 hover:bg-amber-400 active:scale-[0.99] text-slate-950 font-black text-xs uppercase tracking-wider rounded-xl shadow-lg transition flex items-center justify-center gap-2 cursor-pointer"
              >
                <RefreshCw className="w-4 h-4" />
                Play Again
              </button>

              <button
                onClick={() => setGameOverInfo((prev) => ({ ...prev, isOver: false }))}
                className="w-full py-2 px-4 bg-slate-800/80 hover:bg-slate-800 text-slate-300 text-xs font-semibold rounded-xl border border-slate-700/60 transition cursor-pointer"
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
