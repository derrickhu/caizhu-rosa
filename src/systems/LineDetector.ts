import { BOARD_SIZE, MIN_LINE_LENGTH } from '@/config/GameConfig';
import { getPieceColor, isLineParticipant, pieceMatchesColor, type CellValue } from '@/config/PieceConfig';
import type { Point } from './PathFinder';

const DIRECTIONS: [number, number][] = [
  [0, 1],   // horizontal
  [1, 0],   // vertical
  [1, 1],   // diagonal down-right
  [1, -1],  // diagonal down-left
];

function getCandidateColors(board: CellValue[][]): number[] {
  const colors = new Set<number>();
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      const color = getPieceColor(board[r][c]);
      if (color !== null) colors.add(color);
    }
  }
  return colors.size > 0 ? [...colors] : [0];
}

/**
 * Detect all lines of MIN_LINE_LENGTH+ same-color balls passing through
 * any of the given check positions. Wild balls match any color.
 * Returns the set of cells to eliminate.
 */
export function detectLines(
  board: CellValue[][],
  checkPositions: Point[],
): Point[] {
  const toRemove = new Set<string>();
  const candidateColors = getCandidateColors(board);

  for (const pos of checkPositions) {
    const piece = board[pos.row][pos.col];
    if (!isLineParticipant(piece)) continue;

    for (const [dr, dc] of DIRECTIONS) {
      for (const color of candidateColors) {
        if (!pieceMatchesColor(piece, color)) continue;
        const line: Point[] = [pos];

        for (let i = 1; i < BOARD_SIZE; i++) {
          const r = pos.row + dr * i;
          const c = pos.col + dc * i;
          if (r < 0 || r >= BOARD_SIZE || c < 0 || c >= BOARD_SIZE) break;
          if (!pieceMatchesColor(board[r][c], color)) break;
          line.push({ row: r, col: c });
        }

        for (let i = 1; i < BOARD_SIZE; i++) {
          const r = pos.row - dr * i;
          const c = pos.col - dc * i;
          if (r < 0 || r >= BOARD_SIZE || c < 0 || c >= BOARD_SIZE) break;
          if (!pieceMatchesColor(board[r][c], color)) break;
          line.push({ row: r, col: c });
        }

        if (line.length >= MIN_LINE_LENGTH) {
          for (const p of line) {
            toRemove.add(`${p.row},${p.col}`);
          }
        }
      }
    }
  }

  return Array.from(toRemove).map(key => {
    const [r, c] = key.split(',').map(Number);
    return { row: r, col: c };
  });
}

/**
 * Full board scan for lines (used after spawning new balls).
 */
export function detectAllLines(board: CellValue[][]): Point[] {
  const allPositions: Point[] = [];
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      if (isLineParticipant(board[r][c])) {
        allPositions.push({ row: r, col: c });
      }
    }
  }
  return detectLines(board, allPositions);
}
