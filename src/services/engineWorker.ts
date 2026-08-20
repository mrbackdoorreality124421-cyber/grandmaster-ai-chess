import { Chess, Move, Square } from 'chess.js';

// --- PeSTO Midgame Piece-Square Positional Tables ---
const PST_MG: Record<string, number[]> = {
  p: [
    0,   0,   0,   0,   0,   0,   0,   0,
    50,  50,  50,  50,  50,  50,  50,  50,
    10,  10,  20,  30,  30,  20,  10,  10,
     5,   5,  10,  27,  27,  10,   5,   5,
     0,   0,   0,  25,  25,   0,   0,   0,
     5,  -5, -10,   0,   0, -10,  -5,   5,
     5,  10,  10, -25, -25,  10,  10,   5,
     0,   0,   0,   0,   0,   0,   0,   0
  ],
  n: [
    -50, -40, -30, -30, -30, -30, -40, -50,
    -40, -20,   0,   5,   5,   0, -20, -40,
    -30,   5,  15,  20,  20,  15,   5, -30,
    -30,   0,  20,  30,  30,  20,   0, -30,
    -30,   5,  20,  30,  30,  20,   5, -30,
    -30,   0,  15,  20,  20,  15,   0, -30,
    -40, -20,   0,   0,   0,   0, -20, -40,
    -50, -40, -30, -30, -30, -30, -40, -50
  ],
  b: [
    -20, -10, -10, -10, -10, -10, -10, -20,
    -10,   5,   0,   0,   0,   0,   5, -10,
    -10,  10,  10,  10,  10,  10,  10, -10,
    -10,   0,  15,  20,  20,  15,   0, -10,
    -10,   5,  10,  20,  20,  10,   5, -10,
    -10,   0,  10,  10,  10,  10,   0, -10,
    -10,   5,   0,   0,   0,   0,   5, -10,
    -20, -10, -10, -10, -10, -10, -10, -20
  ],
  r: [
      0,   0,   0,   5,   5,   0,   0,   0,
     -5,   0,   0,   0,   0,   0,   0,  -5,
     -5,   0,   0,   0,   0,   0,   0,  -5,
     -5,   0,   0,   0,   0,   0,   0,  -5,
     -5,   0,   0,   0,   0,   0,   0,  -5,
     -5,   0,   0,   0,   0,   0,   0,  -5,
      5,  15,  15,  15,  15,  15,  15,   5,
      0,   0,   0,   0,   0,   0,   0,   0
  ],
  q: [
    -20, -10, -10,  -5,  -5, -10, -10, -20,
    -10,   0,   5,   0,   0,   0,   0, -10,
    -10,   5,   5,   5,   5,   5,   0, -10,
      0,   0,   5,   5,   5,   5,   0,  -5,
     -5,   0,   5,   5,   5,   5,   0,  -5,
    -10,   0,   5,   5,   5,   5,   0, -10,
    -10,   0,   0,   0,   0,   0,   0, -10,
    -20, -10, -10,  -5,  -5, -10, -10, -20
  ],
  k: [
     20,  30,  10,   0,   0,  10,  30,  20,
     20,  20,   0,   0,   0,   0,  20,  20,
    -10, -20, -20, -20, -20, -20, -20, -10,
    -20, -30, -30, -40, -40, -30, -30, -20,
    -30, -40, -40, -50, -50, -40, -40, -30,
    -30, -40, -40, -50, -50, -40, -40, -30,
    -30, -40, -40, -50, -50, -40, -40, -30,
    -30, -40, -40, -50, -50, -40, -40, -30
  ]
};

// Endgame King centralization
const PST_EG_K = [
  -50, -30, -30, -30, -30, -30, -30, -50,
  -30, -30,   0,   0,   0,   0, -30, -30,
  -30, -10,  20,  30,  30,  20, -10, -30,
  -30, -10,  30,  40,  40,  30, -10, -30,
  -30, -10,  30,  40,  40,  30, -10, -30,
  -30, -10,  20,  30,  30,  20, -10, -30,
  -30, -20, -10,   0,   0, -10, -20, -30,
  -50, -40, -30, -20, -20, -30, -40, -50
];

