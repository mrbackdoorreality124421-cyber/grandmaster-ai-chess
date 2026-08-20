import { Chess, Move } from 'chess.js';

// ==========================================
// Stockfish UCI Engine Controller & Fallback
// ==========================================

interface SearchRequest {
  type: 'search';
  fen: string;
  depth?: number;
  movetime?: number;
  personalityId?: string;
  elo?: number;
  skillLevel?: number;
  threads?: number;
  blunderRate?: number;
}

let stockfishWorker: Worker | null = null;
let isStockfishInitialized = false;
let isStockfishReady = false;
let isSearchingWithStockfish = false;
let currentSearchFen = '';
let currentSearchDepth = 0;
let lastEvalScoreCp = 0;
let lastEvalDepth = 0;
let lastNodes = 0;
let pendingSearch: SearchRequest | null = null;
let activeSearchTimeout: any = null;

// Initialize Stockfish worker using public/stockfish.js
function initStockfish() {
  if (stockfishWorker || typeof Worker === 'undefined') return;

  try {
    const stockfishUrl = new URL('/stockfish.js', self.location.origin).href;
    stockfishWorker = new Worker(stockfishUrl);

    stockfishWorker.onmessage = (event: MessageEvent) => {
      const line = typeof event.data === 'string' ? event.data : (event.data?.data || '');
      handleUciOutput(line.trim());
    };

    stockfishWorker.onerror = (err) => {
      console.warn('Stockfish Worker failed to load from /stockfish.js, falling back to LION internal engine:', err);
      isStockfishReady = false;
      if (isSearchingWithStockfish && pendingSearch) {
        fallbackSearch(pendingSearch);
      }
    };

    // Begin UCI initialization
    stockfishWorker.postMessage('uci');
  } catch (err) {
    console.warn('Error starting nested Stockfish worker:', err);
    stockfishReadyFallback();
  }
}

function stockfishReadyFallback() {
  isStockfishInitialized = true;
  isStockfishReady = false;
}

function handleUciOutput(line: string) {
  if (!line) return;

  // Handle UCI init handshake
  if (line === 'uciok') {
    isStockfishInitialized = true;
    stockfishWorker?.postMessage('isready');
    return;
  }

  if (line === 'readyok') {
    isStockfishReady = true;
    if (pendingSearch && !isSearchingWithStockfish) {
      executeStockfishSearch(pendingSearch);
    }
    return;
  }

  // Parse evaluation: info depth 14 seldepth 18 multipv 1 score cp 35 nodes 24000 ...
  if (line.startsWith('info') && line.includes('score')) {
    let scoreCp = lastEvalScoreCp;
    let depth = lastEvalDepth;

    // Depth match
    const depthMatch = line.match(/\bdepth\s+(\d+)/);
    if (depthMatch) {
      depth = parseInt(depthMatch[1], 10);
      lastEvalDepth = depth;
    }

    // Nodes match
    const nodesMatch = line.match(/\bnodes\s+(\d+)/);
    if (nodesMatch) {
      lastNodes = parseInt(nodesMatch[1], 10);
    }

    // Score Centipawns match
    const cpMatch = line.match(/\bscore\s+cp\s+(-?\d+)/);
    if (cpMatch) {
      scoreCp = parseInt(cpMatch[1], 10);
      lastEvalScoreCp = scoreCp;
    } else {
      // Mate in X match
      const mateMatch = line.match(/\bscore\s+mate\s+(-?\d+)/);
      if (mateMatch) {
        const mateMoves = parseInt(mateMatch[1], 10);
        scoreCp = mateMoves > 0 ? (10000 - mateMoves * 100) : (-10000 - Math.abs(mateMoves) * 100);
        lastEvalScoreCp = scoreCp;
      }
    }

    self.postMessage({
      type: 'eval',
      scoreCp,
      depth
    });
    return;
  }

  // Parse bestmove: bestmove e2e4 ponder e7e5
  if (line.startsWith('bestmove')) {
    if (activeSearchTimeout) {
      clearTimeout(activeSearchTimeout);
      activeSearchTimeout = null;
    }

    const parts = line.split(/\s+/);
    const bestMove = parts[1];

    isSearchingWithStockfish = false;
    pendingSearch = null;

    if (bestMove && bestMove !== '(none)' && bestMove !== '0000') {
      self.postMessage({
        type: 'result',
        move: bestMove,
        scoreCp: lastEvalScoreCp,
        depthReached: lastEvalDepth || currentSearchDepth,
        nodes: lastNodes || 1000
      });
    } else {
      // If Stockfish produced no move, fallback to internal engine
      if (currentSearchFen) {
        fallbackSearch({
          type: 'search',
          fen: currentSearchFen,
          depth: currentSearchDepth || 3,
          movetime: 1000
        });
      }
    }
  }
}

