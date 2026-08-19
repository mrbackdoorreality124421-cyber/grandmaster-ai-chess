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
  const [pendingPromotion, setPendingPromotion] = useState<{ from: Square; to: Square } | null>(null);
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
    },
    [isFlipped]
  );

  const clearLongPressTimer = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  const executeMove = useCallback(
    (from: Square, to: Square, promotionPiece?: string) => {
      const piece = chess.get(from);
      const targetPiece = chess.get(to);
      const isPawn = piece?.type === 'p';
      const isTargetRank = (piece?.color === 'w' && to[1] === '8') || (piece?.color === 'b' && to[1] === '1');

      if (isPawn && isTargetRank && !promotionPiece) {
        setPendingPromotion({ from, to });
        return;
      }

      const isCapture = Boolean(targetPiece || (isPawn && from[0] !== to[0]));
      const success = onOpponentMove({ from, to, promotion: promotionPiece || 'q' });

      if (success) {
        setSelectedSquare(null);
        setLegalMoves([]);
        if (isCapture && boardRef.current) {
          const rect = boardRef.current.getBoundingClientRect();
          triggerCaptureSparkle(rect.left + rect.width / 2, rect.top + rect.height / 2);
        }
      }
    },
    [chess, onOpponentMove]
  );

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
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
        executeMove(selectedSquare, square);
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
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (activePointerIdRef.current !== e.pointerId) return;

    if (pointerStartPosRef.current && !interactionRef.current.isGodMode) {
      const dist = Math.hypot(
        e.clientX - pointerStartPosRef.current.x,
        e.clientY - pointerStartPosRef.current.y
      );
      if (dist > 15) {
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
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (activePointerIdRef.current !== e.pointerId) return;
    clearLongPressTimer();
    activePointerIdRef.current = null;
    pointerStartPosRef.current = null;

    const currentInteraction = interactionRef.current;
    if (!currentInteraction.isDragging) return;

    const destSquare = getSquareFromCoords(e.clientX, e.clientY);

    // God Mode Mutation
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
      const isLegal = legalMoves.some((m) => m.to === destSquare);
      if (isLegal) {
        executeMove(currentInteraction.originSquare, destSquare);
      } else {
        playChessSound('illegal');
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

  const handlePromotionSelect = (piece: string) => {
    if (!pendingPromotion) return;
    executeMove(pendingPromotion.from, pendingPromotion.to, piece);
    setPendingPromotion(null);
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
        {renderedRanks.map((rank, rowIndex) =>
          renderedFiles.map((file, colIndex) => {
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

            return (
              <div
                key={square}
                id={`square-${square}`}
                data-square={square}
                style={{ position: 'relative' }}
                className={`relative w-full h-full flex items-center justify-center transition-colors duration-150 ${squareBg}`}
              >
                {/* King in Check Red Glow Indicator */}
                {isKingInCheck && (
                  <div className="absolute inset-0 bg-red-600/60 rounded-full animate-ping pointer-events-none" />
                )}

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

                {/* Legal Move Capture Ring */}
                {isLegalDest && isCapture && (
                  <div className="absolute inset-1 rounded-full border-4 border-black/35 pointer-events-none animate-pulse" />
                )}

                {/* Rank & File Corner Labels */}
                {colIndex === 0 && (
                  <span
                    className={`absolute top-0.5 left-1 text-[9px] font-bold select-none pointer-events-none ${
                      isLightSquare ? 'text-[#4a3319]/70' : 'text-[#f0e6cc]/70'
                    }`}
                  >
                    {rank}
                  </span>
                )}
                {rowIndex === 7 && (
                  <span
                    className={`absolute bottom-0.5 right-1 text-[9px] font-bold select-none pointer-events-none ${
                      isLightSquare ? 'text-[#4a3319]/70' : 'text-[#f0e6cc]/70'
                    }`}
                  >
                    {file}
                  </span>
                )}
              </div>
            );
          })
        )}

        {/* Tactical Arrow Overlay */}
        <TacticalArrows arrow={botArrow} boardRef={boardRef} />
      </div>

      {/* Floating Dragged Piece */}
      {interactionState.isDragging &&
        interactionState.draggedPiece &&
        interactionState.dragPos && (
          <div
            className="fixed pointer-events-none z-50 transform -translate-x-1/2 -translate-y-1/2 scale-125 transition-transform duration-75 drop-shadow-[0_15px_25px_rgba(0,0,0,0.6)]"
            style={{
              left: `${interactionState.dragPos.x}px`,
              top: `${interactionState.dragPos.y}px`,
              width: '56px',
              height: '56px'
            }}
          >
            <ChessPieceSvg
              type={interactionState.draggedPiece.type}
              color={interactionState.draggedPiece.color}
            />
          </div>
        )}

      {/* Pawn Promotion Modal */}
      {pendingPromotion && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fade-in">
          <div className="bg-[#0b101c] border border-[#d4af37]/60 p-5 rounded-2xl shadow-2xl flex flex-col items-center gap-4">
            <h3 className="text-sm font-bold text-amber-200 uppercase tracking-wider font-serif">
              Choose Promotion Piece
            </h3>
            <div className="flex gap-3">
              {['q', 'r', 'b', 'n'].map((p) => (
                <button
                  key={p}
                  onClick={() => handlePromotionSelect(p)}
                  className="w-14 h-14 p-2 rounded-xl bg-slate-800/90 border border-slate-700 hover:border-[#d4af37] hover:bg-slate-700 transition flex items-center justify-center cursor-pointer active:scale-95 shadow-md"
                >
                  <ChessPieceSvg type={p} color={chess.turn() === 'w' ? 'b' : 'w'} />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
