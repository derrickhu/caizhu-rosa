import { BOARD_SIZE, MIN_LINE_LENGTH } from '@/config/GameConfig';
import { WILD_BALL } from '@/config/PropConfig';
import type { Point } from './PathFinder';

const DIRECTIONS: [number, number][] = [
  [0, 1],   // horizontal
  [1, 0],   // vertical
  [1, 1],   // diagonal down-right
  [1, -1],  // diagonal down-left
];

/**
 * Check if two cell values match for line detection purposes.
 * Wild balls (WILD_BALL) match any non-null color.
 */
function colorsMatch(a: number | null, b: number | null): boolean {
  if (a === null || b === null) return false;
  if (a === b) return true;
  if (a === WILD_BALL || b === WILD_BALL) return true;
  return false;
}

/**
 * Get the "effective color" of a line containing wild balls.
 * Returns the first non-wild color found, or WILD_BALL if all are wild.
 */
function getLineColor(board: (number | null)[][], line: Point[]): number {
  for (const p of line) {
    const v = board[p.row][p.col];
    if (v !== null && v !== WILD_BALL) return v;
  }
  return WILD_BALL;
}

/**
 * Detect all lines of MIN_LINE_LENGTH+ same-color balls passing through
 * any of the given check positions. Wild balls match any color.
 * Returns the set of cells to eliminate.
 */
export function detectLines(
  board: (number | null)[][],
  checkPositions: Point[],
): Point[] {
  const toRemove = new Set<string>();

  for (const pos of checkPositions) {
    const cellVal = board[pos.row][pos.col];
    if (cellVal === null) continue;

    for (const [dr, dc] of DIRECTIONS) {
      const line: Point[] = [pos];

      // Extend in positive direction
      for (let i = 1; i < BOARD_SIZE; i++) {
        const r = pos.row + dr * i;
        const c = pos.col + dc * i;
        if (r < 0 || r >= BOARD_SIZE || c < 0 || c >= BOARD_SIZE) break;
        if (!colorsMatch(cellVal, board[r][c])) break;
        line.push({ row: r, col: c });
      }

      // Extend in negative direction
      for (let i = 1; i < BOARD_SIZE; i++) {
        const r = pos.row - dr * i;
        const c = pos.col - dc * i;
        if (r < 0 || r >= BOARD_SIZE || c < 0 || c >= BOARD_SIZE) break;
        if (!colorsMatch(cellVal, board[r][c])) break;
        line.push({ row: r, col: c });
      }

      if (line.length >= MIN_LINE_LENGTH) {
        // For a line involving wild balls, verify the line is valid:
        // it must have a consistent non-wild color (or be all-wild which is ok)
        const lineColor = getLineColor(board, line);
        // Re-validate: each non-wild ball must match lineColor
        let valid = true;
        if (lineColor !== WILD_BALL) {
          for (const p of line) {
            const v = board[p.row][p.col];
            if (v !== null && v !== WILD_BALL && v !== lineColor) {
              valid = false;
              break;
            }
          }
        }

        if (valid) {
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
export function detectAllLines(board: (number | null)[][]): Point[] {
  const allPositions: Point[] = [];
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      if (board[r][c] !== null) {
        allPositions.push({ row: r, col: c });
      }
    }
  }
  return detectLines(board, allPositions);
}