function executeStockfishSearch(req: SearchRequest) {
  if (!stockfishWorker || !isStockfishReady) return;

  isSearchingWithStockfish = true;
  currentSearchFen = req.fen;
  currentSearchDepth = req.depth || 18;
  lastEvalScoreCp = 0;
  lastEvalDepth = 0;
  lastNodes = 0;

  const id = req.personalityId || '';
  const threads = req.threads || (typeof navigator !== 'undefined' ? navigator.hardwareConcurrency : 4) || 4;

  // Configure UCI parameters based on personality ELO & Skill
  if (id === 'novice') {
    stockfishWorker.postMessage('setoption name UCI_LimitStrength value true');
    stockfishWorker.postMessage(`setoption name UCI_Elo value ${req.elo || 1350}`);
    stockfishWorker.postMessage(`setoption name Skill Level value ${req.skillLevel ?? 1}`);
    stockfishWorker.postMessage('setoption name Threads value 1');
  } else if (id === 'club' || id === 'club-player') {
    stockfishWorker.postMessage('setoption name UCI_LimitStrength value true');
    stockfishWorker.postMessage(`setoption name UCI_Elo value ${req.elo || 1500}`);
    stockfishWorker.postMessage(`setoption name Skill Level value ${req.skillLevel ?? 6}`);
    stockfishWorker.postMessage('setoption name Threads value 1');
  } else if (id === 'expert') {
    stockfishWorker.postMessage('setoption name UCI_LimitStrength value true');
    stockfishWorker.postMessage(`setoption name UCI_Elo value ${req.elo || 1800}`);
    stockfishWorker.postMessage(`setoption name Skill Level value ${req.skillLevel ?? 12}`);
    stockfishWorker.postMessage('setoption name Threads value 2');
  } else if (id === 'master') {
    stockfishWorker.postMessage('setoption name UCI_LimitStrength value true');
    stockfishWorker.postMessage(`setoption name UCI_Elo value ${req.elo || 2200}`);
    stockfishWorker.postMessage(`setoption name Skill Level value ${req.skillLevel ?? 17}`);
    stockfishWorker.postMessage(`setoption name Threads value ${Math.min(threads, 4)}`);
  } else {
    // Grandmaster & LION APEX: Full Maximum Power
    stockfishWorker.postMessage('setoption name UCI_LimitStrength value false');
    stockfishWorker.postMessage('setoption name Skill Level value 20');
    stockfishWorker.postMessage(`setoption name Threads value ${Math.max(threads, 2)}`);
    stockfishWorker.postMessage('setoption name Hash value 64');
  }

  stockfishWorker.postMessage(`position fen ${req.fen}`);

  const movetime = req.movetime || (id === 'lion' || id === 'lion-apex' ? 8000 : 5000);
  
  if (req.depth && req.depth >= 20) {
    stockfishWorker.postMessage(`go depth ${req.depth} movetime ${movetime}`);
  } else {
    stockfishWorker.postMessage(`go movetime ${movetime}`);
  }

  // Safety watchdog timeout in case of worker failure
  activeSearchTimeout = setTimeout(() => {
    if (isSearchingWithStockfish) {
      console.warn('Stockfish search timeout, stopping engine...');
      stockfishWorker?.postMessage('stop');
    }
  }, movetime + 3000);
}

// Start Stockfish upon worker load
initStockfish();

// =========================================================
// Internal Engine (High-Performance Fallback + Verification)
// =========================================================

