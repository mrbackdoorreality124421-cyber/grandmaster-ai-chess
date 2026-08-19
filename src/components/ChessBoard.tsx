import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Chess, Square, Move } from 'chess.js';
import { ChessPieceSvg } from './ChessPieceSvg';
import { TacticalArrows } from './TacticalArrows';
import { playChessSound } from '../utils/audio';
import confetti from 'canvas-confetti';

interface ChessBoardProps {
  chess: Chess;
  isFlipped: boolean;
  onOpponentMove: (move: { from: string; to: string; promotion?: string }) => boolean;
  onGodModeBoardChange: (newFen: string) => void;
  lastMove: { from: string; to: string } | null;
  botArrow: { from: string; to: string } | null;
  ghostPiece: { square: string; type: string; color: 'w' | 'b' } | null;
  isBotTurn: boolean;
  isGameOver: boolean;
  isGodModeUnlocked: boolean;
  setIsGodModeUnlocked: (val: boolean) => void;
}

interface InteractionState {
  isDragging: boolean;
  isGodMode: boolean;
  originSquare: Square | null;
  dragPos: { x: number; y: number } | null;
  hoverSquare: Square | null;
  isOffBoard: boolean;
  draggedPiece: { type: string; color: 'w' | 'b' } | null;
}

export const ChessBoard: React.FC<ChessBoardProps> = ({
  chess,
  isFlipped,
  onOpponentMove,
  onGodModeBoardChange,
  lastMove,
  botArrow,
  ghostPiece,
  isBotTurn,
  isGameOver,
  setIsGodModeUnlocked
}) => {
  const boardRef = useRef<HTMLDivElement>(null);
  const [selectedSquare, setSelectedSquare] = useState<Square | null>(null);
  const [legalMoves, setLegalMoves] = useState<Move[]>([]);
  const [inCheckSquare, setInCheckSquare] = useState<Square | null>(null);

  const [interactionState, setInteractionState] = useState<InteractionState>({
    isDragging: false,
    isGodMode: false,
    originSquare: null,
    dragPos: null,
    hoverSquare: null,
    isOffBoard: false,
    draggedPiece: null
  });

  const interactionRef = useRef<InteractionState>(interactionState);
  interactionRef.current = interactionState;

  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const pointerStartPosRef = useRef<{ x: number; y: number } | null>(null);
  const activePointerIdRef = useRef<number | null>(null);

  // Check detection
  useEffect(() => {
    try {
      if (chess.inCheck()) {
        const activeSide = chess.turn();
        const board = chess.board();
        let foundKingSquare: Square | null = null;

        for (let r = 0; r < 8; r++) {
          for (let c = 0; c < 8; c++) {
            const piece = board[r][c];
            if (piece && piece.type === 'k' && piece.color === activeSide) {
              const file = String.fromCharCode(97 + c);
              const rank = (8 - r).toString();
              foundKingSquare = `${file}${rank}` as Square;
              break;
            }
          }
          if (foundKingSquare) break;
        }
        setInCheckSquare(foundKingSquare);
      } else {
        setInCheckSquare(null);
      }
    } catch {
      setInCheckSquare(null);
    }
  }, [chess, chess.fen()]);

  // Capture particle burst
  const triggerCaptureSparkle = (clientX: number, clientY: number) => {
    try {
      const x = clientX / window.innerWidth;
      const y = clientY / window.innerHeight;
      confetti({
        particleCount: 14,
        spread: 35,
        startVelocity: 15,
        origin: { x, y },
        colors: ['#d4af37', '#f59e0b', '#fbbf24', '#ffffff'],
        disableForReducedMotion: true,
        ticks: 40
      });
    } catch {}
  };

  const getSquareFromCoords = useCallback(
    (clientX: number, clientY: number): Square | null => {
      try {
        if (!boardRef.current) return null;
        const rect = boardRef.current.getBoundingClientRect();
        if (
          clientX < rect.left ||
          clientX > rect.right ||
          clientY < rect.top ||
          clientY > rect.bottom
        ) {
          return null;
        }

        const col = Math.floor(((clientX - rect.left) / rect.width) * 8);
        const row = Math.floor(((clientY - rect.top) / rect.height) * 8);

        if (col < 0 || col > 7 || row < 0 || row > 7) return null;

        const fileIndex = isFlipped ? 7 - col : col;
        const rankIndex = isFlipped ? row : 7 - row;

        const file = String.fromCharCode(97 + fileIndex);
        const rank = (rankIndex + 1).toString();

        return `${file}${rank}` as Square;
      } catch {
        return null;
      }
    },
    [isFlipped]
  );

  const clearLongPressTimer = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  /**
   * 2. SAFE onDrop / MOVE EXECUTION (Prevents fatal exceptions & always defaults promotion to 'q')
   */
  const executeSafeMove = useCallback(
    (sourceSquare: Square, targetSquare: Square, promotionPiece: string = 'q'): boolean => {
      try {
        const piece = chess.get(sourceSquare);
        const targetPiece = chess.get(targetSquare);
        const isPawn = piece?.type === 'p';
        const isCapture = Boolean(targetPiece || (isPawn && sourceSquare[0] !== targetSquare[0]));

        // Always promote to queen ('q') to prevent promotion dialog crashes
        const success = onOpponentMove({
          from: sourceSquare,
          to: targetSquare,
          promotion: promotionPiece
        });

        if (success) {
          setSelectedSquare(null);
          setLegalMoves([]);
          if (isCapture && boardRef.current) {
            const rect = boardRef.current.getBoundingClientRect();
            triggerCaptureSparkle(rect.left + rect.width / 2, rect.top + rect.height / 2);
          }
          return true;
        } else {
          playChessSound('illegal');
          return false;
        }
      } catch (err) {
        console.error('Safe Move Execution Notice:', err);
        playChessSound('illegal');
        return false;
      }
    },
    [chess, onOpponentMove]
  );

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    try {
      if (isBotTurn || isGameOver) return;
      const square = getSquareFromCoords(e.clientX, e.clientY);
      if (!square) return;

      activePointerIdRef.current = e.pointerId;
      pointerStartPosRef.current = { x: e.clientX, y: e.clientY };
      const piece = chess.get(square);

      if (piece) {
        clearLongPressTimer();
        longPressTimerRef.current = setTimeout(() => {
          setIsGodModeUnlocked(true);
          setInteractionState((prev) => ({
            ...prev,
            isDragging: true,
            isGodMode: true,
            originSquare: square,
            draggedPiece: { type: piece.type, color: piece.color },
            dragPos: { x: e.clientX, y: e.clientY },
            hoverSquare: square,
            isOffBoard: false
          }));
          playChessSound('capture');
        }, 500);
      }

      if (selectedSquare) {
        const move = legalMoves.find((m) => m.to === square);
        if (move) {
          clearLongPressTimer();
          executeSafeMove(selectedSquare, square);
          return;
        }
      }

      if (piece && piece.color === chess.turn()) {
        setSelectedSquare(square);
        setLegalMoves(chess.moves({ square, verbose: true }));
        setInteractionState((prev) => ({
          ...prev,
          isDragging: true,
          originSquare: square,
          draggedPiece: { type: piece.type, color: piece.color },
          dragPos: { x: e.clientX, y: e.clientY },
          hoverSquare: square,
          isOffBoard: false
        }));
      } else {
        setSelectedSquare(null);
        setLegalMoves([]);
      }
    } catch (err) {
      console.warn('PointerDown notice:', err);
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    try {
      if (activePointerIdRef.current !== e.pointerId) return;

      if (pointerStartPosRef.current && !interactionRef.current.isDragging) {
        const dx = Math.abs(e.clientX - pointerStartPosRef.current.x);
        const dy = Math.abs(e.clientY - pointerStartPosRef.current.y);
        if (dx > 8 || dy > 8) {
          clearLongPressTimer();
        }
      }

      if (!interactionRef.current.isDragging) return;

      const currentSquare = getSquareFromCoords(e.clientX, e.clientY);
      setInteractionState((prev) => ({
        ...prev,
        dragPos: { x: e.clientX, y: e.clientY },
        hoverSquare: currentSquare,
        isOffBoard: !currentSquare
      }));
    } catch (err) {
      console.warn('PointerMove notice:', err);
    }
  };

  /**
   * Safe onDrop Pointer Up (Never throws or corrupts state)
   */
  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    try {
      if (activePointerIdRef.current !== e.pointerId) return;
      clearLongPressTimer();
      activePointerIdRef.current = null;
      pointerStartPosRef.current = null;

      const currentInteraction = interactionRef.current;
      if (!currentInteraction.isDragging) return;

      const destSquare = getSquareFromCoords(e.clientX, e.clientY);

      // God Mode
      if (currentInteraction.isGodMode && currentInteraction.originSquare) {
        if (currentInteraction.isOffBoard || !destSquare) {
          chess.remove(currentInteraction.originSquare);
          playChessSound('capture');
          onGodModeBoardChange(chess.fen());
        } else if (destSquare !== currentInteraction.originSquare) {
          const piece = chess.remove(currentInteraction.originSquare);
          if (piece) {
            chess.put(piece, destSquare);
            playChessSound('move');
            onGodModeBoardChange(chess.fen());
          }
        }
        setInteractionState({
          isDragging: false,
          isGodMode: false,
          originSquare: null,
          dragPos: null,
          hoverSquare: null,
          isOffBoard: false,
          draggedPiece: null
        });
        setSelectedSquare(null);
        setLegalMoves([]);
        return;
      }

      // Standard Opponent Move
      if (
        currentInteraction.originSquare &&
        destSquare &&
        currentInteraction.originSquare !== destSquare
      ) {
        executeSafeMove(currentInteraction.originSquare, destSquare, 'q');
      }
    } catch (error) {
      console.error('onDrop Error:', error);
    } finally {
      // Always snap back and reset drag state safely
      setInteractionState({
        isDragging: false,
        isGodMode: false,
        originSquare: null,
        dragPos: null,
        hoverSquare: null,
        isOffBoard: false,
        draggedPiece: null
      });
    }
  };

  const handlePointerCancel = () => {
    clearLongPressTimer();
    activePointerIdRef.current = null;
    pointerStartPosRef.current = null;
    setInteractionState({
      isDragging: false,
      isGodMode: false,
      originSquare: null,
      dragPos: null,
      hoverSquare: null,
      isOffBoard: false,
      draggedPiece: null
    });
  };

  const displayFiles = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
  const displayRanks = ['8', '7', '6', '5', '4', '3', '2', '1'];

  const renderedFiles = isFlipped ? [...displayFiles].reverse() : displayFiles;
  const renderedRanks = isFlipped ? [...displayRanks].reverse() : displayRanks;

  return (
    <div className="relative w-full max-w-[480px] aspect-square mx-auto select-none touch-none p-1">
      {/* Board Container with Luxury Obsidian Gold Border & Glow */}
      <div
        ref={boardRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerCancel}
        style={{
          touchAction: 'none',
          filter: isGameOver ? 'brightness(0.4)' : undefined
        }}
        className={`relative w-full h-full grid grid-cols-8 grid-rows-8 rounded-2xl overflow-hidden shadow-[0_12px_40px_rgba(0,0,0,0.85)] border-2 border-[#d4af37]/35 bg-[#050814] transition-all duration-300 ${
          isBotTurn || isGameOver ? 'pointer-events-none cursor-wait' : ''
        }`}
      >
        {renderedRanks.map((rank) =>
          renderedFiles.map((file) => {
            const square = `${file}${rank}` as Square;
            const isLightSquare = (file.charCodeAt(0) - 97 + parseInt(rank, 10)) % 2 !== 0;
            const piece = chess.get(square);
            const isSelected = selectedSquare === square;
            const isLastMoveFrom = lastMove?.from === square;
            const isLastMoveTo = lastMove?.to === square;
            const isKingInCheck = inCheckSquare === square;
            const isGodHovered = interactionState.hoverSquare === square && interactionState.isGodMode;

            const isGhostSquare = ghostPiece && ghostPiece.square === square;

            const legalMove = legalMoves.find((m) => m.to === square);
            const isLegalDest = Boolean(legalMove);
            const isCapture = Boolean(legalMove && (piece || legalMove.flags.includes('e')));

            const isCurrentlyDragged =
              interactionState.isDragging &&
              interactionState.originSquare === square;

            // Walnut & Warm Cream Board Palette
            let squareBg = isLightSquare ? 'bg-[#f0e6cc]' : 'bg-[#4a3319]';
            if (isLastMoveFrom || isLastMoveTo) {
              squareBg = isLightSquare ? 'bg-[#e8d89e]' : 'bg-[#7a572a]';
            }
            if (isSelected) {
              squareBg = 'bg-[#d4af37]/80';
            }
            if (isGodHovered) {
              squareBg = 'bg-[#f59e0b]/90 ring-2 ring-[#d4af37] ring-inset';
            }
            if (isKingInCheck) {
              squareBg = 'king-in-check';
            }

            return (
              <div
                key={square}
                id={`square-${square}`}
                data-square={square}
                style={{ position: 'relative' }}
                className={`relative w-full h-full flex items-center justify-center transition-colors duration-150 ${squareBg}`}
              >
                {/* Ghost Piece on Bot's Origin Square */}
                {isGhostSquare && !piece && (
                  <div className="absolute inset-0 p-1 opacity-35 pointer-events-none animate-pulse">
                    <ChessPieceSvg type={ghostPiece.type} color={ghostPiece.color} />
                  </div>
                )}

                {/* Normal Board Piece */}
                {piece && !isCurrentlyDragged && (
                  <div className="w-full h-full p-1 transition-transform duration-100 ease-out hover:scale-105 pointer-events-none">
                    <ChessPieceSvg type={piece.type} color={piece.color} />
                  </div>
                )}

                {/* Legal Move Dot indicator */}
                {isLegalDest && !isCapture && (
                  <div className="w-3.5 h-3.5 rounded-full bg-black/30 pointer-events-none" />
                )}

                {/* Capture Ring indicator */}
                {isLegalDest && isCapture && (
                  <div className="w-full h-full border-4 border-amber-600/60 rounded-full scale-90 pointer-events-none" />
                )}
              </div>
            );
          })
        )}

        {/* Tactical Recommendation Red Vector Arrow */}
        {botArrow && (
          <TacticalArrows
            arrow={botArrow}
            boardRef={boardRef}
          />
        )}
      </div>

      {/* Floating Dragged Piece */}
      {interactionState.isDragging && interactionState.draggedPiece && interactionState.dragPos && (
        <div
          style={{
            position: 'fixed',
            left: interactionState.dragPos.x,
            top: interactionState.dragPos.y,
            transform: 'translate(-50%, -50%) scale(1.15)',
            pointerEvents: 'none',
            zIndex: 9999
          }}
          className={`w-14 h-14 md:w-16 md:h-16 ${
            interactionState.isGodMode ? 'drop-shadow-[0_0_15px_rgba(212,175,55,1)]' : 'drop-shadow-2xl'
          }`}
        >
          <ChessPieceSvg
            type={interactionState.draggedPiece.type}
            color={interactionState.draggedPiece.color}
          />
        </div>
      )}
    </div>
  );
};
