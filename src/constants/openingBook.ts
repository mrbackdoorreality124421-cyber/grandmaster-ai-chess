/**
 * Master Grandmaster Opening Book (Deep Lines & Instant Counter-Attacks)
 */

export const OPENING_BOOK: Record<string, string> = {
  // ==========================================
  // INITIAL POSITIONS
  // ==========================================
  // Initial position -> Play 1. e4 (King's Pawn)
  'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1': 'e2e4',

  // ==========================================
  // WHITE RESPONSES (User plays White)
  // ==========================================
  // 1...e5 -> 2. Nf3 (Open Game)
  'rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2': 'g1f3',
  'rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq e6 0 2': 'g1f3',

  // 1. e4 e5 2. Nf3 Nc6 -> 3. Bc4 (Italian Game) or 3. Bb5 (Ruy Lopez)
  'r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 1 2': 'f1c4',
  'r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 3': 'f1c4',

  // Italian Game: 3...Bc5 -> 4. c3 (Main Line)
  'r1bqk1nr/pppp1ppp/2n5/2b1p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 2 3': 'c2c3',
  'r1bqk1nr/pppp1ppp/2n5/2b1p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4': 'c2c3',

  // Italian Game: 3...Nf6 (Two Knights) -> 4. d3 or 4. Ng5
  'r1bqkb1r/pppp1ppp/2n2n2/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4': 'd2d3',

  // 1...c5 (Sicilian Defense) -> 2. Nf3 (Open Sicilian Setup)
  'rnbqkbnr/pp1ppppp/8/2p5/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2': 'g1f3',
  'rnbqkbnr/pp1ppppp/8/2p5/4P3/8/PPPP1PPP/RNBQKBNR w KQkq c6 0 2': 'g1f3',

  // 1. e4 c5 2. Nf3 d6 -> 3. d4 (Open Sicilian)
  'rnbqkbnr/pp2pppp/3p4/2p5/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 0 2': 'd2d4',
  'rnbqkbnr/pp2pppp/3p4/2p5/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 1 3': 'd2d4',

  // 1. e4 c5 2. Nf3 Nc6 -> 3. d4 (Open Sicilian)
  'r1bqkbnr/pp1ppppp/2n5/2p5/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 1 2': 'd2d4',
  'r1bqkbnr/pp1ppppp/2n5/2p5/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 3': 'd2d4',

  // 1. e4 c5 2. Nf3 e6 -> 3. d4
  'rnbqkbnr/pp1p1ppp/4p3/2p5/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 0 2': 'd2d4',

  // 1...e6 (French Defense) -> 2. d4
  'rnbqkbnr/pppp1ppp/4p3/8/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2': 'd2d4',
  'rnbqkbnr/pppp1ppp/4p3/8/4P3/8/PPPP1PPP/RNBQKBNR w KQkq e6 0 2': 'd2d4',

  // 1. e4 e6 2. d4 d5 -> 3. Nc3 (Paulsen/Classical)
  'rnbqkbnr/ppp2ppp/4p3/3p4/3PP3/8/PPP2PPP/RNBQKBNR w KQkq - 0 2': 'b1c3',
  'rnbqkbnr/ppp2ppp/4p3/3p4/3PP3/8/PPP2PPP/RNBQKBNR w KQkq d6 0 3': 'b1c3',

  // 1...c6 (Caro-Kann Defense) -> 2. d4
  'rnbqkbnr/pp1ppppp/2p5/8/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2': 'd2d4',
  'rnbqkbnr/pp1ppppp/2p5/8/4P3/8/PPPP1PPP/RNBQKBNR w KQkq c6 0 2': 'd2d4',

  // 1. e4 c6 2. d4 d5 -> 3. Nc3
  'rnbqkbnr/pp2pppp/2p5/3p4/3PP3/8/PPP2PPP/RNBQKBNR w KQkq - 0 2': 'b1c3',
  'rnbqkbnr/pp2pppp/2p5/3p4/3PP3/8/PPP2PPP/RNBQKBNR w KQkq d6 0 3': 'b1c3',

  // 1...d5 (Scandinavian Defense) -> 2. exd5
  'rnbqkbnr/ppp1pppp/8/3p4/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2': 'e4d5',
  'rnbqkbnr/ppp1pppp/8/3p4/4P3/8/PPPP1PPP/RNBQKBNR w KQkq d6 0 2': 'e4d5',

  // 1...g6 (Modern / Pirc) -> 2. d4
  'rnbqkbnr/pppppp1p/6p1/8/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2': 'd2d4',
  'rnbqkbnr/pppppp1p/6p1/8/4P3/8/PPPP1PPP/RNBQKBNR w KQkq g6 0 2': 'd2d4',

  // 1...Nf6 (Alekhine's Defense) -> 2. e5
  'rnbqkb1r/pppppppp/5n2/8/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 1 2': 'e4e5',

  // 1...d6 -> 2. d4
  'rnbqkbnr/ppp1pppp/3p4/8/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2': 'd2d4',

  // ==========================================
  // BLACK RESPONSES (User plays Black / Bot is Black)
  // ==========================================
  // Opponent plays 1. e4 -> Black plays Sicilian Defense 1...c5 (Sharpest Winning Percentage)
  'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1': 'c7c5',
  'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1': 'c7c5',

  // 1. e4 c5 2. Nf3 -> Black plays 2...d6 (Najdorf/Dragon Setup)
  'rnbqkbnr/pp1ppppp/8/2p5/4P3/5N2/PPPP1PPP/RNBQKB1R b KQkq - 1 2': 'd7d6',

  // 1. e4 c5 2. Nf3 d6 3. d4 -> 3...cxd4
  'rnbqkbnr/pp2pppp/3p4/2p5/3PP3/5N2/PPP2PPP/RNBQKB1R b KQkq - 0 3': 'c5d4',
  'rnbqkbnr/pp2pppp/3p4/2p5/3PP3/5N2/PPP2PPP/RNBQKB1R b KQkq d3 0 3': 'c5d4',

  // 1. e4 c5 2. Nf3 d6 3. d4 cxd4 4. Nxd4 -> 4...Nf6
  'rnbqkbnr/pp2pppp/3p4/8/3NP3/8/PPP2PPP/RNBQKB1R b KQkq - 0 4': 'g8f6',

  // 1. e4 c5 2. Nc3 (Closed Sicilian) -> 2...Nc6
  'rnbqkbnr/pp1ppppp/8/2p5/4P3/2N5/PPPP1PPP/R1BQKBNR b KQkq - 1 2': 'b8c6',

  // 1. e4 c5 2. c3 (Alapin Sicilian) -> 2...d5
  'rnbqkbnr/pp1ppppp/8/2p5/4P3/2P5/PP1P1PPP/RNBQKBNR b KQkq - 0 2': 'd7d5',

  // 1. e4 c5 2. f4 (Grand Prix) -> 2...d5
  'rnbqkbnr/pp1ppppp/8/2p5/4PP2/8/PPPP2PP/RNBQKBNR b KQkq - 0 2': 'd7d5',

  // Opponent plays 1. d4 -> Black plays King's Indian Defense 1...Nf6
  'rnbqkbnr/pppppppp/8/8/3P4/8/PPP1PPPP/RNBQKBNR b KQkq - 0 1': 'g8f6',
  'rnbqkbnr/pppppppp/8/8/3P4/8/PPP1PPPP/RNBQKBNR b KQkq d3 0 1': 'g8f6',

  // 1. d4 Nf6 2. c4 -> 2...g6 (King's Indian / Grünfeld)
  'rnbqkb1r/pppppppp/5n2/8/2PP4/8/PP2PPPP/RNBQKBNR b KQkq - 0 2': 'g7g6',
  'rnbqkb1r/pppppppp/5n2/8/2PP4/8/PP2PPPP/RNBQKBNR b KQkq c3 0 2': 'g7g6',

  // 1. d4 Nf6 2. Nf3 -> 2...g6
  'rnbqkb1r/pppppppp/5n2/8/3P4/5N2/PPP1PPPP/RNBQKB1R b KQkq - 1 2': 'g7g6',

  // 1. d4 Nf6 2. Bf4 (London System) -> 2...d5
  'rnbqkb1r/pppppppp/5n2/8/3P1B2/8/PPP1PPPP/RN1QKBNR b KQkq - 1 2': 'd7d5',

  // 1. d4 Nf6 2. Bg5 (Trompowsky) -> 2...Ne4
  'rnbqkb1r/pppppppp/5n2/6B1/3P4/8/PPP1PPPP/RN1QKBNR b KQkq - 1 2': 'f6e4',

  // Opponent plays 1. c4 (English Opening) -> Black plays 1...e5 (Reversed Sicilian)
  'rnbqkbnr/pppppppp/8/8/2P5/8/PP1PPPPP/RNBQKBNR b KQkq - 0 1': 'e7e5',
  'rnbqkbnr/pppppppp/8/8/2P5/8/PP1PPPPP/RNBQKBNR b KQkq c3 0 1': 'e7e5',

  // 1. c4 e5 2. Nc3 -> 2...Nf6
  'rnbqkbnr/pppp1ppp/8/4p3/2P5/2N5/PP1PPPPP/R1BQKBNR b KQkq - 1 2': 'g8f6',

  // Opponent plays 1. Nf3 (Reti Opening) -> Black plays 1...d5
  'rnbqkbnr/pppppppp/8/8/8/5N2/PPPPPPPP/RNBQKB1R b KQkq - 0 1': 'd7d5',
  'rnbqkbnr/pppppppp/8/8/8/5N2/PPPPPPPP/RNBQKB1R b KQkq - 1 1': 'd7d5',

  // 1. Nf3 d5 2. g3 -> 2...Nf6
  'rnbqkbnr/ppp1pppp/8/3p4/8/5NP1/PPPPPP1P/RNBQKB1R b KQkq - 0 2': 'g8f6',

  // Opponent plays 1. f4 (Bird's Opening) -> 1...d5
  'rnbqkbnr/pppppppp/8/8/5P2/8/PPPPP1PP/RNBQKBNR b KQkq - 0 1': 'd7d5',

  // Opponent plays 1. b3 (Nimzo-Larsen) -> 1...e5
  'rnbqkbnr/pppppppp/8/8/8/1P6/P1PPPPPP/RNBQKBNR b KQkq - 0 1': 'e7e5'
};

export function getOpeningBookMove(fen: string): string | null {
  if (OPENING_BOOK[fen]) return OPENING_BOOK[fen];

  // Try matching position without move counters
  const parts = fen.split(' ');
  if (parts.length >= 4) {
    const key = `${parts[0]} ${parts[1]} ${parts[2]} ${parts[3]}`;
    for (const [bookFen, move] of Object.entries(OPENING_BOOK)) {
      const bParts = bookFen.split(' ');
      const bKey = `${bParts[0]} ${bParts[1]} ${bParts[2]} ${bParts[3]}`;
      if (key === bKey) {
        return move;
      }
    }
  }

  return null;
}
