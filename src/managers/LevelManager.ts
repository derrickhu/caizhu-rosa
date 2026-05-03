import { Platform } from '@/core/PlatformService';
import { TOTAL_LEVELS, getLevelStars } from '@/config/LevelConfig';

const STORAGE_KEY = 'caizhu_level_progress';

interface LevelRecord {
  stars: number;
  bestScore: number;
}

interface LevelProgress {
  levels: Record<number, LevelRecord>;
  maxUnlocked: number;
}

class LevelManagerClass {
  private _progress: LevelProgress = { levels: {}, maxUnlocked: 1 };
  private _currentLevelId = 1;

  get currentLevelId(): number { return this._currentLevelId; }
  set currentLevelId(id: number) { this._currentLevelId = id; }

  get maxUnlocked(): number { return this._progress.maxUnlocked; }

  init(): void {
    this._load();
  }

  getLevelRecord(id: number): LevelRecord | null {
    return this._progress.levels[id] || null;
  }

  getStars(id: number): number {
    return this._progress.levels[id]?.stars ?? 0;
  }

  isUnlocked(id: number): boolean {
    return id <= this._progress.maxUnlocked;
  }

  /** Record a level completion. Returns the stars earned this attempt. */
  recordCompletion(levelId: number, score: number, starScores: readonly [number, number, number]): number {
    const stars = getLevelStars(score, starScores);
    if (stars === 0) return 0;

    const existing = this._progress.levels[levelId];
    const prevStars = existing?.stars ?? 0;
    const prevBest = existing?.bestScore ?? 0;

    this._progress.levels[levelId] = {
      stars: Math.max(prevStars, stars),
      bestScore: Math.max(prevBest, score),
    };

    // Unlock next level
    if (levelId >= this._progress.maxUnlocked && levelId < TOTAL_LEVELS) {
      this._progress.maxUnlocked = levelId + 1;
    }

    this._save();
    return stars;
  }

  getTotalStars(): number {
    let total = 0;
    for (const key in this._progress.levels) {
      total += this._progress.levels[key].stars;
    }
    return total;
  }

  private _load(): void {
    const raw = Platform.getStorageSync(STORAGE_KEY);
    if (raw) {
      try {
        this._progress = JSON.parse(raw);
      } catch {
        this._progress = { levels: {}, maxUnlocked: 1 };
      }
    }
  }

  private _save(): void {
    Platform.setStorageSync(STORAGE_KEY, JSON.stringify(this._progress));
  }
}

export const LevelManager = new LevelManagerClass();
