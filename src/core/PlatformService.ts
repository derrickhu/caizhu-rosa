declare const wx: any;
declare const tt: any;
declare const GameGlobal: any;

export type PlatformName = 'wechat' | 'douyin' | 'unknown';

export interface PlatformRequestOptions {
  url: string;
  method?: 'GET' | 'POST';
  data?: any;
  headers?: Record<string, string>;
  timeoutMs?: number;
}

export interface PlatformRequestResult {
  statusCode: number;
  data: any;
}

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
  get isDouyin(): boolean { return this.name === 'douyin'; }
  get canUseBackend(): boolean { return this.isWechat || this.isDouyin || !this.isMinigame; }
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

  loginCode(): Promise<string> {
    return new Promise((resolve) => {
      try {
        if (!this._api?.login) {
          resolve('');
          return;
        }
        this._api.login({
          success: (res: any) => resolve(String(res?.code || '')),
          fail: () => resolve(''),
        });
      } catch {
        resolve('');
      }
    });
  }

  request(options: PlatformRequestOptions): Promise<PlatformRequestResult> {
    return new Promise((resolve, reject) => {
      try {
        if (!this._api?.request) {
          if (typeof fetch === 'function') {
            fetch(options.url, {
              method: options.method || 'GET',
              headers: options.headers,
              body: options.data === undefined ? undefined : JSON.stringify(options.data),
            })
              .then(async (res) => resolve({ statusCode: res.status, data: await res.json().catch(() => null) }))
              .catch(reject);
            return;
          }
          reject(new Error('platform request unavailable'));
          return;
        }
        this._api.request({
          url: options.url,
          method: options.method || 'GET',
          data: options.data,
          header: options.headers,
          timeout: options.timeoutMs,
          success: (res: any) => resolve({
            statusCode: Number(res?.statusCode || 0),
            data: res?.data,
          }),
          fail: (err: any) => reject(err),
        });
      } catch (error) {
        reject(error);
      }
    });
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
