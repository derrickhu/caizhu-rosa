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
}

function stars(oneStar: number): readonly [number, number, number] {
  return [oneStar, Math.round(oneStar * 1.5), oneStar * 2] as const;
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
  // === Tier 1: 入门 (1-5) — 3 colors, generous steps, no specials ===
  { id: 1,  type: 'steps', colorCount: 3, starScores: stars(10),  stepLimit: 40, initialBalls: 3, ballsPerTurn: 3, noSpawnThreshold: 8 },
  { id: 2,  type: 'steps', colorCount: 3, starScores: stars(15),  stepLimit: 38, initialBalls: 3, ballsPerTurn: 3, noSpawnThreshold: 8 },
  { id: 3,  type: 'steps', colorCount: 3, starScores: stars(20),  stepLimit: 35, initialBalls: 3, ballsPerTurn: 3, noSpawnThreshold: 8 },
  { id: 4,  type: 'steps', colorCount: 3, starScores: stars(30),  stepLimit: 30, initialBalls: 5, ballsPerTurn: 3, noSpawnThreshold: 8 },
  { id: 5,  type: 'steps', colorCount: 4, starScores: stars(40),  stepLimit: 30, initialBalls: 5, ballsPerTurn: 3, noSpawnThreshold: 8 },

  // === Tier 2: 上手 (6-10) — 4 colors, moderate steps, no specials ===
  { id: 6,  type: 'steps', colorCount: 4, starScores: stars(50),  stepLimit: 28, initialBalls: 5, ballsPerTurn: 3, noSpawnThreshold: 8 },
  { id: 7,  type: 'steps', colorCount: 4, starScores: stars(55),  stepLimit: 26, initialBalls: 5, ballsPerTurn: 3, noSpawnThreshold: 8 },
  { id: 8,  type: 'steps', colorCount: 4, starScores: stars(60),  stepLimit: 25, initialBalls: 5, ballsPerTurn: 3, noSpawnThreshold: 8 },
  { id: 9,  type: 'steps', colorCount: 4, starScores: stars(70),  stepLimit: 25, initialBalls: 5, ballsPerTurn: 3, noSpawnThreshold: 8 },
  { id: 10, type: 'steps', colorCount: 4, starScores: stars(80),  stepLimit: 22, initialBalls: 5, ballsPerTurn: 3, noSpawnThreshold: 8 },

  // === Tier 3: 进阶 (11-15) — introduce wild balls ===
  { id: 11, type: 'timed', colorCount: 4, starScores: stars(60),  timeLimit: 120, initialBalls: 5, ballsPerTurn: 3, noSpawnThreshold: 8, wildBallChance: 0.08 },
  { id: 12, type: 'timed', colorCount: 5, starScores: stars(70),  timeLimit: 120, initialBalls: 5, ballsPerTurn: 3, noSpawnThreshold: 8, wildBallChance: 0.08 },
  { id: 13, type: 'steps', colorCount: 5, starScores: stars(80),  stepLimit: 22, initialBalls: 5, ballsPerTurn: 3, noSpawnThreshold: 8, wildBallChance: 0.10 },
  { id: 14, type: 'timed', colorCount: 5, starScores: stars(90),  timeLimit: 90,  initialBalls: 5, ballsPerTurn: 3, noSpawnThreshold: 8, wildBallChance: 0.10 },
  { id: 15, type: 'steps', colorCount: 5, starScores: stars(100), stepLimit: 20, initialBalls: 5, ballsPerTurn: 3, noSpawnThreshold: 8, wildBallChance: 0.10 },

  // === Tier 4: 挑战 (16-20) — wild + introduce bomb balls ===
  { id: 16, type: 'steps', colorCount: 5, starScores: stars(80),  stepLimit: 20, initialBalls: 7, ballsPerTurn: 3, noSpawnThreshold: 8, wildBallChance: 0.08, bombBallChance: 0.05 },
  { id: 17, type: 'steps', colorCount: 6, starScores: stars(90),  stepLimit: 22, initialBalls: 7, ballsPerTurn: 3, noSpawnThreshold: 8, wildBallChance: 0.08, bombBallChance: 0.05 },
  { id: 18, type: 'steps', colorCount: 6, starScores: stars(100), stepLimit: 20, initialBalls: 7, ballsPerTurn: 3, noSpawnThreshold: 8, wildBallChance: 0.10, bombBallChance: 0.06 },
  { id: 19, type: 'timed', colorCount: 6, starScores: stars(100), timeLimit: 90,  initialBalls: 7, ballsPerTurn: 3, noSpawnThreshold: 8, wildBallChance: 0.10, bombBallChance: 0.06 },
  { id: 20, type: 'timed', colorCount: 6, starScores: stars(120), timeLimit: 75,  initialBalls: 7, ballsPerTurn: 3, noSpawnThreshold: 8, wildBallChance: 0.10, bombBallChance: 0.08 },

  // === Tier 5: 困难 (21-25) — higher wild/bomb chances ===
  { id: 21, type: 'steps', colorCount: 6, starScores: stars(100), stepLimit: 18, initialBalls: 7, ballsPerTurn: 3, noSpawnThreshold: 8, wildBallChance: 0.10, bombBallChance: 0.08 },
  { id: 22, type: 'steps', colorCount: 6, starScores: stars(120), stepLimit: 20, initialBalls: 7, ballsPerTurn: 3, noSpawnThreshold: 8, wildBallChance: 0.10, bombBallChance: 0.08 },
  { id: 23, type: 'steps', colorCount: 6, starScores: stars(130), stepLimit: 18, initialBalls: 7, ballsPerTurn: 3, noSpawnThreshold: 8, wildBallChance: 0.12, bombBallChance: 0.08 },
  { id: 24, type: 'timed', colorCount: 6, starScores: stars(130), timeLimit: 75,  initialBalls: 9, ballsPerTurn: 3, noSpawnThreshold: 8, wildBallChance: 0.12, bombBallChance: 0.10 },
  { id: 25, type: 'timed', colorCount: 6, starScores: stars(150), timeLimit: 60,  initialBalls: 9, ballsPerTurn: 3, noSpawnThreshold: 8, wildBallChance: 0.12, bombBallChance: 0.10 },

  // === Tier 6: 大师 (26-30) — max difficulty, frequent specials ===
  { id: 26, type: 'steps', colorCount: 7, starScores: stars(120), stepLimit: 20, initialBalls: 9, ballsPerTurn: 3, noSpawnThreshold: 8, wildBallChance: 0.10, bombBallChance: 0.10 },
  { id: 27, type: 'steps', colorCount: 7, starScores: stars(140), stepLimit: 18, initialBalls: 9, ballsPerTurn: 3, noSpawnThreshold: 8, wildBallChance: 0.12, bombBallChance: 0.10 },
  { id: 28, type: 'steps', colorCount: 7, starScores: stars(160), stepLimit: 16, initialBalls: 9, ballsPerTurn: 3, noSpawnThreshold: 8, wildBallChance: 0.12, bombBallChance: 0.12 },
  { id: 29, type: 'timed', colorCount: 7, starScores: stars(160), timeLimit: 75,  initialBalls: 9, ballsPerTurn: 3, noSpawnThreshold: 8, wildBallChance: 0.12, bombBallChance: 0.12 },
  { id: 30, type: 'timed', colorCount: 7, starScores: stars(180), timeLimit: 60,  initialBalls: 9, ballsPerTurn: 3, noSpawnThreshold: 8, wildBallChance: 0.15, bombBallChance: 0.12 },
];

export function getLevelDef(id: number): LevelDef | undefined {
  return LEVELS.find(l => l.id === id);
}

export const TOTAL_LEVELS = LEVELS.length;
