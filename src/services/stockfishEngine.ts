import { AIPersonality } from '../types/chess';
import { Chess, Square, Move } from 'chess.js';
import { getOpeningBookMove } from '../constants/openingBook';

export const DEFAULT_STARTING_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

export type BestMoveCallback = (bestMove: string, scoreCp?: number) => void;
export type EvalCallback = (scoreCp: number, depth: number) => void;

export interface EngineMoveResult {
  move: string;
  scoreCentipawns: number;
}

// PeSTO Midgame Piece-Square Positional Tables
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

// Endgame King Positional Table (King is centralized in endgame)
const PST_EG_KING = [
  -50, -40, -30, -20, -20, -30, -40, -50,
  -30, -20, -10,   0,   0, -10, -20, -30,
  -30, -10,  20,  30,  30,  20, -10, -30,
  -30, -10,  30,  40,  40,  30, -10, -30,
  -30, -10,  30,  40,  40,  30, -10, -30,
  -30, -10,  20,  30,  30,  20, -10, -30,
  -30, -30,   0,   0,   0,   0, -30, -30,
  -50, -30, -30, -30, -30, -30, -30, -50
];

const PIECE_VALUES: Record<string, number> = {
  p: 100,
  n: 320,
  b: 330,
  r: 500,
  q: 900,
  k: 20000
};

/**
 * 1. UNIFIED MOVE PARSER & CONVERTER (SAN + UCI SUPPORT)
 */
export function extractAnyValidMove(fen: string, rawText: string): string | null {
  if (!rawText || typeof rawText !== 'string') return null;
  const cleaned = rawText.trim();

  try {
    const testChess = new Chess(fen);

    // Attempt A: Direct SAN parse (e.g. "Nxe5", "e4", "O-O")
    try {
      const res = testChess.move(cleaned);
      if (res) {
        return `${res.from}${res.to}${res.promotion || ''}`;
      }
    } catch {}

    // Attempt B: Extract standard Stockfish 'bestmove <move>'
    const bestMoveMatch = cleaned.match(/bestmove\s+([a-h][1-8][a-h][1-8][qrbn]?)/i);
    if (bestMoveMatch && bestMoveMatch[1]) {
      const uci = bestMoveMatch[1].toLowerCase();
      try {
        const from = uci.substring(0, 2) as Square;
        const to = uci.substring(2, 4) as Square;
        const promotion = uci.length > 4 ? uci[4] : undefined;
        if (testChess.move({ from, to, promotion })) {
          return uci;
        }
      } catch {}
    }

    // Attempt C: Extract isolated UCI string (e.g. 'e2e4')
    const uciMatch = cleaned.match(/\b([a-h][1-8][a-h][1-8][qrbn]?)\b/i);
    if (uciMatch && uciMatch[1]) {
      const uci = uciMatch[1].toLowerCase();
      try {
        const from = uci.substring(0, 2) as Square;
        const to = uci.substring(2, 4) as Square;
        const promotion = uci.length > 4 ? uci[4] : undefined;
        if (testChess.move({ from, to, promotion })) {
          return uci;
        }
      } catch {}
    }

    // Attempt D: Match any legal move SAN or UCI in current position
    const legalMoves = testChess.moves({ verbose: true });
    const matched = legalMoves.find(
      (m) =>
        m.san.toLowerCase() === cleaned.toLowerCase() ||
        `${m.from}${m.to}${m.promotion || ''}`.toLowerCase() === cleaned.toLowerCase()
    );
    if (matched) {
      return `${matched.from}${matched.to}${matched.promotion || ''}`;
    }
  } catch {}

  return null;
}

/**
 * 3. STRICT FEN SANITIZER & VALIDATOR
 * Returns DEFAULT_STARTING_FEN on any validation failure, never an invalid string.
 */
