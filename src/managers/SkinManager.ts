import { SKIN_STATE_KEY } from '@/config/CloudConfig';
import { Platform } from '@/core/PlatformService';
import { PersistService } from '@/core/PersistService';
import { LevelManager } from './LevelManager';
import { RankManager } from './RankManager';
import {
  BACKGROUND_SKINS,
  DEFAULT_BACKGROUND_SKIN_ID,
  DEFAULT_CLASSIC_BACKGROUND,
  DEFAULT_LEVEL_BACKGROUND,
  DEFAULT_ORB_SKIN_ID,
  ORB_SKINS,
  type BackgroundSkinDef,
  type OrbSkinDef,
  type SkinDef,
  type UnlockCondition,
  getSkinById,
} from '@/config/SkinConfig';

interface SkinState {
  selectedOrbSkinId: string;
  selectedBackgroundSkinId: string;
  adUnlockedIds: string[];
}

/** GM 一键解锁标记，仅本地保存，不参与云同步。 */
const GM_SKIN_UNLOCK_KEY = 'caizhu_gm_skin_unlock';

class SkinManagerClass {
  private _state: SkinState = {
    selectedOrbSkinId: DEFAULT_ORB_SKIN_ID,
    selectedBackgroundSkinId: DEFAULT_BACKGROUND_SKIN_ID,
    adUnlockedIds: [],
  };

  private _gmAllUnlocked = false;

  private _adResolve: ((granted: boolean) => void) | null = null;

  constructor() {
    PersistService.subscribeCloudImport((info) => {
      if (info.changedKeys.includes(SKIN_STATE_KEY)) {
        this._load();
        this._repairSelection();
      }
    });
  }

  init(): void {
    this._load();
    this._loadGmFlag();
    this._repairSelection();
  }

  get selectedOrbSkinId(): string {
    return this._state.selectedOrbSkinId;
  }

  get selectedBackgroundSkinId(): string {
    return this._state.selectedBackgroundSkinId;
  }

  getOrbSkins(): readonly OrbSkinDef[] {
    return ORB_SKINS;
  }

  getBackgroundSkins(): readonly BackgroundSkinDef[] {
    return BACKGROUND_SKINS;
  }

  getSelectedOrbSkin(): OrbSkinDef {
    return ORB_SKINS.find((skin) => skin.id === this._state.selectedOrbSkinId)
      ?? ORB_SKINS[0];
  }

  getSelectedBackgroundSkin(): BackgroundSkinDef {
    return BACKGROUND_SKINS.find((skin) => skin.id === this._state.selectedBackgroundSkinId)
      ?? BACKGROUND_SKINS[0];
  }

  getGameplayBackground(mode: 'classic' | 'level'): string {
    if (this._state.selectedBackgroundSkinId === DEFAULT_BACKGROUND_SKIN_ID) {
      return mode === 'classic' ? DEFAULT_CLASSIC_BACKGROUND : DEFAULT_LEVEL_BACKGROUND;
    }
    return this.getSelectedBackgroundSkin().imagePath;
  }

  isSelected(skin: SkinDef): boolean {
    return skin.category === 'orb'
      ? skin.id === this._state.selectedOrbSkinId
      : skin.id === this._state.selectedBackgroundSkinId;
  }

  isUnlocked(skin: SkinDef): boolean {
    if (this._gmAllUnlocked) return true;
    const condition = skin.unlock;
    switch (condition.type) {
      case 'default':
        return true;
      case 'classicScore':
        return RankManager.getBestClassicScore() >= condition.score;
      case 'levelReached':
        return LevelManager.maxUnlocked >= condition.level;
      case 'ad':
        return this._state.adUnlockedIds.includes(skin.id);
      case 'future':
        return false;
    }
  }

  /** GM：开启/关闭全部皮肤解锁（仅供模拟器使用，仅本地保存，不参与云同步）。 */
  gmSetAllUnlocked(enabled: boolean): void {
    this._gmAllUnlocked = !!enabled;
    if (this._gmAllUnlocked) {
      Platform.setStorageSync(GM_SKIN_UNLOCK_KEY, '1');
    } else {
      Platform.removeStorageSync(GM_SKIN_UNLOCK_KEY);
    }
  }

