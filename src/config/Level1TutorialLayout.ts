import { createNormalPiece, type Piece } from '@/config/PieceConfig';
import type { Point } from '@/systems/PathFinder';

export interface Level1TutorialCell {
  row: number;
  col: number;
  piece: Piece;
}

export interface Level1TutorialLayout {
  initialCells: readonly Level1TutorialCell[];
  nextPieces: readonly [Piece, Piece, Piece];
  nextLandingPositions: readonly [Point, Point, Point];
  source: Point;
  target: Point;
}

/**
 * 第 1 关教程棋盘：
 * - 红珠五连教学：从 (6,6) 移到 (4,6) 完成横排 4 列 2–6
 * - 盘面另有黄/蓝珠，消除五连后仍留在棋盘上（消除不落子规则）
 */
export const LEVEL1_TUTORIAL_LAYOUT: Level1TutorialLayout = {
  initialCells: [
    { row: 4, col: 2, piece: createNormalPiece(0) },
    { row: 4, col: 3, piece: createNormalPiece(0) },
    { row: 4, col: 4, piece: createNormalPiece(0) },
    { row: 4, col: 5, piece: createNormalPiece(0) },
    { row: 6, col: 6, piece: createNormalPiece(0) },
    { row: 2, col: 1, piece: createNormalPiece(1) },
    { row: 2, col: 7, piece: createNormalPiece(2) },
    { row: 3, col: 3, piece: createNormalPiece(2) },
    { row: 3, col: 6, piece: createNormalPiece(1) },
    { row: 5, col: 1, piece: createNormalPiece(1) },
    { row: 5, col: 7, piece: createNormalPiece(2) },
    { row: 6, col: 2, piece: createNormalPiece(2) },
    { row: 6, col: 0, piece: createNormalPiece(1) },
    { row: 7, col: 4, piece: createNormalPiece(1) },
    { row: 1, col: 5, piece: createNormalPiece(2) },
    { row: 7, col: 7, piece: createNormalPiece(2) },
  ],
  nextPieces: [
    createNormalPiece(1),
    createNormalPiece(2),
    createNormalPiece(1),
  ],
  nextLandingPositions: [
    { row: 0, col: 0 },
    { row: 0, col: 1 },
    { row: 0, col: 2 },
  ],
  source: { row: 6, col: 6 },
  target: { row: 4, col: 6 },
};