export function sanitizeAndValidateFen(rawFen: string): string {
  if (!rawFen || typeof rawFen !== 'string') {
    return DEFAULT_STARTING_FEN;
  }

  try {
    const testChess = new Chess();
    testChess.load(rawFen);
    const validFen = testChess.fen();

    const tokens = validFen.trim().split(/\s+/);
    if (tokens.length !== 6) return DEFAULT_STARTING_FEN;

    let [placement, activeColor, castling, enPassant, halfmove, fullmove] = tokens;

    // Active color
    if (activeColor !== 'w' && activeColor !== 'b') {
      activeColor = 'w';
    }

    // Castling rights
    castling = castling.replace(/[^KQkq]/g, '');
    if (!castling) castling = '-';

    // En Passant square
    if (!/^[a-h][36]$/.test(enPassant)) {
      enPassant = '-';
    }

    // Move counters
    const half = parseInt(halfmove, 10);
    const full = parseInt(fullmove, 10);
    const safeHalf = isNaN(half) || half < 0 ? '0' : half.toString();
    const safeFull = isNaN(full) || full < 1 ? '1' : full.toString();

    return `${placement} ${activeColor} ${castling} ${enPassant} ${safeHalf} ${safeFull}`;
  } catch (err) {
    console.warn('FEN validation failed, fallback to default starting position:', err);
    return DEFAULT_STARTING_FEN;
  }
}

class StockfishEngineService {
  private worker: Worker | null = null;
  private isReady: boolean = false;
  private isSearching: boolean = false;
  private onBestMoveCallback: BestMoveCallback | null = null;
  private onEvalCallback: EvalCallback | null = null;
  private searchWatchdogTimer: NodeJS.Timeout | null = null;
  private gameFenHistory: string[] = [];
  private currentAbortController: AbortController | null = null;
  private currentSearchingFen: string = '';
  private lastWorkerInitTime: number = 0;
  private currentPersonality: AIPersonality | null = null;

  constructor() {
    this.initWorker();
  }

  public setEvalCallback(cb: EvalCallback | null) {
    this.onEvalCallback = cb;
  }

  public restartWorker() {
    this.clearWatchdog();
    this.isSearching = false;
    this.onBestMoveCallback = null;
    if (this.currentAbortController) {
      this.currentAbortController.abort();
      this.currentAbortController = null;
    }
    this.initWorker();
  }

  private initWorker() {
    const now = Date.now();
    // Throttle worker recreation to prevent loops
    if (now - this.lastWorkerInitTime < 2000 && this.worker) {
      return;
    }
    this.lastWorkerInitTime = now;

    try {
      if (this.worker) {
        try {
          this.worker.terminate();
        } catch {}
        this.worker = null;
      }

      const workerCode = `
        var sf = null;
        var urls = [
          'https://cdnjs.cloudflare.com/ajax/libs/stockfish.js/10.0.2/stockfish.js',
          'https://cdn.jsdelivr.net/npm/stockfish.js@10.0.2/stockfish.js'
        ];

        for (var i = 0; i < urls.length; i++) {
          try {
            importScripts(urls[i]);
            var fn = typeof STOCKFISH === 'function' ? STOCKFISH : (typeof self.Stockfish === 'function' ? self.Stockfish : null);
            if (fn) {
              sf = fn();
              break;
            }
          } catch(e) {}
        }

        if (sf) {
          sf.onmessage = function(e) {
            try {
              var line = typeof e === 'object' && e.data ? e.data : e;
              self.postMessage(line);
            } catch(err) {}
          };
          self.onmessage = function(e) {
            try {
              sf.postMessage(e.data);
            } catch(err) {}
          };
          self.postMessage('STOCKFISH_READY');
        } else {
          self.onmessage = function(e) {
            try {
              if (e.data === 'uci') self.postMessage('uciok');
              if (e.data === 'isready') self.postMessage('readyok');
            } catch(err) {}
          };
          self.postMessage('STOCKFISH_READY');
        }
      `;

      const blob = new Blob([workerCode], { type: 'application/javascript' });
      const workerUrl = URL.createObjectURL(blob);
      this.worker = new Worker(workerUrl);

      this.worker.onmessage = (e) => {
        try {
          const line = typeof e.data === 'string' ? e.data : '';
          this.handleOutput(line);
        } catch (err) {
          console.warn('Worker message parsing notice:', err);
        }
      };

      this.worker.onerror = () => {
        this.isReady = false;
      };

      this.safePostMessage('uci');
    } catch (err) {
      console.warn('Worker init fallback active:', err);
      this.isReady = true;
    }
  }

  private safePostMessage(msg: string) {
    try {
      if (this.worker) {
        this.worker.postMessage(msg);
      }
    } catch (err) {
      console.warn('Silent postMessage error:', err);
    }
  }

