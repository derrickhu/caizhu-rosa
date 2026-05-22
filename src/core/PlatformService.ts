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

export interface PlatformShareOptions {
  title: string;
  imageUrl?: string;
  query?: string;
}

export interface PlatformShareMenuOptions {
  withShareTicket?: boolean;
  menus?: Array<'shareAppMessage' | 'shareTimeline'>;
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

  /** 是否运行在模拟器/开发工具环境（非真机）。
   *  - 微信/抖音开发工具：platform === 'devtools'
   *  - 浏览器或非小游戏环境：直接判定为模拟器
   *  GM 工具用此判断决定是否启用。 */
  get isSimulator(): boolean {
    if (!this.isMinigame) return true;
    try {
      const info = this._api?.getSystemInfoSync?.();
      const platform = String(info?.platform || '').toLowerCase();
      if (platform === 'devtools') return true;
      const env = String(info?.environment || info?.host?.env || '').toLowerCase();
      return env === 'devtools';
    } catch {
      return false;
    }
  }

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

  createCustomAd(adUnitId: string, style: any, adIntervals = 30): any {
    try {
      return this._api?.createCustomAd?.({
        adUnitId,
        adIntervals,
        style,
      });
    } catch {
      return null;
    }
  }

  get supportsGameClubButton(): boolean {
    return this.isWechat && typeof this._api?.createGameClubButton === 'function';
  }

  createGameClubButton(opts: {
    type?: 'image' | 'text';
    text?: string;
    image?: string;
    icon?: 'green' | 'white' | 'dark' | 'light';
    style: {
      left: number;
      top: number;
      width: number;
      height: number;
      backgroundColor?: string;
      borderColor?: string;
      borderWidth?: number;
      borderRadius?: number;
      color?: string;
      textAlign?: 'left' | 'center' | 'right';
      fontSize?: number;
      lineHeight?: number;
    };
  }): any {
    try {
      if (!this.supportsGameClubButton) return null;
      return this._api.createGameClubButton({
        type: opts.type || 'text',
        text: opts.text || '',
        image: opts.image,
        icon: opts.icon,
        style: {
          left: opts.style.left,
          top: opts.style.top,
          width: opts.style.width,
          height: opts.style.height,
          backgroundColor: opts.style.backgroundColor || '#00000000',
          borderColor: opts.style.borderColor || '#00000000',
          borderWidth: opts.style.borderWidth || 0,
          borderRadius: opts.style.borderRadius || 0,
          color: opts.style.color || '#00000000',
          textAlign: opts.style.textAlign || 'center',
          fontSize: opts.style.fontSize || 1,
          lineHeight: opts.style.lineHeight || opts.style.height,
        },
      });
    } catch {
      return null;
    }
  }

  showShareMenu(opts: PlatformShareMenuOptions = {}): void {
    try {
      this._api?.showShareMenu?.({
        withShareTicket: opts.withShareTicket ?? true,
        menus: opts.menus || ['shareAppMessage', 'shareTimeline'],
      });
    } catch {}
  }

  shareAppMessage(opts: PlatformShareOptions): void {
    try { this._api?.shareAppMessage?.(opts); } catch {}
  }

  onShareAppMessage(callback: () => PlatformShareOptions): void {
    try { this._api?.onShareAppMessage?.(callback); } catch {}
  }

  onShareTimeline(callback: () => PlatformShareOptions): void {
    try { this._api?.onShareTimeline?.(callback); } catch {}
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

  setClipboardData(data: string): Promise<boolean> {
    return new Promise((resolve) => {
      try {
        if (this._api?.setClipboardData) {
          this._api.setClipboardData({
            data,
            success: () => resolve(true),
            fail: () => resolve(false),
          });
          return;
        }
        if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
          navigator.clipboard.writeText(data).then(() => resolve(true)).catch(() => resolve(false));
          return;
        }
      } catch {}
      resolve(false);
    });
  }

  // ─── User profile / open-data domain (WeChat Mini Game) ───────────────

  /** 是否支持开放数据域（仅微信小游戏支持） */
  get supportsOpenData(): boolean {
    return this.isWechat && typeof this._api?.getOpenDataContext === 'function';
  }

  /** 调起头像昵称填写能力（chooseAvatar 流程通常需要 button 触发，这里仅做兜底）。
   *  现代合规方案优先用 button[type=avatar] + nickname input；
   *  我们额外提供一个 resolve 接口，让 UI 层把按钮选择出的结果传回来。 */
  setUserCloudStorage(KVDataList: Array<{ key: string; value: string }>): Promise<void> {
    return new Promise((resolve) => {
      try {
        if (!this._api?.setUserCloudStorage) {
          resolve();
          return;
        }
        this._api.setUserCloudStorage({
          KVDataList,
          success: () => resolve(),
          fail: () => resolve(),
          complete: () => undefined,
        });
      } catch {
        resolve();
      }
    });
  }

  removeUserCloudStorage(keyList: string[]): Promise<void> {
    return new Promise((resolve) => {
      try {
        if (!this._api?.removeUserCloudStorage) {
          resolve();
          return;
        }
        this._api.removeUserCloudStorage({
          keyList,
          success: () => resolve(),
          fail: () => resolve(),
          complete: () => undefined,
        });
      } catch {
        resolve();
      }
    });
  }

