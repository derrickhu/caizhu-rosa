import { Platform } from '@/core/PlatformService';
import { LevelManager } from './LevelManager';
import { SkinManager } from './SkinManager';
import { PropManager } from './PropManager';

/**
 * GM 工具：仅模拟器/开发环境可用，便于测试时快速解锁全部内容。
 * 真机环境下所有方法均会直接 no-op。
 */
class GmManagerClass {
  /** 是否允许使用 GM 功能（只在模拟器/开发工具/浏览器调试中开启） */
  get isEnabled(): boolean {
    return Platform.isSimulator;
  }

  /** GM：一键解锁全部关卡 + 全部皮肤 + 全部道具补满。 */
  unlockAll(): boolean {
    if (!this.isEnabled) return false;
    LevelManager.gmUnlockAllLevels();
    SkinManager.gmSetAllUnlocked(true);
    PropManager.gmRestockAll(99);
    return true;
  }

  unlockAllSkins(): boolean {
    if (!this.isEnabled) return false;
    SkinManager.gmSetAllUnlocked(true);
    return true;
  }

  unlockAllLevels(): boolean {
    if (!this.isEnabled) return false;
    LevelManager.gmUnlockAllLevels();
    return true;
  }

  restockAllProps(count: number = 99): boolean {
    if (!this.isEnabled) return false;
    PropManager.gmRestockAll(count);
    return true;
  }

  /** 关闭 GM 皮肤全解锁（恢复正常解锁逻辑），关卡进度不会回退。 */
  disableSkinUnlockAll(): boolean {
    if (!this.isEnabled) return false;
    SkinManager.gmSetAllUnlocked(false);
    return true;
  }
}

export const GmManager = new GmManagerClass();
