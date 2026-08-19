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

// PeSTO Midgame Piece-Square Positional Tables (Main-thread 1-ply evaluator)
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

// Endgame King Positional Table
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
 * 2. STRICT FEN SANITIZER & VALIDATOR
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

    if (activeColor !== 'w' && activeColor !== 'b') {
      activeColor = 'w';
    }

    castling = castling.replace(/[^KQkq]/g, '');
    if (!castling) castling = '-';

    if (!/^[a-h][36]$/.test(enPassant)) {
      enPassant = '-';
    }

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
  private lastEvalEmitTime: number = 0;
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

  /**
   * Initializes Web Worker.
   * If Stockfish CDN is blocked or unavailable, the worker uses a self-contained pure JS fallback
   * engine with iterative alpha-beta search, hard time budget, and quiescence search.
   */
  private initWorker() {
    const now = Date.now();
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
        var sfLoaded = false;
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
              sfLoaded = true;
              break;
            }
          } catch(e) {}
        }

        // Try importing chess.js in worker for pure-JS fallback engine if Stockfish fails
        var chessLib = null;
        if (!sfLoaded) {
          try {
            importScripts('https://cdnjs.cloudflare.com/ajax/libs/chess.js/0.10.3/chess.min.js');
            if (typeof Chess === 'function') {
              chessLib = Chess;
            }
          } catch(e) {}
        }

        if (sfLoaded && sf) {
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
          // Pure-JS Background Worker Engine (Runs off the main thread)
          var currentFen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
          var isSearchCancelled = false;

          var P_VALS = { p: 100, n: 320, b: 330, r: 500, q: 900, k: 20000 };
          var P_MG = {
            p: [0,0,0,0,0,0,0,0,50,50,50,50,50,50,50,50,10,10,20,30,30,20,10,10,5,5,10,27,27,10,5,5,0,0,0,25,25,0,0,0,5,-5,-10,0,0,-10,-5,5,5,10,10,-25,-25,10,10,5,0,0,0,0,0,0,0,0],
            n: [-50,-40,-30,-30,-30,-30,-40,-50,-40,-20,0,5,5,0,-20,-40,-30,5,15,20,20,15,5,-30,-30,0,20,30,30,20,0,-30,-30,5,20,30,30,20,5,-30,-30,0,15,20,20,15,0,-30,-40,-20,0,0,0,0,-20,-40,-50,-40,-30,-30,-30,-30,-40,-50],
            b: [-20,-10,-10,-10,-10,-10,-10,-20,-10,5,0,0,0,0,5,-10,-10,10,10,10,10,10,10,-10,-10,0,15,20,20,15,0,-10,-10,5,10,20,20,10,5,-10,-10,0,10,10,10,10,0,-10,-10,5,0,0,0,0,5,-10,-20,-10,-10,-10,-10,-10,-10,-20],
            r: [0,0,0,5,5,0,0,0,-5,0,0,0,0,0,0,-5,-5,0,0,0,0,0,0,-5,-5,0,0,0,0,0,0,-5,-5,0,0,0,0,0,0,-5,-5,0,0,0,0,0,0,-5,5,15,15,15,15,15,15,5,0,0,0,0,0,0,0,0],
            q: [-20,-10,-10,-5,-5,-10,-10,-20,-10,0,5,0,0,0,0,-10,-10,5,5,5,5,5,0,-10,0,0,5,5,5,5,0,-5,-5,0,5,5,5,5,0,-5,-10,0,5,5,5,5,0,-10,-10,0,0,0,0,0,0,-10,-20,-10,-10,-5,-5,-10,-10,-20],
            k: [20,30,10,0,0,10,30,20,20,20,0,0,0,0,20,20,-10,-20,-20,-20,-20,-20,-20,-10,-20,-30,-30,-40,-40,-30,-30,-20,-30,-40,-40,-50,-50,-40,-40,-30,-30,-40,-40,-50,-50,-40,-40,-30,-30,-40,-40,-50,-50,-40,-40,-30,-30,-40,-40,-50,-50,-40,-40,-30]
          };

          function evalPosition(chess, botColor) {
            if (chess.in_checkmate && chess.in_checkmate()) return chess.turn() === botColor ? -99999 : 99999;
            if (chess.in_draw && chess.in_draw()) return -500;
            var score = 0;
            var board = chess.board();
            for (var r = 0; r < 8; r++) {
              for (var c = 0; c < 8; c++) {
                var p = board[r][c];
                if (!p) continue;
                var val = P_VALS[p.type] || 100;
                var sq = p.color === 'w' ? r * 8 + c : (7 - r) * 8 + c;
                var pst = (P_MG[p.type] && P_MG[p.type][sq]) || 0;
                var total = val + pst;
                if (p.color === botColor) score += total;
                else score -= total;
              }
            }
            return score;
          }

          function orderWorkerMoves(moves) {
            return moves.sort(function(a, b) {
              var sA = 0, sB = 0;
              if (a.promotion === 'q') sA += 800;
              if (b.promotion === 'q') sB += 800;
              if (a.captured) sA += (P_VALS[a.captured] || 100) * 10 - (P_VALS[a.piece] || 100);
              if (b.captured) sB += (P_VALS[b.captured] || 100) * 10 - (P_VALS[b.piece] || 100);
              return sB - sA;
            });
          }

          function qSearch(chess, alpha, beta, botColor, qDepth, state) {
            if (state.cancelled || ++state.nodes % 512 === 0 && Date.now() - state.startTime > state.maxTime) {
              state.cancelled = true;
              return alpha;
            }
            var standPat = evalPosition(chess, botColor);
            if (qDepth <= 0 || standPat >= beta) return standPat;
            if (standPat > alpha) alpha = standPat;

            var rawMoves = chess.moves({ verbose: true });
            var captures = orderWorkerMoves(rawMoves.filter(function(m) { return m.captured || m.promotion === 'q'; }));

            for (var i = 0; i < captures.length; i++) {
              chess.move(captures[i]);
              try {
                var score = -qSearch(chess, -beta, -alpha, botColor, qDepth - 1, state);
                if (score >= beta) return beta;
                if (score > alpha) alpha = score;
              } finally {
                chess.undo();
              }
              if (state.cancelled) break;
            }
            return alpha;
          }

          function searchMinimax(chess, depth, alpha, beta, isMax, botColor, state) {
            if (state.cancelled || ++state.nodes % 512 === 0 && Date.now() - state.startTime > state.maxTime) {
              state.cancelled = true;
              return 0;
            }
            if (chess.in_checkmate && chess.in_checkmate()) return isMax ? -99999 + depth : 99999 - depth;
            if (chess.in_draw && chess.in_draw()) return 0;
            if (depth <= 0) {
              return qSearch(chess, alpha, beta, botColor, 4, state);
            }

            var moves = orderWorkerMoves(chess.moves({ verbose: true }));
            if (moves.length === 0) return 0;

            if (isMax) {
              var maxEval = -Infinity;
              for (var i = 0; i < moves.length; i++) {
                chess.move(moves[i]);
                try {
                  var ev = searchMinimax(chess, depth - 1, alpha, beta, false, botColor, state);
                  if (ev > maxEval) maxEval = ev;
                  if (ev > alpha) alpha = ev;
                } finally {
                  chess.undo();
                }
                if (beta <= alpha || state.cancelled) break;
              }
              return maxEval;
            } else {
              var minEval = Infinity;
              for (var j = 0; j < moves.length; j++) {
                chess.move(moves[j]);
                try {
                  var ev2 = searchMinimax(chess, depth - 1, alpha, beta, true, botColor, state);
                  if (ev2 < minEval) minEval = ev2;
                  if (ev2 < beta) beta = ev2;
                } finally {
                  chess.undo();
                }
                if (beta <= alpha || state.cancelled) break;
              }
              return minEval;
            }
          }

          function runPureJsSearch(fen, maxDepth, maxTimeMs) {
            var chess = chessLib ? new chessLib(fen) : null;
            if (!chess) {
              self.postMessage('bestmove (none)');
              return;
            }

            var botColor = chess.turn();
            var moves = orderWorkerMoves(chess.moves({ verbose: true }));
            if (moves.length === 0) {
              self.postMessage('bestmove (none)');
              return;
            }

            // Quick mate check
            for (var mIdx = 0; mIdx < moves.length; mIdx++) {
              chess.move(moves[mIdx]);
              try {
                if (chess.in_checkmate && chess.in_checkmate()) {
                  var uci = moves[mIdx].from + moves[mIdx].to + (moves[mIdx].promotion || '');
                  self.postMessage('info depth 1 score cp 99999');
                  self.postMessage('bestmove ' + uci);
                  return;
                }
              } finally {
                chess.undo();
              }
            }

            var bestMoveUci = moves[0].from + moves[0].to + (moves[0].promotion || '');
            var bestScore = 0;
            var state = {
              startTime: Date.now(),
              maxTime: Math.min(1500, maxTimeMs || 1000),
              nodes: 0,
              cancelled: false
            };

            // Iterative deepening search (Depth 1 up to maxDepth)
            for (var d = 1; d <= Math.min(6, maxDepth || 3); d++) {
              var currentBestMove = null;
              var currentBestScore = -Infinity;

              for (var i = 0; i < moves.length; i++) {
                var move = moves[i];
                chess.move(move);
                try {
                  var score = -searchMinimax(chess, d - 1, -Infinity, Infinity, false, botColor, state);
                  if (score > currentBestScore) {
                    currentBestScore = score;
                    currentBestMove = move;
                  }
                } finally {
                  chess.undo();
                }
                if (state.cancelled || Date.now() - state.startTime > state.maxTime) {
                  state.cancelled = true;
                  break;
                }
              }

              if (!state.cancelled && currentBestMove) {
                bestMoveUci = currentBestMove.from + currentBestMove.to + (currentBestMove.promotion || '');
                bestScore = currentBestScore;
                self.postMessage('info depth ' + d + ' score cp ' + currentBestScore);
              } else {
                break;
              }
            }

            self.postMessage('bestmove ' + bestMoveUci);
          }

          self.onmessage = function(e) {
            try {
              var msg = typeof e === 'object' && e.data ? e.data : '' + e;
              if (typeof msg !== 'string') return;

              if (msg === 'uci') {
                self.postMessage('uciok');
              } else if (msg === 'isready') {
                self.postMessage('readyok');
              } else if (msg.indexOf('position fen ') === 0) {
                currentFen = msg.substring(13).trim();
              } else if (msg.indexOf('go') === 0) {
                var depthMatch = msg.match(/depth (\\d+)/);
                var timeMatch = msg.match(/movetime (\\d+)/);
                var d = depthMatch ? parseInt(depthMatch[1], 10) : 3;
                var t = timeMatch ? parseInt(timeMatch[1], 10) : 1000;
                runPureJsSearch(currentFen, d, t);
              }
            } catch(err) {
              self.postMessage('bestmove (none)');
            }
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
   * 4. OPTIMIZED ENGINE OUTPUT HANDLER (HOT PATH)
   * Only processes 'bestmove' lines or 'info' lines containing ' score '.
   * Throttles eval callback emission to at most once per 250ms.
   * Removes all extractAnyValidMove calls on any other lines.
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

      // Process 'info' lines containing ' score ' (throttled to <= 1 emit per 250ms)
      if (line.startsWith('info') && line.includes(' score ')) {
        const now = Date.now();
        if (now - this.lastEvalEmitTime >= 250) {
          this.lastEvalEmitTime = now;
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
        return;
      }

      // ONLY call move parser when line actually starts with 'bestmove'
      if (line.startsWith('bestmove')) {
        const move = extractAnyValidMove(this.currentSearchingFen, line);
        if (move) {
          this.finishSearch(move);
        } else {
          // If bestmove was (none) or unparseable, use fast main-thread fallback
          const fallback = this.calculateFastGrandmasterMove(this.currentSearchingFen);
          if (fallback.move) {
            this.finishSearch(fallback.move, fallback.scoreCentipawns);
          }
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
        try {
          if (sim.isCheckmate()) return true;
        } finally {
          sim.undo();
        }
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
  // MAIN-THREAD FAST 1-PLY EVALUATOR (<5ms, NEVER BLOCKS MAIN THREAD)
  // Mate-in-1 scan + MVV-LVA move ordering + PeSTO positional tables
  // =========================================================================

  public evaluateBoard(chess: Chess, botColor: 'w' | 'b'): number {
    if (chess.isCheckmate()) return chess.turn() === botColor ? -99999 : 99999;
    if (chess.isDraw() || chess.isStalemate()) return -500;

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

  /**
   * Main-thread fast 1-ply evaluator (<5ms).
   * Used for Watchdog fallback, hint suggestions, and immediate emergency evaluations.
   * NEVER runs deep recursive alpha-beta search on the main thread.
   */
  public calculateFastGrandmasterMove(fen: string): EngineMoveResult {
    try {
      const chess = new Chess(fen);
      const moves = chess.moves({ verbose: true });
      if (moves.length === 0) {
        return { move: '', scoreCentipawns: 0 };
      }

      const botColor = chess.turn();

      // 1. Instant Mate in 1 Check (wrapped in try/finally)
      for (const m of moves) {
        chess.move(m);
        try {
          if (chess.isCheckmate()) {
            return { move: `${m.from}${m.to}${m.promotion || ''}`, scoreCentipawns: 99999 };
          }
        } finally {
          chess.undo();
        }
      }

      // 2. Score 1-ply candidate moves by MVV-LVA & PeSTO tables (< 2ms)
      let bestScore = -Infinity;
      let scoredMoves: { move: Move; score: number }[] = [];

      for (const m of moves) {
        chess.move(m);
        try {
          // Anti-stalemate guard
          if (chess.isStalemate()) {
            continue;
          }

          // Anti-threefold repetition guard
          const fenKey = chess.fen().split(' ').slice(0, 4).join(' ');
          const repeats = this.gameFenHistory.filter((f) => f.split(' ').slice(0, 4).join(' ') === fenKey).length;
          if (repeats >= 2) {
            continue;
          }

          let score = 0;
          if (chess.inCheck()) score += 80;
          if (m.promotion === 'q') score += 800;
          if (m.captured) {
            score += (PIECE_VALUES[m.captured] || 100) * 10 - (PIECE_VALUES[m.piece] || 100);
          }

          // Positional PeSTO delta
          const toCol = m.to.charCodeAt(0) - 97;
          const toRow = 8 - parseInt(m.to[1], 10);
          const pstIndex = botColor === 'w' ? toRow * 8 + toCol : (7 - toRow) * 8 + toCol;
          const pstTable = PST_MG[m.piece];
          if (pstTable && pstTable[pstIndex]) {
            score += pstTable[pstIndex];
          }

          scoredMoves.push({ move: m, score });
          if (score > bestScore) {
            bestScore = score;
          }
        } finally {
          chess.undo();
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
      console.warn('calculateFastGrandmasterMove fallback notice:', err);
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

  // Alias for backwards compatibility
  public calculateGrandmasterMove(fen: string, _depth?: number): EngineMoveResult {
    return this.calculateFastGrandmasterMove(fen);
  }

  // =========================================================================
  // MAIN ENGINE SEARCH (Book -> Tablebase -> Cloud APIs -> Worker -> Fast Failsafe)
  // =========================================================================

  public async calculateMove(
    rawFen: string,
    personality: AIPersonality,
    historyFens: string[],
    onBestMove: BestMoveCallback
  ) {
    // 5. FIX SILENT DEADLOCK: Reset previous search if still marked active
    if (this.isSearching) {
      this.reset();
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

    // 3. Parallel Cloud GM Analysis (if online and high rating)
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

    // 4. Watchdog Timer: Runs FAST 1-ply evaluator (<5ms) if Web Worker / Cloud takes too long
    this.clearWatchdog();
    this.searchWatchdogTimer = setTimeout(() => {
      if (this.isSearching) {
        const fastResult = this.calculateFastGrandmasterMove(fen);
        this.finishSearch(fastResult.move, fastResult.scoreCentipawns);
      }
    }, movetime + 200);

    // 5. Configure options for personality and send command to Web Worker
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
