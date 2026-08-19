/**
 * Grandmaster Opening Book for God Mode
 * Normalized FEN lookup mapping top opening positions to GM-proven moves.
 */

// Normalized FEN (piece placement + active turn + castling + ep) -> UCI best move
export const OPENING_BOOK: Record<string, string> = {
  // --- Move 1 ---
  // Initial starting position
  'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq -': 'e2e4',

  // Responses to 1. e4
  'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3': 'e7e5',
  
  // Responses to 1. d4
  'rnbqkbnr/pppppppp/8/8/3P4/8/PPP1PPPP/RNBQKBNR b KQkq d3': 'g8f6',

  // Responses to 1. c4 (English)
  'rnbqkbnr/pppppppp/8/8/2P5/8/PP1PPPPP/RNBQKBNR b KQkq c3': 'e7e5',

  // Responses to 1. Nf3 (Reti)
  'rnbqkbnr/pppppppp/8/8/8/5N2/PPPPPPPP/RNBQKB1R b KQkq -': 'd7d5',

  // --- Move 2: Open Games (1. e4 e5) ---
  'rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq e6': 'g1f3',
  'rnbqkbnr/pppp1ppp/8/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R b KQkq -': 'b8c6',

  // --- Move 3: Ruy Lopez & Italian ---
  'r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq -': 'f1b5', // 3. Bb5 (Ruy Lopez)
  'r1bqkbnr/1ppp1ppp/p1n5/1B2p3/4P3/5N2/PPPP1PPP/RNBQK2R w KQkq -': 'b5a4', // 4. Ba4 (Morphy Def)
  'r1bqkb1r/1ppp1ppp/p1n2n2/4p3/B3P3/5N2/PPPP1PPP/RNBQK2R w KQkq -': 'e1g1', // 5. O-O
  'r1bqkb1r/2pp1ppp/p1n2n2/1p2p3/B3P3/5N2/PPPP1PPP/RNBQ1RK1 w kq b6': 'a4b3', // 6. Bb3

  // Italian Game alternatives
  'r1bqk1nr/pppp1ppp/2n5/2b1p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq -': 'c2c3', // Giuoco Piano 4. c3
  'r1bqk2r/pppp1ppp/2n2n2/2b1p3/2BPP3/2P2N2/PP3PPP/RNBQK2R b KQkq -': 'e5d4', // 5. exd4
  'r1bqk2r/pppp1ppp/2n2n2/2b5/2BPP3/5N2/PP3PPP/RNBQK2R b KQkq -': 'c5b4', // 5... Bb4+

  // --- Sicilian Defense (1. e4 c5) ---
  'rnbqkbnr/pp1ppppp/8/2p5/4P3/8/PPPP1PPP/RNBQKBNR w KQkq c6': 'g1f3',
  'rnbqkbnr/pp1ppppp/8/2p5/4P3/5N2/PPPP1PPP/RNBQKB1R b KQkq -': 'd7d6',
  'rnbqkbnr/pp2pppp/3p4/2p5/3PP3/5N2/PPP2PPP/RNBQKB1R b KQkq d3': 'c5d4',
  'rnbqkbnr/pp2pppp/3p4/8/3NP3/8/PPP2PPP/RNBQKB1R b KQkq -': 'g8f6',
  'rnbqkb1r/pp2pppp/3p1n2/8/3NP3/2N5/PPP2PPP/RNBQKB1R b KQkq -': 'a7a6', // Najdorf 5... a6
  'rnbqkb1r/1p2pppp/p2p1n2/8/3NP3/2N1B3/PPP2PPP/R2QKB1R b KQkq -': 'e7e5', // English Attack response
  'rnbqkb1r/pp2pppp/5n2/2pp4/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq -': 'e4d5',

  // --- French Defense (1. e4 e6) ---
  'rnbqkbnr/pppp1ppp/4p3/8/4P3/8/PPPP1PPP/RNBQKBNR w KQkq -': 'd2d4',
  'rnbqkbnr/pppp1ppp/4p3/8/3PP3/8/PPP2PPP/RNBQKBNR b KQkq d3': 'd7d5',
  'rnbqkbnr/ppp2ppp/4p3/3p4/3PP3/8/PPP2PPP/RNBQKBNR w KQkq d6': 'b1c3', // 3. Nc3
  'rnbqk1nr/ppp2ppp/4p3/3p4/3PP3/2N5/PPP2PPP/R1BQKBNR b KQkq -': 'g8f6', // 3... Nf6
  'rnbqkb1r/ppp2ppp/4pn2/3pP3/3P4/2N5/PPP2PPP/R1BQKBNR b KQkq -': 'f6d7', // 4. e5 Nfd7

  // --- Caro-Kann Defense (1. e4 c6) ---
  'rnbqkbnr/pp1ppppp/2p5/8/4P3/8/PPPP1PPP/RNBQKBNR w KQkq -': 'd2d4',
  'rnbqkbnr/pp1ppppp/2p5/8/3PP3/8/PPP2PPP/RNBQKBNR b KQkq d3': 'd7d5',
  'rnbqkbnr/pp2pppp/2p5/3p4/3PP3/8/PPP2PPP/RNBQKBNR w KQkq d6': 'b1c3', // 3. Nc3
  'rnbqkbnr/pp2pppp/2p5/8/3PN3/8/PPP2PPP/R1BQKBNR b KQkq -': 'c8f5', // 4... Bf5

  // --- Queen's Gambit & 1. d4 d5 ---
  'rnbqkbnr/ppp1pppp/8/3p4/3P4/8/PPP1PPPP/RNBQKBNR w KQkq d6': 'c2c4', // 2. c4
  'rnbqkbnr/ppp1pppp/8/3p4/2PP4/8/PP2PPPP/RNBQKBNR b KQkq c3': 'e7e6', // 2... e6 (QGD)
  'rnbqkbnr/ppp2ppp/4p3/3p4/2PP4/2N5/PP2PPPP/R1BQKBNR b KQkq -': 'g8f6', // 3. Nc3 Nf6
  'rnbqkb1r/ppp2ppp/4pn2/3p4/2PP4/2N2N2/PP2PPPP/R1BQKB1R b KQkq -': 'f8e7', // 4. Nf3 Be7

  // Slav Defense
  'rnbqkbnr/pp2pppp/2p5/3p4/2PP4/5N2/PP2PPPP/RNBQKB1R b KQkq -': 'g8f6',
  'rnbqkb1r/pp2pppp/2p2n2/3p4/2PP4/2N2N2/PP2PPPP/R1BQKB1R b KQkq -': 'd5c4', // 4... dxc4

  // --- King's Indian & Grunfeld (1. d4 Nf6 2. c4 g6) ---
  'rnbqkb1r/pppppppp/5n2/8/3P4/8/PPP1PPPP/RNBQKBNR w KQkq -': 'c2c4',
  'rnbqkb1r/pppppppp/5n2/8/2PP4/8/PP2PPPP/RNBQKBNR b KQkq c3': 'g7g6',
  'rnbqkb1r/pppppp1p/5np1/8/2PP4/2N5/PP2PPPP/R1BQKBNR b KQkq -': 'f8g7', // 3... Bg7
  'rnbqk2r/ppppppbp/5np1/8/2PPP3/2N5/PP3PPP/R1BQKBNR b KQkq e3': 'd7d6', // 4. e4 d6
  'rnbqk2r/ppp1ppbp/3p1np1/8/2PPP3/2N2N2/PP3PPP/R1BQKB1R b KQkq -': 'e1g1', // 5... O-O

  // --- Nimzo-Indian (1. d4 Nf6 2. c4 e6 3. Nc3 Bb4) ---
  'rnbqkb1r/pppp1ppp/4pn2/8/2PP4/2N5/PP2PPPP/R1BQKBNR b KQkq -': 'f8b4',
  'rnbqk2r/pppp1ppp/4pn2/8/1bPP4/2N5/PP2PPPP/R1BQKBNR w KQkq -': 'e2e3', // Rubinstein 4. e3
  'rnbqk2r/pppp1ppp/4pn2/8/1bPP4/2N1P3/PP3PPP/R1BQKBNR b KQkq -': 'e8g8',

  // --- London System (1. d4 d5 2. Bf4) ---
  'rnbqkbnr/ppp1pppp/8/3p4/3P1B2/8/PPP1PPPP/RN1QKBNR b KQkq -': 'g8f6',
  'rnbqkb1r/ppp1pppp/5n2/3p4/3P1B2/4P3/PPP2PPP/RN1QKBNR b KQkq -': 'c7c5',
  'rnbqkb1r/pp2pppp/5n2/2pp4/3P1B2/2P1P3/PP3PPP/RN1QKBNR b KQkq -': 'b8c6',

  // --- Scandinavian (1. e4 d5) ---
  'rnbqkbnr/ppp1pppp/8/3p4/4P3/8/PPPP1PPP/RNBQKBNR w KQkq d6': 'e4d5',
  'rnb1kbnr/ppp1pppp/8/3q4/8/8/PPPP1PPP/RNBQKBNR w KQkq -': 'b1c3',
  'rnb1kbnr/ppp1pppp/8/8/8/2N5/PPPP1PPP/R1BQKBNR b KQkq -': 'd5a5'
};

/**
 * Looks up a Grandmaster book move for the given FEN
 */
export function getOpeningBookMove(fen: string): string | null {
  const parts = fen.trim().split(/\s+/);
  if (parts.length < 4) return null;
  const key = `${parts[0]} ${parts[1]} ${parts[2]} ${parts[3]}`;
  return OPENING_BOOK[key] || null;
}
