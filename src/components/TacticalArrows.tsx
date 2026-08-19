import React, { useEffect, useState } from 'react';

interface TacticalArrowsProps {
  arrow: { from: string; to: string } | null;
  boardRef: React.RefObject<HTMLDivElement | null>;
}

export const TacticalArrows = React.memo<TacticalArrowsProps>(({
  arrow,
  boardRef
}) => {
  const [coords, setCoords] = useState<{
    x1: number;
    y1: number;
    x2: number;
    y2: number;
    boardWidth: number;
    boardHeight: number;
  } | null>(null);

  useEffect(() => {
    if (!arrow || !boardRef.current) {
      setCoords(null);
      return;
    }

    const updateArrowPositions = () => {
      if (!boardRef.current || !arrow) {
        setCoords(null);
        return;
      }

      const boardEl = boardRef.current;
      const fromEl = document.getElementById(`square-${arrow.from}`);
      const toEl = document.getElementById(`square-${arrow.to}`);

      if (!boardEl || !fromEl || !toEl) {
        setCoords(null);
        return;
      }

      const boardRect = boardEl.getBoundingClientRect();
      const fromRect = fromEl.getBoundingClientRect();
      const toRect = toEl.getBoundingClientRect();

      if (boardRect.width === 0 || boardRect.height === 0) return;

      const x1 = fromRect.left + fromRect.width / 2 - boardRect.left;
      const y1 = fromRect.top + fromRect.height / 2 - boardRect.top;
      const x2 = toRect.left + toRect.width / 2 - boardRect.left;
      const y2 = toRect.top + toRect.height / 2 - boardRect.top;

      setCoords({
        x1,
        y1,
        x2,
        y2,
        boardWidth: boardRect.width,
        boardHeight: boardRect.height
      });
    };

    updateArrowPositions();

    const resizeObserver = new ResizeObserver(() => {
      updateArrowPositions();
    });

    if (boardRef.current) {
      resizeObserver.observe(boardRef.current);
    }

    window.addEventListener('resize', updateArrowPositions);
    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('resize', updateArrowPositions);
    };
  }, [arrow, boardRef]);

  if (!arrow || !coords) return null;

  const { x1, y1, x2, y2, boardWidth, boardHeight } = coords;
  const dx = x2 - x1;
  const dy = y2 - y1;
  const length = Math.sqrt(dx * dx + dy * dy);
  if (length === 0) return null;

  const unitX = dx / length;
  const unitY = dy / length;
  const startOffset = Math.min(18, length * 0.2);
  const endOffset = Math.min(22, length * 0.25);

  const startX = x1 + unitX * startOffset;
  const startY = y1 + unitY * startOffset;
  const endX = x2 - unitX * endOffset;
  const endY = y2 - unitY * endOffset;

  return (
    <svg
      className="move-arrow absolute inset-0 w-full h-full pointer-events-none z-20"
      viewBox={`0 0 ${boardWidth} ${boardHeight}`}
      style={{ width: '100%', height: '100%' }}
    >
      <defs>
        <marker
          id="bot-red-arrow-marker"
          viewBox="0 0 12 12"
          refX="6"
          refY="6"
          markerWidth="8"
          markerHeight="8"
          orient="auto-start-reverse"
        >
          <path
            d="M 1 2 L 11 6 L 1 10 L 4 6 Z"
            fill="#EF4444"
            stroke="#991B1B"
            strokeWidth="0.5"
          />
        </marker>
        <filter id="arrow-glow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#EF4444" floodOpacity="0.7" />
        </filter>
      </defs>

      <g filter="url(#arrow-glow)" opacity="0.92">
        <circle cx={x1} cy={y1} r="9" fill="#EF4444" opacity="0.85" />
        <line
          x1={startX}
          y1={startY}
          x2={endX}
          y2={endY}
          stroke="#EF4444"
          strokeWidth="7"
          strokeLinecap="round"
          markerEnd="url(#bot-red-arrow-marker)"
        />
        <circle
          cx={x2}
          cy={y2}
          r="16"
          fill="none"
          stroke="#EF4444"
          strokeWidth="3"
          strokeDasharray="4 3"
          opacity="0.85"
        />
      </g>
    </svg>
  );
});