const PIECE_VALUES: Record<string, number> = { p: 100, n: 320, b: 330, r: 500, q: 900, k: 20000 };

const MATE_VALUE = 99999;
const DRAW_VALUE = 0;

let nodes = 0;
let startTime = 0;
let timeLimit = 0;
let isCancelled = false;

function evaluateBoard(chess: Chess, botColor: 'w' | 'b'): number {
  if (chess.isCheckmate()) return chess.turn() === botColor ? -MATE_VALUE : MATE_VALUE;
  if (chess.isDraw() || chess.isStalemate() || chess.isThreefoldRepetition() || chess.isInsufficientMaterial()) {
    return DRAW_VALUE;
  }

  let score = 0;
  const board = chess.board();
  let totalPieces = 0;

  let whiteBishops = 0;
  let blackBishops = 0;

  // Track pawn files for isolated/passed pawn logic
  const whitePawns = new Array(8).fill(0);
  const blackPawns = new Array(8).fill(0);

  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const p = board[r][c];
      if (p) {
        totalPieces++;
        if (p.type === 'p') {
          if (p.color === 'w') whitePawns[c]++;
          else blackPawns[c]++;
        } else if (p.type === 'b') {
          if (p.color === 'w') whiteBishops++;
          else blackBishops++;
        }
      }
    }
  }

  const isEndgame = totalPieces <= 10;

  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const p = board[r][c];
      if (!p) continue;
      
      let val = PIECE_VALUES[p.type];
      
      // Calculate square index (0 to 63)
      let sq = p.color === 'w' ? r * 8 + c : (7 - r) * 8 + c;
      let pst = PST_MG[p.type][sq];
      
      if (isEndgame && p.type === 'k') {
        pst = PST_EG_K[sq];
      }

      // Pawn specific logic
      if (p.type === 'p') {
        // Doubled pawns penalty
        if (p.color === 'w' && whitePawns[c] > 1) val -= 15;
        if (p.color === 'b' && blackPawns[c] > 1) val -= 15;
        
        // Isolated pawns penalty
        const hasNeighbor = (c > 0 && (p.color === 'w' ? whitePawns[c-1] : blackPawns[c-1]) > 0) ||
                            (c < 7 && (p.color === 'w' ? whitePawns[c+1] : blackPawns[c+1]) > 0);
        if (!hasNeighbor) val -= 10;
        
        // Passed pawns bonus
        const rank = p.color === 'w' ? 7 - r : r; // 0-7 where 7 is promotion rank
        let isPassed = false;
        if (p.color === 'w') {
           // No black pawns in front or on adjacent files in front
           if (blackPawns[c] === 0 && (c === 0 || blackPawns[c-1] === 0) && (c === 7 || blackPawns[c+1] === 0)) {
               isPassed = true;
           }
        } else {
           if (whitePawns[c] === 0 && (c === 0 || whitePawns[c-1] === 0) && (c === 7 || whitePawns[c+1] === 0)) {
               isPassed = true;
           }
        }
        if (isPassed && rank >= 4) {
          val += (rank - 3) * 20; // +20 on 5th rank, +40 on 6th, +60 on 7th
        }
      }
      
      let total = val + pst;
      
      if (p.color === botColor) {
        score += total;
      } else {
        score -= total;
      }
    }
  }

  // Bishop pair bonus
  if (whiteBishops >= 2) score += botColor === 'w' ? 30 : -30;
  if (blackBishops >= 2) score += botColor === 'b' ? 30 : -30;
  
  // Small tempo bonus
  if (chess.turn() === botColor) {
    score += 15;
  } else {
    score -= 15;
  }

  return score;
}

function orderMoves(moves: Move[]): Move[] {
  return moves.sort((a, b) => {
    let scoreA = 0;
    let scoreB = 0;
    
    // MVV-LVA for a
    if (a.captured) {
      scoreA += 10 * PIECE_VALUES[a.captured] - PIECE_VALUES[a.piece];
    }
    // MVV-LVA for b
    if (b.captured) {
      scoreB += 10 * PIECE_VALUES[b.captured] - PIECE_VALUES[b.piece];
    }
    
    if (a.promotion === 'q') scoreA += 900;
    if (b.promotion === 'q') scoreB += 900;
    
    // In actual check bonus
    if (a.san.includes('+')) scoreA += 50;
    if (b.san.includes('+')) scoreB += 50;
    
    return scoreB - scoreA;
  });
}

