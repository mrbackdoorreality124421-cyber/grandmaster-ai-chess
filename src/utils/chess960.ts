/**
 * Generates a valid Fischer Random / Chess960 starting FEN
 * Rules:
 * - Bishops must be on opposite-colored squares (one on light, one on dark).
 * - The King must be somewhere between the two Rooks.
 * - Black's back rank mirrors White's back rank.
 * Note: Standard chess.js does not support 960 castling geometry, so castling rights are set to '-'.
 */
export function generateChess960FEN(): string {
  const pieces = new Array(8).fill('');

  // 1. Place Light-squared Bishop (ranks 0, 2, 4, 6)
  const lightSquares = [0, 2, 4, 6];
  const lightBishopPos = lightSquares[Math.floor(Math.random() * lightSquares.length)];
  pieces[lightBishopPos] = 'B';

  // 2. Place Dark-squared Bishop (ranks 1, 3, 5, 7)
  const darkSquares = [1, 3, 5, 7];
  const darkBishopPos = darkSquares[Math.floor(Math.random() * darkSquares.length)];
  pieces[darkBishopPos] = 'B';

  // Helper to get remaining empty indices
  const getEmptyIndices = () => {
    const empty: number[] = [];
    for (let i = 0; i < 8; i++) {
      if (!pieces[i]) empty.push(i);
    }
    return empty;
  };

  // 3. Place Queen on one of remaining empty squares
  let empty = getEmptyIndices();
  const queenPos = empty[Math.floor(Math.random() * empty.length)];
  pieces[queenPos] = 'Q';

  // 4. Place two Knights on remaining empty squares
  empty = getEmptyIndices();
  const knight1Idx = Math.floor(Math.random() * empty.length);
  pieces[empty[knight1Idx]] = 'N';
  empty.splice(knight1Idx, 1);

  const knight2Idx = Math.floor(Math.random() * empty.length);
  pieces[empty[knight2Idx]] = 'N';
  empty.splice(knight2Idx, 1);

  // 5. The remaining 3 empty squares MUST be Rook, King, Rook in that exact order
  empty = getEmptyIndices(); // Exactly 3 squares left, sorted ascending
  pieces[empty[0]] = 'R';
  pieces[empty[1]] = 'K';
  pieces[empty[2]] = 'R';

  // Generate White Rank string
  const whiteRank = pieces.join('');
  // Black rank is lower-case mirror
  const blackRank = pieces.map((p) => p.toLowerCase()).join('');

  return `${blackRank}/pppppppp/8/8/8/8/PPPPPPPP/${whiteRank} w - - 0 1`;
}