  isGmAllUnlocked(): boolean {
    return this._gmAllUnlocked;
  }

  private _loadGmFlag(): void {
    this._gmAllUnlocked = Platform.getStorageSync(GM_SKIN_UNLOCK_KEY) === '1';
  }

  getUnlockText(skin: SkinDef): string {
    const condition = skin.unlock;
    switch (condition.type) {
      case 'default':
        return '已解锁';
      case 'classicScore':
        return `经典 ${condition.score} 分解锁`;
      case 'levelReached':
        return `到达第 ${condition.level} 关解锁`;
      case 'ad':
        return '看广告解锁';
      case 'future':
        return condition.label;
    }
  }

  selectSkin(id: string): boolean {
    const skin = getSkinById(id);
    if (!skin || !this.isUnlocked(skin)) return false;

    if (skin.category === 'orb') {
      this._state.selectedOrbSkinId = skin.id;
    } else {
      this._state.selectedBackgroundSkinId = skin.id;
    }
    this._save();
    return true;
  }

  async unlockByAd(id: string): Promise<boolean> {
    const skin = getSkinById(id);
    if (!skin || skin.unlock.type !== 'ad') return false;
    if (this.isUnlocked(skin)) return true;

    const granted = await this._showRewardedAd(skin.unlock);
    if (!granted) return false;

    this._state.adUnlockedIds = Array.from(new Set([...this._state.adUnlockedIds, id]));
    this._save();
    return true;
  }

  private _repairSelection(): void {
    const orbSkin = getSkinById(this._state.selectedOrbSkinId);
    if (!orbSkin || orbSkin.category !== 'orb' || !this.isUnlocked(orbSkin)) {
      this._state.selectedOrbSkinId = DEFAULT_ORB_SKIN_ID;
    }

    const bgSkin = getSkinById(this._state.selectedBackgroundSkinId);
    if (!bgSkin || bgSkin.category !== 'background' || !this.isUnlocked(bgSkin)) {
      this._state.selectedBackgroundSkinId = DEFAULT_BACKGROUND_SKIN_ID;
    }
    this._save();
  }

  private _load(): void {
    const parsed = PersistService.readJSON<Partial<SkinState>>(SKIN_STATE_KEY);
    if (!parsed) return;
    try {
      this._state = {
        selectedOrbSkinId: parsed.selectedOrbSkinId || DEFAULT_ORB_SKIN_ID,
        selectedBackgroundSkinId: parsed.selectedBackgroundSkinId || DEFAULT_BACKGROUND_SKIN_ID,
        adUnlockedIds: Array.isArray(parsed.adUnlockedIds) ? parsed.adUnlockedIds : [],
      };
    } catch {
      this._state = {
        selectedOrbSkinId: DEFAULT_ORB_SKIN_ID,
        selectedBackgroundSkinId: DEFAULT_BACKGROUND_SKIN_ID,
        adUnlockedIds: [],
      };
    }
  }

  private _save(): void {
    PersistService.writeJSON(SKIN_STATE_KEY, this._state);
  }

  private _showRewardedAd(condition: Extract<UnlockCondition, { type: 'ad' }>): Promise<boolean> {
    return new Promise((resolve) => {
      const ad = Platform.createRewardedVideoAd(condition.adUnitId);
      if (!ad) {
        Platform.showToast('开发模式：已解锁皮肤');
        resolve(true);
        return;
      }

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

  private _onAdClose = (res: any) => {
    const resolve = this._adResolve;
    this._adResolve = null;
    if (!resolve) return;
    if (res && res.isEnded) {
      resolve(true);
    } else {
      Platform.showToast('需要看完广告才能解锁皮肤');
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
}

const _global: any = typeof GameGlobal !== 'undefined' ? (globalThis as any).GameGlobal
  : typeof globalThis !== 'undefined' ? globalThis : {};
declare const GameGlobal: any;

if (!_global.__skinManager) { _global.__skinManager = new SkinManagerClass(); }
export const SkinManager: SkinManagerClass = _global.__skinManager;
