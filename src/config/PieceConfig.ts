import { BALL_COLORS } from '@/config/GameConfig';

export type PieceKind = 'normal' | 'wild' | 'bomb' | 'frozen' | 'chain' | 'block';

export interface NormalPiece {
  kind: 'normal';
  color: number;
}

export interface WildPiece {
  kind: 'wild';
}

export interface BombPiece {
  kind: 'bomb';
  color: number;
}

export interface FrozenPiece {
  kind: 'frozen';
  color: number;
  layers: 1;
}

export interface ChainPiece {
  kind: 'chain';
  color: number;
  layers: 1 | 2;
}

export interface BlockPiece {
  kind: 'block';
  layers: 1 | 2;
}

export type Piece = NormalPiece | WildPiece | BombPiece | FrozenPiece | ChainPiece | BlockPiece;
export type CellValue = Piece | null;

export interface SpecialPieceChances {
  wildBallChance?: number;
  bombBallChance?: number;
  frozenBallChance?: number;
  chainBallChance?: number;
  blockChance?: number;
}

export type PieceSpawnKind = 'wild' | 'bomb' | 'frozen' | 'chain' | 'block';

export function createNormalPiece(color: number): NormalPiece {
  return { kind: 'normal', color };
}

export function clonePiece(piece: Piece): Piece {
  return { ...piece } as Piece;
}

export function cloneCell(cell: CellValue): CellValue {
  return cell ? clonePiece(cell) : null;
}

export function getPieceColor(piece: Piece | null): number | null {
  if (!piece) return null;
  switch (piece.kind) {
    case 'normal':
    case 'bomb':
    case 'frozen':
    case 'chain':
      return piece.color;
    default:
      return null;
  }
}

export function getPieceDisplayColor(piece: Piece | null): number {
  if (!piece) return 0xCCCCCC;
  if (piece.kind === 'wild') return 0xFFFFFF;
  if (piece.kind === 'bomb') return 0xF39C12;
  if (piece.kind === 'block') return 0x8EA0B8;
  const color = getPieceColor(piece);
  return color === null ? 0xCCCCCC : (BALL_COLORS[color] ?? 0xCCCCCC);
}

export function isMovablePiece(piece: Piece | null): boolean {
  return !!piece && piece.kind !== 'frozen' && piece.kind !== 'block';
}

export function isLineParticipant(piece: Piece | null): boolean {
  return !!piece && piece.kind !== 'block';
}

export function pieceMatchesColor(piece: Piece | null, color: number): boolean {
  if (!isLineParticipant(piece)) return false;
  if (piece.kind === 'wild') return true;
  return getPieceColor(piece) === color;
}

export function isWildPiece(piece: Piece | null): boolean {
  return piece?.kind === 'wild';
}

export function isBombPiece(piece: Piece | null): boolean {
  return piece?.kind === 'bomb';
}

export function isBlockPiece(piece: Piece | null): boolean {
  return piece?.kind === 'block';
}

export function isDamagedByLine(piece: Piece): boolean {
  return piece.kind !== 'block';
}

export function damagePieceByLine(piece: Piece): CellValue {
  if (piece.kind === 'frozen') return createNormalPiece(piece.color);
  if (piece.kind === 'chain') {
    if (piece.layers > 1) return { ...piece, layers: 1 };
    return createNormalPiece(piece.color);
  }
  return null;
}

export function damagePieceByExplosion(piece: Piece): CellValue {
  if (piece.kind === 'block') {
    if (piece.layers > 1) return { ...piece, layers: 1 };
    return null;
  }
  return damagePieceByLine(piece);
}

export function rollSpawnPiece(colorCount: number, chances: SpecialPieceChances = {}): Piece {
  const color = Math.floor(Math.random() * colorCount);
  let cursor = 0;
  const rand = Math.random();

  cursor += chances.wildBallChance ?? 0;
  if (rand < cursor) return { kind: 'wild' };

  cursor += chances.bombBallChance ?? 0;
  if (rand < cursor) return { kind: 'bomb', color };

  cursor += chances.frozenBallChance ?? 0;
  if (rand < cursor) return { kind: 'frozen', color, layers: 1 };

  cursor += chances.chainBallChance ?? 0;
  if (rand < cursor) return { kind: 'chain', color, layers: 1 };

  cursor += chances.blockChance ?? 0;
  if (rand < cursor) return { kind: 'block', layers: 1 };

  return createNormalPiece(color);
}

export function createSpecialPiece(kind: PieceSpawnKind, colorCount: number): Piece {
  const color = Math.floor(Math.random() * colorCount);
  switch (kind) {
    case 'wild':
      return { kind: 'wild' };
    case 'bomb':
      return { kind: 'bomb', color };
    case 'frozen':
      return { kind: 'frozen', color, layers: 1 };
    case 'chain':
      return { kind: 'chain', color, layers: 1 };
    case 'block':
      return { kind: 'block', layers: 1 };
  }
}
