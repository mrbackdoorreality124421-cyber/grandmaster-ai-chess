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

  // Exact Visual King in Check Detection & Removal Logic
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
        particleCount: 12,
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
      const targetPiece = chess.get(to);
      const isPawn = chess.get(from)?.type === 'p';
      const isTargetRank = (chess.turn() === 'w' && to.endsWith('8')) || (chess.turn() === 'b' && to.endsWith('1'));

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
    const isOffBoard = currentSquare === null;

    setInteractionState((prev) => ({
      ...prev,
      dragPos: { x: e.clientX, y: e.clientY },
      hoverSquare: currentSquare,
      isOffBoard
    }));
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    clearLongPressTimer();
    if (activePointerIdRef.current !== e.pointerId) return;
    activePointerIdRef.current = null;
    pointerStartPosRef.current = null;

    const state = interactionRef.current;
    if (!state.isDragging) return;

    const targetSquare = getSquareFromCoords(e.clientX, e.clientY);

    if (state.isGodMode) {
      if (state.originSquare) {
        if (!targetSquare) {
          const simChess = new Chess(chess.fen());
          simChess.remove(state.originSquare);
          onGodModeBoardChange(simChess.fen());
          playChessSound('capture');
        } else if (targetSquare !== state.originSquare && state.draggedPiece) {
          const simChess = new Chess(chess.fen());
          simChess.remove(state.originSquare);
          simChess.put(
            { type: state.draggedPiece.type as any, color: state.draggedPiece.color },
            targetSquare
          );
          onGodModeBoardChange(simChess.fen());
          playChessSound('move');
        }
      }
    } else if (state.originSquare && targetSquare && targetSquare !== state.originSquare) {
      const move = legalMoves.find((m) => m.to === targetSquare);
      if (move) {
        executeMove(state.originSquare, targetSquare);
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

  if (isFlipped) {
    displayFiles.reverse();
    displayRanks.reverse();
  }

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
        {displayRanks.map((rank, rowIndex) =>
          displayFiles.map((file, colIndex) => {
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

            // Luxury Walnut & Warm Cream Square Palette
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
                className={`w-full h-full flex items-center justify-center transition-colors duration-200 ${squareBg} ${
                  isKingInCheck ? 'king-in-check' : ''
                }`}
              >
                {/* Board Rank & File Labels */}
                {colIndex === 0 && (
                  <span
                    className={`absolute top-0.5 left-1 text-[9px] md:text-[11px] font-bold select-none z-10 pointer-events-none ${
                      isLightSquare ? 'text-[#4a3319]/80' : 'text-[#f0e6cc]/80'
                    }`}
                  >
                    {rank}
                  </span>
                )}
                {rowIndex === 7 && (
                  <span
                    className={`absolute bottom-0.5 right-1 text-[9px] md:text-[11px] font-bold select-none z-10 pointer-events-none ${
                      isLightSquare ? 'text-[#4a3319]/80' : 'text-[#f0e6cc]/80'
                    }`}
                  >
                    {file}
                  </span>
                )}

                {/* Legal Move Dot */}
                {isLegalDest && !isCapture && (
                  <div className="w-3.5 h-3.5 md:w-4 md:h-4 rounded-full bg-slate-900/35 backdrop-blur-xs z-15 pointer-events-none" />
                )}

                {/* Legal Move Capture Ring */}
                {isLegalDest && isCapture && (
                  <div className="absolute inset-1 rounded-full border-4 border-slate-900/40 z-15 pointer-events-none" />
                )}

                {/* Ghost Piece on Bot Origin Square */}
                {isGhostSquare && (
                  <div
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '100%',
                      height: '100%',
                      pointerEvents: 'none'
                    }}
                    className="p-1 opacity-40 z-10 scale-95"
                  >
                    <div className="w-full h-full rounded-md ring-2 ring-red-500/50 ring-dashed">
                      <ChessPieceSvg type={ghostPiece.type} color={ghostPiece.color} />
                    </div>
                  </div>
                )}

                {/* Real Piece SVG with Soft Drop Shadow & 250ms Smooth Motion */}
                {piece && !isCurrentlyDragged && (
                  <div
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '100%',
                      height: '100%',
                      pointerEvents: 'none'
                    }}
                    className="p-1 flex items-center justify-center select-none z-20 chess-piece"
                  >
                    <ChessPieceSvg type={piece.type} color={piece.color} />
                  </div>
                )}
              </div>
            );
          })
        )}

        {/* Vector Arrow Overlay */}
        <TacticalArrows
          arrow={botArrow}
          boardRef={boardRef}
        />
      </div>

      {/* Floating Piece Cursor during Drag & God Mode */}
      {interactionState.isDragging && interactionState.draggedPiece && interactionState.dragPos && (
        <div
          className="fixed pointer-events-none z-50 transform -translate-x-1/2 -translate-y-1/2"
          style={{
            left: `${interactionState.dragPos.x}px`,
            top: `${interactionState.dragPos.y}px`,
            width: '60px',
            height: '60px'
          }}
        >
          <div
            className={`w-full h-full filter brightness-110 ${
              interactionState.isGodMode
                ? 'scale-125 drop-shadow-[0_15px_25px_rgba(0,0,0,0.7)]'
                : 'scale-110 drop-shadow-[0_8px_16px_rgba(0,0,0,0.5)]'
            }`}
          >
            <ChessPieceSvg
              type={interactionState.draggedPiece.type}
              color={interactionState.draggedPiece.color}
            />
          </div>
          {interactionState.isGodMode && interactionState.isOffBoard && (
            <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 bg-rose-600 text-white text-[9px] font-bold px-1.5 py-0.5 rounded shadow whitespace-nowrap">
              Release to Delete
            </div>
          )}
        </div>
      )}

      {/* Pawn Promotion Dialog */}
      {pendingPromotion && (
        <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-md rounded-2xl z-40 flex flex-col items-center justify-center p-4">
          <div className="bg-[#0b101c] border border-[#d4af37]/40 p-4 rounded-xl shadow-2xl flex flex-col items-center gap-3">
            <span className="text-sm font-bold text-[#d4af37] uppercase tracking-wider font-serif">
              Choose Promotion Piece
            </span>
            <div className="flex gap-2">
              {(['q', 'n', 'r', 'b'] as const).map((pieceType) => (
                <button
                  key={pieceType}
                  onClick={() => handlePromotionSelect(pieceType)}
                  className="w-12 h-12 md:w-14 md:h-14 bg-slate-900 hover:bg-slate-800 active:scale-95 rounded-lg border border-slate-700 flex items-center justify-center p-1.5 transition-all shadow-md hover:border-[#d4af37] cursor-pointer"
                >
                  <ChessPieceSvg type={pieceType} color={chess.turn()} />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
