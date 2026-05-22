import {
  BACKEND_ANON_ID_KEY,
  BACKEND_BASE_URL,
  BACKEND_LB_CLASSIC_SUBMIT_PATH,
  BACKEND_LB_CLASSIC_WORLD_PATH,
  BACKEND_LB_LEVEL_SUBMIT_PATH,
  BACKEND_LB_LEVEL_WORLD_PATH,
  BACKEND_LOGIN_PATH,
  BACKEND_PROFILE_GET_PATH,
  BACKEND_PROFILE_UPDATE_PATH,
  BACKEND_PULL_PATH,
  BACKEND_PUSH_PATH,
  BACKEND_REQUEST_TIMEOUT_MS,
  BACKEND_TOKEN_KEY,
} from '@/config/CloudConfig';
import { Platform } from '@/core/PlatformService';

export interface BackendPullResult {
  userId: string;
  platform: string;
  exists: boolean;
  schemaVersion: number;
  updatedAt: number;
  payload: Record<string, string>;
  payloadKeys: string[];
  clientFingerprint?: string;
}

export interface BackendPushPayload {
  schemaVersion: number;
  updatedAt: number;
  baseRemoteUpdatedAt: number;
  clientFingerprint: string;
  payload: Record<string, string>;
}

export interface BackendPushResult {
  userId: string;
  updatedAt: number;
  savedAt: number;
  mode: 'insert' | 'update';
  sizeBytes: number;
}

export interface LeaderboardClassicEntry {
  rank: number;
  isMe: boolean;
  userId: string;
  nickname: string;
  avatarUrl: string;
  bestScore: number;
  updatedAt: number;
}

export interface LeaderboardLevelEntry {
  rank: number;
  isMe: boolean;
  userId: string;
  nickname: string;
  avatarUrl: string;
  totalStars: number;
  totalScore: number;
  maxUnlocked: number;
  updatedAt: number;
}

export interface LeaderboardFetchMeta {
  ok: boolean;
  code?: string;
  message?: string;
}

export interface LeaderboardWorldResult<T> {
  items: T[];
  me: T | null;
  total: number;
  /** 全服榜接口拉取状态；失败时 items 为空，不应把本地成绩混入列表冒充全服榜 */
  fetch?: LeaderboardFetchMeta;
}

export interface LeaderboardSubmitProfile {
  nickname?: string;
  avatarUrl?: string;
}

export interface ClassicSubmitResult {
  userId: string;
  bestScore: number;
  savedAt: number;
  improved: boolean;
}

export interface LevelSubmitResult {
  userId: string;
  totalStars: number;
  totalScore: number;
  maxUnlocked: number;
  savedAt: number;
  improved: boolean;
}

export interface ProfileUpdateResult {
  userId: string;
  nickname: string;
  avatarUrl: string;
  savedAt: number;
}

interface StoredToken {
  token: string;
  userId: string;
  platform: string;
  expiresAt: number;
}

export class BackendError extends Error {
  readonly status: number;
  readonly code: string;
  readonly data?: any;

  constructor(status: number, code: string, message: string, data?: any) {
    super(message);
    this.name = 'BackendError';
    this.status = status;
    this.code = code;
    this.data = data;
  }
}

class BackendServiceClass {
  private stored: StoredToken | null = null;
  private loginInflight: Promise<StoredToken> | null = null;

  get available(): boolean {
    return Platform.canUseBackend;
  }

  get userId(): string {
    return this.stored?.userId || '';
  }

  async ensureToken(): Promise<StoredToken> {
    if (this.stored && this.stored.expiresAt - Date.now() > 60_000) {
      return this.stored;
    }
    const cached = this.loadTokenFromStorage();
    if (cached && cached.expiresAt - Date.now() > 60_000) {
      this.stored = cached;
      return cached;
    }
    if (this.loginInflight) {
      return this.loginInflight;
    }
    this.loginInflight = this.login()
      .finally(() => {
        this.loginInflight = null;
      });
    return this.loginInflight;
  }

  pullSave(): Promise<BackendPullResult> {
    return this.callWithAuth<BackendPullResult>(BACKEND_PULL_PATH, {});
  }

  pushSave(snapshot: BackendPushPayload): Promise<BackendPushResult> {
    return this.callWithAuth<BackendPushResult>(BACKEND_PUSH_PATH, snapshot);
  }

  submitClassicScore(
    score: number,
    profile?: LeaderboardSubmitProfile,
  ): Promise<ClassicSubmitResult> {
    return this.callWithAuth<ClassicSubmitResult>(BACKEND_LB_CLASSIC_SUBMIT_PATH, {
      score: Math.floor(Math.max(0, score)),
      ...(profile || {}),
    });
  }

  submitLevelProgress(
    payload: { totalStars: number; totalScore: number; maxUnlocked: number },
    profile?: LeaderboardSubmitProfile,
  ): Promise<LevelSubmitResult> {
    return this.callWithAuth<LevelSubmitResult>(BACKEND_LB_LEVEL_SUBMIT_PATH, {
      totalStars: Math.max(0, Math.floor(payload.totalStars)),
      totalScore: Math.max(0, Math.floor(payload.totalScore)),
      maxUnlocked: Math.max(1, Math.floor(payload.maxUnlocked)),
      ...(profile || {}),
    });
  }

