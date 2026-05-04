import { BOARD_SIZE } from '@/config/GameConfig';
import type { CellValue } from '@/config/PieceConfig';

export interface Point { row: number; col: number; }

const DIRS = [[-1, 0], [1, 0], [0, -1], [0, 1]]; // up, down, left, right

/**
 * BFS pathfinding on a 9x9 grid.
 * Returns the path from start to end (inclusive), or null if unreachable.
 * Only horizontal/vertical moves through empty cells are allowed.
 */
export function findPath(
  board: CellValue[][],
  start: Point,
  end: Point,
): Point[] | null {
  if (start.row === end.row && start.col === end.col) return [start];
  if (board[end.row][end.col] !== null) return null;

  const visited: boolean[][] = Array.from({ length: BOARD_SIZE }, () =>
    Array(BOARD_SIZE).fill(false)
  );
  const parent: (Point | null)[][] = Array.from({ length: BOARD_SIZE }, () =>
    Array(BOARD_SIZE).fill(null)
  );

  const queue: Point[] = [start];
  visited[start.row][start.col] = true;

  while (queue.length > 0) {
    const current = queue.shift()!;

    for (const [dr, dc] of DIRS) {
      const nr = current.row + dr;
      const nc = current.col + dc;

      if (nr < 0 || nr >= BOARD_SIZE || nc < 0 || nc >= BOARD_SIZE) continue;
      if (visited[nr][nc]) continue;
      if (board[nr][nc] !== null && !(nr === end.row && nc === end.col)) continue;
      // Allow moving through start position (it has a ball but we're moving it)
      if (board[nr][nc] !== null && nr !== end.row && nc !== end.col) continue;

      visited[nr][nc] = true;
      parent[nr][nc] = current;

      if (nr === end.row && nc === end.col) {
        // Reconstruct path
        const path: Point[] = [];
        let p: Point | null = { row: nr, col: nc };
        while (p !== null) {
          path.unshift(p);
          if (p.row === start.row && p.col === start.col) break;
          p = parent[p.row][p.col];
        }
        return path;
      }

      queue.push({ row: nr, col: nc });
    }
  }

  return null;
}
