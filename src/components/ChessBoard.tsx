import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Chess, Square, Move } from 'chess.js';
import { ChessPieceSvg } from './ChessPieceSvg';
import { TacticalArrows } from './TacticalArrows';
import { playChessSound } from '../utils/audio';

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
      // Instantly remove check warning when King is safe
      setInCheckSquare(null);
    }
  }, [chess, chess.fen()]);

  const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
  const ranks = ['8', '7', '6', '5', '4', '3', '2', '1'];

  const displayFiles = isFlipped ? [...files].reverse() : files;
  const displayRanks = isFlipped ? [...ranks].reverse() : ranks;

  const getSquareFromCoords = useCallback((clientX: number, clientY: number): Square | null => {
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
    const squareSize = rect.width / 8;
    const colIndex = Math.floor((clientX - rect.left) / squareSize);
    const rowIndex = Math.floor((clientY - rect.top) / squareSize);

    if (colIndex >= 0 && colIndex < 8 && rowIndex >= 0 && rowIndex < 8) {
      const file = displayFiles[colIndex];
      const rank = displayRanks[rowIndex];
      return `${file}${rank}` as Square;
    }
    return null;
  }, [displayFiles, displayRanks]);

  const getMovesForSquare = useCallback((sq: Square) => {
    try {
      return chess.moves({ square: sq, verbose: true }) as Move[];
    } catch {
      return [];
    }
  }, [chess]);

  const attemptMove = (from: Square, to: Square): boolean => {
    const move = chess.moves({ square: from, verbose: true }).find((m) => m.to === to);
    if (!move) return false;

    const isPromotion =
      move.piece === 'p' &&
      ((move.color === 'w' && to[1] === '8') || (move.color === 'b' && to[1] === '1'));

    if (isPromotion) {
      setPendingPromotion({ from, to });
      return true;
    }

    const success = onOpponentMove({ from, to });
    if (success) {
      setSelectedSquare(null);
      setLegalMoves([]);
    }
    return success;
  };

  const handlePromotionSelect = (promotionPiece: 'q' | 'r' | 'b' | 'n') => {
    if (!pendingPromotion) return;
    onOpponentMove({
      from: pendingPromotion.from,
      to: pendingPromotion.to,
      promotion: promotionPiece
    });
    setPendingPromotion(null);
    setSelectedSquare(null);
    setLegalMoves([]);
  };

  // Event Delegation Handlers
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isBotTurn || isGameOver || pendingPromotion) return;
    if (!e.isPrimary || (e.button !== 0 && e.pointerType === 'mouse')) return;

    activePointerIdRef.current = e.pointerId;
    pointerStartPosRef.current = { x: e.clientX, y: e.clientY };

    const targetEl = (e.target as HTMLElement).closest('[data-square]');
    const clickedSquare = targetEl ? (targetEl.getAttribute('data-square') as Square) : null;
    if (!clickedSquare) return;

    const piece = chess.get(clickedSquare);

    if (selectedSquare && selectedSquare !== clickedSquare) {
      const moved = attemptMove(selectedSquare, clickedSquare);
      if (moved) return;
    }

    const currentMoves = piece && piece.color === chess.turn() ? getMovesForSquare(clickedSquare) : [];

    setInteractionState({
      isDragging: false,
      isGodMode: false,
      originSquare: clickedSquare,
      dragPos: { x: e.clientX, y: e.clientY },
      hoverSquare: clickedSquare,
      isOffBoard: false,
      draggedPiece: piece ? { type: piece.type, color: piece.color } : null
    });

    if (piece) {
      setSelectedSquare(clickedSquare);
      setLegalMoves(currentMoves);

      if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = setTimeout(() => {
        if (navigator.vibrate) navigator.vibrate([40, 30, 40]);
        playChessSound('godmode');
        setIsGodModeUnlocked(true);

        setInteractionState((prev) => ({
          ...prev,
          isDragging: true,
          isGodMode: true
        }));
      }, 500);
    } else {
      setSelectedSquare(null);
      setLegalMoves([]);
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (activePointerIdRef.current !== e.pointerId) return;

    const startPos = pointerStartPosRef.current;
    if (!startPos) return;

    const dist = Math.hypot(e.clientX - startPos.x, e.clientY - startPos.y);

    if (dist > 8 && longPressTimerRef.current && !interactionRef.current.isGodMode) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;

      if (interactionRef.current.originSquare && interactionRef.current.draggedPiece) {
        setInteractionState((prev) => ({
          ...prev,
          isDragging: true,
          isGodMode: false
        }));
      }
    }

    if (interactionRef.current.isDragging) {
      const hoverSq = getSquareFromCoords(e.clientX, e.clientY);
      setInteractionState((prev) => ({
        ...prev,
        dragPos: { x: e.clientX, y: e.clientY },
        hoverSquare: hoverSq,
        isOffBoard: hoverSq === null
      }));
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (activePointerIdRef.current !== e.pointerId) return;
    activePointerIdRef.current = null;

    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }

    const state = interactionRef.current;
    pointerStartPosRef.current = null;

    const dropSquare = getSquareFromCoords(e.clientX, e.clientY);

    // God Mode Drop
    if (state.isGodMode && state.draggedPiece) {
      try {
        if (state.originSquare) {
          chess.remove(state.originSquare);
        }

        if (dropSquare) {
          chess.remove(dropSquare);
          chess.put(
            { type: state.draggedPiece.type as any, color: state.draggedPiece.color },
            dropSquare
          );
          playChessSound('move');
        } else {
          playChessSound('delete');
        }

        const nextFen = chess.fen();
        onGodModeBoardChange(nextFen);
      } catch (err) {
        console.warn('God Mode drop notice:', err);
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

    // Normal Legal Drag Drop
    if (state.isDragging && state.originSquare && dropSquare) {
      if (state.originSquare !== dropSquare) {
        attemptMove(state.originSquare, dropSquare);
      }
    }

    setInteractionState((prev) => ({
      ...prev,
      isDragging: false,
      isGodMode: false,
      dragPos: null,
      hoverSquare: null,
      isOffBoard: false
    }));
  };

  const handlePointerCancel = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
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

  return (
    <div className="relative flex flex-col items-center select-none w-full max-w-[540px] aspect-square">
      {/* Bot Thinking Floating Pill */}
      {isBotTurn && (
        <div className="absolute -top-7 left-1/2 -translate-x-1/2 bg-slate-900/90 text-amber-400 border border-amber-500/40 text-[11px] font-bold px-3 py-0.5 rounded-full shadow-lg flex items-center gap-1.5 z-30">
          <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
          Bot Calculating...
        </div>
      )}

      {/* Main 64-Square Grid */}
      <div
        id="board"
        ref={boardRef}
        onContextMenu={(e) => e.preventDefault()}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerCancel}
        style={{
          touchAction: 'none',
          filter: isGameOver ? 'brightness(0.45)' : undefined
        }}
        className={`relative w-full h-full grid grid-cols-8 grid-rows-8 rounded-2xl overflow-hidden shadow-2xl border-2 border-slate-700/80 bg-slate-900 transition-all duration-300 ${
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

            let squareBg = isLightSquare ? 'bg-[#ECECD0]' : 'bg-[#739552]';
            if (isLastMoveFrom || isLastMoveTo) {
              squareBg = isLightSquare ? 'bg-[#F5F682]' : 'bg-[#B9CA43]';
            }
            if (isSelected) {
              squareBg = 'bg-amber-300/80';
            }
            if (isGodHovered) {
              squareBg = 'bg-amber-400/90 ring-2 ring-amber-500 ring-inset';
            }

            return (
              <div
                key={square}
                id={`square-${square}`}
                data-square={square}
                style={{ position: 'relative' }}
                className={`w-full h-full flex items-center justify-center transition-colors duration-150 ${squareBg} ${
                  isKingInCheck ? 'king-in-check' : ''
                }`}
              >
                {/* Board Rank & File Labels */}
                {colIndex === 0 && (
                  <span
                    className={`absolute top-0.5 left-1 text-[9px] md:text-[11px] font-bold select-none z-10 pointer-events-none ${
                      isLightSquare ? 'text-[#739552]' : 'text-[#ECECD0]'
                    }`}
                  >
                    {rank}
                  </span>
                )}
                {rowIndex === 7 && (
                  <span
                    className={`absolute bottom-0.5 right-1 text-[9px] md:text-[11px] font-bold select-none z-10 pointer-events-none ${
                      isLightSquare ? 'text-[#739552]' : 'text-[#ECECD0]'
                    }`}
                  >
                    {file}
                  </span>
                )}

                {/* Legal Move Dot */}
                {isLegalDest && !isCapture && (
                  <div className="w-3.5 h-3.5 md:w-4 md:h-4 rounded-full bg-slate-900/30 backdrop-blur-xs z-15 pointer-events-none" />
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

                {/* Real Piece SVG */}
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
                    className="p-1 flex items-center justify-center select-none z-20"
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
        <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-md rounded-2xl z-40 flex flex-col items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 p-4 rounded-xl shadow-2xl flex flex-col items-center gap-3">
            <span className="text-sm font-bold text-amber-400 uppercase tracking-wider">
              Choose Promotion Piece
            </span>
            <div className="flex gap-2">
              {(['q', 'n', 'r', 'b'] as const).map((pieceType) => (
                <button
                  key={pieceType}
                  onClick={() => handlePromotionSelect(pieceType)}
                  className="w-12 h-12 md:w-14 md:h-14 bg-slate-800 hover:bg-slate-700 active:scale-95 rounded-lg border border-slate-600 flex items-center justify-center p-1.5 transition-all shadow-md hover:border-amber-400 cursor-pointer"
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
