import { AIPersonality } from '../types/chess';
import { Chess, Square, Move } from 'chess.js';
import { getOpeningBookMove } from '../constants/openingBook';

export type BestMoveCallback = (bestMove: string) => void;

// PeSTO Piece-Square Positional Tables
const PST: Record<string, number[]> = {
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

const PIECE_VALUES: Record<string, number> = {
  p: 100,
  n: 325,
  b: 335,
  r: 510,
  q: 950,
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
 * 3. FEN SANITIZER & VALIDATOR
 */
export function sanitizeAndValidateFen(rawFen: string): string {
  if (!rawFen || typeof rawFen !== 'string') {
    return 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
  }

  try {
    const testChess = new Chess();
    testChess.load(rawFen);
    const validFen = testChess.fen();

    const tokens = validFen.trim().split(/\s+/);
    if (tokens.length !== 6) return rawFen;

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
    console.warn('FEN validation notice:', err);
    return rawFen;
  }
}

class StockfishEngineService {
  private worker: Worker | null = null;
  private isReady: boolean = false;
  private isSearching: boolean = false;
  private onBestMoveCallback: BestMoveCallback | null = null;
  private searchWatchdogTimer: NodeJS.Timeout | null = null;
  private gameFenHistory: string[] = [];
  private currentAbortController: AbortController | null = null;
  private currentSearchingFen: string = '';

  constructor() {
    this.initWorker();
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
        setTimeout(() => this.initWorker(), 500);
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
      console.warn('Silent postMessage restart:', err);
      this.initWorker();
    }
  }

  private handleOutput(line: string) {
    try {
      if (line === 'STOCKFISH_READY' || line.includes('uciok')) {
        this.isReady = true;
        this.safePostMessage('setoption name Use NNUE value true');
        this.safePostMessage('setoption name Threads value 2');
        this.safePostMessage('setoption name Hash value 64');
        this.safePostMessage('setoption name Skill Level value 20');
        this.safePostMessage('setoption name Contempt value 300');
        this.safePostMessage('setoption name Ponder value true');
        this.safePostMessage('isready');
        return;
      }

      // Unified move extraction from line
      const move = extractAnyValidMove(this.currentSearchingFen, line);
      if (move && line.startsWith('bestmove')) {
        this.finishSearch(move);
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
  private async fetchLichessCloud(fen: string, signal: AbortSignal): Promise<string | null> {
    try {
      const url = `https://lichess.org/api/cloud-eval?fen=${encodeURIComponent(fen)}&multiPv=1`;
      const res = await fetch(url, { signal });
      if (!res.ok) return null;
      const data = await res.json();
      if (data && data.pvs && data.pvs.length > 0 && data.pvs[0].moves) {
        const firstMove = data.pvs[0].moves.split(' ')[0];
        const move = extractAnyValidMove(fen, firstMove);
        if (move) return move;
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

  private finishSearch(engineBestMove: string) {
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
      cb(engineBestMove);
    }
  }

  private clearWatchdog() {
    if (this.searchWatchdogTimer) {
      clearTimeout(this.searchWatchdogTimer);
      this.searchWatchdogTimer = null;
    }
  }

  private evaluatePosition(chess: Chess, botColor: 'w' | 'b'): number {
    if (chess.isCheckmate()) return chess.turn() === botColor ? -999999 : 999999;
    if (chess.isDraw() || chess.isStalemate()) return -500000;

    let score = 0;
    const board = chess.board();

    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const piece = board[r][c];
        if (!piece) continue;

        const val = PIECE_VALUES[piece.type] || 100;
        const pstTable = PST[piece.type];
        const pstIndex = piece.color === 'w' ? r * 8 + c : (7 - r) * 8 + c;
        const pstVal = pstTable ? pstTable[pstIndex] : 0;
        const pieceScore = val + pstVal;

        if (piece.color === botColor) score += pieceScore;
        else score -= pieceScore;
      }
    }
    return score;
  }

  private sortMoves(moves: Move[]): Move[] {
    return moves.sort((a, b) => {
      let scoreA = 0;
      let scoreB = 0;
      if (a.promotion === 'q') scoreA += 900;
      if (b.promotion === 'q') scoreB += 900;
      if (a.captured) scoreA += (PIECE_VALUES[a.captured] || 100) * 10 - (PIECE_VALUES[a.piece] || 100);
      if (b.captured) scoreB += (PIECE_VALUES[b.captured] || 100) * 10 - (PIECE_VALUES[b.piece] || 100);
      return scoreB - scoreA;
    });
  }

  private quiescence(chess: Chess, alpha: number, beta: number, botColor: 'w' | 'b', maxDepth: number): number {
    const standPat = this.evaluatePosition(chess, botColor);
    if (maxDepth <= 0 || standPat >= beta) return standPat;
    let currentAlpha = Math.max(alpha, standPat);

    const captureMoves = this.sortMoves(chess.moves({ verbose: true }).filter((m) => m.captured || m.promotion));
    for (const move of captureMoves) {
      chess.move(move);
      const score = -this.quiescence(chess, -beta, -currentAlpha, botColor, maxDepth - 1);
      chess.undo();
      if (score >= beta) return beta;
      if (score > currentAlpha) currentAlpha = score;
    }
    return currentAlpha;
  }

  private alphaBeta(
    chess: Chess,
    depth: number,
    alpha: number,
    beta: number,
    isMaximizing: boolean,
    botColor: 'w' | 'b'
  ): number {
    if (chess.isCheckmate()) return isMaximizing ? -999999 + depth : 999999 - depth;
    if (chess.isStalemate() || chess.isDraw()) return -500000;
    if (depth <= 0) return this.quiescence(chess, alpha, beta, botColor, 3);

    const moves = this.sortMoves(chess.moves({ verbose: true }));
    if (moves.length === 0) return 0;

    if (isMaximizing) {
      let maxEval = -Infinity;
      for (const m of moves) {
        chess.move(m);
        const evalScore = this.alphaBeta(chess, depth - 1, alpha, beta, false, botColor);
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
        const evalScore = this.alphaBeta(chess, depth - 1, alpha, beta, true, botColor);
        chess.undo();
        minEval = Math.min(minEval, evalScore);
        beta = Math.min(beta, evalScore);
        if (beta <= alpha) break;
      }
      return minEval;
    }
  }

  /**
   * Deep Local Fallback Tactical Search (Ultimate Safety Evaluator)
   */
  public calculateGrandmasterMove(fen: string): string {
    try {
      const chess = new Chess(fen);
      const moves = this.sortMoves(chess.moves({ verbose: true }));
      if (moves.length === 0) return '';

      const botColor = chess.turn();

      // Check Mate in 1
      for (const m of moves) {
        chess.move(m);
        if (chess.isCheckmate()) {
          chess.undo();
          return `${m.from}${m.to}${m.promotion || ''}`;
        }
        chess.undo();
      }

      let bestScore = -Infinity;
      let bestMove = moves[0];

      for (const m of moves) {
        chess.move(m);

        if (chess.isStalemate()) {
          chess.undo();
          continue;
        }

        const fenKey = chess.fen().split(' ').slice(0, 4).join(' ');
        const repeats = this.gameFenHistory.filter((f) => f.split(' ').slice(0, 4).join(' ') === fenKey).length;
        if (repeats >= 2) {
          chess.undo();
          continue;
        }

        let moveScore = 0;
        if (chess.inCheck()) moveScore += 80;
        if (m.captured) moveScore += (PIECE_VALUES[m.captured] || 100) * 10 - (PIECE_VALUES[m.piece] || 100);
        if (m.promotion === 'q') moveScore += 900;

        const evalAfter = this.alphaBeta(chess, 3, -Infinity, Infinity, false, botColor);
        moveScore += evalAfter;

        chess.undo();

        if (moveScore > bestScore) {
          bestScore = moveScore;
          bestMove = m;
        }
      }

      return `${bestMove.from}${bestMove.to}${bestMove.promotion || ''}`;
    } catch {
      // 3. ULTIMATE FAILSAFE: Return ANY legal move
      try {
        const c = new Chess(fen);
        const legals = c.moves({ verbose: true });
        if (legals.length > 0) {
          const first = legals[0];
          return `${first.from}${first.to}${first.promotion || ''}`;
        }
      } catch {}
      return '';
    }
  }

  public async calculateMove(
    rawFen: string,
    _personality: AIPersonality,
    historyFens: string[],
    onBestMove: BestMoveCallback
  ) {
    const fen = sanitizeAndValidateFen(rawFen);
    this.currentSearchingFen = fen;
    this.gameFenHistory = historyFens || [];

    // 2. OPENING BOOK ISOLATION & STRICT TRY...CATCH FALLBACK
    try {
      const bookMove = getOpeningBookMove(fen);
      if (bookMove) {
        const validatedBookMove = extractAnyValidMove(fen, bookMove);
        if (validatedBookMove && !this.isDrawOrBlunder(fen, validatedBookMove)) {
          setTimeout(() => {
            onBestMove(validatedBookMove);
          }, 40);
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

    // Syzygy Endgame Tablebase
    if (pieceCount <= 7) {
      try {
        const syzygyMove = await this.fetchSyzygyTablebase(fen, signal);
        if (syzygyMove && !this.isDrawOrBlunder(fen, syzygyMove)) {
          this.finishSearch(syzygyMove);
          return;
        }
      } catch {}
    }

    // Parallel Grandmaster API Queries
    Promise.allSettled([
      this.fetchLichessCloud(fen, signal),
      this.fetchStockfishOnline(fen, signal)
    ]).then((results) => {
      if (!this.isSearching) return;
      for (const res of results) {
        if (res.status === 'fulfilled' && res.value) {
          const move = res.value;
          if (!this.isDrawOrBlunder(fen, move)) {
            this.finishSearch(move);
            return;
          }
        }
      }
    });

    let simChess: Chess | null = null;
    try {
      simChess = new Chess(fen);
    } catch {}

    const isTactical = Boolean(simChess?.inCheck()) || pieceCount <= 12;
    const targetDepth = isTactical ? 30 : 22;
    const movetime = isTactical ? 2800 : 2000;

    // Watchdog Timer (Triggers deep local minimax if engine takes > 2.8s)
    this.clearWatchdog();
    this.searchWatchdogTimer = setTimeout(() => {
      if (this.isSearching) {
        const gmMove = this.calculateGrandmasterMove(fen);
        this.finishSearch(gmMove);
      }
    }, movetime + 200);

    // Worker Stockfish with Sanitized FEN
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
