import { Analytics, EVENT_NAMES, type DeviceInfo, type EventParamValue, type PlatformName } from '@gp/analytics-sdk';

import { BACKEND_BASE_URL, GAME_KEY } from '@/config/CloudConfig';
import { Platform } from '@/core/PlatformService';

type AnalyticsParams = Record<string, EventParamValue>;

export interface AnalyticsAdContext {
  adUnitId: string;
  scene: string;
  adType: string;
  levelId?: number | string;
  extra?: Record<string, string | number | boolean>;
}

type LevelEvent = {
  levelId: number | string;
  levelName?: string;
  mode?: string;
  durationMs?: number;
  reason?: string;
  extra?: Record<string, string | number | boolean>;
};

type TutorialEvent = {
  stepId: string;
  stepIndex?: number;
  status?: string;
  isForce?: boolean;
  extra?: Record<string, string | number | boolean>;
};

function track(eventName: string, params: AnalyticsParams = {}): void {
  Analytics.track(eventName, params);
}

function flattenExtra(params: AnalyticsParams, extra?: Record<string, string | number | boolean>): AnalyticsParams {
  if (!extra) return params;
  return { ...params, ...extra };
}

function adParams(context: AnalyticsAdContext, extra: AnalyticsParams = {}): AnalyticsParams {
  return flattenExtra({
    ad_unit_id: context.adUnitId,
    scene: context.scene,
    ad_type: context.adType,
    level_id: context.levelId == null ? null : String(context.levelId),
    ...extra,
  }, context.extra);
}

function errorToParams(error: unknown, extra: AnalyticsParams = {}): AnalyticsParams {
  const err = error as { name?: string; message?: string; stack?: string; errMsg?: string; errCode?: number };
  return {
    error_name: String(err?.name || 'Error'),
    error_message: String(err?.message || err?.errMsg || error || 'unknown'),
    error_code: err?.errCode == null ? null : Number(err.errCode),
    stack: err?.stack ? String(err.stack).slice(0, 500) : null,
    ...extra,
  };
}

export const analytics = {
  track,

  trackSessionStart(params: AnalyticsParams): void {
    track(EVENT_NAMES.SESSION_START, params);
  },

  trackSessionEnd(reasonOrParams?: string | AnalyticsParams): void {
    const params = typeof reasonOrParams === 'string'
      ? { reason: reasonOrParams }
      : (reasonOrParams || {});
    track(EVENT_NAMES.SESSION_END, params);
  },

  trackAppShow(params: AnalyticsParams): void {
    track('app_show', params);
  },

  trackAppError(error: unknown, params: AnalyticsParams = {}): void {
    track(EVENT_NAMES.APP_ERROR, errorToParams(error, params));
  },

  trackLevelStart(event: LevelEvent): void {
    track(EVENT_NAMES.LEVEL_START, flattenExtra({
      level_id: String(event.levelId),
      level_name: event.levelName || '',
      mode: event.mode || 'level',
    }, event.extra));
  },

  trackLevelClear(event: LevelEvent): void {
    track(EVENT_NAMES.LEVEL_CLEAR, flattenExtra({
      level_id: String(event.levelId),
      level_name: event.levelName || '',
      mode: event.mode || 'level',
      duration_ms: event.durationMs ?? 0,
    }, event.extra));
  },

  trackLevelFail(event: LevelEvent): void {
    track(EVENT_NAMES.LEVEL_FAIL, flattenExtra({
      level_id: String(event.levelId),
      level_name: event.levelName || '',
      mode: event.mode || 'level',
      duration_ms: event.durationMs ?? 0,
      reason: event.reason || 'unknown',
    }, event.extra));
  },

  trackTutorialStep(event: TutorialEvent): void {
    track('tutorial_step', flattenExtra({
      step_id: event.stepId,
      step_index: event.stepIndex ?? 0,
      status: event.status || '',
      is_force: !!event.isForce,
    }, event.extra));
  },

  trackAdRequest(context: AnalyticsAdContext): void {
    track(EVENT_NAMES.AD_REQUEST, adParams(context));
  },

  trackAdShow(context: AnalyticsAdContext): void {
    track(EVENT_NAMES.AD_SHOW, adParams(context));
  },

  trackAdError(context: AnalyticsAdContext, error: { errCode?: number; errMsg?: string }): void {
    track(EVENT_NAMES.AD_ERROR, adParams(context, {
      err_code: error.errCode ?? -1,
      err_msg: error.errMsg || 'unknown',
    }));
  },

  trackAdClose(context: AnalyticsAdContext, params: AnalyticsParams = {}): void {
    track(EVENT_NAMES.AD_CLOSE, adParams(context, params));
  },

  trackShareAppMessage(source: string, params: AnalyticsParams = {}): void {
    track(EVENT_NAMES.SHARE_APP_MESSAGE, { source, channel: 'app_message', ...params });
  },

  trackShareTimeline(source: string, params: AnalyticsParams = {}): void {
    track('share_timeline', { source, channel: 'timeline', ...params });
  },
};

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
