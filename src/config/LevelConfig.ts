import type { PieceSpawnKind } from '@/config/PieceConfig';

export interface LevelDef {
  id: number;
  type: 'steps' | 'timed';
  colorCount: number;
  starScores: readonly [oneStar: number, twoStar: number, threeStar: number];
  stepLimit?: number;
  timeLimit?: number;
  initialBalls: number;
  ballsPerTurn: number;
  noSpawnThreshold: number;
  /** Chance (0-1) of spawning a wild/rainbow ball instead of a normal color */
  wildBallChance?: number;
  /** Chance (0-1) of spawning a bomb ball */
  bombBallChance?: number;
  /** Chance (0-1) of spawning a frozen ball that cannot be moved */
  frozenBallChance?: number;
  /** Chance (0-1) of spawning a chained ball */
  chainBallChance?: number;
  /** Chance (0-1) of spawning a board blocker */
  blockChance?: number;
  /** Special pieces guaranteed in the initial board setup */
  guaranteedInitialPieces?: readonly PieceSpawnKind[];
  /** Special pieces guaranteed in the first preview/spawn queue */
  guaranteedNextPieces?: readonly PieceSpawnKind[];
  /** Designed board layout used instead of fully random initial placement */
  layoutId?: string;
}

function stars(oneStar: number): readonly [number, number, number] {
  return [oneStar, Math.round(oneStar * 2.4), Math.round(oneStar * 4.5)] as const;
}

export function getPassScore(starScores: readonly [number, number, number]): number {
  return starScores[0];
}

export function getMaxStarScore(starScores: readonly [number, number, number]): number {
  return starScores[2];
}

export function getLevelStars(score: number, starScores: readonly [number, number, number]): number {
  if (score >= starScores[2]) return 3;
  if (score >= starScores[1]) return 2;
  if (score >= starScores[0]) return 1;
  return 0;
}

