import { AIPersonality } from '../types/chess';
import { getOpeningBookMove } from '../constants/openingBook';
import { Chess } from 'chess.js';

export const DEFAULT_STARTING_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

export type BestMoveCallback = (bestMove: string, scoreCp?: number) => void;
export type EvalCallback = (scoreCp: number, depth: number) => void;

export interface EngineMoveResult {
  move: string;
  scoreCentipawns: number;
}

export function extractAnyValidMove(fen: string, line: string): string | null {
  const match = line.match(/([a-h][1-8][a-h][1-8][qrbn]?)/);
  if (match) return match[1];
  return null;
}

export function sanitizeAndValidateFen(fen: string | null | undefined): string {
  if (!fen || typeof fen !== 'string' || fen.trim() === '') {
    return DEFAULT_STARTING_FEN;
  }
  try {
    const parts = fen.trim().split(/\s+/);
    if (parts.length < 4) return DEFAULT_STARTING_FEN;
    const placement = parts[0];
    const activeColor = parts[1].match(/^[wb]$/) ? parts[1] : 'w';
    const castling = parts[2].match(/^[KkQq-]+$/) ? parts[2] : '-';
    const enPassant = parts[3].match(/^([a-h][36]|-)$/) ? parts[3] : '-';
    const halfmove = parts.length > 4 ? parts[4] : '0';
    const fullmove = parts.length > 5 ? parts[5] : '1';

    const half = parseInt(halfmove, 10);
    const full = parseInt(fullmove, 10);
    const safeHalf = isNaN(half) || half < 0 ? '0' : half.toString();
    const safeFull = isNaN(full) || full < 1 ? '1' : full.toString();

    return `${placement} ${activeColor} ${castling} ${enPassant} ${safeHalf} ${safeFull}`;
  } catch (err) {
    return DEFAULT_STARTING_FEN;
  }
}

class LionEngineService {
  private worker: Worker | null = null;
  private isSearching: boolean = false;
  private onBestMoveCallback: BestMoveCallback | null = null;
  private onEvalCallback: EvalCallback | null = null;
  private lastEvalEmitTime: number = 0;
  private gameFenHistory: string[] = [];
  
  constructor() {
    this.initWorker();
  }

  public setEvalCallback(cb: EvalCallback | null) {
    this.onEvalCallback = cb;
  }

  public restartWorker() {
    this.isSearching = false;
    this.onBestMoveCallback = null;
    this.initWorker();
  }

  private initWorker() {
    if (this.worker) {
      this.worker.terminate();
    }
    this.worker = new Worker(new URL('./engineWorker.ts', import.meta.url), { type: 'module' });
    this.worker.onmessage = this.handleWorkerMessage.bind(this);
  }

  private handleWorkerMessage(e: MessageEvent) {
    const data = e.data;
    
    if (data.type === 'eval' && this.onEvalCallback) {
      const now = Date.now();
      if (now - this.lastEvalEmitTime >= 250) {
        this.lastEvalEmitTime = now;
        this.onEvalCallback(data.scoreCp, data.depth);
      }
    } else if (data.type === 'result') {
      this.isSearching = false;
      const { move, scoreCp } = data;
      if (this.onBestMoveCallback && move) {
        this.onBestMoveCallback(move, scoreCp);
      }
      this.onBestMoveCallback = null;
    }
  }

  public syncGameHistory(historyFens: string[]) {
    this.gameFenHistory = [...historyFens];
  }

  public calculateMove(
    fen: string,
    personality: AIPersonality,
    callback: BestMoveCallback
  ) {
    if (this.isSearching) {
      this.restartWorker();
    }

    const validFen = sanitizeAndValidateFen(fen);
    
    // Check opening book first (main thread)
    if (this.gameFenHistory.length < 16) {
      const bookMove = getOpeningBookMove(validFen);
      if (bookMove) {
        setTimeout(() => callback(bookMove), 400); // Add a small delay for realism
        return;
      }
    }

    this.isSearching = true;
    this.onBestMoveCallback = callback;
    
    let depth = 3;
    let movetime = 1000;
    let blunderRate = 0;

    // PERSONALITY MAPPING
    // Novice: depth 1, 300ms, blunder 0.35
    // Club: depth 2, 500ms, blunder 0.15
    // Expert: depth 3, 900ms, blunder 0.05
    // Master: depth 3, 1400ms, blunder 0
    // Grandmaster: depth 4, 2000ms, blunder 0
    // LION APEX: depth 4, 2500ms, blunder 0
    
    const id = personality.id;
    if (id === 'novice') { depth = 1; movetime = 300; blunderRate = 0.35; }
    else if (id === 'club') { depth = 2; movetime = 500; blunderRate = 0.15; }
    else if (id === 'expert') { depth = 3; movetime = 900; blunderRate = 0.05; }
    else if (id === 'master') { depth = 3; movetime = 1400; blunderRate = 0; }
    else if (id === 'grandmaster') { depth = 4; movetime = 2000; blunderRate = 0; }
    else if (id === 'lion') { depth = 4; movetime = 2500; blunderRate = 0; }

    this.worker?.postMessage({
      type: 'search',
      fen: validFen,
      depth,
      movetime,
      blunderRate
    });
  }