const PST_MG: Record<string, number[]> = {
  p: [
     0,  0,  0,  0,  0,  0,  0,  0,
    50, 50, 50, 50, 50, 50, 50, 50,
    10, 10, 20, 30, 30, 20, 10, 10,
     5,  5, 10, 27, 27, 10,  5,  5,
     0,  0,  0, 25, 25,  0,  0,  0,
     5, -5,-10,  0,  0,-10, -5,  5,
     5, 10, 10,-25,-25, 10, 10,  5,
     0,  0,  0,  0,  0,  0,  0,  0
  ],
  n: [
   -50,-40,-30,-30,-30,-30,-40,-50,
   -40,-20,  0,  5,  5,  0,-20,-40,
   -30,  5, 15, 20, 20, 15,  5,-30,
   -30,  0, 20, 30, 30, 20,  0,-30,
   -30,  5, 20, 30, 30, 20,  5,-30,
   -30,  0, 15, 20, 20, 15,  0,-30,
   -40,-20,  0,  0,  0,  0,-20,-40,
   -50,-40,-30,-30,-30,-30,-40,-50
  ],
  b: [
   -20,-10,-10,-10,-10,-10,-10,-20,
   -10,  5,  0,  0,  0,  0,  5,-10,
   -10, 10, 10, 10, 10, 10, 10,-10,
   -10,  0, 15, 20, 20, 15,  0,-10,
   -10,  5, 10, 20, 20, 10,  5,-10,
   -10,  0, 10, 10, 10, 10,  0,-10,
   -10,  5,  0,  0,  0,  0,  5,-10,
   -20,-10,-10,-10,-10,-10,-10,-20
  ],
  r: [
     0,  0,  0,  5,  5,  0,  0,  0,
    -5,  0,  0,  0,  0,  0,  0, -5,
    -5,  0,  0,  0,  0,  0,  0, -5,
    -5,  0,  0,  0,  0,  0,  0, -5,
    -5,  0,  0,  0,  0,  0,  0, -5,
    -5,  0,  0,  0,  0,  0,  0, -5,
     5, 15, 15, 15, 15, 15, 15,  5,
     0,  0,  0,  0,  0,  0,  0,  0
  ],
  q: [
   -20,-10,-10, -5, -5,-10,-10,-20,
   -10,  0,  5,  0,  0,  0,  0,-10,
   -10,  5,  5,  5,  5,  5,  0,-10,
     0,  0,  5,  5,  5,  5,  0, -5,
    -5,  0,  5,  5,  5,  5,  0, -5,
   -10,  0,  5,  5,  5,  5,  0,-10,
   -10,  0,  0,  0,  0,  0,  0,-10,
   -20,-10,-10, -5, -5,-10,-10,-20
  ],
  k: [
     20, 30, 10,  0,  0, 10, 30, 20,
     20, 20,  0,  0,  0,  0, 20, 20,
    -10,-20,-20,-20,-20,-20,-20,-10,
    -20,-30,-30,-40,-40,-30,-30,-20,
    -30,-40,-40,-50,-50,-40,-40,-30,
    -30,-40,-40,-50,-50,-40,-40,-30,
    -30,-40,-40,-50,-50,-40,-40,-30,
    -30,-40,-40,-50,-50,-40,-40,-30
  ]
};

const PST_EG_K = [
  -50,-30,-30,-30,-30,-30,-30,-50,
  -30,-30,  0,  0,  0,  0,-30,-30,
  -30,-10, 20, 30, 30, 20,-10,-30,
  -30,-10, 30, 40, 40, 30,-10,-30,
  -30,-10, 30, 40, 40, 30,-10,-30,
  -30,-10, 20, 30, 30, 20,-10,-30,
  -30,-20,-10,  0,  0,-10,-20,-30,
  -50,-40,-30,-20,-20,-30,-40,-50
];

const PIECE_VALUES: Record<string, number> = { p: 100, n: 320, b: 330, r: 500, q: 900, k: 20000 };
const MATE_VALUE = 99999;
const DRAW_VALUE = 0;

let fbNodes = 0;
let fbStartTime = 0;
let fbTimeLimit = 0;
let fbCancelled = false;

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
      const sq = p.color === 'w' ? r * 8 + c : (7 - r) * 8 + c;
      let pst = PST_MG[p.type][sq];

      if (isEndgame && p.type === 'k') {
        pst = PST_EG_K[sq];
      }

      if (p.type === 'p') {
        if (p.color === 'w' && whitePawns[c] > 1) val -= 15;
        if (p.color === 'b' && blackPawns[c] > 1) val -= 15;

        const hasNeighbor = (c > 0 && (p.color === 'w' ? whitePawns[c-1] : blackPawns[c-1]) > 0) ||
                            (c < 7 && (p.color === 'w' ? whitePawns[c+1] : blackPawns[c+1]) > 0);
        if (!hasNeighbor) val -= 10;

        const rank = p.color === 'w' ? 7 - r : r;
        let isPassed = false;
        if (p.color === 'w') {
          if (blackPawns[c] === 0 && (c === 0 || blackPawns[c-1] === 0) && (c === 7 || blackPawns[c+1] === 0)) {
            isPassed = true;
          }
        } else {
          if (whitePawns[c] === 0 && (c === 0 || whitePawns[c-1] === 0) && (c === 7 || whitePawns[c+1] === 0)) {
            isPassed = true;
          }
        }
        if (isPassed && rank >= 4) {
          val += (rank - 3) * 20;
        }
      }

      const total = val + pst;
      if (p.color === botColor) score += total;
      else score -= total;
    }
  }

  if (whiteBishops >= 2) score += botColor === 'w' ? 30 : -30;
  if (blackBishops >= 2) score += botColor === 'b' ? 30 : -30;

  if (chess.turn() === botColor) score += 15;
  else score -= 15;

  return score;
}