  private configureWorkerOptions(personality: AIPersonality) {
    if (!this.isReady) return;

    // Clamped contempt -100 to 100
    const contempt = Math.max(-100, Math.min(100, personality.contempt));
    const skill = Math.max(0, Math.min(20, personality.skillLevel));
    const threads = Math.max(1, Math.min(4, personality.threads || 2));
    const hash = Math.max(16, Math.min(256, personality.hash || 64));

    this.safePostMessage('setoption name Use NNUE value true');
    this.safePostMessage(`setoption name Threads value ${threads}`);
    this.safePostMessage(`setoption name Hash value ${hash}`);
    this.safePostMessage(`setoption name Skill Level value ${skill}`);
    this.safePostMessage(`setoption name Contempt value ${contempt}`);
    this.safePostMessage('setoption name Ponder value true');
    this.safePostMessage('isready');
  }

  /**
   * 4. OPTIMIZED ENGINE OUTPUT HANDLER
   * Only calls extractAnyValidMove on 'bestmove' lines.
   */
  private handleOutput(line: string) {
    try {
      if (line === 'STOCKFISH_READY' || line.includes('uciok')) {
        this.isReady = true;
        if (this.currentPersonality) {
          this.configureWorkerOptions(this.currentPersonality);
        }
        return;
      }

      // Parse score from info line if present for live eval
      if (line.startsWith('info') && line.includes('score')) {
        const cpMatch = line.match(/score cp (-?\d+)/);
        const mateMatch = line.match(/score mate (-?\d+)/);
        const depthMatch = line.match(/depth (\d+)/);

        const depth = depthMatch ? parseInt(depthMatch[1], 10) : 0;

        if (cpMatch && this.onEvalCallback) {
          const cp = parseInt(cpMatch[1], 10);
          this.onEvalCallback(cp, depth);
        } else if (mateMatch && this.onEvalCallback) {
          const mateIn = parseInt(mateMatch[1], 10);
          const cp = mateIn > 0 ? 10000 - mateIn * 100 : -10000 - mateIn * 100;
          this.onEvalCallback(cp, depth);
        }
      }

      // ONLY call move parser when line actually starts with 'bestmove'
      if (line.startsWith('bestmove')) {
        const move = extractAnyValidMove(this.currentSearchingFen, line);
        if (move) {
          this.finishSearch(move);
        }
      }
    } catch (err) {
      console.warn('handleOutput notice:', err);
    }
  }

  /**
   * Syzygy Endgame Tablebase API (<= 7 pieces on board)
   */
  private async fetchSyzygyTablebase(fen: string, signal: AbortSignal): Promise<string | null> {
    try {
      const url = `https://tablebase.lichess.ovh/standard?fen=${encodeURIComponent(fen)}`;
      const res = await fetch(url, { signal });
      if (!res.ok) return null;
      const data = await res.json();
      if (data && data.moves && data.moves.length > 0) {
        const winningMoves = data.moves.filter(
          (m: { category?: string; dtm?: number | null }) =>
            m.category === 'win' || (m.dtm !== null && m.dtm !== undefined && m.dtm < 0)
        );
        const selected = winningMoves.length > 0 ? winningMoves[0] : data.moves[0];
        if (selected && selected.uci) {
          const move = extractAnyValidMove(fen, selected.uci);
          if (move) return move;
        }
      }
    } catch {}
    return null;
  }

  /**
   * Lichess Cloud Analysis (Depth 40-50+ GM Database)
   */
  private async fetchLichessCloud(fen: string, signal: AbortSignal): Promise<{ move: string; scoreCp: number } | null> {
    try {
      const url = `https://lichess.org/api/cloud-eval?fen=${encodeURIComponent(fen)}&multiPv=1`;
      const res = await fetch(url, { signal });
      if (!res.ok) return null;
      const data = await res.json();
      if (data && data.pvs && data.pvs.length > 0 && data.pvs[0].moves) {
        const firstMove = data.pvs[0].moves.split(' ')[0];
        const move = extractAnyValidMove(fen, firstMove);
        const scoreCp = typeof data.pvs[0].cp === 'number' ? data.pvs[0].cp : 0;
        if (move) return { move, scoreCp };
      }
    } catch {}
    return null;
  }

  /**
   * Online Stockfish 16 NNUE API (Depth 15+ Master)
   */
  private async fetchStockfishOnline(fen: string, signal: AbortSignal): Promise<string | null> {
    try {
      const url = `https://stockfish.online/api/s/v2.php?fen=${encodeURIComponent(fen)}&depth=15`;
      const res = await fetch(url, { signal });
      if (!res.ok) return null;
      const data = await res.json();
      if (data && data.success && data.bestmove) {
        const move = extractAnyValidMove(fen, data.bestmove);
        if (move) return move;
      }
    } catch {}
    return null;
  }

