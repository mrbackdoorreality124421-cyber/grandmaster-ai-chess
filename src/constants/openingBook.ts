/**
 * Master Grandmaster Opening Book (Deep Lines & Instant Counter-Attacks)
 * Matched strictly on first 4 FEN tokens (placement activeColor castling enPassant)
 * Supports 2-3 candidate moves per key chosen randomly for rich gameplay variety.
 */

export const OPENING_BOOK: Record<string, string[]> = {
  // ==========================================
  // INITIAL POSITION
  // ==========================================
  // 1. e4 (King's Pawn), 1. d4 (Queen's Pawn), 1. c4 (English), 1. Nf3 (Reti)
  'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq -': ['e2e4', 'd2d4', 'c2c4', 'g1f3'],

  // ==========================================
  // WHITE RESPONSES (User plays White or Bot plays White)
  // ==========================================
  // 1...e5 -> 2. Nf3 (King's Knight) or 2. Bc4 (Bishop's Opening) or 2. Nc3 (Vienna)
  'rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq -': ['g1f3', 'f1c4', 'b1c3'],
  'rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq e6': ['g1f3', 'f1c4', 'b1c3'],

  // 1. e4 e5 2. Nf3 Nc6 -> 3. Bc4 (Italian) or 3. Bb5 (Ruy Lopez) or 3. d4 (Scotch)
  'r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq -': ['f1c4', 'f1b5', 'd2d4'],

  // Italian Game: 3...Bc5 -> 4. c3 (Giuoco Piano) or 4. O-O or 4. d3
  'r1bqk1nr/pppp1ppp/2n5/2b1p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq -': ['c2c3', 'e1g1', 'd2d3'],

  // Italian Game: 3...Nf6 (Two Knights) -> 4. d3 or 4. Ng5 (Fried Liver Attack)
  'r1bqkb1r/pppp1ppp/2n2n2/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq -': ['d2d3', 'f3g5', 'd2d4'],

  // 1...c5 (Sicilian Defense) -> 2. Nf3 (Open) or 2. Nc3 (Closed) or 2. c3 (Alapin)
  'rnbqkbnr/pp1ppppp/8/2p5/4P3/8/PPPP1PPP/RNBQKBNR w KQkq -': ['g1f3', 'b1c3', 'c2c3'],
  'rnbqkbnr/pp1ppppp/8/2p5/4P3/8/PPPP1PPP/RNBQKBNR w KQkq c6': ['g1f3', 'b1c3', 'c2c3'],

  // 1. e4 c5 2. Nf3 d6 -> 3. d4 (Open Sicilian) or 3. Bb5+ (Moscow)
  'rnbqkbnr/pp2pppp/3p4/2p5/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq -': ['d2d4', 'f1b5'],

  // 1. e4 c5 2. Nf3 Nc6 -> 3. d4 or 3. Bb5 (Rossolimo)
  'r1bqkbnr/pp1ppppp/2n5/2p5/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq -': ['d2d4', 'f1b5', 'c2c3'],

  // 1. e4 c5 2. Nf3 e6 -> 3. d4 or 3. c3
  'rnbqkbnr/pp1p1ppp/4p3/2p5/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq -': ['d2d4', 'c2c3', 'b1c3'],

  // 1...e6 (French Defense) -> 2. d4 or 2. d3 (King's Indian Attack)
  'rnbqkbnr/pppp1ppp/4p3/8/4P3/8/PPPP1PPP/RNBQKBNR w KQkq -': ['d2d4', 'd2d3'],
  'rnbqkbnr/pppp1ppp/4p3/8/4P3/8/PPPP1PPP/RNBQKBNR w KQkq e6': ['d2d4', 'd2d3'],

  // 1. e4 e6 2. d4 d5 -> 3. Nc3 (Paulsen) or 3. Nd2 (Tarrasch) or 3. e5 (Advance)
  'rnbqkbnr/ppp2ppp/4p3/3p4/3PP3/8/PPP2PPP/RNBQKBNR w KQkq -': ['b1c3', 'b1d2', 'e4e5'],
  'rnbqkbnr/ppp2ppp/4p3/3p4/3PP3/8/PPP2PPP/RNBQKBNR w KQkq d6': ['b1c3', 'b1d2', 'e4e5'],

  // 1...c6 (Caro-Kann Defense) -> 2. d4 or 2. Nc3
  'rnbqkbnr/pp1ppppp/2p5/8/4P3/8/PPPP1PPP/RNBQKBNR w KQkq -': ['d2d4', 'b1c3', 'g1f3'],
  'rnbqkbnr/pp1ppppp/2p5/8/4P3/8/PPPP1PPP/RNBQKBNR w KQkq c6': ['d2d4', 'b1c3'],

  // 1. e4 c6 2. d4 d5 -> 3. Nc3 or 3. e5 (Advance) or 3. exd5 (Exchange)
  'rnbqkbnr/pp2pppp/2p5/3p4/3PP3/8/PPP2PPP/RNBQKBNR w KQkq -': ['b1c3', 'e4e5', 'e4d5'],
  'rnbqkbnr/pp2pppp/2p5/3p4/3PP3/8/PPP2PPP/RNBQKBNR w KQkq d6': ['b1c3', 'e4e5', 'e4d5'],

  // 1...d5 (Scandinavian Defense) -> 2. exd5
  'rnbqkbnr/ppp1pppp/8/3p4/4P3/8/PPPP1PPP/RNBQKBNR w KQkq -': ['e4d5'],
  'rnbqkbnr/ppp1pppp/8/3p4/4P3/8/PPPP1PPP/RNBQKBNR w KQkq d6': ['e4d5'],

  // 1...g6 (Modern / Pirc) -> 2. d4
  'rnbqkbnr/pppppp1p/6p1/8/4P3/8/PPPP1PPP/RNBQKBNR w KQkq -': ['d2d4', 'g1f3'],
  'rnbqkbnr/pppppp1p/6p1/8/4P3/8/PPPP1PPP/RNBQKBNR w KQkq g6': ['d2d4', 'g1f3'],

  // 1...Nf6 (Alekhine's Defense) -> 2. e5
  'rnbqkb1r/pppppppp/5n2/8/4P3/8/PPPP1PPP/RNBQKBNR w KQkq -': ['e4e5', 'b1c3'],

  // 1. d4 d5 -> 2. c4 (Queen's Gambit) or 2. Nf3 or 2. Bf4 (London)
  'rnbqkbnr/ppp1pppp/8/3p4/3P4/8/PPP1PPPP/RNBQKBNR w KQkq -': ['c2c4', 'g1f3', 'c1f4'],
  'rnbqkbnr/ppp1pppp/8/3p4/3P4/8/PPP1PPPP/RNBQKBNR w KQkq d6': ['c2c4', 'g1f3', 'c1f4'],

  // ==========================================
  // BLACK RESPONSES (Bot plays Black)
  // ==========================================
  // Opponent plays 1. e4 -> 1...c5 (Sicilian) or 1...e5 (Open Game)
  'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq -': ['c7c5', 'e7e5', 'c7c6'],
  'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3': ['c7c5', 'e7e5', 'c7c6'],

  // 1. e4 c5 2. Nf3 -> 2...d6 (Najdorf/Dragon) or 2...Nc6 or 2...e6
  'rnbqkbnr/pp1ppppp/8/2p5/4P3/5N2/PPPP1PPP/RNBQKB1R b KQkq -': ['d7d6', 'b8c6', 'e7e6'],

  // 1. e4 c5 2. Nf3 d6 3. d4 -> 3...cxd4
  'rnbqkbnr/pp2pppp/3p4/2p5/3PP3/5N2/PPP2PPP/RNBQKB1R b KQkq -': ['c5d4'],
  'rnbqkbnr/pp2pppp/3p4/2p5/3PP3/5N2/PPP2PPP/RNBQKB1R b KQkq d3': ['c5d4'],

  // 1. e4 c5 2. Nf3 d6 3. d4 cxd4 4. Nxd4 -> 4...Nf6
  'rnbqkbnr/pp2pppp/3p4/8/3NP3/8/PPP2PPP/RNBQKB1R b KQkq -': ['g8f6'],

  // 1. e4 c5 2. Nc3 (Closed Sicilian) -> 2...Nc6 or 2...e6
  'rnbqkbnr/pp1ppppp/8/2p5/4P3/2N5/PPPP1PPP/R1BQKBNR b KQkq -': ['b8c6', 'e7e6', 'g7g6'],

  // 1. e4 c5 2. c3 (Alapin Sicilian) -> 2...d5 or 2...Nf6
  'rnbqkbnr/pp1ppppp/8/2p5/4P3/2P5/PP1P1PPP/RNBQKBNR b KQkq -': ['d7d5', 'g8f6'],

  // Opponent plays 1. d4 -> 1...Nf6 (Indian) or 1...d5
  'rnbqkbnr/pppppppp/8/8/3P4/8/PPP1PPPP/RNBQKBNR b KQkq -': ['g8f6', 'd7d5'],
  'rnbqkbnr/pppppppp/8/8/3P4/8/PPP1PPPP/RNBQKBNR b KQkq d3': ['g8f6', 'd7d5'],

  // 1. d4 Nf6 2. c4 -> 2...g6 (King's Indian / Grünfeld) or 2...e6 (Nimzo-Indian)
  'rnbqkb1r/pppppppp/5n2/8/2PP4/8/PP2PPPP/RNBQKBNR b KQkq -': ['g7g6', 'e7e6', 'c7c5'],
  'rnbqkb1r/pppppppp/5n2/8/2PP4/8/PP2PPPP/RNBQKBNR b KQkq c3': ['g7g6', 'e7e6'],

  // 1. d4 Nf6 2. Nf3 -> 2...g6 or 2...e6 or 2...d5
  'rnbqkb1r/pppppppp/5n2/8/3P4/5N2/PPP1PPPP/RNBQKB1R b KQkq -': ['g7g6', 'e7e6', 'd7d5'],

  // 1. d4 Nf6 2. Bf4 (London System) -> 2...d5 or 2...c5
  'rnbqkb1r/pppppppp/5n2/8/3P1B2/8/PPP1PPPP/RN1QKBNR b KQkq -': ['d7d5', 'c7c5', 'g7g6'],

  // Opponent plays 1. c4 (English) -> 1...e5 or 1...Nf6 or 1...c5
  'rnbqkbnr/pppppppp/8/8/2P5/8/PP1PPPPP/RNBQKBNR b KQkq -': ['e7e5', 'g8f6', 'c7c5'],
  'rnbqkbnr/pppppppp/8/8/2P5/8/PP1PPPPP/RNBQKBNR b KQkq c3': ['e7e5', 'g8f6'],

  // Opponent plays 1. Nf3 (Reti) -> 1...d5 or 1...Nf6
  'rnbqkbnr/pppppppp/8/8/8/5N2/PPPPPPPP/RNBQKB1R b KQkq -': ['d7d5', 'g8f6', 'c7c5']
};

/**
 * Extracts candidate opening move(s) based on the first 4 FEN tokens.
 * Randomly picks from available GM candidate moves for dynamic opening variety.
 */
export function getOpeningBookMove(fen: string): string | null {
  if (!fen || typeof fen !== 'string') return null;

  try {
    const parts = fen.trim().split(/\s+/);
    if (parts.length < 4) return null;

    const key = `${parts[0]} ${parts[1]} ${parts[2]} ${parts[3]}`;

    // Direct lookup
    if (OPENING_BOOK[key] && OPENING_BOOK[key].length > 0) {
      const moves = OPENING_BOOK[key];
      return moves[Math.floor(Math.random() * moves.length)];
    }

    // Try fallback ignoring en-passant square if empty or specific
    const keyWithoutEp = `${parts[0]} ${parts[1]} ${parts[2]} -`;
    if (OPENING_BOOK[keyWithoutEp] && OPENING_BOOK[keyWithoutEp].length > 0) {
      const moves = OPENING_BOOK[keyWithoutEp];
      return moves[Math.floor(Math.random() * moves.length)];
    }
  } catch (err) {
    console.warn('getOpeningBookMove notice:', err);
  }

  return null;
}
