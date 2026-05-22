import {
  createNormalPiece,
  type Piece,
} from '@/config/PieceConfig';
import type { Point } from '@/systems/PathFinder';

export interface DesignedLevelLayout {
  initialCells: readonly { row: number; col: number; piece: Piece }[];
  nextPieces: readonly Piece[];
  nextLandingPositions?: readonly Point[];
}

const n = (color: number): Piece => createNormalPiece(color);
const wild = (): Piece => ({ kind: 'wild' });
const bomb = (color: number): Piece => ({ kind: 'bomb', color });
const frozen = (color: number): Piece => ({ kind: 'frozen', color, layers: 1 });
const chain = (color: number): Piece => ({ kind: 'chain', color, layers: 1 });
const block = (): Piece => ({ kind: 'block', layers: 1 });

function cell(row: number, col: number, piece: Piece): { row: number; col: number; piece: Piece } {
  return { row, col, piece };
}

function layout(
  initialCells: readonly { row: number; col: number; piece: Piece }[],
  nextPieces: readonly Piece[],
  nextLandingPositions?: readonly Point[],
): DesignedLevelLayout {
  return { initialCells, nextPieces, nextLandingPositions };
}

export const LEVEL_LAYOUTS: Record<string, DesignedLevelLayout> = {
  level_01: layout([
    cell(4, 2, n(0)), cell(4, 3, n(0)), cell(4, 4, n(0)), cell(4, 5, n(0)),
    cell(6, 6, n(0)),
    cell(2, 1, n(1)), cell(2, 7, n(2)), cell(3, 3, n(2)), cell(3, 6, n(1)),
    cell(5, 1, n(1)), cell(5, 7, n(2)), cell(6, 2, n(2)), cell(6, 0, n(1)),
    cell(7, 4, n(1)), cell(1, 5, n(2)), cell(7, 7, n(2)),
  ], [n(1), n(2), n(1)]),

  level_02: layout([
    cell(2, 2, n(0)), cell(2, 3, n(0)), cell(2, 4, n(0)), cell(4, 6, n(0)),
    cell(6, 1, n(1)), cell(6, 2, n(1)), cell(6, 4, n(1)), cell(7, 7, n(2)),
  ], [n(0), n(1), n(2)]),

  level_03: layout([
    cell(1, 1, n(2)), cell(1, 2, n(2)), cell(1, 3, n(2)), cell(1, 5, n(2)),
    cell(5, 2, n(0)), cell(5, 3, n(0)), cell(5, 5, n(0)), cell(6, 5, n(0)),
    cell(7, 7, n(3)),
  ], [n(2), n(0), n(4)]),

  level_04: layout([
    cell(3, 1, n(1)), cell(3, 2, n(1)), cell(3, 4, n(1)), cell(3, 5, n(1)),
    cell(1, 4, n(2)), cell(2, 4, n(2)), cell(4, 4, n(2)), cell(5, 4, n(2)),
    cell(7, 1, n(3)), cell(7, 7, n(4)),
  ], [n(1), n(2), n(5)]),

  level_05: layout([
    cell(2, 1, n(3)), cell(2, 2, n(3)), cell(2, 3, n(3)), cell(2, 5, n(3)),
    cell(5, 5, n(4)), cell(6, 5, n(4)), cell(7, 5, n(4)), cell(4, 5, n(4)),
    cell(6, 1, n(0)), cell(6, 2, n(0)), cell(6, 4, n(0)),
  ], [n(3), n(4), n(0)]),

  level_06: layout([
    cell(4, 1, n(0)), cell(4, 2, n(0)), cell(4, 3, n(0)), cell(4, 5, n(0)),
    cell(6, 3, wild()), cell(2, 6, n(1)), cell(3, 6, n(1)), cell(5, 6, n(1)),
  ], [wild(), n(0), n(1)]),

  level_07: layout([
    cell(3, 1, n(2)), cell(3, 2, n(2)), cell(3, 3, bomb(2)), cell(3, 5, n(2)),
    cell(6, 1, n(4)), cell(6, 2, n(4)), cell(6, 4, n(4)), cell(7, 7, n(0)),
  ], [n(2), n(4), n(5)]),

  level_08: layout([
    cell(4, 1, n(1)), cell(4, 2, n(1)), cell(4, 3, frozen(1)), cell(4, 5, n(1)),
    cell(2, 5, n(1)), cell(6, 2, n(3)), cell(6, 3, n(3)), cell(6, 5, n(3)),
  ], [n(1), n(3), n(1)]),

  level_09: layout([
    cell(2, 2, n(5)), cell(2, 3, n(5)), cell(2, 4, chain(5)), cell(2, 6, n(5)),
    cell(5, 1, n(0)), cell(5, 2, n(0)), cell(5, 4, n(0)), cell(7, 5, n(2)),
  ], [n(5), n(0), n(5)]),

  level_10: layout([
    cell(3, 3, block()), cell(3, 4, block()), cell(4, 3, block()),
    cell(4, 4, bomb(0)), cell(4, 5, n(0)), cell(4, 6, n(0)), cell(4, 7, n(0)),
    cell(6, 2, n(1)), cell(6, 3, n(1)), cell(6, 5, n(1)),
  ], [n(0), n(1), bomb(0)]),

  level_11: layout([
    cell(2, 1, n(2)), cell(2, 2, n(2)), cell(2, 3, bomb(2)), cell(2, 5, n(2)),
    cell(5, 3, wild()), cell(6, 3, n(4)), cell(6, 4, n(4)), cell(6, 6, n(4)),
    cell(7, 1, block()),
  ], [wild(), n(2), n(4)]),

  level_12: layout([
    cell(1, 2, n(3)), cell(2, 2, frozen(3)), cell(3, 2, n(3)), cell(5, 2, n(3)),
    cell(5, 5, n(1)), cell(5, 6, frozen(1)), cell(5, 7, n(1)), cell(7, 7, n(1)),
    cell(3, 6, bomb(3)),
  ], [n(3), n(1), wild()]),

  level_13: layout([
    cell(3, 1, n(4)), cell(3, 2, chain(4)), cell(3, 3, bomb(4)), cell(3, 5, n(4)),
    cell(1, 6, n(0)), cell(2, 6, n(0)), cell(4, 6, chain(0)), cell(5, 6, n(0)),
    cell(7, 2, block()), cell(7, 3, block()),
  ], [n(4), n(0), bomb(4)]),

  level_14: layout([
    cell(3, 3, block()), cell(3, 4, block()), cell(4, 3, block()), cell(5, 3, block()),
    cell(2, 2, n(2)), cell(2, 3, n(2)), cell(2, 5, n(2)), cell(2, 6, n(2)),
    cell(5, 5, bomb(2)), cell(6, 6, n(5)), cell(6, 7, n(5)), cell(7, 6, n(5)),
  ], [n(2), n(5), wild()]),

  level_15: layout([
    cell(1, 1, n(0)), cell(1, 2, n(0)), cell(1, 4, frozen(0)), cell(1, 5, n(0)),
    cell(3, 2, chain(3)), cell(3, 3, n(3)), cell(3, 4, n(3)), cell(3, 6, n(3)),
    cell(5, 4, block()), cell(5, 5, block()), cell(6, 5, bomb(3)),
    cell(7, 1, n(5)), cell(7, 2, n(5)), cell(7, 4, n(5)),
  ], [n(0), n(3), n(5)]),

  level_16: layout([
    cell(2, 4, block()), cell(3, 4, block()), cell(4, 4, block()), cell(5, 4, block()),
    cell(2, 1, n(1)), cell(2, 2, n(1)), cell(2, 3, n(1)), cell(2, 6, n(1)),
    cell(6, 5, bomb(1)), cell(6, 6, n(4)), cell(6, 7, n(4)), cell(7, 6, n(4)),
  ], [n(1), n(4), wild()]),

  level_17: layout([
    cell(3, 1, n(2)), cell(3, 2, n(2)), cell(3, 3, bomb(2)), cell(3, 5, n(2)),
    cell(4, 5, bomb(5)), cell(5, 5, n(5)), cell(6, 5, n(5)), cell(7, 5, n(5)),
    cell(2, 6, block()), cell(5, 2, chain(2)),
  ], [n(2), n(5), bomb(2)]),

  level_18: layout([
    cell(1, 1, n(0)), cell(1, 2, frozen(0)), cell(1, 3, n(0)), cell(1, 5, chain(0)), cell(1, 6, n(0)),
    cell(4, 2, n(6)), cell(4, 3, chain(6)), cell(4, 4, frozen(6)), cell(4, 6, n(6)),
    cell(6, 6, bomb(0)), cell(7, 2, block()), cell(7, 3, block()),
  ], [n(0), n(6), wild()]),

  level_19: layout([
    cell(1, 1, n(1)), cell(1, 2, n(1)), cell(2, 1, n(1)), cell(2, 2, n(1)),
    cell(1, 7, n(3)), cell(2, 7, n(3)), cell(2, 6, n(3)),
    cell(6, 1, n(5)), cell(7, 1, n(5)), cell(7, 2, n(5)),
    cell(6, 7, n(0)), cell(7, 7, n(0)), cell(7, 6, n(0)),
    cell(4, 4, block()), cell(4, 5, bomb(1)),
  ], [n(1), n(3), n(5)]),

  level_20: layout([
    cell(3, 3, block()), cell(3, 4, block()), cell(3, 5, block()),
    cell(4, 3, block()), cell(4, 5, block()), cell(5, 3, block()), cell(5, 4, block()),
    cell(4, 4, bomb(2)), cell(2, 4, n(2)), cell(6, 4, n(2)), cell(4, 2, n(2)), cell(4, 6, n(2)),
    cell(1, 1, n(4)), cell(1, 2, n(4)), cell(1, 4, n(4)),
  ], [n(2), n(4), bomb(2)]),

  level_21: layout([
    cell(2, 1, n(0)), cell(2, 2, n(0)), cell(2, 4, n(0)), cell(2, 6, n(0)),
    cell(4, 2, n(2)), cell(4, 3, n(2)), cell(4, 5, n(2)), cell(4, 7, n(2)),
    cell(6, 1, n(3)), cell(6, 3, n(3)), cell(6, 4, n(3)), cell(6, 6, n(3)),
    cell(3, 6, frozen(2)), cell(7, 7, chain(3)),
  ], [n(0), n(2), n(3)]),

  level_22: layout([
    cell(2, 3, block()), cell(2, 4, block()), cell(3, 3, block()), cell(4, 3, block()),
    cell(4, 4, bomb(5)), cell(4, 5, n(5)), cell(4, 6, n(5)), cell(4, 7, n(5)),
    cell(6, 2, n(1)), cell(6, 3, n(1)), cell(6, 5, n(1)), cell(7, 5, n(1)),
    cell(1, 6, chain(5)), cell(7, 1, frozen(1)),
  ], [n(5), n(1), bomb(5)]),

  level_23: layout([
    cell(1, 1, n(4)), cell(1, 2, frozen(4)), cell(1, 3, frozen(4)), cell(1, 5, n(4)), cell(1, 6, n(4)),
    cell(4, 2, n(0)), cell(4, 3, frozen(0)), cell(4, 4, frozen(0)), cell(4, 6, n(0)),
    cell(6, 5, bomb(4)), cell(7, 6, chain(0)), cell(3, 7, block()), cell(4, 7, block()),
  ], [n(4), n(0), wild()]),

  level_24: layout([
    cell(1, 1, n(1)), cell(1, 2, n(1)), cell(2, 1, n(1)), cell(2, 3, n(1)),
    cell(1, 7, n(2)), cell(2, 7, n(2)), cell(3, 7, n(2)), cell(2, 5, n(2)),
    cell(6, 1, n(3)), cell(7, 1, n(3)), cell(7, 2, n(3)), cell(5, 2, n(3)),
    cell(6, 7, n(5)), cell(7, 7, n(5)), cell(7, 6, n(5)), cell(5, 6, n(5)),
    cell(4, 4, bomb(1)), cell(4, 5, block()), cell(3, 4, chain(2)),
  ], [n(1), n(2), n(3)]),

  level_25: layout([
    cell(1, 1, bomb(0)), cell(1, 2, n(0)), cell(1, 3, n(0)), cell(1, 5, n(0)),
    cell(3, 1, frozen(2)), cell(3, 2, n(2)), cell(3, 3, frozen(2)), cell(3, 5, n(2)),
    cell(5, 1, chain(4)), cell(5, 2, n(4)), cell(5, 3, chain(4)), cell(5, 5, n(4)),
    cell(6, 6, block()), cell(6, 7, block()), cell(7, 6, bomb(6)), cell(7, 7, n(6)),
    cell(4, 4, wild()),
  ], [n(0), n(2), n(4)]),

  level_26: layout([
    cell(1, 1, n(0)), cell(1, 2, n(0)), cell(1, 4, n(0)), cell(1, 6, n(0)),
    cell(3, 1, n(2)), cell(3, 2, n(2)), cell(3, 4, n(2)), cell(3, 6, n(2)),
    cell(5, 1, n(4)), cell(5, 3, n(4)), cell(5, 4, n(4)), cell(5, 6, n(4)),
    cell(7, 2, n(6)), cell(7, 3, n(6)), cell(7, 5, n(6)), cell(7, 7, n(6)),
    cell(4, 4, wild()), cell(2, 7, chain(0)),
  ], [n(0), n(2), n(4)]),

  level_27: layout([
    cell(2, 2, bomb(1)), cell(2, 3, n(1)), cell(2, 4, n(1)), cell(2, 6, n(1)),
    cell(6, 6, bomb(5)), cell(6, 5, n(5)), cell(6, 4, n(5)), cell(6, 2, n(5)),
    cell(3, 4, block()), cell(4, 4, block()), cell(5, 4, block()),
    cell(4, 2, n(3)), cell(4, 3, n(3)), cell(4, 5, n(3)), cell(4, 6, n(3)),
    cell(1, 7, frozen(1)), cell(7, 1, chain(5)),
  ], [n(1), n(5), n(3)]),

  level_28: layout([
    cell(2, 1, n(2)), cell(2, 2, frozen(2)), cell(2, 3, chain(2)), cell(2, 4, frozen(2)), cell(2, 6, n(2)),
    cell(4, 1, n(0)), cell(4, 2, chain(0)), cell(4, 3, frozen(0)), cell(4, 5, chain(0)), cell(4, 7, n(0)),
    cell(6, 2, n(5)), cell(6, 3, frozen(5)), cell(6, 4, chain(5)), cell(6, 6, n(5)),
    cell(3, 7, bomb(2)), cell(5, 7, block()), cell(7, 7, block()),
  ], [n(2), n(0), n(5)]),

  level_29: layout([
    cell(1, 1, n(0)), cell(1, 2, n(0)), cell(1, 3, n(0)), cell(1, 5, n(0)),
    cell(2, 6, bomb(0)), cell(3, 6, n(3)), cell(4, 6, n(3)), cell(5, 6, n(3)),
    cell(6, 1, n(4)), cell(6, 2, n(4)), cell(6, 4, n(4)), cell(7, 4, n(4)),
    cell(3, 2, block()), cell(3, 3, block()), cell(4, 2, frozen(4)), cell(4, 3, chain(3)),
    cell(7, 7, wild()), cell(5, 1, bomb(4)),
  ], [n(0), n(3), n(4)]),

  level_30: layout([
    cell(3, 3, block()), cell(3, 4, block()), cell(3, 5, block()),
    cell(4, 3, block()), cell(4, 4, bomb(2)), cell(4, 5, block()),
    cell(5, 3, block()), cell(5, 4, block()), cell(5, 5, block()),
    cell(1, 1, n(0)), cell(1, 2, n(0)), cell(1, 4, frozen(0)), cell(1, 6, n(0)),
    cell(7, 1, n(3)), cell(7, 2, chain(3)), cell(7, 4, n(3)), cell(7, 6, n(3)),
    cell(1, 7, bomb(5)), cell(2, 7, n(5)), cell(3, 7, n(5)), cell(5, 7, n(5)),
    cell(6, 1, wild()), cell(6, 6, bomb(3)),
  ], [n(2), n(0), n(3)]),
};

export function getLevelLayout(layoutId?: string): DesignedLevelLayout | undefined {
  return layoutId ? LEVEL_LAYOUTS[layoutId] : undefined;
}
