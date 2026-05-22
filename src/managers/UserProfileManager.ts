import { USER_PROFILE_KEY } from '@/config/CloudConfig';
import { PersistService } from '@/core/PersistService';
import {
  formatDefaultNickname,
  getDefaultOrbAvatarPath,
  isLegacyDefaultAvatar,
  isRemoteAvatarUrl,
  resolveDisplayAvatarUrl,
  resolveDisplayNickname,
} from '@/utils/defaultProfileDisplay';

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
    if (!this._profile.authorized) {
      this._profile = this._defaultProfile(userId);
      this._emit();
    } else if (!this._profile.nickname) {
      this._profile.nickname = formatDefaultNickname(userId);
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
    return resolveDisplayNickname(this._profile.nickname, this._userId);
  }

  get avatarUrl(): string {
    return resolveDisplayAvatarUrl(this._profile.avatarUrl, this._userId);
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

  /** 由 UI 提供已经从微信拿到的昵称和头像 URL 写入存档。 */
  async updateProfile(nickname: string, avatarUrl: string): Promise<UserProfile> {
    const trimmedNick = String(nickname || '').trim().slice(0, 32);
    const trimmedAvatar = String(avatarUrl || '').trim();
    if (!trimmedNick && !trimmedAvatar) {
      return this._profile;
    }

    const next: UserProfile = {
      nickname: trimmedNick || this._profile.nickname || formatDefaultNickname(this._userId),
      avatarUrl: this._normalizeAvatarUrl(trimmedAvatar || this._profile.avatarUrl, true),
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

  private _defaultProfile(userId: string): UserProfile {
    return {
      nickname: formatDefaultNickname(userId),
      avatarUrl: getDefaultOrbAvatarPath(userId),
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
    let avatarUrl = this._normalizeAvatarUrl(String(raw.avatarUrl || '').trim(), false);
    const updatedAt = Number(raw.updatedAt || 0);
    const authorized = Boolean(raw.authorized) && isRemoteAvatarUrl(avatarUrl);

    this._profile = {
      nickname: authorized
        ? (nickname || formatDefaultNickname(this._userId))
        : formatDefaultNickname(this._userId),
      avatarUrl: authorized
        ? avatarUrl
        : getDefaultOrbAvatarPath(this._userId),
      updatedAt,
      authorized,
    };

    if (!authorized && (nickname !== this._profile.nickname || avatarUrl !== this._profile.avatarUrl)) {
      this._saveToStorage();
    }
  }

  private _normalizeAvatarUrl(url: string, fromWechat: boolean): string {
    const trimmed = String(url || '').trim();
    if (this._isTemporaryAvatarUrl(trimmed)) {
      return fromWechat ? trimmed : getDefaultOrbAvatarPath(this._userId);
    }
    if (!trimmed || isLegacyDefaultAvatar(trimmed)) {
      return getDefaultOrbAvatarPath(this._userId);
    }
    return trimmed;
  }

  private _isTemporaryAvatarUrl(url: string): boolean {
    return /^(wxfile:|ttfile:|blob:)/i.test(url);
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
