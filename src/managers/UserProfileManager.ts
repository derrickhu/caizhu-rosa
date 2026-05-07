import { DEFAULT_AVATAR_PATH, USER_PROFILE_KEY } from '@/config/CloudConfig';
import { PersistService } from '@/core/PersistService';
import { Platform } from '@/core/PlatformService';

declare const GameGlobal: any;

export interface UserProfile {
  nickname: string;
  avatarUrl: string;
  updatedAt: number;
  /** 是否已经过用户授权（区分默认游客资料） */
  authorized: boolean;
}

interface StoredProfile {
  nickname?: string;
  avatarUrl?: string;
  updatedAt?: number;
  authorized?: boolean;
}

type Listener = (profile: UserProfile) => void;

class UserProfileManagerClass {
  private _profile: UserProfile = this._defaultProfile('');
  private _userId = '';
  private _listeners = new Set<Listener>();

  constructor() {
    PersistService.subscribeCloudImport((info) => {
      if (info.changedKeys.includes(USER_PROFILE_KEY)) {
        this._loadFromStorage();
        this._emit();
      }
    });
  }

  init(userId = ''): void {
    this._userId = userId || this._userId;
    this._loadFromStorage();
    this._emit();
  }

  setUserId(userId: string): void {
    if (!userId || userId === this._userId) return;
    this._userId = userId;
    if (!this._profile.authorized && !this._profile.nickname) {
      this._profile = this._defaultProfile(userId);
      this._emit();
    } else if (!this._profile.nickname) {
      this._profile.nickname = this._defaultNickname(userId);
      this._emit();
    }
  }

  get profile(): UserProfile {
    return this._profile;
  }

  get userId(): string {
    return this._userId;
  }

  get nickname(): string {
    return this._profile.nickname || this._defaultNickname(this._userId);
  }

  get avatarUrl(): string {
    return this._profile.avatarUrl || DEFAULT_AVATAR_PATH;
  }

  get isAuthorized(): boolean {
    return this._profile.authorized;
  }

  subscribe(listener: Listener): () => void {
    this._listeners.add(listener);
    try {
      listener(this._profile);
    } catch (error) {
      console.warn('[UserProfile] listener error', error);
    }
    return () => {
      this._listeners.delete(listener);
    };
  }

  /** 由 UI 提供已经从微信按钮拿到的（昵称, 本地头像）写入存档 */
  async updateProfile(nickname: string, avatarUrl: string): Promise<UserProfile> {
    const trimmedNick = String(nickname || '').trim().slice(0, 32);
    const trimmedAvatar = String(avatarUrl || '').trim();
    if (!trimmedNick && !trimmedAvatar) {
      return this._profile;
    }

    let resolvedAvatar = trimmedAvatar || this._profile.avatarUrl;
    if (trimmedAvatar && /^https?:/i.test(trimmedAvatar)) {
      try {
        resolvedAvatar = await Platform.downloadAvatar(trimmedAvatar);
      } catch {
        resolvedAvatar = trimmedAvatar;
      }
    }

    const next: UserProfile = {
      nickname: trimmedNick || this._profile.nickname || this._defaultNickname(this._userId),
      avatarUrl: resolvedAvatar || DEFAULT_AVATAR_PATH,
      updatedAt: Date.now(),
      authorized: true,
    };
    this._profile = next;
    this._saveToStorage();
    this._emit();
    return next;
  }

  /** 重置为默认（用于退出登录或开发调试） */
  reset(): void {
    this._profile = this._defaultProfile(this._userId);
    this._saveToStorage();
    this._emit();
  }

  private _defaultNickname(userId: string): string {
    const tail = (userId || '').replace(/[^A-Za-z0-9]/g, '').slice(-4) || '0000';
    return `游客${tail.toUpperCase()}`;
  }

  private _defaultProfile(userId: string): UserProfile {
    return {
      nickname: this._defaultNickname(userId),
      avatarUrl: DEFAULT_AVATAR_PATH,
      updatedAt: 0,
      authorized: false,
    };
  }

  private _loadFromStorage(): void {
    const raw = PersistService.readJSON<StoredProfile>(USER_PROFILE_KEY);
    if (!raw) {
      this._profile = this._defaultProfile(this._userId);
      return;
    }
    const nickname = String(raw.nickname || '').trim();
    const avatarUrl = String(raw.avatarUrl || '').trim();
    const updatedAt = Number(raw.updatedAt || 0);
    const authorized = Boolean(raw.authorized) || (nickname.length > 0 && !!avatarUrl);
    this._profile = {
      nickname: nickname || this._defaultNickname(this._userId),
      avatarUrl: avatarUrl || DEFAULT_AVATAR_PATH,
      updatedAt,
      authorized,
    };
  }

  private _saveToStorage(): void {
    const payload: StoredProfile = {
      nickname: this._profile.nickname,
      avatarUrl: this._profile.avatarUrl,
      updatedAt: this._profile.updatedAt,
      authorized: this._profile.authorized,
    };
    PersistService.writeJSON(USER_PROFILE_KEY, payload);
  }

  private _emit(): void {
    for (const listener of this._listeners) {
      try {
        listener(this._profile);
      } catch (error) {
        console.warn('[UserProfile] listener error', error);
      }
    }
  }
}

const _global: any = typeof GameGlobal !== 'undefined' ? GameGlobal
  : typeof globalThis !== 'undefined' ? globalThis : {};

if (!_global.__userProfileManager) {
  _global.__userProfileManager = new UserProfileManagerClass();
}

export const UserProfileManager: UserProfileManagerClass = _global.__userProfileManager;
