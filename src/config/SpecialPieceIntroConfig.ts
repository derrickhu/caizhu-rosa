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
    description: '绿色彩珠加入棋盘。\n同色五连可消除。',
    tip: '颜色变多，先找好连的颜色。',
  },
  {
    id: 'color-purple',
    levelId: 3,
    title: '紫色彩珠',
    iconPiece: createNormalPiece(4),
    description: '紫色彩珠加入棋盘。\n可与其他紫色五连。',
    tip: '优先清集中色，别让盘太满。',
  },
  {
    id: 'color-orange',
    levelId: 4,
    title: '橙色彩珠',
    iconPiece: createNormalPiece(5),
    description: '橙色彩珠加入棋盘。\n摆好位置凑五连。',
    tip: '多想想下一步路线。',
  },
  {
    id: 'color-cyan',
    levelId: 5,
    title: '青色彩珠',
    iconPiece: createNormalPiece(6),
    description: '青色彩珠加入棋盘。\n七种颜色齐登场。',
    tip: '留出通路，别堵死棋盘。',
  },
  {
    id: 'wild',
    levelId: 6,
    title: '万能彩珠',
    iconPiece: { kind: 'wild' },
    description: '可代替任意颜色\n参与同色五连。',
    tip: '放在关键格更好凑五连。',
  },
  {
    id: 'bomb',
    levelId: 7,
    title: '炸弹彩珠',
    iconPiece: { kind: 'bomb', color: 0 },
    description: '参与消除时\n爆破周围一圈。',
    tip: '连线引爆炸弹开局面。',
  },
  {
    id: 'frozen',
    levelId: 8,
    title: '冰冻彩珠',
    iconPiece: { kind: 'frozen', color: 2, layers: 1 },
    description: '不能移动，\n但可参与同色连线。',
    tip: '消除一次破冰变普通珠。',
  },
  {
    id: 'chain',
    levelId: 9,
    title: '锁链彩珠',
    iconPiece: { kind: 'chain', color: 5, layers: 1 },
    description: '被锁不能动，\n连线可破锁。',
    tip: '破锁后保留，再连一次才消。',
  },
  {
    id: 'block',
    levelId: 10,
    title: '石块障碍',
    iconPiece: { kind: 'block', layers: 1 },
    description: '占格不动，\n不能参与连线。',
    tip: '炸弹可炸掉石块。',
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
