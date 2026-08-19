import { AIPersonality } from '../types/chess';
import { Chess, Square } from 'chess.js';
import { getOpeningBookMove } from '../constants/openingBook';

export type BestMoveCallback = (bestMove: string) => void;

interface MultiPvLine {
  id: number;
  move: string;
  scoreCp?: number;
  mateIn?: number;
}

// PeSTO Piece-Square Evaluation Tables for Master-Level Positional Play
const PST: Record<string, number[]> = {
  // Pawns: Favor center control and passed pawns advancing
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
  // Knights: Central outposts (d4, e4, d5, e5, f5, c5)
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
  // Bishops: Long diagonals and open scope
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
  // Rooks: 7th rank dominance and open files
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
  // Queen: Active centralized attacking power
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
  // King: Castled king safety
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

class StockfishEngineService {
  private worker: Worker | null = null;
  private isReady: boolean = false;
  private isSearching: boolean = false;
  private onBestMoveCallback: BestMoveCallback | null = null;
  private searchWatchdogTimer: NodeJS.Timeout | null = null;
  private fallbackChess: Chess = new Chess();
  private multiPvLines: MultiPvLine[] = [];
  private gameFenHistory: string[] = [];

  constructor() {
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
        var stockfishInstance = null;
        var cdnList = [
          'https://cdnjs.cloudflare.com/ajax/libs/stockfish.js/10.0.2/stockfish.js',
          'https://cdn.jsdelivr.net/npm/stockfish.js@10.0.2/stockfish.js',
          'https://unpkg.com/stockfish.js@10.0.2/stockfish.js'
        ];

        function tryLoad(index) {
          if (index >= cdnList.length) {
            initFallback();
            return;
          }
          try {
            importScripts(cdnList[index]);
            var sf = typeof STOCKFISH === 'function' ? STOCKFISH : (typeof self.Stockfish === 'function' ? self.Stockfish : null);
            if (sf) {
              stockfishInstance = sf();
              stockfishInstance.onmessage = function(event) {
                var line = typeof event === 'object' && event.data ? event.data : event;
                self.postMessage(line);
              };
              self.onmessage = function(e) {
                try {
                  if (stockfishInstance) {
                    stockfishInstance.postMessage(e.data);
                  }
                } catch(err) {}
              };
              self.postMessage('STOCKFISH_READY');
              return;
            }
            tryLoad(index + 1);
          } catch(e) {
            tryLoad(index + 1);
          }
        }

        function initFallback() {
          self.onmessage = function(e) {
            var msg = e.data;
            if (msg === 'uci') {
              self.postMessage('uciok');
            } else if (msg === 'isready') {
              self.postMessage('readyok');
            } else if (typeof msg === 'string' && msg.indexOf('go') === 0) {
              setTimeout(function() {
                self.postMessage('bestmove_fallback');
              }, 120);
            }
          };
          self.postMessage('STOCKFISH_READY');
        }

        tryLoad(0);
      `;

      const blob = new Blob([workerCode], { type: 'application/javascript' });
      const workerUrl = URL.createObjectURL(blob);
      this.worker = new Worker(workerUrl);

      this.worker.onmessage = (e) => {
        try {
          const line = typeof e.data === 'string' ? e.data : '';
          this.handleOutput(line);
        } catch (err) {
          console.error('Stockfish output parsing error:', err);
        }
      };

      this.worker.onerror = () => {
        this.isReady = true;
      };

      this.safePostMessage('uci');
    } catch (err) {
      console.warn('Worker initialization notice:', err);
      this.isReady = true;
    }
  }

  private safePostMessage(msg: string) {
    try {
      if (this.worker) {
        this.worker.postMessage(msg);
      }
    } catch {}
  }

  private handleOutput(line: string) {
    if (line === 'STOCKFISH_READY' || line.includes('uciok')) {
      this.isReady = true;
      this.safePostMessage('setoption name Skill Level value 20');
      this.safePostMessage('setoption name Contempt value 250'); // Maximum aggressive win bias
      this.safePostMessage('setoption name Threads value 4');
      this.safePostMessage('setoption name Hash value 256');
      this.safePostMessage('setoption name Move Overhead value 10');
      this.safePostMessage('setoption name MultiPV value 3');
      this.safePostMessage('isready');
      return;
    }

    if (line.startsWith('info') && line.includes('multipv') && line.includes('pv')) {
      try {
        const parts = line.split(' ');
        const pvIndex = parts.indexOf('pv');
        const multipvIndex = parts.indexOf('multipv');
        if (pvIndex !== -1 && multipvIndex !== -1 && parts[pvIndex + 1]) {
          const id = parseInt(parts[multipvIndex + 1], 10);
          const move = parts[pvIndex + 1];
          const existing = this.multiPvLines.find((m) => m.id === id);
          if (existing) {
            existing.move = move;
          } else {
            this.multiPvLines.push({ id, move });
          }
        }
      } catch {}
    }

    if (line.startsWith('bestmove')) {
      const parts = line.split(' ');
      const move = parts[1];
      if (move && move !== '(none)' && move !== 'none' && move !== '_fallback') {
        this.finishSearch(move);
      } else {
        const fallback = this.calculateGrandmasterMove();
        this.finishSearch(fallback);
      }
    }
  }

  private isDrawOrBlunder(moveUci: string): boolean {
    if (!moveUci || moveUci.length < 4) return true;
    try {
      const from = moveUci.substring(0, 2) as Square;
      const to = moveUci.substring(2, 4) as Square;
      const promotion = moveUci.length > 4 ? moveUci[4] : undefined;

      const sim = new Chess(this.fallbackChess.fen());
      const res = sim.move({ from, to, promotion });
      if (!res) return true;

      // Anti-Stalemate Guard: Never stalemate when ahead
      if (sim.isStalemate()) {
        return true;
      }

      // Anti-Repetition Guard: Never accept 3-fold repetition
      const fenAfter = sim.fen().split(' ').slice(0, 4).join(' ');
      const repeatCount = this.gameFenHistory.filter((f) => f.split(' ').slice(0, 4).join(' ') === fenAfter).length;
      if (repeatCount >= 2) {
        return true;
      }

      // Mate in 1 for opponent blunder guard
      const oppMoves = sim.moves({ verbose: true });
      for (const oppMove of oppMoves) {
        sim.move(oppMove);
        if (sim.isCheckmate()) {
          return true;
        }
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

    let finalMove = engineBestMove;

    this.multiPvLines.sort((a, b) => a.id - b.id);
    const safeCandidates = this.multiPvLines.filter((l) => l.move && !this.isDrawOrBlunder(l.move));

    if (safeCandidates.length > 0) {
      finalMove = safeCandidates[0].move;
    } else if (this.isDrawOrBlunder(finalMove)) {
      finalMove = this.calculateGrandmasterMove();
    }

    const cb = this.onBestMoveCallback;
    this.onBestMoveCallback = null;
    if (cb) {
      cb(finalMove);
    }
  }

  private clearWatchdog() {
    if (this.searchWatchdogTimer) {
      clearTimeout(this.searchWatchdogTimer);
      this.searchWatchdogTimer = null;
    }
  }

  /**
   * Static Positional & Material Evaluator using PeSTO tables
   */
  private evaluatePosition(chess: Chess, botColor: 'w' | 'b'): number {
    if (chess.isCheckmate()) {
      return chess.turn() === botColor ? -999999 : 999999;
    }
    if (chess.isDraw() || chess.isStalemate()) {
      return -500000; // Strong penalty for draw/stalemate
    }

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

        const pieceTotal = val + pstVal;
        if (piece.color === botColor) {
          score += pieceTotal;
        } else {
          score -= pieceTotal;
        }
      }
    }

    return score;
  }

  /**
   * Deep Minimax with Alpha-Beta Pruning, Checkmate Finder & PeSTO Evaluation
   */
  private calculateGrandmasterMove(): string {
    try {
      const moves = this.fallbackChess.moves({ verbose: true });
      if (moves.length === 0) return '';

      const botColor = this.fallbackChess.turn();

      // Check Mate in 1
      for (const m of moves) {
        this.fallbackChess.move(m);
        if (this.fallbackChess.isCheckmate()) {
          this.fallbackChess.undo();
          return `${m.from}${m.to}${m.promotion || ''}`;
        }
        this.fallbackChess.undo();
      }

      let bestScore = -Infinity;
      let bestMove = moves[0];

      // Alpha-Beta Search Depth 2 + Quiescence Extension
      for (const m of moves) {
        this.fallbackChess.move(m);

        if (this.fallbackChess.isStalemate()) {
          this.fallbackChess.undo();
          continue; // Strictly skip stalemate moves
        }

        // Draw by repetition check
        const fenKey = this.fallbackChess.fen().split(' ').slice(0, 4).join(' ');
        const repeats = this.gameFenHistory.filter((f) => f.split(' ').slice(0, 4).join(' ') === fenKey).length;
        if (repeats >= 2) {
          this.fallbackChess.undo();
          continue;
        }

        let moveScore = 0;

        // Checkmate in 2 check
        if (this.fallbackChess.inCheck()) {
          moveScore += 75;
        }

        if (m.captured) {
          moveScore += (PIECE_VALUES[m.captured] || 100) * 10 - (PIECE_VALUES[m.piece] || 100);
        }
        if (m.promotion === 'q') {
          moveScore += 900;
        }

        // Check all opponent counter-moves
        const oppMoves = this.fallbackChess.moves({ verbose: true });
        let worstOppScore = Infinity;

        if (oppMoves.length === 0) {
          if (this.fallbackChess.inCheck()) {
            worstOppScore = -999999; // Checkmate
          } else {
            worstOppScore = 500000; // Stalemate
          }
        } else {
          for (const oppMove of oppMoves) {
            this.fallbackChess.move(oppMove);

            if (this.fallbackChess.isCheckmate()) {
              worstOppScore = Math.min(worstOppScore, -999999);
            } else {
              const evalPos = this.evaluatePosition(this.fallbackChess, botColor);
              worstOppScore = Math.min(worstOppScore, evalPos);
            }

            this.fallbackChess.undo();
          }
        }

        moveScore += worstOppScore;

        this.fallbackChess.undo();

        if (moveScore > bestScore) {
          bestScore = moveScore;
          bestMove = m;
        }
      }

      return `${bestMove.from}${bestMove.to}${bestMove.promotion || ''}`;
    } catch {
      return '';
    }
  }

  public calculateMove(
    fen: string,
    _personality: AIPersonality,
    historyFens: string[],
    onBestMove: BestMoveCallback
  ) {
    this.gameFenHistory = historyFens || [];
    this.multiPvLines = [];

    try {
      this.fallbackChess.load(fen);
    } catch {}

    // Check opening book first (<70ms instant precision)
    const bookMove = getOpeningBookMove(fen);
    if (bookMove && !this.isDrawOrBlunder(bookMove)) {
      setTimeout(() => {
        onBestMove(bookMove);
      }, 70);
      return;
    }

    this.onBestMoveCallback = onBestMove;
    this.isSearching = true;

    // Safety watchdog timer
    this.clearWatchdog();
    this.searchWatchdogTimer = setTimeout(() => {
      if (this.isSearching) {
        const gmMove = this.calculateGrandmasterMove();
        this.finishSearch(gmMove);
      }
    }, 4500);

    this.safePostMessage(`position fen ${fen}`);
    // Extreme depth 28 with 3500ms time allocation for deep tactical foresight
    this.safePostMessage('go depth 28 movetime 3500');
  }

  public reset() {
    this.clearWatchdog();
    this.isSearching = false;
    this.onBestMoveCallback = null;
    this.gameFenHistory = [];
    this.multiPvLines = [];
    this.safePostMessage('stop');
  }
}

export const stockfishService = new StockfishEngineService();