  public getTacticalHint(fen: string): Promise<EngineMoveResult> {
    return new Promise((resolve) => {
      // 1-ply search for quick hint
      const chess = new Chess(fen);
      const moves = chess.moves({ verbose: true });
      if (moves.length === 0) {
        resolve({ move: '', scoreCentipawns: 0 });
        return;
      }
      
      const tempWorker = new Worker(new URL('./engineWorker.ts', import.meta.url), { type: 'module' });
      tempWorker.onmessage = (e) => {
        if (e.data.type === 'result') {
          resolve({ move: e.data.move || moves[0].lan, scoreCentipawns: e.data.scoreCp });
          tempWorker.terminate();
        }
      };
      
      tempWorker.postMessage({
        type: 'search',
        fen,
        depth: 2, // slightly deeper for a good hint
        movetime: 1000,
        blunderRate: 0
      });
    });
  }

  public async testEngine() {
    console.log('Running LION CORE self-test...');
    
    const tests = [
      // 5 Mate in 1/2
      { fen: 'r1bqkb1r/pppp1ppp/2n2n2/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR w KQkq - 4 4', expected: ['h5f7'], desc: 'Scholar\'s Mate in 1' },
      { fen: 'rnbqkbnr/pppp1ppp/8/4p3/6P1/5P2/PPPPP2P/RNBQKBNR b KQkq - 0 2', expected: ['d8h4'], desc: 'Fool\'s Mate in 1' },
      { fen: '1k6/1P6/2K5/8/8/8/8/8 w - - 0 1', expected: ['c6b6'], desc: 'Avoid stalemate, mate in 2' },
      { fen: 'r1bqk2r/pppp1ppp/2n5/2b1p3/2B1P1n1/2NP1N2/PPP2PPP/R1BQK2R w KQkq - 1 6', expected: ['c4f7'], desc: 'Tactical Mate pattern start (not exactly mate, but best)' },
      { fen: '6k1/R7/6K1/8/8/8/8/8 w - - 0 1', expected: ['a7a8'], desc: 'Back rank mate in 1' },
      
      // 3 Basic Forks
      { fen: 'r3k2r/p1ppqpb1/bn2pnp1/3PN3/1p2P3/2N2Q1p/PPPBBPPP/R3K2R w KQkq - 0 1', expected: ['e5c6'], desc: 'Royal fork pattern approximation' },
      { fen: '2kr3r/ppp2ppp/2n5/3P4/6b1/2P2N2/P1P1BPPP/R3K2R b KQ - 0 13', expected: ['c6e5'], desc: 'Discovered attack/fork' },
      { fen: 'rnbqk2r/pppp1ppp/4pn2/8/1bPP4/2N5/PP2PPPP/R1BQKBNR w KQkq - 0 1', expected: ['c1d2', 'd1c2'], desc: 'Nimzo defense block fork' },
      
      // 2 Knight Traps (avoiding Na5-style traps or falling for them)
      { fen: 'r1bqk2r/pppp1ppp/2n2n2/2b1p3/4P3/2N2N2/PPPP1PPP/R1BQKB1R w KQkq - 4 5', expected: ['f3e5', 'd2d3'], desc: 'Center control vs bad knight jump' },
      { fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1', expected: ['e2e4', 'd2d4', 'g1f3'], desc: 'Opening good moves vs Na3 trap' }
    ];

    let passed = 0;
    for (let i = 0; i < tests.length; i++) {
      const t = tests[i];
      const res = await new Promise<EngineMoveResult>((resolve) => {
        const tempWorker = new Worker(new URL('./engineWorker.ts', import.meta.url), { type: 'module' });
        tempWorker.onmessage = (e) => {
          if (e.data.type === 'result') {
            resolve({ move: e.data.move, scoreCentipawns: e.data.scoreCp });
            tempWorker.terminate();
          }
        };
        tempWorker.postMessage({
          type: 'search',
          fen: t.fen,
          depth: 4,
          movetime: 2500, // LION APEX
          blunderRate: 0
        });
      });

      if (t.expected.includes(res.move)) {
        passed++;
        console.log(`[PASS] Test ${i+1}: ${t.desc} | Move: ${res.move}`);
      } else {
        console.warn(`[FAIL] Test ${i+1}: ${t.desc} | Expected one of ${t.expected}, got: ${res.move}`);
      }
    }
    
    console.log(`LION CORE self-test: ${passed}/10`);
  }
}

export const engineService = new LionEngineService();

// Expose to global window for dev console access
if (typeof window !== 'undefined') {
  (window as any).runLionTest = () => engineService.testEngine();
}
