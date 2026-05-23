import { Analytics, type AnalyticsAdContext, type DeviceInfo, type PlatformName } from '@gp/analytics-sdk';

import { BACKEND_BASE_URL, GAME_KEY } from '@/config/CloudConfig';
import { Platform } from '@/core/PlatformService';

export const analytics = Analytics;
export type { AnalyticsAdContext };

const APP_VERSION = '1.0.0';
const ENDPOINT = `${BACKEND_BASE_URL}/analytics-ingest/track`;

let inited = false;

export function initAnalytics(opts?: { endpoint?: string; userId?: string; debug?: boolean }): void {
  if (inited) return;

  Analytics.init({
    endpoint: opts?.endpoint || ENDPOINT,
    gameKey: GAME_KEY,
    appVersion: APP_VERSION,
    platform: mapPlatform(),
    deviceInfo: buildDeviceInfo(),
    initialUserId: opts?.userId,
    transport: { request: Platform.request.bind(Platform) },
    storage: {
      get: Platform.getStorageSync.bind(Platform),
      set: Platform.setStorageSync.bind(Platform),
      remove: Platform.removeStorageSync.bind(Platform),
    },
    lifecycle: { onHide: Platform.onHide.bind(Platform) },
    debug: opts?.debug,
  });

  inited = true;
}

export function setAnalyticsUserId(userId: string): void {
  if (!inited) return;
  Analytics.setUserId(userId || '');
}

function mapPlatform(): PlatformName {
  if (Platform.isWechat) return 'wechat';
  if (Platform.isDouyin) return 'douyin';
  if (Platform.isMinigame) return 'unknown';
  return 'h5';
}

function buildDeviceInfo(): DeviceInfo {
  const sys = Platform.getSystemInfoSync() || {};
  return {
    brand: String(sys.brand || sys.deviceBrand || ''),
    model: String(sys.model || sys.deviceModel || ''),
    system: String(sys.system || ''),
    sdkVersion: String(sys.SDKVersion || sys.sdkVersion || ''),
    screenWidth: Number(sys.screenWidth) || 0,
    screenHeight: Number(sys.screenHeight) || 0,
    network: 'unknown',
  };
}
