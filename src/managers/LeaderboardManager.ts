import {
  WX_FRIEND_CLASSIC_KEY,
  WX_FRIEND_LEVEL_SCORE_KEY,
  WX_FRIEND_LEVEL_STARS_KEY,
} from '@/config/CloudConfig';
import {
  BackendError,
  BackendService,
  type LeaderboardClassicEntry,
  type LeaderboardLevelEntry,
  type LeaderboardWorldResult,
} from '@/core/BackendService';
import { Platform } from '@/core/PlatformService';
import { UserProfileManager } from './UserProfileManager';

declare const GameGlobal: any;

const CACHE_TTL_MS = 30_000;

interface CachedWorld<T> {
  result: LeaderboardWorldResult<T>;
  fetchedAt: number;
}

class LeaderboardManagerClass {
  private _classicCache: CachedWorld<LeaderboardClassicEntry> | null = null;
  private _levelCache: CachedWorld<LeaderboardLevelEntry> | null = null;
  private _classicInflight: Promise<LeaderboardWorldResult<LeaderboardClassicEntry>> | null = null;
  private _levelInflight: Promise<LeaderboardWorldResult<LeaderboardLevelEntry>> | null = null;
  private _lastSubmittedClassic = -1;
  private _lastSubmittedLevelStars = -1;
  private _lastSubmittedLevelScore = -1;

  init(): void {
    UserProfileManager.subscribe((profile) => {
      if (profile.authorized) {
        // Resync nickname/avatar to leaderboards on profile change.
        void this._syncProfileToServer();
      }
    });
  }

  /** 上报经典模式分数。失败时静默重试（仅记录日志），不阻塞 UI。 */
  async submitClassicScore(score: number): Promise<void> {
    if (!BackendService.available) return;
    if (!Number.isFinite(score) || score <= 0) return;
    if (score <= this._lastSubmittedClassic) return;
    try {
      await BackendService.ensureToken();
      const profile = this._profileForSubmit();
      const result = await BackendService.submitClassicScore(score, profile);
      this._lastSubmittedClassic = Math.max(this._lastSubmittedClassic, result.bestScore);
      this._classicCache = null;
      this._writeWxFriendStorage([
        { key: WX_FRIEND_CLASSIC_KEY, value: String(result.bestScore) },
      ]);
    } catch (error) {
      this._logError('submitClassicScore', error);
    }
  }

  /** 上报关卡模式累计星星 / 累计分数 / 已解锁关卡 */
  async submitLevelProgress(payload: {
    totalStars: number;
    totalScore: number;
    maxUnlocked: number;
  }): Promise<void> {
    if (!BackendService.available) return;
    if (
      payload.totalStars <= this._lastSubmittedLevelStars
      && payload.totalScore <= this._lastSubmittedLevelScore
    ) {
      return;
    }
    try {
      await BackendService.ensureToken();
      const profile = this._profileForSubmit();
      const result = await BackendService.submitLevelProgress(payload, profile);
      this._lastSubmittedLevelStars = Math.max(this._lastSubmittedLevelStars, result.totalStars);
      this._lastSubmittedLevelScore = Math.max(this._lastSubmittedLevelScore, result.totalScore);
      this._levelCache = null;
      this._writeWxFriendStorage([
        { key: WX_FRIEND_LEVEL_STARS_KEY, value: String(result.totalStars) },
        { key: WX_FRIEND_LEVEL_SCORE_KEY, value: String(result.totalScore) },
      ]);
    } catch (error) {
      this._logError('submitLevelProgress', error);
    }
  }

  async fetchClassicWorld(force = false): Promise<LeaderboardWorldResult<LeaderboardClassicEntry>> {
    if (!BackendService.available) {
      return { items: [], me: null, total: 0 };
    }
    if (!force && this._classicCache && Date.now() - this._classicCache.fetchedAt < CACHE_TTL_MS) {
      return this._classicCache.result;
    }
    if (this._classicInflight) return this._classicInflight;
    this._classicInflight = (async () => {
      try {
        await BackendService.ensureToken();
        const result = await BackendService.fetchClassicWorld(100);
        this._classicCache = { result, fetchedAt: Date.now() };
        return result;
      } catch (error) {
        this._logError('fetchClassicWorld', error);
        if (this._classicCache) return this._classicCache.result;
        return { items: [], me: null, total: 0 } as LeaderboardWorldResult<LeaderboardClassicEntry>;
      } finally {
        this._classicInflight = null;
      }
    })();
    return this._classicInflight;
  }

  async fetchLevelWorld(force = false): Promise<LeaderboardWorldResult<LeaderboardLevelEntry>> {
    if (!BackendService.available) {
      return { items: [], me: null, total: 0 };
    }
    if (!force && this._levelCache && Date.now() - this._levelCache.fetchedAt < CACHE_TTL_MS) {
      return this._levelCache.result;
    }
    if (this._levelInflight) return this._levelInflight;
    this._levelInflight = (async () => {
      try {
        await BackendService.ensureToken();
        const result = await BackendService.fetchLevelWorld(100);
        this._levelCache = { result, fetchedAt: Date.now() };
        return result;
      } catch (error) {
        this._logError('fetchLevelWorld', error);
        if (this._levelCache) return this._levelCache.result;
        return { items: [], me: null, total: 0 } as LeaderboardWorldResult<LeaderboardLevelEntry>;
      } finally {
        this._levelInflight = null;
      }
    })();
    return this._levelInflight;
  }

  invalidateCache(): void {
    this._classicCache = null;
    this._levelCache = null;
  }

  private _profileForSubmit(): { nickname: string; avatarUrl: string } | undefined {
    const profile = UserProfileManager.profile;
    if (!profile.authorized) return undefined;
    if (!profile.nickname && !profile.avatarUrl) return undefined;
    return {
      nickname: profile.nickname,
      avatarUrl: profile.avatarUrl,
    };
  }

  private async _syncProfileToServer(): Promise<void> {
    if (!BackendService.available) return;
    const profile = UserProfileManager.profile;
    if (!profile.authorized) return;
    try {
      await BackendService.ensureToken();
      await BackendService.updateProfile({
        nickname: profile.nickname,
        avatarUrl: profile.avatarUrl,
      });
      this.invalidateCache();
    } catch (error) {
      this._logError('updateProfile', error);
    }
  }

  private _writeWxFriendStorage(KVDataList: Array<{ key: string; value: string }>): void {
    if (!Platform.isWechat) return;
    const safe = KVDataList
      .filter((item) => item && item.key && item.value !== undefined && item.value !== null)
      .map((item) => ({ key: String(item.key), value: String(item.value) }));
    if (safe.length === 0) return;
    void Platform.setUserCloudStorage(safe);
  }

  private _logError(scope: string, error: unknown): void {
    if (error instanceof BackendError) {
      console.warn(`[Leaderboard:${scope}] ${error.code} ${error.message}`);
    } else {
      console.warn(`[Leaderboard:${scope}]`, error);
    }
  }
}

const _global: any = typeof GameGlobal !== 'undefined' ? GameGlobal
  : typeof globalThis !== 'undefined' ? globalThis : {};

if (!_global.__leaderboardManager) {
  _global.__leaderboardManager = new LeaderboardManagerClass();
}

export const LeaderboardManager: LeaderboardManagerClass = _global.__leaderboardManager;
