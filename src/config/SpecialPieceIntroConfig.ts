import { SEEN_SPECIAL_INTROS_KEY } from '@/config/CloudConfig';
import { PersistService } from '@/core/PersistService';
import { createNormalPiece, type Piece } from '@/config/PieceConfig';

export interface SpecialPieceIntroDef {
  id: string;
  levelId: number;
  title: string;
  iconPath?: string;
  iconPiece?: Piece;
  description: string;
  tip: string;
}

export const SPECIAL_PIECE_INTROS: readonly SpecialPieceIntroDef[] = [
  {
    id: 'color-green',
    levelId: 2,
    title: '绿色彩珠',
    iconPiece: createNormalPiece(3),
    description: '棋盘会出现绿色彩珠。\n同色连成 5 颗即可消除得分。',
    tip: '颜色更多，连线选择也更多，先找最容易凑五连的颜色。',
  },
  {
    id: 'color-purple',
    levelId: 3,
    title: '紫色彩珠',
    iconPiece: createNormalPiece(4),
    description: '紫色彩珠加入棋盘。\n可与其他紫色彩珠连成五连。',
    tip: '优先清理集中颜色，避免棋盘太快被填满。',
  },
  {
    id: 'color-orange',
    levelId: 4,
    title: '橙色彩珠',
    iconPiece: createNormalPiece(5),
    description: '橙色彩珠加入棋盘。\n移动到合适位置凑出五连。',
    tip: '提前规划移动路线，别只盯着当前一步。',
  },
  {
    id: 'color-cyan',
    levelId: 5,
    title: '青色彩珠',
    iconPiece: createNormalPiece(6),
    description: '青色彩珠加入棋盘。\n七种颜色全部登场。',
    tip: '后期更考验空间管理，尽量保留可移动通路。',
  },
  {
    id: 'wild',
    levelId: 6,
    title: '万能彩珠',
    iconPiece: { kind: 'wild' },
    description: '万能彩珠可以代替任意颜色，\n参与同色五连。',
    tip: '把它放进关键位置，更容易凑出五连。',
  },
  {
    id: 'bomb',
    levelId: 7,
    title: '炸弹彩珠',
    iconPiece: { kind: 'bomb', color: 0 },
    description: '炸弹彩珠参与消除时，\n会爆破周围一圈棋子。',
    tip: '连线触发炸弹，可以快速打开局面。',
  },
  {
    id: 'frozen',
    levelId: 8,
    title: '冰冻彩珠',
    iconPiece: { kind: 'frozen', color: 2, layers: 1 },
    description: '冰冻彩珠不能移动，\n但仍可参与同色连线。',
    tip: '第一次消除会破冰，让它恢复成普通棋子。',
  },
  {
    id: 'chain',
    levelId: 9,
    title: '锁链彩珠',
    iconPiece: { kind: 'chain', color: 5, layers: 1 },
    description: '锁链会保护棋子，\n需要先通过连线破除。',
    tip: '破锁后棋子会保留下来，再次连线才能清掉。',
  },
  {
    id: 'block',
    levelId: 10,
    title: '石块障碍',
    iconPiece: { kind: 'block', layers: 1 },
    description: '石块会占住格子，\n不能移动，也不能参与连线。',
    tip: '用炸弹爆破可以清理石块。',
  },
] as const;

export function getSpecialPieceIntros(levelId: number): SpecialPieceIntroDef[] {
  return SPECIAL_PIECE_INTROS.filter(intro => intro.levelId === levelId);
}

export function hasSeenSpecialPieceIntro(id: string): boolean {
  const seen = _loadSeenIntros();
  return seen.includes(id);
}

export function markSpecialPieceIntroSeen(id: string): void {
  const seen = new Set(_loadSeenIntros());
  seen.add(id);
  PersistService.writeJSON(SEEN_SPECIAL_INTROS_KEY, [...seen]);
}

function _loadSeenIntros(): string[] {
  const parsed = PersistService.readJSON<unknown>(SEEN_SPECIAL_INTROS_KEY);
  return Array.isArray(parsed) ? parsed.filter(item => typeof item === 'string') : [];
}