  /** 获取开放数据域的 OpenDataContext（仅微信小游戏） */
  getOpenDataContext(): any {
    try {
      if (!this.supportsOpenData) return null;
      return this._api.getOpenDataContext();
    } catch {
      return null;
    }
  }

  /** 获取共享 canvas（用于 PIXI 主域采样开放数据域绘制结果） */
  getSharedCanvas(): any {
    try {
      const ctx = this.getOpenDataContext();
      return ctx?.canvas || null;
    } catch {
      return null;
    }
  }

  /** 通知开放数据域子项目刷新好友榜 */
  postOpenDataMessage(message: any): boolean {
    try {
      const ctx = this.getOpenDataContext();
      if (!ctx?.postMessage) return false;
      ctx.postMessage(message);
      return true;
    } catch {
      return false;
    }
  }

  /** 创建头像/昵称填写按钮（小游戏端） */
  createUserInfoButton(opts: {
    type?: 'image' | 'text';
    text?: string;
    image?: string;
    style: { left: number; top: number; width: number; height: number };
    withCredentials?: boolean;
    lang?: string;
  }): any {
    try {
      if (!this._api?.createUserInfoButton) return null;
      return this._api.createUserInfoButton({
        type: opts.type || 'text',
        text: opts.text || '',
        image: opts.image,
        style: {
          left: opts.style.left,
          top: opts.style.top,
          width: opts.style.width,
          height: opts.style.height,
          backgroundColor: '#00000000',
          color: '#FFFFFF',
          textAlign: 'center',
          fontSize: 16,
          borderRadius: 8,
        },
        withCredentials: opts.withCredentials ?? true,
        lang: opts.lang || 'zh_CN',
      });
    } catch {
      return null;
    }
  }

  /** 调用 wx.getUserProfile 获取用户信息（旧版 SDK 兼容；新版基础库推荐用按钮触发的头像昵称填写能力）。 */
  getUserProfile(desc = '用于完善排行榜资料'): Promise<{ nickName: string; avatarUrl: string } | null> {
    return new Promise((resolve) => {
      try {
        if (!this._api?.getUserProfile) {
          resolve(null);
          return;
        }
        this._api.getUserProfile({
          desc,
          success: (res: any) => {
            const info = res?.userInfo;
            if (!info) {
              resolve(null);
              return;
            }
            resolve({
              nickName: String(info.nickName || ''),
              avatarUrl: String(info.avatarUrl || ''),
            });
          },
          fail: () => resolve(null),
        });
      } catch {
        resolve(null);
      }
    });
  }

  /** 请求微信好友关系链授权，用于开放数据域好友排行榜。 */
  authorizeWxFriendInteraction(): Promise<boolean> {
    return new Promise((resolve) => {
      try {
        if (!this.isWechat) {
          resolve(true);
          return;
        }
        const scope = 'scope.WxFriendInteraction';
        const openSetting = () => {
          if (!this._api?.openSetting) {
            resolve(false);
            return;
          }
          this._api.openSetting({
            success: (res: any) => resolve(res?.authSetting?.[scope] === true),
            fail: () => resolve(false),
          });
        };
        const requestAuthorize = () => {
          if (!this._api?.authorize) {
            openSetting();
            return;
          }
          this._api.authorize({
            scope,
            success: () => resolve(true),
            fail: () => openSetting(),
          });
        };

        if (this._api?.getSetting) {
          this._api.getSetting({
            success: (res: any) => {
              const state = res?.authSetting?.[scope];
              if (state === true) {
                resolve(true);
              } else if (state === false) {
                openSetting();
              } else {
                requestAuthorize();
              }
            },
            fail: () => requestAuthorize(),
          });
          return;
        }

        requestAuthorize();
      } catch {
        resolve(false);
      }
    });
  }

  /** 把头像 URL 下载为本地路径（小游戏环境），失败时返回原 URL。 */
  downloadAvatar(url: string): Promise<string> {
    return new Promise((resolve) => {
      try {
        if (!url) {
          resolve('');
          return;
        }
        if (!this._api?.downloadFile) {
          resolve(url);
          return;
        }
        this._api.downloadFile({
          url,
          success: (res: any) => {
            const local = String(res?.tempFilePath || '');
            resolve(local || url);
          },
          fail: () => resolve(url),
        });
      } catch {
        resolve(url);
      }
    });
  }

  /** 微信基础库版本号 (e.g. "2.27.3") */
  getSDKVersion(): string {
    try {
      const info = this._api?.getSystemInfoSync?.();
      return String(info?.SDKVersion || '');
    } catch {
      return '';
    }
  }
}

const _global: any = typeof GameGlobal !== 'undefined' ? GameGlobal
  : typeof globalThis !== 'undefined' ? globalThis : {};

if (!_global.__platformService) {
  _global.__platformService = new PlatformServiceClass();
}

export const Platform: PlatformServiceClass = _global.__platformService;