  private isDrawOrBlunder(fen: string, moveUci: string): boolean {
    if (!moveUci || moveUci.length < 4) return true;
    try {
      const from = moveUci.substring(0, 2) as Square;
      const to = moveUci.substring(2, 4) as Square;
      const promotion = moveUci.length > 4 ? moveUci[4] : undefined;

      const sim = new Chess(fen);
      const res = sim.move({ from, to, promotion });
      if (!res) return true;

      // 1. Anti-Stalemate Guard
      if (sim.isStalemate()) return true;

      // 2. Anti-Repetition Guard
      const fenAfter = sim.fen().split(' ').slice(0, 4).join(' ');
      const repeats = this.gameFenHistory.filter((f) => f.split(' ').slice(0, 4).join(' ') === fenAfter).length;
      if (repeats >= 2) return true;

      // 3. Mate in 1 blunder check
      const oppMoves = sim.moves({ verbose: true });
      for (const om of oppMoves) {
        sim.move(om);
        if (sim.isCheckmate()) return true;
        sim.undo();
      }

      return false;
    } catch {
      return false;
    }
  }

  private finishSearch(engineBestMove: string, scoreCp?: number) {
    if (!this.isSearching) return;
    this.isSearching = false;
    this.clearWatchdog();

    if (this.currentAbortController) {
      this.currentAbortController.abort();
      this.currentAbortController = null;
    }

    const cb = this.onBestMoveCallback;
    this.onBestMoveCallback = null;
    if (cb) {
      cb(engineBestMove, scoreCp);
    }
  }

  private clearWatchdog() {
    if (this.searchWatchdogTimer) {
      clearTimeout(this.searchWatchdogTimer);
      this.searchWatchdogTimer = null;
    }
  }

  // =========================================================================
  // 3. SMARTER LOCAL ENGINE (Iterative Alpha-Beta + PeSTO + MVV-LVA + Quiescence)
  // =========================================================================

