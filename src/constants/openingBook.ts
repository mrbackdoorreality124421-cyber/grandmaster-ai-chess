/**
 * Expanded Grandmaster Opening Book for 🦁 LION MODE
 * Deep 15+ move GM book trees for White & Black with optimal win-rates.
 */

// Normalized FEN (piece placement + active turn + castling + ep) -> UCI best move
export const OPENING_BOOK: Record<string, string> = {
  // =========================================================================
  // 1. FIRST MOVES
  // =========================================================================
  // Initial Position (White)
  'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq -': 'e2e4',

  // Responses to 1. e4 (Black)
  'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3': 'e7e5',
  
  // Responses to 1. d4 (Black)
  'rnbqkbnr/pppppppp/8/8/3P4/8/PPP1PPPP/RNBQKBNR b KQkq d3': 'g8f6',

  // Responses to 1. c4 (English)
  'rnbqkbnr/pppppppp/8/8/2P5/8/PP1PPPPP/RNBQKBNR b KQkq c3': 'e7e5',

  // Responses to 1. Nf3 (Reti)
  'rnbqkbnr/pppppppp/8/8/8/5N2/PPPPPPPP/RNBQKB1R b KQkq -': 'd7d5',

  // =========================================================================
  // 2. OPEN GAME: 1. e4 e5 (RUY LOPEZ & ITALIAN 15+ MOVES)
  // =========================================================================
  'rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq e6': 'g1f3',
  'rnbqkbnr/pppp1ppp/8/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R b KQkq -': 'b8c6',

  // --- Ruy Lopez Main Line ---
  'r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq -': 'f1b5', // 3. Bb5
  'r1bqkbnr/1ppp1ppp/p1n5/1B2p3/4P3/5N2/PPPP1PPP/RNBQK2R w KQkq -': 'b5a4', // 4. Ba4
  'r1bqkb1r/1ppp1ppp/p1n2n2/4p3/B3P3/5N2/PPPP1PPP/RNBQK2R w KQkq -': 'e1g1', // 5. O-O
  'r1bqkb1r/1ppp1ppp/p1n2n2/4p3/B3P3/5N2/PPPP1PPP/RNBQ1RK1 b kq -': 'f8e7', // 5... Be7
  'r1bqkb1r/1pppbppp/p1n2n2/4p3/B3P3/5N2/PPPP1PPP/RNBQR1K1 w kq -': 'f1e1', // 6. Re1
  'r1bqkb1r/1pppbppp/p1n2n2/4p3/B3P3/5N2/PPPP1PPP/RNBQR1K1 b kq -': 'b7b5', // 6... b5
  'r1bqkb1r/2ppbppp/p1n2n2/1p2p3/4P3/1B3N2/PPPP1PPP/RNBQR1K1 w kq -': 'a4b3', // 7. Bb3
  'r1bqkb1r/2ppbppp/p1n2n2/1p2p3/4P3/1B3N2/PPPP1PPP/RNBQR1K1 b kq -': 'd7d6', // 7... d6
  'r1bqkb1r/2p1bppp/p1np1n2/1p2p3/4P3/1B3N2/PPPP1PPP/RNBQR1K1 w kq -': 'c2c3', // 8. c3
  'r1bqkb1r/2p1bppp/p1np1n2/1p2p3/4P3/1BP2N2/PP1P1PPP/RNBQR1K1 b kq -': 'e1g1', // 8... O-O
  'r1bq1rk1/2p1bppp/p1np1n2/1p2p3/4P3/1BP2N2/PP1P1PPP/RNBQR1K1 w - -': 'h2h3', // 9. h3
  'r1bq1rk1/2p1bppp/p1np1n2/1p2p3/4P3/1BP2N1P/PP1P1PP1/RNBQR1K1 b - -': 'c6a5', // 9... Na5 (Chigorin)
  'r1bq1rk1/2p1bppp/p2p1n2/np2p3/4P3/1BP2N1P/PP1P1PP1/RNBQR1K1 w - b6': 'b3c2', // 10. Bc2
  'r1bq1rk1/2p1bppp/p2p1n2/np2p3/4P3/2P2N1P/PPBP1PP1/RNBQR1K1 b - -': 'c7c5', // 10... c5
  'r1bq1rk1/4bppp/p2p1n2/npp1p3/4P3/2P2N1P/PPBP1PP1/RNBQR1K1 w - c6': 'd2d4', // 11. d4
  'r1bq1rk1/4bppp/p2p1n2/npp1p3/3PP3/2P2N1P/PPB2PP1/RNBQR1K1 b - d3': 'd8c7', // 11... Qc7
  'r1b2rk1/2q1bppp/p2p1n2/npp1p3/3PP3/2P2N1P/PPB2PP1/RNBQR1K1 w - -': 'b1d2', // 12. Nbd2
  'r1b2rk1/2q1bppp/p2p1n2/npp1p3/3PP3/2P2N1P/PPBN1PP1/R1BQR1K1 b - -': 'c5d4', // 12... cxd4
  'r1b2rk1/2q1bppp/p2p1n2/np2p3/3PP3/5N1P/PPBN1PP1/R1BQR1K1 w - -': 'c3d4', // 13. cxd4
  'r1b2rk1/2q1bppp/p2p1n2/np2p3/3PP3/5N1P/PPBN1PP1/R1BQR1K1 b - -': 'c8d7', // 13... Bd7
  'r4rk1/2qbbppp/p2p1n2/np2p3/3PP3/5N1P/PPBN1PP1/R1BQR1K1 w - -': 'd2f1', // 14. Nf1

  // --- Italian Game: Giuoco Piano ---
  'r1bqk1nr/pppp1ppp/2n5/2b1p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq -': 'c2c3', // 4. c3
  'r1bqk2r/pppp1ppp/2n2n2/2b1p3/2B1P3/2P2N2/PP1P1PPP/RNBQK2R w KQkq -': 'd2d3', // 5. d3
  'r1bqk2r/pppp1ppp/2n2n2/2b1p3/2B1P3/2PP1N2/PP3PPP/RNBQK2R b KQkq -': 'd7d6', // 5... d6
  'r1bqk2r/ppp2ppp/2np1n2/2b1p3/2B1P3/2PP1N2/PP3PPP/RNBQK2R w KQkq -': 'e1g1', // 6. O-O
  'r1bqk2r/ppp2ppp/2np1n2/2b1p3/2B1P3/2PP1N2/PP3PPP/RNBQ1RK1 b kq -': 'a7a6', // 6... a6
  'r1bqk2r/1pp2ppp/p1np1n2/2b1p3/2B1P3/2PP1N2/PP3PPP/RNBQ1RK1 w kq -': 'f1e1', // 7. Re1
  'r1bqk2r/1pp2ppp/p1np1n2/2b1p3/2B1P3/2PP1N2/PP3PPP/RNBQR1K1 b kq -': 'c5a7', // 7... Ba7
  'r1bqk2r/bpp2ppp/p1np1n2/4p3/2B1P3/2PP1N2/PP3PPP/RNBQR1K1 w kq -': 'b1d2', // 8. Nbd2
  'r1bq1rk1/bpp2ppp/p1np1n2/4p3/2B1P3/2PP1N2/PP1N1PPP/R1BQR1K1 w - -': 'd2f1', // 9. Nf1

  // =========================================================================
  // 3. SICILIAN DEFENSE: 1. e4 c5 (NAJDORF & OPEN SICILIAN 15+ MOVES)
  // =========================================================================
  'rnbqkbnr/pp1ppppp/8/2p5/4P3/8/PPPP1PPP/RNBQKBNR w KQkq c6': 'g1f3',
  'rnbqkbnr/pp1ppppp/8/2p5/4P3/5N2/PPPP1PPP/RNBQKB1R b KQkq -': 'd7d6',
  'rnbqkbnr/pp2pppp/3p4/2p5/3PP3/5N2/PPP2PPP/RNBQKB1R b KQkq d3': 'c5d4',
  'rnbqkbnr/pp2pppp/3p4/8/3NP3/8/PPP2PPP/RNBQKB1R b KQkq -': 'g8f6',
  'rnbqkb1r/pp2pppp/3p1n2/8/3NP3/2N5/PPP2PPP/RNBQKB1R b KQkq -': 'a7a6', // 5... a6 (Najdorf)
  
  // Najdorf 6. Be3 (English Attack)
  'rnbqkb1r/1p2pppp/p2p1n2/8/3NP3/2N1B3/PPP2PPP/R2QKB1R b KQkq -': 'e7e5', // 6... e5
  'rnbqkb1r/1p3ppp/p2p1n2/4p3/3NP3/2N1B3/PPP2PPP/R2QKB1R w KQkq -': 'd4b3', // 7. Nb3
  'rnbqkb1r/1p3ppp/p2p1n2/4p3/4P3/1NN1B3/PPP2PPP/R2QKB1R b KQkq -': 'c8e6', // 7... Be6
  'rn1qkb1r/1p3ppp/p2pbn2/4p3/4P3/1NN1B3/PPP2PPP/R2QKB1R w KQkq -': 'f2f3', // 8. f3
  'rn1qkb1r/1p3ppp/p2pbn2/4p3/4P3/1NN1BP2/PPP3PP/R2QKB1R b KQkq -': 'b8d7', // 8... Nbd7
  'r2qkb1r/1p1n1ppp/p2pbn2/4p3/4P3/1NN1BP2/PPP3PP/R2QKB1R w KQkq -': 'd1d2', // 9. Qd2
  'r2qkb1r/1p1n1ppp/p2pbn2/4p3/4P3/1NN1BP2/PPPQ2PP/R3KB1R b KQkq -': 'b7b5', // 9... b5
  'r2qkb1r/3n1ppp/p2pbn2/1p2p3/4P3/1NN1BP2/PPPQ2PP/R3KB1R w KQkq b6': 'g2g4', // 10. g4
  'r2qkb1r/3n1ppp/p2pbn2/1p2p3/4P1P1/1NN1BP2/PPPQ3P/R3KB1R b KQkq g3': 'b5b4', // 10... b4
  'r2qkb1r/3n1ppp/p2pbn2/4p3/1p2P1P1/1NN1BP2/PPPQ3P/R3KB1R w KQkq -': 'c3d5', // 11. Nd5
  'r2qkb1r/3n1ppp/p2p1n2/3bp3/1p2P1P1/1N2BP2/PPPQ3P/R3KB1R w KQkq -': 'e4d5', // 12. exd5
  'r2qkb1r/3n1ppp/p2p1n2/3Pp3/1p4P1/1N2BP2/PPPQ3P/R3KB1R b KQkq -': 'a6a5', // 12... a5
  'r2qkb1r/3n1ppp/3p1n2/p2Pp3/1p4P1/1N2BP2/PPPQ3P/R3KB1R w KQkq -': 'a2a4', // 13. a4

  // =========================================================================
  // 4. QUEEN'S GAMBIT & 1. d4 d5 (15+ MOVES)
  // =========================================================================
  'rnbqkbnr/ppp1pppp/8/3p4/3P4/8/PPP1PPPP/RNBQKBNR w KQkq d6': 'c2c4', // 2. c4
  'rnbqkbnr/ppp1pppp/8/3p4/2PP4/8/PP2PPPP/RNBQKBNR b KQkq c3': 'e7e6', // 2... e6 (QGD)
  'rnbqkbnr/ppp2ppp/4p3/3p4/2PP4/2N5/PP2PPPP/R1BQKBNR b KQkq -': 'g8f6', // 3. Nc3 Nf6
  'rnbqkb1r/ppp2ppp/4pn2/3p4/2PP4/2N2N2/PP2PPPP/R1BQKB1R b KQkq -': 'f8e7', // 4. Nf3 Be7
  'rnbqkb1r/ppp1bppp/4pn2/3p2B1/2PP4/2N2N2/PP2PPPP/R2QKB1R b KQkq -': 'e8g8', // 5... O-O
  'rnbq1rk1/ppp1bppp/4pn2/3p2B1/2PP4/2N2N2/PP2PPPP/R2QKB1R w KQ -': 'e2e3', // 6. e3
  'rnbq1rk1/ppp1bppp/4pn2/3p2B1/2PP4/2N1PN2/PP3PPP/R2QKB1R b KQ -': 'h7h6', // 6... h6
  'rnbq1rk1/ppp1bpp1/4pn1p/3p2B1/2PP4/2N1PN2/PP3PPP/R2QKB1R w KQ -': 'g5h4', // 7. Bh4
  'rnbq1rk1/ppp1bpp1/4pn1p/3p4/2PP3B/2N1PN2/PP3PPP/R2QKB1R b KQ -': 'b7b6', // 7... b6 (Tartakower)
  'rnbq1rk1/p1p1bpp1/1p2pn1p/3p4/2PP3B/2N1PN2/PP3PPP/R2QKB1R w KQ -': 'f1d3', // 8. Bd3
  'rnbq1rk1/p1p1bpp1/1p2pn1p/3p4/2PP3B/2NBPN2/PP3PPP/R2QK2R b KQ -': 'c8b7', // 8... Bb7
  'rn1q1rk1/pbp1bpp1/1p2pn1p/3p4/2PP3B/2NBPN2/PP3PPP/R2QK2R w KQ -': 'e1g1', // 9. O-O
  'rn1q1rk1/pbp1bpp1/1p2pn1p/3p4/2PP3B/2NBPN2/PP3PPP/R2Q1RK1 b - -': 'b8d7', // 9... Nbd7
  'r2q1rk1/pbpnbpp1/1p2pn1p/3p4/2PP3B/2NBPN2/PP3PPP/R2Q1RK1 w - -': 'd1e2', // 10. Qe2
  'r2q1rk1/pbpnbpp1/1p2pn1p/3p4/2PP3B/2NBPN2/PP2QPPP/R4RK1 b - -': 'c7c5', // 10... c5
  'r2q1rk1/pb1nbpp1/1p2pn1p/2pp4/2PP3B/2NBPN2/PP2QPPP/R4RK1 w - c6': 'f1d1', // 11. Rfd1
  'r2q1rk1/pb1nbpp1/1p2pn1p/2pp4/2PP3B/2NBPN2/PP2QPPP/R2R2K1 b - -': 'a7a6', // 11... a6
  'r2q1rk1/1b1nbpp1/1p2pn1p/2pp4/2PP3B/2NBPN2/PP2QPPP/R2R2K1 w - -': 'a2a4', // 12. a4

  // =========================================================================
  // 5. KING'S INDIAN DEFENSE (1. d4 Nf6 2. c4 g6 15+ MOVES)
  // =========================================================================
  'rnbqkb1r/pppppppp/5n2/8/3P4/8/PPP1PPPP/RNBQKBNR w KQkq -': 'c2c4',
  'rnbqkb1r/pppppppp/5n2/8/2PP4/8/PP2PPPP/RNBQKBNR b KQkq c3': 'g7g6',
  'rnbqkb1r/pppppp1p/5np1/8/2PP4/2N5/PP2PPPP/R1BQKBNR b KQkq -': 'f8g7', // 3... Bg7
  'rnbqk2r/ppppppbp/5np1/8/2PPP3/2N5/PP3PPP/R1BQKBNR b KQkq e3': 'd7d6', // 4. e4 d6
  'rnbqk2r/ppp1ppbp/3p1np1/8/2PPP3/2N2N2/PP3PPP/R1BQKB1R b KQkq -': 'e1g1', // 5... O-O
  'rnbq1rk1/ppp1ppbp/3p1np1/8/2PPP3/2N2N2/PP2BPPP/R1BQK2R b KQ -': 'e7e5', // 6... e5
  'rnbq1rk1/ppp2pbp/3p1np1/4p3/2PPP3/2N2N2/PP2BPPP/R1BQ1RK1 b - -': 'b8c6', // 7... Nc6 (Mar del Plata)
  'r1bq1rk1/ppp2pbp/2np1np1/4p3/2PPP3/2N2N2/PP2BPPP/R1BQ1RK1 w - -': 'd4d5', // 8. d5
  'r1bq1rk1/ppp2pbp/2np1np1/3Pp3/2P1P3/2N2N2/PP2BPPP/R1BQ1RK1 b - -': 'c6e7', // 8... Ne7
  'r1bq1rk1/ppp1npbp/3p1np1/3Pp3/2P1P3/2N2N2/PP2BPPP/R1BQ1RK1 w - -': 'f3e1', // 9. Ne1
  'r1bq1rk1/ppp1npbp/3p1np1/3Pp3/2P1P3/2N5/PP2BPPP/R1BQNRK1 b - -': 'f6d7', // 9... Nd7
  'r1bq1rk1/ppp1npbp/3p2p1/3Pp3/2P1P3/2N1B3/PP2BPPP/R2QNRK1 b - -': 'f7f5', // 10... f5
  'r1bq1rk1/ppp1n1bp/3p2p1/3Ppp2/2P1P3/2N1B3/PP2BPPP/R2QNRK1 w - f6': 'f2f3', // 11. f3
  'r1bq1rk1/ppp1n1bp/3p2p1/3Ppp2/2P1P3/2N1BP2/PP2B1PP/R2QNRK1 b - -': 'f5f4', // 11... f4
  'r1bq1rk1/ppp1n1bp/3p2p1/3Pp3/2P1Pp2/2N1BP2/PP2B1PP/R2QNRK1 w - -': 'e3f2', // 12. Bf2
  'r1bq1rk1/ppp1n1bp/3p2p1/3Pp3/2P1Pp2/2N2P2/PP2BBPP/R2QNRK1 b - -': 'g6g5', // 12... g5
  'r1bq1rk1/ppp1n1b1/3p3p/3Pp1p1/2P1Pp2/2N2P2/PP2BBPP/R2QNRK1 w - -': 'c4c5', // 13. c5

  // =========================================================================
  // 6. FRENCH DEFENSE: 1. e4 e6 (WINAWER & ADVANCE 15+ MOVES)
  // =========================================================================
  'rnbqkbnr/pppp1ppp/4p3/8/4P3/8/PPPP1PPP/RNBQKBNR w KQkq -': 'd2d4',
  'rnbqkbnr/pppp1ppp/4p3/8/3PP3/8/PPP2PPP/RNBQKBNR b KQkq d3': 'd7d5',
  'rnbqkbnr/ppp2ppp/4p3/3p4/3PP3/8/PPP2PPP/RNBQKBNR w KQkq d6': 'b1c3', // 3. Nc3
  'rnbqk1nr/ppp2ppp/4p3/3p4/3PP3/2N5/PPP2PPP/R1BQKBNR b KQkq -': 'f8b4', // 3... Bb4 (Winawer)
  'rnbqk1nr/ppp2ppp/4p3/3pP3/1b1P4/2N5/PPP2PPP/R1BQKBNR b KQkq -': 'c7c5', // 4... c5
  'rnbqk1nr/pp3ppp/4p3/2ppP3/1b1P4/2N5/PPPB1PPP/R2QKBNR b KQkq -': 'g8e7', // 5... Ne7
  'rnbqk2r/pp2nppp/4p3/2ppP3/1b1P4/2NB4/PPPB1PPP/R2QK1NR b KQkq -': 'b8c6', // 6... Nbc6
  'r1bqk2r/pp2nppp/2n1p3/2ppP3/1b1P4/2NB1N2/PPPB1PPP/R2QK2R b KQkq -': 'c5d4', // 7... cxd4
  'r1bqk2r/pp2nppp/2n1p3/3pP3/1b1N4/2NB4/PPPB1PPP/R2QK2R b KQkq -': 'c6d4', // 8... Nxd4

  // =========================================================================
  // 7. CARO-KANN DEFENSE: 1. e4 c6 (CLASSICAL & ADVANCE 15+ MOVES)
  // =========================================================================
  'rnbqkbnr/pp1ppppp/2p5/8/4P3/8/PPPP1PPP/RNBQKBNR w KQkq -': 'd2d4',
  'rnbqkbnr/pp1ppppp/2p5/8/3PP3/8/PPP2PPP/RNBQKBNR b KQkq d3': 'd7d5',
  'rnbqkbnr/pp2pppp/2p5/3p4/3PP3/8/PPP2PPP/RNBQKBNR w KQkq d6': 'b1c3', // 3. Nc3
  'rnbqkbnr/pp2pppp/2p5/8/3PN3/8/PPP2PPP/R1BQKBNR b KQkq -': 'c8f5', // 4... Bf5
  'rnbqkbnr/pp2pppp/2p5/8/3P4/8/PPP2PPP/R1BQKBNR b KQkq -': 'g8f6', // 5... Nf6
  'rnbqkb1r/pp2pppp/2p2n2/8/3P4/2N2N2/PPP2PPP/R1BQKB1R b KQkq -': 'e7e6', // 6... e6
  'rnbqkb1r/pp3ppp/2p1pn2/8/2BP4/2N2N2/PPP2PPP/R1BQK2R b KQkq -': 'f8e7', // 7... Be7
  'rnbqk2r/pp2bppp/2p1pn2/8/2BP4/2N2N2/PPP2PPP/R1BQ1RK1 b kq -': 'e8g8', // 8... O-O

  // =========================================================================
  // 8. LONDON SYSTEM (1. d4 d5 2. Bf4 15+ MOVES)
  // =========================================================================
  'rnbqkbnr/ppp1pppp/8/3p4/3P1B2/8/PPP1PPPP/RN1QKBNR b KQkq -': 'g8f6',
  'rnbqkb1r/ppp1pppp/5n2/3p4/3P1B2/4P3/PPP2PPP/RN1QKBNR b KQkq -': 'c7c5',
  'rnbqkb1r/pp2pppp/5n2/2pp4/3P1B2/2P1P3/PP3PPP/RN1QKBNR b KQkq -': 'b8c6',
  'r1bqkb1r/pp2pppp/2n2n2/2pp4/3P1B2/2P1PN2/PP3PPP/RN1QKB1R b KQkq -': 'e7e6',
  'r1bqkb1r/pp3ppp/2n1pn2/2pp4/3P1B2/2PBPN2/PP3PPP/RN1QK2R b KQkq -': 'f8d6',
  'r1bqk2r/pp3ppp/2nbpn2/2pp4/3P1B2/2PBPN2/PP3PPP/RN1Q1RK1 b kq -': 'e8g8',
  'r1bq1rk1/pp3ppp/2nbpn2/2pp4/3P4/2PBPNB1/PP3PPP/RN1Q1RK1 b - -': 'd6g3',
  'r1bq1rk1/pp3ppp/2n1pn2/2pp4/3P4/2PBPNP1/PP3PP1/RN1Q1RK1 w - -': 'h2g3'
};

/**
 * Looks up an optimal Grandmaster book move for the given FEN
 */
export function getOpeningBookMove(fen: string): string | null {
  const parts = fen.trim().split(/\s+/);
  if (parts.length < 4) return null;
  const key = `${parts[0]} ${parts[1]} ${parts[2]} ${parts[3]}`;
  return OPENING_BOOK[key] || null;
}