function qSearch(chess: Chess, alpha: number, beta: number, botColor: 'w' | 'b', qDepth: number): number {
  if (isCancelled) return alpha;
  nodes++;
  
  if (nodes % 256 === 0 && performance.now() - startTime > timeLimit) {
    isCancelled = true;
    return alpha;
  }
  
  const standPat = evaluateBoard(chess, botColor);
  
  if (standPat >= beta) return beta;
  if (alpha < standPat) alpha = standPat;
  
  if (qDepth <= 0) return standPat;
  
  const rawMoves = chess.moves({ verbose: true });
  const capturesAndPromos = orderMoves(rawMoves.filter(m => m.captured || m.promotion));
  
  for (const move of capturesAndPromos) {
    chess.move(move);
    let score = 0;
    try {
      score = -qSearch(chess, -beta, -alpha, botColor, qDepth - 1);
    } finally {
      chess.undo();
    }
    
    if (score >= beta) return beta;
    if (score > alpha) alpha = score;
    if (isCancelled) break;
  }
  
  return alpha;
}

function minimax(chess: Chess, depth: number, alpha: number, beta: number, isMax: boolean, botColor: 'w' | 'b'): number {
  if (isCancelled) return 0;
  nodes++;
  
  if (nodes % 256 === 0 && performance.now() - startTime > timeLimit) {
    isCancelled = true;
    return 0;
  }
  
  if (chess.isCheckmate()) return isMax ? -(MATE_VALUE - depth) : (MATE_VALUE - depth);
  if (chess.isDraw() || chess.isStalemate() || chess.isThreefoldRepetition()) return DRAW_VALUE;
  
  if (depth <= 0) {
    return qSearch(chess, alpha, beta, botColor, 4);
  }
  
  const moves = orderMoves(chess.moves({ verbose: true }));
  if (moves.length === 0) return 0;
  
  if (isMax) {
    let maxEval = -Infinity;
    for (const move of moves) {
      chess.move(move);
      let ev = 0;
      try {
        ev = minimax(chess, depth - 1, alpha, beta, false, botColor);
      } finally {
        chess.undo();
      }
      if (ev > maxEval) maxEval = ev;
      if (ev > alpha) alpha = ev;
      if (beta <= alpha || isCancelled) break;
    }
    return maxEval;
  } else {
    let minEval = Infinity;
    for (const move of moves) {
      chess.move(move);
      let ev = 0;
      try {
        ev = minimax(chess, depth - 1, alpha, beta, true, botColor);
      } finally {
        chess.undo();
      }
      if (ev < minEval) minEval = ev;
      if (ev < beta) beta = ev;
      if (beta <= alpha || isCancelled) break;
    }
    return minEval;
  }
}

// Check if a move is obviously bad (stalemate, repetition, or allows mate-in-1)
function isDrawOrBlunder(chess: Chess, move: Move, botColor: 'w' | 'b'): boolean {
  chess.move(move);
  let bad = false;
  try {
    if (chess.isDraw() || chess.isStalemate() || chess.isThreefoldRepetition()) {
      // If we are completely winning, drawing is bad.
      // But if we are losing, drawing is fine.
      // To be safe, we just check if it allows mate-in-1 for now.
      // Actually we'll just evaluate it. Let's just focus on avoiding giving them a mate-in-1.
    }
    
    // Check if opponent can mate in 1
    if (!chess.isGameOver()) {
      const oppMoves = chess.moves({ verbose: true });
      for (const m of oppMoves) {
        chess.move(m);
        try {
          if (chess.isCheckmate()) {
            bad = true; // They can mate us!
            break;
          }
        } finally {
          chess.undo();
        }
      }
    }
  } finally {
    chess.undo();
  }
  return bad;
}