  public evaluateBoard(chess: Chess, botColor: 'w' | 'b'): number {
    if (chess.isCheckmate()) return chess.turn() === botColor ? -99999 : 99999;
    if (chess.isDraw() || chess.isStalemate()) return -25000;

    let score = 0;
    const board = chess.board();
    let totalPieces = 0;

    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const piece = board[r][c];
        if (piece && piece.type !== 'k' && piece.type !== 'p') {
          totalPieces++;
        }
      }
    }

    const isEndgame = totalPieces <= 6;

    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const piece = board[r][c];
        if (!piece) continue;

        const val = PIECE_VALUES[piece.type] || 100;
        let pstVal = 0;

        const sqIndex = piece.color === 'w' ? r * 8 + c : (7 - r) * 8 + c;

        if (piece.type === 'k' && isEndgame) {
          pstVal = PST_EG_KING[sqIndex] || 0;
        } else {
          const pstTable = PST_MG[piece.type];
          pstVal = pstTable ? pstTable[sqIndex] : 0;
        }

        const pieceScore = val + pstVal;
        if (piece.color === botColor) {
          score += pieceScore;
        } else {
          score -= pieceScore;
        }
      }
    }

    return score;
  }

  private orderMoves(moves: Move[]): Move[] {
    return moves.sort((a, b) => {
      let scoreA = 0;
      let scoreB = 0;

      if (a.promotion === 'q') scoreA += 800;
      if (b.promotion === 'q') scoreB += 800;

      // MVV-LVA (Most Valuable Victim - Least Valuable Attacker)
      if (a.captured) {
        scoreA += (PIECE_VALUES[a.captured] || 100) * 10 - (PIECE_VALUES[a.piece] || 100);
      }
      if (b.captured) {
        scoreB += (PIECE_VALUES[b.captured] || 100) * 10 - (PIECE_VALUES[b.piece] || 100);
      }

      return scoreB - scoreA;
    });
  }

  private quiescenceSearch(chess: Chess, alpha: number, beta: number, botColor: 'w' | 'b', maxQDepth: number): number {
    const standPat = this.evaluateBoard(chess, botColor);
    if (maxQDepth <= 0 || standPat >= beta) return standPat;
    let currentAlpha = Math.max(alpha, standPat);

    const captureMoves = this.orderMoves(
      chess.moves({ verbose: true }).filter((m) => m.captured || m.promotion === 'q')
    );

    for (const move of captureMoves) {
      chess.move(move);
      const score = -this.quiescenceSearch(chess, -beta, -currentAlpha, botColor, maxQDepth - 1);
      chess.undo();

      if (score >= beta) return beta;
      if (score > currentAlpha) currentAlpha = score;
    }

    return currentAlpha;
  }

  private minimaxSearch(
    chess: Chess,
    depth: number,
    alpha: number,
    beta: number,
    isMaximizing: boolean,
    botColor: 'w' | 'b'
  ): number {
    if (chess.isCheckmate()) return isMaximizing ? -99999 + depth : 99999 - depth;
    if (chess.isStalemate() || chess.isDraw()) return -25000;
    if (depth <= 0) {
      return this.quiescenceSearch(chess, alpha, beta, botColor, 2);
    }

    const moves = this.orderMoves(chess.moves({ verbose: true }));
    if (moves.length === 0) return 0;

    if (isMaximizing) {
      let maxEval = -Infinity;
      for (const m of moves) {
        chess.move(m);
        const evalScore = this.minimaxSearch(chess, depth - 1, alpha, beta, false, botColor);
        chess.undo();
        maxEval = Math.max(maxEval, evalScore);
        alpha = Math.max(alpha, evalScore);
        if (beta <= alpha) break;
      }
      return maxEval;
    } else {
      let minEval = Infinity;
      for (const m of moves) {
        chess.move(m);
        const evalScore = this.minimaxSearch(chess, depth - 1, alpha, beta, true, botColor);
        chess.undo();
        minEval = Math.min(minEval, evalScore);
        beta = Math.min(beta, evalScore);
        if (beta <= alpha) break;
      }
      return minEval;
    }
  }

  /**
   * Smarter Local Search: Returns both the best move and its centipawns evaluation score
   */
  public calculateGrandmasterMove(fen: string, searchDepth: number = 3): EngineMoveResult {
    try {
      const chess = new Chess(fen);
      const moves = this.orderMoves(chess.moves({ verbose: true }));
      if (moves.length === 0) {
        return { move: '', scoreCentipawns: 0 };
      }

      const botColor = chess.turn();

      // 1. Instant Mate in 1 check
      for (const m of moves) {
        chess.move(m);
        if (chess.isCheckmate()) {
          chess.undo();
          return { move: `${m.from}${m.to}${m.promotion || ''}`, scoreCentipawns: 99999 };
        }
        chess.undo();
      }

      let bestScore = -Infinity;
      let scoredMoves: { move: Move; score: number }[] = [];

      const targetDepth = Math.max(1, Math.min(4, searchDepth));

      for (const m of moves) {
        chess.move(m);

        // Anti-stalemate guard
        if (chess.isStalemate()) {
          chess.undo();
          continue;
        }

        // Anti-threefold repetition guard
        const fenKey = chess.fen().split(' ').slice(0, 4).join(' ');
        const repeats = this.gameFenHistory.filter((f) => f.split(' ').slice(0, 4).join(' ') === fenKey).length;
        if (repeats >= 2) {
          chess.undo();
          continue;
        }

        const score = -this.minimaxSearch(chess, targetDepth - 1, -Infinity, Infinity, false, botColor);
        chess.undo();

        scoredMoves.push({ move: m, score });

        if (score > bestScore) {
          bestScore = score;
        }
      }

      scoredMoves.sort((a, b) => b.score - a.score);

      // Blunder rate injection for weaker personalities (Novice/Club)
      let selectedMove = scoredMoves[0]?.move || moves[0];
      if (this.currentPersonality && this.currentPersonality.blunderRate > 0 && scoredMoves.length > 1) {
        if (Math.random() < this.currentPersonality.blunderRate) {
          const blunderIndex = Math.min(scoredMoves.length - 1, Math.floor(Math.random() * 2) + 1);
          selectedMove = scoredMoves[blunderIndex].move;
        }
      }

      const bestUci = `${selectedMove.from}${selectedMove.to}${selectedMove.promotion || ''}`;
      return { move: bestUci, scoreCentipawns: bestScore === -Infinity ? 0 : bestScore };
    } catch (err) {
      console.warn('calculateGrandmasterMove fallback notice:', err);
      try {
        const c = new Chess(fen);
        const legals = c.moves({ verbose: true });
        if (legals.length > 0) {
          const first = legals[0];
          return { move: `${first.from}${first.to}${first.promotion || ''}`, scoreCentipawns: 0 };
        }
      } catch {}
      return { move: '', scoreCentipawns: 0 };
    }
  }

  // =========================================================================
  // MAIN ENGINE SEARCH (Book -> Tablebase -> Cloud APIs -> Worker -> Local Engine)
  // =========================================================================

  public async calculateMove(
    rawFen: string,
    personality: AIPersonality,
    historyFens: string[],
    onBestMove: BestMoveCallback
  ) {
    if (this.isSearching) {
      return;
    }

    this.currentPersonality = personality;
    const fen = sanitizeAndValidateFen(rawFen);
    this.currentSearchingFen = fen;
    this.gameFenHistory = historyFens || [];

    // 1. OPENING BOOK LOOKUP (4-token matching with random alternative selection)
    try {
      const bookMove = getOpeningBookMove(fen);
      if (bookMove) {
        const validatedBookMove = extractAnyValidMove(fen, bookMove);
        if (validatedBookMove && !this.isDrawOrBlunder(fen, validatedBookMove)) {
          // Introduce human-like slight opening pause based on personality moveTimeMs
          const openingDelay = Math.min(200, personality.moveTimeMs / 6);
          setTimeout(() => {
            onBestMove(validatedBookMove, 25);
          }, openingDelay);
          return;
        }
      }
    } catch (err) {
      console.warn('Opening book isolation fallback to engine:', err);
    }

    this.onBestMoveCallback = onBestMove;
    this.isSearching = true;

    if (this.currentAbortController) {
      this.currentAbortController.abort();
    }
    this.currentAbortController = new AbortController();
    const { signal } = this.currentAbortController;

    const pieceCount = (fen.split(' ')[0].match(/[pnbrqkPNBRQK]/g) || []).length;

    // 2. Syzygy Endgame Tablebase (<= 7 pieces on board)
    if (pieceCount <= 7) {
      try {
        const syzygyMove = await this.fetchSyzygyTablebase(fen, signal);
        if (syzygyMove && !this.isDrawOrBlunder(fen, syzygyMove)) {
          this.finishSearch(syzygyMove, 10000);
          return;
        }
      } catch {}
    }

    // 3. Parallel Cloud GM Analysis (if online)
    if (personality.rating >= 2000) {
      Promise.allSettled([
        this.fetchLichessCloud(fen, signal),
        this.fetchStockfishOnline(fen, signal)
      ]).then((results) => {
        if (!this.isSearching) return;
        for (const res of results) {
          if (res.status === 'fulfilled' && res.value) {
            const val = res.value;
            const move = typeof val === 'string' ? val : val.move;
            const scoreCp = typeof val === 'object' && 'scoreCp' in val ? val.scoreCp : undefined;
            if (move && !this.isDrawOrBlunder(fen, move)) {
              this.finishSearch(move, scoreCp);
              return;
            }
          }
        }
      });
    }

    let simChess: Chess | null = null;
    try {
      simChess = new Chess(fen);
    } catch {}

    const isTactical = Boolean(simChess?.inCheck()) || pieceCount <= 10;
    const targetDepth = isTactical ? personality.depth + 2 : personality.depth;
    const movetime = isTactical ? personality.moveTimeMs + 400 : personality.moveTimeMs;

    // 4. Watchdog Timer: Runs Smarter Local Search if Web Worker takes too long
    this.clearWatchdog();
    this.searchWatchdogTimer = setTimeout(() => {
      if (this.isSearching) {
        const gmResult = this.calculateGrandmasterMove(fen, personality.localSearchDepth);
        this.finishSearch(gmResult.move, gmResult.scoreCentipawns);
      }
    }, movetime + 200);

    // 5. Configure options for personality and send command to Stockfish Web Worker
    this.configureWorkerOptions(personality);
    this.safePostMessage(`position fen ${fen}`);
    this.safePostMessage(`go depth ${targetDepth} movetime ${movetime}`);
  }

  public reset() {
    this.clearWatchdog();
    this.isSearching = false;
    this.onBestMoveCallback = null;
    this.gameFenHistory = [];
    if (this.currentAbortController) {
      this.currentAbortController.abort();
      this.currentAbortController = null;
    }
    this.safePostMessage('stop');
  }
}

export const stockfishService = new StockfishEngineService();
