import { analytics, type AnalyticsAdContext } from '@/analytics';
import { Platform } from '@/core/PlatformService';

export type RewardedAdResult = 'completed' | 'skipped' | 'unavailable' | 'error';

export interface RewardedAdContext {
  scene: string;
  levelId?: number | string;
  extra?: Record<string, string | number | boolean>;
}

const SDK_ERR_UNAVAILABLE = -100;
const SDK_ERR_BUSY = -101;

const rewardedAds = new Map<string, any>();
const listenerReady = new Set<string>();
let pendingResolve: ((result: RewardedAdResult) => void) | null = null;
let pendingContext: AnalyticsAdContext | null = null;
let pendingAdUnitId: string | null = null;
let pendingShowResolved = false;
let errorReportedThisCycle = false;

function buildAnalyticsContext(adUnitId: string, context: RewardedAdContext): AnalyticsAdContext {
  return {
    adUnitId,
    scene: context.scene,
    adType: 'reward',
    levelId: context.levelId,
    extra: context.extra,
  };
}

function reportAdErrorOnce(context: AnalyticsAdContext | null, errCode: number, errMsg: string): void {
  if (!context || errorReportedThisCycle) return;
  errorReportedThisCycle = true;
  analytics.trackAdError(context, { errCode, errMsg });
}

function finishPending(adUnitId: string, result: RewardedAdResult): void {
  if (pendingAdUnitId !== adUnitId) return;
  const resolve = pendingResolve;
  const context = pendingContext;
  if (!resolve) return;

  pendingResolve = null;
  pendingContext = null;
  pendingAdUnitId = null;
  pendingShowResolved = false;

  if (context) {
    analytics.trackAdClose(context, {
      completed: result === 'completed',
      is_ended: result === 'completed',
      result,
    });
  }
  resolve(result);

  rewardedAds.get(adUnitId)?.load?.().catch?.((err: any) => {
    console.warn('[RewardedAd] reload failed', adUnitId, err);
  });
}

function bindListeners(ad: any, adUnitId: string): void {
  if (listenerReady.has(adUnitId)) return;
  listenerReady.add(adUnitId);
  ad.onClose?.((res?: { isEnded?: boolean }) => {
    finishPending(adUnitId, res?.isEnded === false ? 'skipped' : 'completed');
  });
  ad.onError?.((err: { errMsg?: string; errCode?: number }) => {
    console.warn('[RewardedAd] error', adUnitId, err);
    if (pendingAdUnitId !== adUnitId) return;
    reportAdErrorOnce(pendingContext, Number(err?.errCode ?? -1), String(err?.errMsg || 'unknown'));
    if (pendingShowResolved) {
      finishPending(adUnitId, 'error');
    }
  });
}

function getRewardedAd(adUnitId: string): any | null {
  const existing = rewardedAds.get(adUnitId);
  if (existing) {
    bindListeners(existing, adUnitId);
    return existing;
  }
  const ad = Platform.createRewardedVideoAd(adUnitId);
  if (!ad) return null;
  rewardedAds.set(adUnitId, ad);
  bindListeners(ad, adUnitId);
  return ad;
}

export function warmupRewardedAd(adUnitId: string): void {
  const ad = getRewardedAd(adUnitId);
  ad?.load?.().catch?.((err: any) => {
    console.warn('[RewardedAd] warmup failed', adUnitId, err);
  });
}

export async function showRewardedAd(adUnitId: string, context: RewardedAdContext): Promise<RewardedAdResult> {
  if (Platform.isSimulator) {
    return 'unavailable';
  }

  const analyticsContext = buildAnalyticsContext(adUnitId, context);
  analytics.trackAdRequest(analyticsContext);

  if (pendingResolve) {
    analytics.trackAdError(analyticsContext, { errCode: SDK_ERR_BUSY, errMsg: 'busy' });
    return 'error';
  }

  const ad = getRewardedAd(adUnitId);
  if (!ad) {
    analytics.trackAdError(analyticsContext, { errCode: SDK_ERR_UNAVAILABLE, errMsg: 'unavailable' });
    return 'unavailable';
  }

  pendingAdUnitId = adUnitId;
  pendingContext = analyticsContext;
  pendingShowResolved = false;
  errorReportedThisCycle = false;

  return new Promise<RewardedAdResult>((resolve) => {
    pendingResolve = resolve;
    ad.show?.()
      .then(() => {
        if (pendingAdUnitId === adUnitId) {
          pendingShowResolved = true;
          analytics.trackAdShow(analyticsContext);
        }
      })
      .catch(() => ad.load?.().then(() => ad.show?.()).then(() => {
        if (pendingAdUnitId === adUnitId) {
          pendingShowResolved = true;
          analytics.trackAdShow(analyticsContext);
        }
      }))
      .catch((err: { errMsg?: string; errCode?: number } | Error | undefined) => {
        if (pendingAdUnitId !== adUnitId) return;
        const e = err as { errMsg?: string; errCode?: number } | undefined;
        reportAdErrorOnce(
          pendingContext,
          Number(e?.errCode ?? -1),
          String(e?.errMsg || (err as Error)?.message || 'unknown'),
        );
        finishPending(adUnitId, 'error');
      });
  });
}