self.onmessage = (e: MessageEvent) => {
  const data = e.data;
  
  if (data.type === 'search') {
    const { fen, depth, movetime, blunderRate } = data;
    
    const chess = new Chess(fen);
    const botColor = chess.turn();
    
    timeLimit = movetime || 1000;
    startTime = performance.now();
    nodes = 0;
    isCancelled = false;
    
    let bestMoveFinal: Move | null = null;
    let bestScoreFinal = -Infinity;
    
    const legalMoves = chess.moves({ verbose: true });
    
    if (legalMoves.length === 0) {
      self.postMessage({ type: 'result', move: null, scoreCp: 0, depthReached: 0, nodes: 0 });
      return;
    }
    if (legalMoves.length === 1) {
      const score = evaluateBoard(chess, botColor);
      self.postMessage({ type: 'result', move: legalMoves[0].lan, scoreCp: score, depthReached: 1, nodes: 1 });
      return;
    }
    
    // If blunder is requested, just evaluate depth 1, pick among top, and return
    if (blunderRate && blunderRate > 0 && Math.random() < blunderRate) {
      let moveScores: { move: Move, score: number }[] = [];
      for (const m of legalMoves) {
        chess.move(m);
        let sc = 0;
        try {
          sc = evaluateBoard(chess, botColor);
        } finally {
          chess.undo();
        }
        moveScores.push({ move: m, score: sc });
      }
      moveScores.sort((a, b) => b.score - a.score);
      const topCount = Math.min(3, moveScores.length);
      const randIdx = Math.floor(Math.random() * topCount);
      const chosen = moveScores[randIdx];
      
      self.postMessage({
        type: 'result',
        move: chosen.move.lan,
        scoreCp: chosen.score,
        depthReached: 1,
        nodes: legalMoves.length
      });
      return;
    }
    
    let currentBestMove: Move | null = null;
    let currentBestScore = -Infinity;
    
    let d = 1;
    let completedDepth = 0;
    
    // Iterative deepening
    while (d <= depth) {
      let alpha = -Infinity;
      let beta = Infinity;
      let iterBestMove: Move | null = null;
      let iterBestScore = -Infinity;
      
      // Order moves: put currentBestMove first
      let orderedMoves = orderMoves([...legalMoves]);
      if (currentBestMove) {
        orderedMoves = [
          currentBestMove, 
          ...orderedMoves.filter(m => m.lan !== currentBestMove!.lan)
        ];
      }
      
      for (const move of orderedMoves) {
        chess.move(move);
        let score = 0;
        try {
          score = minimax(chess, d - 1, alpha, beta, false, botColor);
        } finally {
          chess.undo();
        }
        
        if (isCancelled) break;
        
        // Safety layer check for top level
        if (d >= 2 && score > iterBestScore) {
            // Check if it's an obvious blunder (e.g., mate in 1)
            // But only if we have other moves. We shouldn't prune the only move.
            if (isDrawOrBlunder(chess, move, botColor) && orderedMoves.length > 1) {
               score = -MATE_VALUE + 100; // Penalize heavily
            }
        }
        
        if (score > iterBestScore) {
          iterBestScore = score;
          iterBestMove = move;
        }
        if (score > alpha) alpha = score;
      }
      
      if (isCancelled) break;
      
      // Completed full depth
      currentBestMove = iterBestMove;
      currentBestScore = iterBestScore;
      completedDepth = d;
      
      // Send intermediate eval update
      self.postMessage({
        type: 'eval',
        scoreCp: currentBestScore,
        depth: completedDepth,
      });
      
      if (Math.abs(currentBestScore) > MATE_VALUE - 100) {
        break; // Found mate, no need to search deeper
      }
      
      d++;
    }
    
    if (currentBestMove) {
      bestMoveFinal = currentBestMove;
      bestScoreFinal = currentBestScore;
    } else {
      // Fallback if somehow cancelled immediately on depth 1
      bestMoveFinal = legalMoves[0];
      bestScoreFinal = 0;
    }
    
    self.postMessage({
      type: 'result',
      move: bestMoveFinal.lan,
      scoreCp: bestScoreFinal,
      depthReached: completedDepth,
      nodes: nodes
    });
  }
};
