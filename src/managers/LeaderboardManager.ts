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
import {
  isRemoteAvatarUrl,
  resolveDisplayAvatarUrl,
  resolveDisplayNickname,
} from '@/utils/defaultProfileDisplay';
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
    if (!Number.isFinite(score) || score <= 0) return;
    await this._writeWxFriendStorage([
      { key: WX_FRIEND_CLASSIC_KEY, value: String(Math.floor(score)) },
    ]);
    if (!BackendService.available) return;
    if (score <= this._lastSubmittedClassic) return;
    try {
      await BackendService.ensureToken();
      const profile = this._profileForSubmit();
      const result = await BackendService.submitClassicScore(score, profile);
      this._lastSubmittedClassic = Math.max(this._lastSubmittedClassic, result.bestScore);
      this._classicCache = null;
      void this._writeWxFriendStorage([
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
    await this._writeWxFriendStorage([
      { key: WX_FRIEND_LEVEL_STARS_KEY, value: String(Math.max(0, Math.floor(payload.totalStars || 0))) },
      { key: WX_FRIEND_LEVEL_SCORE_KEY, value: String(Math.max(0, Math.floor(payload.totalScore || 0))) },
    ]);
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
      void this._writeWxFriendStorage([
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
        const wrapped = { ...result, fetch: { ok: true as const } };
        this._classicCache = { result: wrapped, fetchedAt: Date.now() };
        return wrapped;
      } catch (error) {
        this._logError('fetchClassicWorld', error);
        if (this._classicCache?.result.fetch?.ok !== false) return this._classicCache.result;
        return this._emptyWorldResult<LeaderboardClassicEntry>(error);
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
        const wrapped = { ...result, fetch: { ok: true as const } };
        this._levelCache = { result: wrapped, fetchedAt: Date.now() };
        return wrapped;
      } catch (error) {
        this._logError('fetchLevelWorld', error);
        if (this._levelCache?.result.fetch?.ok !== false) return this._levelCache.result;
        return this._emptyWorldResult<LeaderboardLevelEntry>(error);
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

  /** 授权后把昵称/头像同步到全服榜记录（进入排行榜时调用） */
  async resyncAuthorizedProfile(): Promise<void> {
    if (!BackendService.available || !UserProfileManager.isAuthorized) return;
    const payload = this._authorizedProfilePayload();
    if (!payload) return;
    try {
      await BackendService.ensureToken();
      await BackendService.updateProfile(payload);
      this.invalidateCache();
    } catch (error) {
      this._logError('resyncAuthorizedProfile', error);
    }
  }

  private _profileForSubmit(): { nickname: string; avatarUrl: string } {
    const authorized = this._authorizedProfilePayload();
    if (authorized) return authorized;
    const userId = UserProfileManager.userId;
    return {
      nickname: resolveDisplayNickname('', userId),
      avatarUrl: resolveDisplayAvatarUrl('', userId),
    };
  }

  private _authorizedProfilePayload(): { nickname: string; avatarUrl: string } | null {
    const profile = UserProfileManager.profile;
    if (!profile.authorized) return null;
    const nickname = String(profile.nickname || '').trim();
    const avatarUrl = String(profile.avatarUrl || '').trim();
    if (!nickname && !isRemoteAvatarUrl(avatarUrl)) return null;
    return {
      nickname: nickname || resolveDisplayNickname('', UserProfileManager.userId),
      avatarUrl: isRemoteAvatarUrl(avatarUrl) ? avatarUrl : resolveDisplayAvatarUrl('', UserProfileManager.userId),
    };
  }

  private async _syncProfileToServer(): Promise<void> {
    await this.resyncAuthorizedProfile();
  }

  private async _writeWxFriendStorage(KVDataList: Array<{ key: string; value: string }>): Promise<void> {
    if (!Platform.isWechat) return;
    const safe = KVDataList
      .filter((item) => item && item.key && item.value !== undefined && item.value !== null)
      .map((item) => ({ key: String(item.key), value: String(item.value) }));
    if (safe.length === 0) return;
    await Platform.setUserCloudStorage(safe);
  }

  private _emptyWorldResult<T>(error: unknown): LeaderboardWorldResult<T> {
    const meta: LeaderboardWorldResult<T>['fetch'] = { ok: false };
    if (error instanceof BackendError) {
      meta.code = error.code;
      meta.message = error.message;
    } else if (error instanceof Error) {
      meta.message = error.message;
    }
    return { items: [], me: null, total: 0, fetch: meta };
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
