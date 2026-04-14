declare const wx: any;
declare const tt: any;
declare const GameGlobal: any;

export type PlatformName = 'wechat' | 'douyin' | 'unknown';

class PlatformServiceClass {
  readonly name: PlatformName;
  private _api: any;

  constructor() {
    if (typeof wx !== 'undefined') {
      this._api = wx;
      this.name = 'wechat';
    } else if (typeof tt !== 'undefined') {
      this._api = tt;
      this.name = 'douyin';
    } else {
      this._api = null;
      this.name = 'unknown';
    }
  }

  get isMinigame(): boolean { return this._api !== null; }
  get isWechat(): boolean { return this.name === 'wechat'; }
  get api(): any { return this._api; }

  getStorageSync(key: string): string | null {
    try { return this._api?.getStorageSync(key) || null; } catch { return null; }
  }

  setStorageSync(key: string, value: string): void {
    try { this._api?.setStorageSync(key, value); } catch {}
  }

  removeStorageSync(key: string): void {
    try { this._api?.removeStorageSync(key); } catch {}
  }

  getSystemInfoSync(): any {
    try { return this._api?.getSystemInfoSync?.() || null; } catch { return null; }
  }

  getMenuButtonBoundingClientRect(): any {
    try { return this._api?.getMenuButtonBoundingClientRect?.() || null; } catch { return null; }
  }

  vibrateShort(): void {
    try { this._api?.vibrateShort?.({ type: 'light' }); } catch {}
  }

  createRewardedVideoAd(adUnitId: string): any {
    try { return this._api?.createRewardedVideoAd?.({ adUnitId }); } catch { return null; }
  }

  createBannerAd(adUnitId: string, style: any): any {
    try { return this._api?.createBannerAd?.({ adUnitId, style }); } catch { return null; }
  }

  createInterstitialAd(adUnitId: string): any {
    try { return this._api?.createInterstitialAd?.({ adUnitId }); } catch { return null; }
  }

  shareAppMessage(opts: { title: string; imageUrl?: string; query?: string }): void {
    try { this._api?.shareAppMessage?.(opts); } catch {}
  }

  onShareAppMessage(callback: () => { title: string; imageUrl?: string; query?: string }): void {
    try { this._api?.onShareAppMessage?.(callback); } catch {}
  }

  onHide(callback: () => void): void {
    try { this._api?.onHide?.(callback); } catch {}
  }

  onShow(callback: (res?: any) => void): void {
    try { this._api?.onShow?.(callback); } catch {}
  }

  showToast(title: string, icon: 'success' | 'none' | 'error' = 'none'): void {
    try { this._api?.showToast?.({ title, icon, duration: 2000 }); } catch {}
  }
}

const _global: any = typeof GameGlobal !== 'undefined' ? GameGlobal
  : typeof globalThis !== 'undefined' ? globalThis : {};

if (!_global.__platformService) {
  _global.__platformService = new PlatformServiceClass();
}

export const Platform: PlatformServiceClass = _global.__platformService;
