import { PROP_INVENTORY_KEY } from '@/config/CloudConfig';
import { EventBus } from '@/core/EventBus';
import { PersistService } from '@/core/PersistService';
import { Platform } from '@/core/PlatformService';
import { PropType, PROP_DEFS } from '@/config/PropConfig';
import { showRewardedAd } from '@/utils/rewardedAd';

interface PropInventory {
  [key: string]: number;
}

interface PropUseContext {
  levelId?: number | string;
  mode?: string;
}

class PropManagerClass {
  private _inventory: PropInventory = {};
  private _sessionUsage: Record<string, number> = {};

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
    EventBus.emit('prop:sessionReset');
  }

  /** Get current stock of a prop */
  getStock(type: PropType): number {
    void type;
    return 0;
  }

  /** Direct stock usage is disabled; props are ad-gated every game. */
  canUse(type: PropType): boolean {
    void type;
    return false;
  }

  /** Check whether the prop can still be requested in this game session. */
  canRequestUse(type: PropType): boolean {
    return (this._sessionUsage[type] ?? 0) < PROP_DEFS[type].maxPerGame;
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
   *  Every use requires a rewarded ad, and each prop is limited per game. */
  async requestUse(type: PropType, context: PropUseContext = {}): Promise<boolean> {
    if (!this.canRequestUse(type)) {
      Platform.showToast('本局该道具已使用');
      return false;
    }

    const adGranted = await this._showRewardedAd(type, context);
    if (adGranted) {
      this._sessionUsage[type] = (this._sessionUsage[type] ?? 0) + 1;
      EventBus.emit('prop:used', type);
      return true;
    }

    return false;
  }

  private async _showRewardedAd(type: PropType, context: PropUseContext): Promise<boolean> {
    const def = PROP_DEFS[type];
    const result = await showRewardedAd(def.adUnitId, {
      scene: `level_prop_${type}`,
      levelId: context.levelId,
      extra: { prop_type: type, mode: context.mode || 'level' },
    });
    if (result === 'completed') return true;
    if (result === 'unavailable' && Platform.isSimulator) {
      Platform.showToast('开发模式：免费获得道具');
      return true;
    }
    if (result === 'skipped') {
      Platform.showToast('需要看完广告才能获得道具');
    } else {
      Platform.showToast('广告暂时不可用');
    }
    return false;
  }

  /** GM：一键将所有道具补满至指定数量（仅供模拟器使用） */
  gmRestockAll(count: number = 99): void {
    for (const type of Object.values(PropType)) {
      this._inventory[type] = count;
      EventBus.emit('prop:stockChanged', type, this._inventory[type]);
    }
    this._save();
  }

  /** Starter gifts are disabled; props are now always ad-gated. */
  grantStarterPack(): void {
    this._inventory['_starterGranted'] = 1;
    this._inventory['_starterGrantedV2'] = 1;
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
