/**
 * Resilient Stockfish UCI Engine Service
 * Calibrated mode-specific intelligence, strict FEN blacklist, and crash-proof execution.
 */

import { AIPersonality, AIPersonalityId } from '../types/chess';
import { Chess } from 'chess.js';

export type BestMoveCallback = (bestMove: string) => void;

interface MultiPvEntry {
  id: number;
  move: string;
  scoreType: 'cp' | 'mate';
  scoreVal: number;
}

class StockfishEngineService {
  private worker: Worker | null = null;
  private isReady: boolean = false;
  private isSearching: boolean = false;
  private onBestMoveCallback: BestMoveCallback | null = null;
  private fallbackChess: Chess = new Chess();
  private multiPvLines: MultiPvEntry[] = [];
  private activePersonalityId: AIPersonalityId = 'tournament_player';
  private searchWatchdogTimer: NodeJS.Timeout | null = null;

  // Strict FEN History Blacklist
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
              }, 200);
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
          console.error('Stockfish worker message error:', err);
          this.resetWorkerSafely();
        }
      };

      this.worker.onerror = (err) => {
        console.error('Stockfish worker crash event:', err);
        this.resetWorkerSafely();
      };

      this.safePostMessage('uci');
    } catch (err) {
      console.error('Stockfish worker init error:', err);
      this.isReady = true;
    }
  }

  public resetWorkerSafely() {
    try {
      this.isReady = false;
      this.isSearching = false;
      this.clearWatchdog();

      if (this.worker) {
        try {
          this.worker.terminate();
        } catch {}
        this.worker = null;
      }
      this.initWorker();
    } catch (err) {
      console.error('Failed to reset worker safely:', err);
    }
  }

  private safePostMessage(msg: string) {
    if (!this.worker) return;
    try {
      this.worker.postMessage(msg);
    } catch (err) {
      console.error('Stockfish postMessage error:', err);
      this.resetWorkerSafely();
    }
  }

  private clearWatchdog() {
    if (this.searchWatchdogTimer) {
      clearTimeout(this.searchWatchdogTimer);
      this.searchWatchdogTimer = null;
    }
  }

  public normalizeFenKey(fen: string): string {
    const parts = fen.trim().split(/\s+/);
    if (parts.length >= 4) {
      return `${parts[0]} ${parts[1]} ${parts[2]} ${parts[3]}`;
    }
    return fen;
  }

  public syncFenHistory(fenList: string[]) {
    this.gameFenHistory = fenList.map((f) => this.normalizeFenKey(f));
  }

  private handleOutput(line: string) {
    if (!line) return;

    if (line === 'STOCKFISH_READY' || line === 'uciok') {
      this.isReady = true;
      this.safePostMessage('isready');
      return;
    }

    if (line === 'readyok') {
      this.isReady = true;
      return;
    }

    // Capture MultiPV lines (1, 2, 3) for strict blacklist filtering & personality shaping
    if (line.startsWith('info') && line.includes('multipv')) {
      const pvMatch = line.match(/multipv\s+(\d+)/);
      const scoreMatch = line.match(/score\s+(cp|mate)\s+(-?\d+)/);
      const pvIndex = line.indexOf(' pv ');

      if (pvMatch && pvIndex !== -1) {
        const pvId = parseInt(pvMatch[1], 10);
        const pvMoves = line.substring(pvIndex + 4).trim().split(/\s+/);
        const scoreType = (scoreMatch ? scoreMatch[1] : 'cp') as 'cp' | 'mate';
        const scoreVal = scoreMatch ? parseInt(scoreMatch[2], 10) : 0;

        if (pvMoves.length > 0) {
          const entry: MultiPvEntry = {
            id: pvId,
            move: pvMoves[0],
            scoreType,
            scoreVal
          };

          const existingIdx = this.multiPvLines.findIndex((p) => p.id === pvId);
          if (existingIdx >= 0) {
            this.multiPvLines[existingIdx] = entry;
          } else {
            this.multiPvLines.push(entry);
          }
        }
      }
    }

    if (line === 'bestmove_fallback') {
      this.finishSearch(this.calculateLocalBestMove());
      return;
    }

    if (line.startsWith('bestmove')) {
      const tokens = line.split(' ');
      const bestMove = tokens[1];

      if (bestMove && bestMove !== '(none)' && bestMove !== 'NULL') {
        this.finishSearch(bestMove);
      } else {
        this.finishSearch(this.calculateLocalBestMove());
      }
    }
  }

  /**
   * Tests if a move UCI leads to a position in gameFenHistory
   */
  private isMoveInFenBlacklist(moveUci: string): boolean {
    if (!moveUci || moveUci.length < 4) return false;
    try {
      const from = moveUci.substring(0, 2);
      const to = moveUci.substring(2, 4);
      const promotion = moveUci.length > 4 ? moveUci[4] : undefined;

      const simChess = new Chess(this.fallbackChess.fen());
      const res = simChess.move({ from, to, promotion });
      if (!res) return true;

      const resultingKey = this.normalizeFenKey(simChess.fen());
      return this.gameFenHistory.includes(resultingKey);
    } catch {
      return false;
    }
  }

  private finishSearch(engineBestMove: string) {
    if (!this.isSearching) return;
    this.isSearching = false;
    this.clearWatchdog();

    let finalMove = engineBestMove;

    // Filter candidate MultiPV lines that do not trigger repetition
    this.multiPvLines.sort((a, b) => a.id - b.id);
    const cleanLines = this.multiPvLines.filter((p) => p.move && !this.isMoveInFenBlacklist(p.move));

    // Personality Decision Rules
    if (this.activePersonalityId === 'hacker_extreme' && cleanLines.length >= 2) {
      // Swag Mastermind: Bypass standard #1 move when 2nd or 3rd line is viable
      const line1 = cleanLines[0];
      const line2 = cleanLines[1];
      const line3 = cleanLines[2];

      const line2Viable =
        line2 &&
        (line1.scoreType === 'cp' && line2.scoreType === 'cp'
          ? Math.abs(line1.scoreVal - line2.scoreVal) < 140 || line2.scoreVal > 150
          : true);

      if (line2Viable) {
        finalMove = line3 && Math.random() < 0.35 ? line3.move : line2.move;
      } else {
        finalMove = cleanLines[0].move;
      }
    } else if (this.activePersonalityId === 'human_play' && cleanLines.length >= 2 && Math.random() < 0.25) {
      // Smart Beginner: Occasional human inconsistency on equal lines
      finalMove = cleanLines[1].move;
    } else if (cleanLines.length > 0) {
      finalMove = cleanLines[0].move;
    }

    // Strict Anti-Repetition Guard: If the chosen move is in blacklist, find clean alternative
    if (this.isMoveInFenBlacklist(finalMove)) {
      const altClean = cleanLines.find((p) => !this.isMoveInFenBlacklist(p.move));
      if (altClean?.move) {
        finalMove = altClean.move;
      } else {
        const localCleanMove = this.findCleanLegalMove(finalMove);
        if (localCleanMove) {
          finalMove = localCleanMove;
        }
      }
    }

    const cb = this.onBestMoveCallback;
    this.onBestMoveCallback = null;
    if (cb) {
      cb(finalMove);
    }
  }

  private findCleanLegalMove(forbiddenMove: string): string {
    try {
      const moves = this.fallbackChess.moves({ verbose: true });
      if (moves.length === 0) return forbiddenMove;

      const cleanMoves = moves.filter((m) => {
        const uci = `${m.from}${m.to}${m.promotion || ''}`;
        return uci !== forbiddenMove && !this.isMoveInFenBlacklist(uci);
      });

      if (cleanMoves.length > 0) {
        cleanMoves.sort((a, b) => {
          let scoreA = 0;
          let scoreB = 0;
          if (a.captured) scoreA += 50;
          if (b.captured) scoreB += 50;
          if (['d4', 'd5', 'e4', 'e5'].includes(a.to)) scoreA += 20;
          if (['d4', 'd5', 'e4', 'e5'].includes(b.to)) scoreB += 20;
          return scoreB - scoreA;
        });

        const selected = cleanMoves[0];
        return `${selected.from}${selected.to}${selected.promotion || ''}`;
      }
    } catch {}
    return forbiddenMove;
  }

  private calculateLocalBestMove(): string {
    try {
      const moves = this.fallbackChess.moves({ verbose: true });
      if (moves.length === 0) return '';

      for (const m of moves) {
        this.fallbackChess.move(m);
        if (this.fallbackChess.isCheckmate()) {
          this.fallbackChess.undo();
          return `${m.from}${m.to}${m.promotion || ''}`;
        }
        this.fallbackChess.undo();
      }

      const pieceValues: Record<string, number> = { p: 100, n: 320, b: 330, r: 500, q: 900, k: 20000 };
      let bestScore = -999999;
      let selectedMove = moves[0];

      for (const m of moves) {
        const uci = `${m.from}${m.to}${m.promotion || ''}`;
        let score = 0;
        if (m.captured) {
          score += (pieceValues[m.captured] || 100) * 10 - (pieceValues[m.piece] || 100);
        }
        if (['d4', 'd5', 'e4', 'e5'].includes(m.to)) {
          score += 30;
        }
        this.fallbackChess.move(m);
        if (this.fallbackChess.inCheck()) {
          score += 40;
        }
        this.fallbackChess.undo();

        if (this.isMoveInFenBlacklist(uci)) {
          score -= 2000;
        }

        score += Math.random() * 10;
        if (score > bestScore) {
          bestScore = score;
          selectedMove = m;
        }
      }

      return `${selectedMove.from}${selectedMove.to}${selectedMove.promotion || ''}`;
    } catch {
      return '';
    }
  }

  public calculateMove(
    fen: string,
    personality: AIPersonality,
    allGameFens: string[],
    onBestMove: BestMoveCallback
  ) {
    this.activePersonalityId = personality.id;
    this.multiPvLines = [];

    this.syncFenHistory(allGameFens);

    try {
      this.fallbackChess.load(fen);
    } catch {}

    if (this.isSearching) {
      this.safePostMessage('stop');
      this.isSearching = false;
    }

    this.isSearching = true;
    this.onBestMoveCallback = onBestMove;

    if (!this.worker || !this.isReady) {
      setTimeout(() => {
        this.finishSearch(this.calculateLocalBestMove());
      }, 200);
      return;
    }

    try {
      // 1. 🟢 HUMAN PLAY: Skill Level 3, Depth 4
      if (personality.id === 'human_play') {
        this.safePostMessage('setoption name Skill Level value 3');
        this.safePostMessage('setoption name Hash value 16');
        this.safePostMessage('setoption name MultiPV value 2');
        this.safePostMessage(`position fen ${fen}`);
        this.safePostMessage('go depth 4 movetime 450');
      }
      // 2. 🔵 HUMAN PRO: Skill Level 12, Depth 11
      else if (personality.id === 'human_pro') {
        this.safePostMessage('setoption name Skill Level value 12');
        this.safePostMessage('setoption name Hash value 32');
        this.safePostMessage('setoption name MultiPV value 2');
        this.safePostMessage(`position fen ${fen}`);
        this.safePostMessage('go depth 11 movetime 750');
      }
      // 3. 🏆 TOURNAMENT PLAYER: Skill Level 20, Depth 18
      else if (personality.id === 'tournament_player') {
        this.safePostMessage('setoption name Skill Level value 20');
        this.safePostMessage('setoption name Contempt value 50');
        this.safePostMessage('setoption name Hash value 64');
        this.safePostMessage('setoption name MultiPV value 2');
        this.safePostMessage(`position fen ${fen}`);
        this.safePostMessage('go depth 18 movetime 1200');
      }
      // 4. ⚡ EXTREME FAST (Rush): Skill Level 20, Depth 14, Contempt 200, MoveTime 500ms
      else if (personality.id === 'extreme_fast') {
        this.safePostMessage('setoption name Skill Level value 20');
        this.safePostMessage('setoption name Contempt value 200');
        this.safePostMessage('setoption name Hash value 32');
        this.safePostMessage('setoption name MultiPV value 2');
        this.safePostMessage(`position fen ${fen}`);
        this.safePostMessage('go depth 14 movetime 500');
      }
      // 5. 🐢 EXTREME SLOW (Mastermind): Skill Level 20, Depth 28, MoveTime 3500ms
      else if (personality.id === 'extreme_slow') {
        this.safePostMessage('setoption name Skill Level value 20');
        this.safePostMessage('setoption name Contempt value 50');
        this.safePostMessage('setoption name Hash value 64');
        this.safePostMessage('setoption name MultiPV value 2');
        this.safePostMessage(`position fen ${fen}`);
        this.safePostMessage('go depth 28 movetime 3500');
      }
      // 6. 🕶️ HACKER EXTREME (Swag Mastermind): Skill Level 20, MultiPV 3, MoveTime 1000ms
      else if (personality.id === 'hacker_extreme') {
        this.safePostMessage('setoption name Skill Level value 20');
        this.safePostMessage('setoption name Contempt value 80');
        this.safePostMessage('setoption name Hash value 64');
        this.safePostMessage('setoption name MultiPV value 3');
        this.safePostMessage(`position fen ${fen}`);
        this.safePostMessage('go depth 16 movetime 1000');
      }

      // Hard Watchdog: Allow up to 5500ms to comfortably accommodate the 3500ms Mastermind search
      const maxAllowedTimeout = personality.id === 'extreme_slow' ? 5500 : 3800;
      this.clearWatchdog();
      this.searchWatchdogTimer = setTimeout(() => {
        if (this.isSearching) {
          console.warn('Watchdog triggered, completing with clean fallback and restarting worker');
          this.finishSearch(this.calculateLocalBestMove());
          this.resetWorkerSafely();
        }
      }, maxAllowedTimeout);
    } catch (err) {
      console.error('Worker calculation error:', err);
      this.finishSearch(this.calculateLocalBestMove());
      this.resetWorkerSafely();
    }
  }

  public reset() {
    this.isSearching = false;
    this.onBestMoveCallback = null;
    this.multiPvLines = [];
    this.gameFenHistory = [];
    this.clearWatchdog();

    if (this.worker) {
      try {
        this.safePostMessage('stop');
        this.safePostMessage('ucinewgame');
        this.safePostMessage('isready');
      } catch {}
    }
  }
}

export const stockfishService = new StockfishEngineService();