  fetchClassicWorld(limit = 100): Promise<LeaderboardWorldResult<LeaderboardClassicEntry>> {
    return this.callWithAuth<LeaderboardWorldResult<LeaderboardClassicEntry>>(
      BACKEND_LB_CLASSIC_WORLD_PATH,
      { limit: Math.max(1, Math.min(200, Math.floor(limit))) },
    );
  }

  fetchLevelWorld(limit = 100): Promise<LeaderboardWorldResult<LeaderboardLevelEntry>> {
    return this.callWithAuth<LeaderboardWorldResult<LeaderboardLevelEntry>>(
      BACKEND_LB_LEVEL_WORLD_PATH,
      { limit: Math.max(1, Math.min(200, Math.floor(limit))) },
    );
  }

  updateProfile(profile: LeaderboardSubmitProfile): Promise<ProfileUpdateResult> {
    return this.callWithAuth<ProfileUpdateResult>(BACKEND_PROFILE_UPDATE_PATH, {
      nickname: String(profile.nickname || '').slice(0, 32),
      avatarUrl: String(profile.avatarUrl || '').slice(0, 512),
    });
  }

  fetchProfile(): Promise<{ userId: string; nickname: string; avatarUrl: string; exists: boolean }> {
    return this.callWithAuth(BACKEND_PROFILE_GET_PATH, {});
  }

  clearToken(): void {
    this.stored = null;
    Platform.removeStorageSync(BACKEND_TOKEN_KEY);
  }

  private async login(): Promise<StoredToken> {
    const body = await this.buildLoginBody();
    const { status, data } = await this.request(BACKEND_LOGIN_PATH, body, undefined);
    if (status !== 200 || !data || data.ok !== true || !data.data?.token) {
      const code = data?.code || 'LOGIN_FAIL';
      const msg = data?.error || `login failed (status=${status})`;
      throw new BackendError(status, code, msg, data?.data);
    }
    const stored = {
      token: String(data.data.token),
      userId: String(data.data.userId || ''),
      platform: String(data.data.platform || body.platform),
      expiresAt: Number(data.data.expiresAt || 0),
    };
    this.stored = stored;
    Platform.setStorageSync(BACKEND_TOKEN_KEY, JSON.stringify(stored));
    console.log(`[Backend] login ok userId=${stored.userId}`);
    return stored;
  }

  private async buildLoginBody(): Promise<{ platform: string; code?: string; anonId?: string }> {
    if (Platform.isWechat) {
      const code = await Platform.loginCode();
      if (!code) {
        throw new BackendError(0, 'NO_WX_CODE', 'wx.login did not return code');
      }
      return { platform: 'wx', code };
    }
    if (Platform.isDouyin) {
      const code = await Platform.loginCode();
      if (!code) {
        throw new BackendError(0, 'NO_TT_CODE', 'tt.login did not return code');
      }
      return { platform: 'dy', code };
    }
    return { platform: 'anon', anonId: this.getOrCreateAnonId() };
  }

  private getOrCreateAnonId(): string {
    const existing = Platform.getStorageSync(BACKEND_ANON_ID_KEY);
    if (existing) {
      return existing;
    }
    const id = `anon_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
    Platform.setStorageSync(BACKEND_ANON_ID_KEY, id);
    return id;
  }

  private async callWithAuth<T>(path: string, body: any): Promise<T> {
    const token = await this.ensureToken();
    const { status, data } = await this.request(path, body, token.token);
    if (status === 401) {
      this.clearToken();
      const retryToken = await this.ensureToken();
      const retry = await this.request(path, body, retryToken.token);
      return this.unwrap<T>(retry.status, retry.data);
    }
    return this.unwrap<T>(status, data);
  }

  private unwrap<T>(status: number, data: any): T {
    if (status === 200 && data?.ok === true) {
      return data.data as T;
    }
    const code = data?.code || `HTTP_${status}`;
    const msg = data?.error || `request failed status=${status}`;
    throw new BackendError(status, code, msg, data?.data);
  }

  private async request(
    path: string,
    body: any,
    token: string | undefined,
  ): Promise<{ status: number; data: any }> {
    const headers: Record<string, string> = {
      'content-type': 'application/json',
    };
    if (token) {
      headers.authorization = `Bearer ${token}`;
    }
    const res = await Platform.request({
      url: BACKEND_BASE_URL + path,
      method: 'POST',
      data: body || {},
      headers,
      timeoutMs: BACKEND_REQUEST_TIMEOUT_MS,
    });
    return { status: res.statusCode, data: res.data };
  }

  private loadTokenFromStorage(): StoredToken | null {
    const raw = Platform.getStorageSync(BACKEND_TOKEN_KEY);
    if (!raw) {
      return null;
    }
    try {
      const parsed = JSON.parse(raw) as Partial<StoredToken>;
      if (!parsed.token) {
        return null;
      }
      return {
        token: parsed.token,
        userId: parsed.userId || '',
        platform: parsed.platform || '',
        expiresAt: Number(parsed.expiresAt || 0),
      };
    } catch {
      return null;
    }
  }
}

export const BackendService = new BackendServiceClass();
