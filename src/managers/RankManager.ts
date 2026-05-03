import { Platform } from '@/core/PlatformService';
import { LevelManager } from './LevelManager';
import { TOTAL_LEVELS } from '@/config/LevelConfig';

const STORAGE_KEY = 'caizhu_classic_ranks';
const MAX_RECORDS = 10;

export interface ClassicRecord {
  score: number;
  date: string;
}

class RankManagerClass {
  private _records: ClassicRecord[] = [];

  init(): void {
    const raw = Platform.getStorageSync(STORAGE_KEY);
    if (raw) {
      try { this._records = JSON.parse(raw); } catch { this._records = []; }
    }
  }

  addClassicScore(score: number): void {
    if (score <= 0) return;
    this._records.push({
      score,
      date: this._today(),
    });
    this._records.sort((a, b) => b.score - a.score);
    if (this._records.length > MAX_RECORDS) {
      this._records.length = MAX_RECORDS;
    }
    Platform.setStorageSync(STORAGE_KEY, JSON.stringify(this._records));
  }

  getClassicRecords(): ClassicRecord[] {
    return this._records;
  }

  getBestClassicScore(): number {
    return this._records[0]?.score ?? 0;
  }

  getLevelStats(): { completed: number; total: number; totalStars: number } {
    let completed = 0;
    for (let i = 1; i <= TOTAL_LEVELS; i++) {
      if (LevelManager.getStars(i) > 0) completed++;
    }
    return {
      completed,
      total: TOTAL_LEVELS,
      totalStars: LevelManager.getTotalStars(),
    };
  }

  getLevelRecords(): { id: number; stars: number; bestScore: number }[] {
    const list: { id: number; stars: number; bestScore: number }[] = [];
    for (let i = 1; i <= TOTAL_LEVELS; i++) {
      const rec = LevelManager.getLevelRecord(i);
      if (rec && rec.stars > 0) {
        list.push({ id: i, stars: rec.stars, bestScore: rec.bestScore });
      }
    }
    return list;
  }

  private _today(): string {
    const d = new Date();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${d.getFullYear()}-${mm}-${dd}`;
  }
}

const _global: any = typeof GameGlobal !== 'undefined' ? (globalThis as any).GameGlobal
  : typeof globalThis !== 'undefined' ? globalThis : {};
declare const GameGlobal: any;

if (!_global.__rankManager) { _global.__rankManager = new RankManagerClass(); }
export const RankManager: RankManagerClass = _global.__rankManager;
