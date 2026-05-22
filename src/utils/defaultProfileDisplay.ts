import { DEFAULT_AVATAR_PATH } from '@/config/CloudConfig';
import { ORB_AVATAR_PATHS } from '@/utils/orbLoader';

function hashUserId(userId: string): number {
  const seed = String(userId || 'guest');
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = (Math.imul(31, h) + seed.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

/** 未授权时的默认昵称：玩家 + 3 位数字（同一 userId 稳定不变） */
export function formatDefaultNickname(userId: string): string {
  const suffix = 100 + (hashUserId(userId) % 900);
  return `玩家${suffix}`;
}

/** 未授权时的默认头像：按 userId 稳定映射到一颗珠子图 */
export function getDefaultOrbAvatarPath(userId: string): string {
  const idx = hashUserId(userId) % ORB_AVATAR_PATHS.length;
  return ORB_AVATAR_PATHS[idx] || ORB_AVATAR_PATHS[0];
}

export function isLegacyDefaultAvatar(url: string): boolean {
  const u = String(url || '').trim();
  if (!u) return true;
  if (u === DEFAULT_AVATAR_PATH) return true;
  return /avatar_default\.png$/i.test(u);
}

export function isRemoteAvatarUrl(url: string): boolean {
  return /^https?:/i.test(String(url || '').trim());
}

export function resolveDisplayAvatarUrl(avatarUrl: string, userId: string): string {
  const trimmed = String(avatarUrl || '').trim();
  if (isRemoteAvatarUrl(trimmed)) return trimmed;
  if (trimmed && !isLegacyDefaultAvatar(trimmed)) return trimmed;
  return getDefaultOrbAvatarPath(userId);
}

/** 是否为系统自动生成的默认昵称（玩家123 / 游客XXXX） */
export function isGeneratedDefaultNickname(nickname: string): boolean {
  const n = String(nickname || '').trim();
  return /^玩家\d{3}$/.test(n) || /^游客/i.test(n);
}

export function resolveDisplayNickname(nickname: string, userId: string): string {
  const trimmed = String(nickname || '').trim();
  if (!trimmed || isGeneratedDefaultNickname(trimmed)) {
    return formatDefaultNickname(userId);
  }
  return trimmed;
}
