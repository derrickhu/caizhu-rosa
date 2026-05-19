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
 * First level tutorial board:
 * move the red ball from (6, 6) to (4, 6), completing row 4 columns 2-6.
 */
export const LEVEL1_TUTORIAL_LAYOUT: Level1TutorialLayout = {
  initialCells: [
    { row: 4, col: 2, piece: createNormalPiece(0) },
    { row: 4, col: 3, piece: createNormalPiece(0) },
    { row: 4, col: 4, piece: createNormalPiece(0) },
    { row: 4, col: 5, piece: createNormalPiece(0) },
    { row: 6, col: 6, piece: createNormalPiece(0) },
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
