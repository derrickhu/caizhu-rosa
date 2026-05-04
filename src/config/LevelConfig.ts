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
  { id: 1,  type: 'steps', colorCount: 3, starScores: stars(10),  stepLimit: 40, initialBalls: 3, ballsPerTurn: 3, noSpawnThreshold: 8 },
  { id: 2,  type: 'steps', colorCount: 4, starScores: stars(15),  stepLimit: 38, initialBalls: 3, ballsPerTurn: 3, noSpawnThreshold: 8 },
  { id: 3,  type: 'steps', colorCount: 5, starScores: stars(20),  stepLimit: 36, initialBalls: 4, ballsPerTurn: 3, noSpawnThreshold: 8 },
  { id: 4,  type: 'steps', colorCount: 6, starScores: stars(30),  stepLimit: 34, initialBalls: 5, ballsPerTurn: 3, noSpawnThreshold: 8 },
  { id: 5,  type: 'steps', colorCount: 7, starScores: stars(40),  stepLimit: 32, initialBalls: 5, ballsPerTurn: 3, noSpawnThreshold: 8 },

  // === Tier 2: 上手 (6-10) — introduce one special mechanic per level ===
  { id: 6,  type: 'steps', colorCount: 7, starScores: stars(90),  stepLimit: 30, initialBalls: 5, ballsPerTurn: 3, noSpawnThreshold: 8, wildBallChance: 0.05, guaranteedInitialPieces: ['wild'], guaranteedNextPieces: ['wild'] },
  { id: 7,  type: 'steps', colorCount: 7, starScores: stars(105), stepLimit: 28, initialBalls: 5, ballsPerTurn: 3, noSpawnThreshold: 8, wildBallChance: 0.05, bombBallChance: 0.03, guaranteedInitialPieces: ['bomb'], guaranteedNextPieces: ['bomb'] },
  { id: 8,  type: 'steps', colorCount: 7, starScores: stars(120), stepLimit: 28, initialBalls: 5, ballsPerTurn: 3, noSpawnThreshold: 8, wildBallChance: 0.06, bombBallChance: 0.04, frozenBallChance: 0.03, guaranteedInitialPieces: ['frozen'], guaranteedNextPieces: ['frozen'] },
  { id: 9,  type: 'steps', colorCount: 7, starScores: stars(140), stepLimit: 26, initialBalls: 5, ballsPerTurn: 3, noSpawnThreshold: 8, wildBallChance: 0.07, bombBallChance: 0.04, frozenBallChance: 0.03, chainBallChance: 0.02, guaranteedInitialPieces: ['chain'], guaranteedNextPieces: ['chain'] },
  { id: 10, type: 'steps', colorCount: 7, starScores: stars(160), stepLimit: 25, initialBalls: 5, ballsPerTurn: 3, noSpawnThreshold: 8, wildBallChance: 0.08, bombBallChance: 0.05, frozenBallChance: 0.04, chainBallChance: 0.03, blockChance: 0.02, guaranteedInitialPieces: ['block'], guaranteedNextPieces: ['block'] },

  // === Tier 3: 进阶 (11-15) — combine low-density specials ===
  { id: 11, type: 'timed', colorCount: 7, starScores: stars(150), timeLimit: 120, initialBalls: 5, ballsPerTurn: 3, noSpawnThreshold: 8, wildBallChance: 0.08, bombBallChance: 0.05, frozenBallChance: 0.04, chainBallChance: 0.03, blockChance: 0.02 },
  { id: 12, type: 'timed', colorCount: 7, starScores: stars(170), timeLimit: 120, initialBalls: 5, ballsPerTurn: 3, noSpawnThreshold: 8, wildBallChance: 0.08, bombBallChance: 0.05, frozenBallChance: 0.04, chainBallChance: 0.03, blockChance: 0.02 },
  { id: 13, type: 'steps', colorCount: 7, starScores: stars(190), stepLimit: 24, initialBalls: 5, ballsPerTurn: 3, noSpawnThreshold: 8, wildBallChance: 0.10, bombBallChance: 0.06, frozenBallChance: 0.04, chainBallChance: 0.03, blockChance: 0.02 },
  { id: 14, type: 'timed', colorCount: 7, starScores: stars(210), timeLimit: 90,  initialBalls: 5, ballsPerTurn: 3, noSpawnThreshold: 8, wildBallChance: 0.10, bombBallChance: 0.06, frozenBallChance: 0.05, chainBallChance: 0.04, blockChance: 0.02 },
  { id: 15, type: 'steps', colorCount: 7, starScores: stars(230), stepLimit: 22, initialBalls: 5, ballsPerTurn: 3, noSpawnThreshold: 8, wildBallChance: 0.10, bombBallChance: 0.07, frozenBallChance: 0.05, chainBallChance: 0.04, blockChance: 0.03 },

  // === Tier 4: 挑战 (16-20) — wild + introduce bomb balls ===
  { id: 16, type: 'steps', colorCount: 7, starScores: stars(220), stepLimit: 20, initialBalls: 7, ballsPerTurn: 3, noSpawnThreshold: 8, wildBallChance: 0.08, bombBallChance: 0.05 },
  { id: 17, type: 'steps', colorCount: 7, starScores: stars(240), stepLimit: 22, initialBalls: 7, ballsPerTurn: 3, noSpawnThreshold: 8, wildBallChance: 0.08, bombBallChance: 0.05 },
  { id: 18, type: 'steps', colorCount: 7, starScores: stars(260), stepLimit: 20, initialBalls: 7, ballsPerTurn: 3, noSpawnThreshold: 8, wildBallChance: 0.10, bombBallChance: 0.06 },
  { id: 19, type: 'timed', colorCount: 7, starScores: stars(270), timeLimit: 90,  initialBalls: 7, ballsPerTurn: 3, noSpawnThreshold: 8, wildBallChance: 0.10, bombBallChance: 0.06 },
  { id: 20, type: 'timed', colorCount: 7, starScores: stars(300), timeLimit: 75,  initialBalls: 7, ballsPerTurn: 3, noSpawnThreshold: 8, wildBallChance: 0.10, bombBallChance: 0.08 },

  // === Tier 5: 困难 (21-25) — introduce frozen balls ===
  { id: 21, type: 'steps', colorCount: 7, starScores: stars(290), stepLimit: 20, initialBalls: 7, ballsPerTurn: 3, noSpawnThreshold: 8, wildBallChance: 0.10, bombBallChance: 0.08, frozenBallChance: 0.04 },
  { id: 22, type: 'steps', colorCount: 7, starScores: stars(320), stepLimit: 20, initialBalls: 7, ballsPerTurn: 3, noSpawnThreshold: 8, wildBallChance: 0.10, bombBallChance: 0.08, frozenBallChance: 0.05 },
  { id: 23, type: 'steps', colorCount: 7, starScores: stars(350), stepLimit: 18, initialBalls: 7, ballsPerTurn: 3, noSpawnThreshold: 8, wildBallChance: 0.12, bombBallChance: 0.08, frozenBallChance: 0.06 },
  { id: 24, type: 'timed', colorCount: 7, starScores: stars(360), timeLimit: 75,  initialBalls: 9, ballsPerTurn: 3, noSpawnThreshold: 8, wildBallChance: 0.12, bombBallChance: 0.10, frozenBallChance: 0.06 },
  { id: 25, type: 'timed', colorCount: 7, starScores: stars(400), timeLimit: 60,  initialBalls: 9, ballsPerTurn: 3, noSpawnThreshold: 8, wildBallChance: 0.12, bombBallChance: 0.10, frozenBallChance: 0.07 },

  // === Tier 6: 大师 (26-30) — chain balls and blockers ===
  { id: 26, type: 'steps', colorCount: 7, starScores: stars(380), stepLimit: 20, initialBalls: 9, ballsPerTurn: 3, noSpawnThreshold: 8, wildBallChance: 0.10, bombBallChance: 0.10, frozenBallChance: 0.05, chainBallChance: 0.04 },
  { id: 27, type: 'steps', colorCount: 7, starScores: stars(430), stepLimit: 18, initialBalls: 9, ballsPerTurn: 3, noSpawnThreshold: 8, wildBallChance: 0.12, bombBallChance: 0.10, frozenBallChance: 0.05, chainBallChance: 0.05 },
  { id: 28, type: 'steps', colorCount: 7, starScores: stars(480), stepLimit: 18, initialBalls: 9, ballsPerTurn: 3, noSpawnThreshold: 8, wildBallChance: 0.12, bombBallChance: 0.12, frozenBallChance: 0.05, chainBallChance: 0.05, blockChance: 0.03 },
  { id: 29, type: 'timed', colorCount: 7, starScores: stars(500), timeLimit: 75,  initialBalls: 9, ballsPerTurn: 3, noSpawnThreshold: 8, wildBallChance: 0.12, bombBallChance: 0.12, frozenBallChance: 0.06, chainBallChance: 0.06, blockChance: 0.04 },
  { id: 30, type: 'timed', colorCount: 7, starScores: stars(560), timeLimit: 60,  initialBalls: 9, ballsPerTurn: 3, noSpawnThreshold: 8, wildBallChance: 0.15, bombBallChance: 0.12, frozenBallChance: 0.06, chainBallChance: 0.06, blockChance: 0.05 },
];

export function getLevelDef(id: number): LevelDef | undefined {
  return LEVELS.find(l => l.id === id);
}

export const TOTAL_LEVELS = LEVELS.length;