function orderMoves(moves: Move[]): Move[] {
  return moves.sort((a, b) => {
    let scoreA = 0;
    let scoreB = 0;

    if (a.captured) scoreA += 10 * PIECE_VALUES[a.captured] - PIECE_VALUES[a.piece];
    if (b.captured) scoreB += 10 * PIECE_VALUES[b.captured] - PIECE_VALUES[b.piece];

    if (a.promotion === 'q') scoreA += 900;
    if (b.promotion === 'q') scoreB += 900;

    if (a.san.includes('+')) scoreA += 50;
    if (b.san.includes('+')) scoreB += 50;

    return scoreB - scoreA;
  });
}

function qSearch(chess: Chess, alpha: number, beta: number, botColor: 'w' | 'b', qDepth: number): number {
  if (fbCancelled) return alpha;
  fbNodes++;

  if (fbNodes % 256 === 0 && performance.now() - fbStartTime > fbTimeLimit) {
    fbCancelled = true;
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
    if (fbCancelled) break;
  }

  return alpha;
}

function minimax(chess: Chess, depth: number, alpha: number, beta: number, isMax: boolean, botColor: 'w' | 'b'): number {
  if (fbCancelled) return 0;
  fbNodes++;

  if (fbNodes % 256 === 0 && performance.now() - fbStartTime > fbTimeLimit) {
    fbCancelled = true;
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
      if (beta <= alpha || fbCancelled) break;
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
      if (beta <= alpha || fbCancelled) break;
    }
    return minEval;
  }
}

function fallbackSearch(req: SearchRequest) {
  const chess = new Chess(req.fen);
  const botColor = chess.turn();

  fbTimeLimit = req.movetime || 1500;
  fbStartTime = performance.now();
  fbNodes = 0;
  fbCancelled = false;

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

  let currentBestMove: Move | null = null;
  let currentBestScore = -Infinity;
  let d = 1;
  const maxDepth = Math.min(req.depth || 4, 4);

  while (d <= maxDepth) {
    let alpha = -Infinity;
    let beta = Infinity;
    let iterBestMove: Move | null = null;
    let iterBestScore = -Infinity;

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

      if (fbCancelled) break;

      if (score > iterBestScore) {
        iterBestScore = score;
        iterBestMove = move;
      }
      if (score > alpha) alpha = score;
    }

    if (fbCancelled) break;

    currentBestMove = iterBestMove;
    currentBestScore = iterBestScore;

    self.postMessage({
      type: 'eval',
      scoreCp: currentBestScore,
      depth: d
    });

    if (Math.abs(currentBestScore) > MATE_VALUE - 100) break;
    d++;
  }

  const finalMove = currentBestMove || legalMoves[0];
  self.postMessage({
    type: 'result',
    move: finalMove.lan,
    scoreCp: currentBestScore === -Infinity ? 0 : currentBestScore,
    depthReached: d - 1,
    nodes: fbNodes
  });
}

// ==========================================
// Main Worker Message Handler
// ==========================================

self.onmessage = (e: MessageEvent) => {
  const data = e.data;
  if (!data || data.type !== 'search') return;

  const req = data as SearchRequest;
  pendingSearch = req;

  // If Stockfish worker is ready, execute immediately
  if (stockfishWorker && isStockfishReady) {
    executeStockfishSearch(req);
    return;
  }

  // If Stockfish is still initializing, give it 800ms before falling back
  if (stockfishWorker && !isStockfishInitialized) {
    setTimeout(() => {
      if (isStockfishReady && pendingSearch) {
        executeStockfishSearch(pendingSearch);
      } else if (pendingSearch) {
        fallbackSearch(pendingSearch);
      }
    }, 800);
    return;
  }

  // Otherwise, use built-in engine
  fallbackSearch(req);
};
