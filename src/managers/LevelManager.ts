import { LEVEL_PROGRESS_KEY } from '@/config/CloudConfig';
import { TOTAL_LEVELS, getLevelStars } from '@/config/LevelConfig';
import { PersistService } from '@/core/PersistService';

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

  constructor() {
    PersistService.subscribeCloudImport((info) => {
      if (info.changedKeys.includes(LEVEL_PROGRESS_KEY)) {
        this._load();
      }
    });
  }

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
    this._progress = PersistService.readJSON<LevelProgress>(LEVEL_PROGRESS_KEY)
      || { levels: {}, maxUnlocked: 1 };
  }

  private _save(): void {
    PersistService.writeJSON(LEVEL_PROGRESS_KEY, this._progress);
  }
}

export const LevelManager = new LevelManagerClass();
