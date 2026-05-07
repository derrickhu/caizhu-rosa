import { PROP_INVENTORY_KEY } from '@/config/CloudConfig';
import { EventBus } from '@/core/EventBus';
import { PersistService } from '@/core/PersistService';
import { Platform } from '@/core/PlatformService';
import { PropType, PROP_DEFS } from '@/config/PropConfig';

interface PropInventory {
  [key: string]: number;
}

class PropManagerClass {
  private _inventory: PropInventory = {};
  private _sessionUsage: Record<string, number> = {};
  private _adResolve: ((granted: boolean) => void) | null = null;

  constructor() {
    PersistService.subscribeCloudImport((info) => {
      if (info.changedKeys.includes(PROP_INVENTORY_KEY)) {
        this._load();
        for (const type of Object.values(PropType)) {
          EventBus.emit('prop:stockChanged', type, this.getStock(type));
        }
      }
    });
  }

  init(): void {
    this._load();
  }

  /** Reset per-game usage counters (call at start of each game) */
  resetSession(): void {
    this._sessionUsage = {};
  }

  /** Get current stock of a prop */
  getStock(type: PropType): number {
    return this._inventory[type] ?? 0;
  }

  /** Check if a prop can be used this session */
  canUse(type: PropType): boolean {
    const stock = this.getStock(type);
    if (stock <= 0) return false;
    const def = PROP_DEFS[type];
    const used = this._sessionUsage[type] ?? 0;
    return used < def.maxPerGame;
  }

  /** Consume one use of a prop. Returns true if successful. */
  use(type: PropType): boolean {
    if (!this.canUse(type)) return false;
    this._inventory[type] = (this._inventory[type] ?? 0) - 1;
    this._sessionUsage[type] = (this._sessionUsage[type] ?? 0) + 1;
    this._save();
    EventBus.emit('prop:used', type);
    return true;
  }

  /** Add stock (after watching ad or as reward) */
  addStock(type: PropType, count: number = 1): void {
    this._inventory[type] = (this._inventory[type] ?? 0) + count;
    this._save();
    EventBus.emit('prop:stockChanged', type, this._inventory[type]);
  }

  /** Request to use a prop with ad fallback.
   *  If stock > 0, use directly. Otherwise trigger ad flow.
   *  Returns a promise that resolves to true if prop was granted. */
  async requestUse(type: PropType): Promise<boolean> {
    if (this.canUse(type)) {
      return this.use(type);
    }

    // No stock or session maxed — try watching an ad
    const adGranted = await this._showRewardedAd(type);
    if (adGranted) {
      this.addStock(type, 1);
      // Force consume: bypass session limit since user watched an ad
      this._inventory[type] = Math.max(0, (this._inventory[type] ?? 0) - 1);
      this._save();
      EventBus.emit('prop:used', type);
      return true;
    }

    return false;
  }

  private _onAdClose = (res: any) => {
    const resolve = this._adResolve;
    this._adResolve = null;
    if (!resolve) return;
    if (res && res.isEnded) {
      resolve(true);
    } else {
      Platform.showToast('需要看完广告才能获得道具');
      resolve(false);
    }
  };

  private _onAdError = () => {
    const resolve = this._adResolve;
    this._adResolve = null;
    if (!resolve) return;
    Platform.showToast('广告加载失败');
    resolve(false);
  };

  private _showRewardedAd(type: PropType): Promise<boolean> {
    return new Promise((resolve) => {
      const def = PROP_DEFS[type];
      const ad = Platform.createRewardedVideoAd(def.adUnitId);

      if (!ad) {
        Platform.showToast('开发模式：免费获得道具');
        resolve(true);
        return;
      }

      // Remove previous listeners before binding to avoid duplicates
      ad.offClose?.(this._onAdClose);
      ad.offError?.(this._onAdError);
      ad.onClose(this._onAdClose);
      ad.onError(this._onAdError);

      this._adResolve = resolve;

      ad.show().catch(() => {
        ad.load().then(() => ad.show()).catch(() => {
          this._adResolve = null;
          Platform.showToast('广告暂时不可用');
          resolve(false);
        });
      });
    });
  }

  /** GM：一键将所有道具补满至指定数量（仅供模拟器使用） */
  gmRestockAll(count: number = 99): void {
    for (const type of Object.values(PropType)) {
      this._inventory[type] = count;
      EventBus.emit('prop:stockChanged', type, this._inventory[type]);
    }
    this._save();
  }

  /** Give initial free props to new players */
  grantStarterPack(): void {
    if (this._inventory['_starterGranted']) return;
    this.addStock(PropType.Undo, 3);
    this.addStock(PropType.RemoveBall, 2);
    this.addStock(PropType.RerollColors, 3);
    this.addStock(PropType.PositionPreview, 2);
    this.addStock(PropType.ExtraLimit, 2);
    this._inventory['_starterGranted'] = 1;
    this._save();
  }

  private _load(): void {
    this._inventory = PersistService.readJSON<PropInventory>(PROP_INVENTORY_KEY) || {};
  }

  private _save(): void {
    PersistService.writeJSON(PROP_INVENTORY_KEY, this._inventory);
  }
}

export const PropManager = new PropManagerClass();