export const LEVELS: readonly LevelDef[] = [
  // === Tier 1: 入门 (1-5) — unlock all colors early ===
  { id: 1,  type: 'steps', colorCount: 3, starScores: stars(10),  stepLimit: 40, initialBalls: 16, ballsPerTurn: 3, noSpawnThreshold: 8, layoutId: 'level_01' },
  { id: 2,  type: 'steps', colorCount: 4, starScores: stars(30),  stepLimit: 38, initialBalls: 8, ballsPerTurn: 3, noSpawnThreshold: 8, layoutId: 'level_02' },
  { id: 3,  type: 'steps', colorCount: 5, starScores: stars(50),  stepLimit: 38, initialBalls: 9, ballsPerTurn: 3, noSpawnThreshold: 8, layoutId: 'level_03' },
  { id: 4,  type: 'steps', colorCount: 6, starScores: stars(75),  stepLimit: 36, initialBalls: 10, ballsPerTurn: 3, noSpawnThreshold: 8, layoutId: 'level_04' },
  { id: 5,  type: 'steps', colorCount: 7, starScores: stars(100), stepLimit: 36, initialBalls: 11, ballsPerTurn: 3, noSpawnThreshold: 8, layoutId: 'level_05' },

  // === Tier 2: 上手 (6-10) — introduce one special mechanic per level ===
  { id: 6,  type: 'steps', colorCount: 7, starScores: stars(90),  stepLimit: 34, initialBalls: 8,  ballsPerTurn: 3, noSpawnThreshold: 8, wildBallChance: 0.03, layoutId: 'level_06' },
  { id: 7,  type: 'steps', colorCount: 7, starScores: stars(110), stepLimit: 34, initialBalls: 8,  ballsPerTurn: 3, noSpawnThreshold: 8, wildBallChance: 0.03, bombBallChance: 0.015, layoutId: 'level_07' },
  { id: 8,  type: 'steps', colorCount: 7, starScores: stars(130), stepLimit: 34, initialBalls: 8,  ballsPerTurn: 3, noSpawnThreshold: 8, wildBallChance: 0.03, bombBallChance: 0.015, frozenBallChance: 0.015, layoutId: 'level_08' },
  { id: 9,  type: 'steps', colorCount: 7, starScores: stars(150), stepLimit: 34, initialBalls: 8,  ballsPerTurn: 3, noSpawnThreshold: 8, wildBallChance: 0.035, bombBallChance: 0.015, frozenBallChance: 0.015, chainBallChance: 0.012, layoutId: 'level_09' },
  { id: 10, type: 'steps', colorCount: 7, starScores: stars(180), stepLimit: 36, initialBalls: 10, ballsPerTurn: 3, noSpawnThreshold: 8, wildBallChance: 0.035, bombBallChance: 0.02, frozenBallChance: 0.015, chainBallChance: 0.012, blockChance: 0.03, layoutId: 'level_10' },

  // === Tier 3: 进阶 (11-15) — combine low-density specials ===
  { id: 11, type: 'timed', colorCount: 7, starScores: stars(220), timeLimit: 180, initialBalls: 9,  ballsPerTurn: 3, noSpawnThreshold: 8, wildBallChance: 0.04, bombBallChance: 0.02, frozenBallChance: 0.015, chainBallChance: 0.012, blockChance: 0.03, layoutId: 'level_11' },
  { id: 12, type: 'timed', colorCount: 7, starScores: stars(250), timeLimit: 180, initialBalls: 9,  ballsPerTurn: 3, noSpawnThreshold: 8, wildBallChance: 0.04, bombBallChance: 0.02, frozenBallChance: 0.02, chainBallChance: 0.012, blockChance: 0.03, layoutId: 'level_12' },
  { id: 13, type: 'steps', colorCount: 7, starScores: stars(260), stepLimit: 36, initialBalls: 10, ballsPerTurn: 3, noSpawnThreshold: 8, wildBallChance: 0.045, bombBallChance: 0.025, frozenBallChance: 0.02, chainBallChance: 0.018, blockChance: 0.03, layoutId: 'level_13' },
  { id: 14, type: 'timed', colorCount: 7, starScores: stars(300), timeLimit: 210, initialBalls: 12, ballsPerTurn: 3, noSpawnThreshold: 8, wildBallChance: 0.045, bombBallChance: 0.025, frozenBallChance: 0.025, chainBallChance: 0.018, blockChance: 0.035, layoutId: 'level_14' },
  { id: 15, type: 'steps', colorCount: 7, starScores: stars(330), stepLimit: 40, initialBalls: 14, ballsPerTurn: 3, noSpawnThreshold: 8, wildBallChance: 0.05, bombBallChance: 0.03, frozenBallChance: 0.025, chainBallChance: 0.02, blockChance: 0.04, layoutId: 'level_15' },

  // === Tier 4: 挑战 (16-20) — denser starts with low-density specials ===
  { id: 16, type: 'steps', colorCount: 7, starScores: stars(360), stepLimit: 42, initialBalls: 12, ballsPerTurn: 3, noSpawnThreshold: 8, wildBallChance: 0.045, bombBallChance: 0.025, frozenBallChance: 0.02, chainBallChance: 0.015, blockChance: 0.035, layoutId: 'level_16' },
  { id: 17, type: 'steps', colorCount: 7, starScores: stars(390), stepLimit: 42, initialBalls: 10, ballsPerTurn: 3, noSpawnThreshold: 8, wildBallChance: 0.045, bombBallChance: 0.025, frozenBallChance: 0.02, chainBallChance: 0.018, blockChance: 0.035, layoutId: 'level_17' },
  { id: 18, type: 'steps', colorCount: 7, starScores: stars(420), stepLimit: 44, initialBalls: 12, ballsPerTurn: 3, noSpawnThreshold: 8, wildBallChance: 0.05, bombBallChance: 0.03, frozenBallChance: 0.025, chainBallChance: 0.02, blockChance: 0.04, layoutId: 'level_18' },
  { id: 19, type: 'timed', colorCount: 7, starScores: stars(480), timeLimit: 240, initialBalls: 15, ballsPerTurn: 3, noSpawnThreshold: 8, wildBallChance: 0.05, bombBallChance: 0.03, frozenBallChance: 0.025, chainBallChance: 0.02, blockChance: 0.04, layoutId: 'level_19' },
  { id: 20, type: 'timed', colorCount: 7, starScores: stars(520), timeLimit: 240, initialBalls: 15, ballsPerTurn: 3, noSpawnThreshold: 8, wildBallChance: 0.055, bombBallChance: 0.035, frozenBallChance: 0.03, chainBallChance: 0.025, blockChance: 0.045, layoutId: 'level_20' },

  // === Tier 5: 困难 (21-25) — mixed mechanics with stronger initial boards ===
  { id: 21, type: 'steps', colorCount: 7, starScores: stars(560), stepLimit: 46, initialBalls: 14, ballsPerTurn: 3, noSpawnThreshold: 8, wildBallChance: 0.055, bombBallChance: 0.035, frozenBallChance: 0.03, chainBallChance: 0.022, blockChance: 0.045, layoutId: 'level_21' },
  { id: 22, type: 'steps', colorCount: 7, starScores: stars(600), stepLimit: 48, initialBalls: 14, ballsPerTurn: 3, noSpawnThreshold: 8, wildBallChance: 0.055, bombBallChance: 0.035, frozenBallChance: 0.03, chainBallChance: 0.022, blockChance: 0.05, layoutId: 'level_22' },
  { id: 23, type: 'steps', colorCount: 7, starScores: stars(640), stepLimit: 48, initialBalls: 13, ballsPerTurn: 3, noSpawnThreshold: 8, wildBallChance: 0.06, bombBallChance: 0.04, frozenBallChance: 0.035, chainBallChance: 0.025, blockChance: 0.05, layoutId: 'level_23' },
  { id: 24, type: 'timed', colorCount: 7, starScores: stars(700), timeLimit: 270, initialBalls: 19, ballsPerTurn: 3, noSpawnThreshold: 8, wildBallChance: 0.06, bombBallChance: 0.04, frozenBallChance: 0.035, chainBallChance: 0.025, blockChance: 0.055, layoutId: 'level_24' },
  { id: 25, type: 'timed', colorCount: 7, starScores: stars(760), timeLimit: 300, initialBalls: 17, ballsPerTurn: 3, noSpawnThreshold: 8, wildBallChance: 0.065, bombBallChance: 0.04, frozenBallChance: 0.04, chainBallChance: 0.03, blockChance: 0.055, layoutId: 'level_25' },

  // === Tier 6: 大师 (26-30) — chain balls and blockers ===
  { id: 26, type: 'steps', colorCount: 7, starScores: stars(780),  stepLimit: 52, initialBalls: 18, ballsPerTurn: 3, noSpawnThreshold: 8, wildBallChance: 0.065, bombBallChance: 0.04, frozenBallChance: 0.035, chainBallChance: 0.03, blockChance: 0.055, layoutId: 'level_26' },
  { id: 27, type: 'steps', colorCount: 7, starScores: stars(850),  stepLimit: 54, initialBalls: 17, ballsPerTurn: 3, noSpawnThreshold: 8, wildBallChance: 0.065, bombBallChance: 0.04, frozenBallChance: 0.035, chainBallChance: 0.03, blockChance: 0.06, layoutId: 'level_27' },
  { id: 28, type: 'steps', colorCount: 7, starScores: stars(900),  stepLimit: 56, initialBalls: 17, ballsPerTurn: 3, noSpawnThreshold: 8, wildBallChance: 0.07, bombBallChance: 0.045, frozenBallChance: 0.04, chainBallChance: 0.035, blockChance: 0.06, layoutId: 'level_28' },
  { id: 29, type: 'timed', colorCount: 7, starScores: stars(950),  timeLimit: 300, initialBalls: 18, ballsPerTurn: 3, noSpawnThreshold: 8, wildBallChance: 0.075, bombBallChance: 0.045, frozenBallChance: 0.04, chainBallChance: 0.035, blockChance: 0.065, layoutId: 'level_29' },
  { id: 30, type: 'timed', colorCount: 7, starScores: stars(1000), timeLimit: 300, initialBalls: 23, ballsPerTurn: 3, noSpawnThreshold: 8, wildBallChance: 0.08, bombBallChance: 0.05, frozenBallChance: 0.045, chainBallChance: 0.04, blockChance: 0.07, layoutId: 'level_30' },
];

export function getLevelDef(id: number): LevelDef | undefined {
  return LEVELS.find(l => l.id === id);
}

export const TOTAL_LEVELS = LEVELS.length;
