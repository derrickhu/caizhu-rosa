import * as PIXI from 'pixi.js';
import { Game } from '@/core/Game';
import { SceneManager, type Scene } from '@/core/SceneManager';
import { Platform } from '@/core/PlatformService';
import { createBgSprite } from '@/utils/bgHelper';
import { addImageSprite } from '@/utils/imageTexture';
import { GmOverlay } from '@/ui/GmOverlay';
import { SettingsOverlay } from '@/ui/SettingsOverlay';
import { AudioManager } from '@/core/AudioManager';
import { shareToFriend } from '@/core/ShareService';
import { AUDIO_ASSETS, AUDIO_VOLUME } from '@/config/AudioConfig';

export class HomeScene implements Scene {
  readonly name = 'home';
  readonly container = new PIXI.Container();

  private _gmOverlay: GmOverlay | null = null;
  private _settingsOverlay: SettingsOverlay | null = null;
  private _gameClubButton: any = null;

  onEnter(): void {
    this._destroyGameClubButton();
    this.container.removeChildren();
    AudioManager.playBGM(AUDIO_ASSETS.bgmClassic, AUDIO_VOLUME.bgmClassic);
    const W = Game.logicWidth;
    const H = Game.logicHeight;

    const bg = createBgSprite('subpkg_assets/images/home_bg_clean.png', W, H, 0x39C7F3);
    this.container.addChild(bg);

    this._addImage('subpkg_assets/images/home_title_cz5.png', W / 2, H * 0.25, W * 0.76);
    this._addImage('subpkg_assets/images/home_btn_start.png', W / 2, H * 0.46, W * 0.58);
    this._addImage('subpkg_assets/images/home_btn_classic.png', W / 2, H * 0.57, W * 0.47);
    this._addImage('subpkg_assets/images/home_btn_rank.png', W * 0.29, H * 0.72, W * 0.34);
    this._addImage('subpkg_assets/images/home_btn_skin.png', W * 0.71, H * 0.72, W * 0.34);
    this._addImage('subpkg_assets/images/home_btn_settings.png', W * 0.29, H * 0.84, W * 0.34);
    this._addImage('subpkg_assets/images/home_btn_rewards.png', W * 0.71, H * 0.84, W * 0.34);

    this._createHotspot(W * 0.21, H * 0.415, W * 0.79, H * 0.505, () => SceneManager.switchTo('levelSelect'));
    this._createHotspot(W * 0.26, H * 0.525, W * 0.74, H * 0.615, () => SceneManager.switchTo('classic'));
    this._createHotspot(W * 0.09, H * 0.665, W * 0.49, H * 0.78, () => SceneManager.switchTo('rank'));
    this._createHotspot(W * 0.51, H * 0.665, W * 0.91, H * 0.78, () => SceneManager.switchTo('skin'));
    this._createHotspot(W * 0.09, H * 0.785, W * 0.49, H * 0.90, () => this._openSettingsOverlay());
    this._createHotspot(W * 0.51, H * 0.785, W * 0.91, H * 0.90, () => this._handleRewardsTap());
    this._createGameClubButton(W * 0.51, H * 0.785, W * 0.91, H * 0.90);

    this._addShareEntry();
    this._maybeAddGmEntry();
  }

  onExit(): void {
    this._destroyGameClubButton();
  }

  private _addImage(path: string, x: number, y: number, width: number): void {
    const holder = new PIXI.Container();
    holder.x = x;
    holder.y = y;
    this.container.addChild(holder);

    addImageSprite(holder, path, (sprite) => {
      sprite.anchor.set(0.5, 0.5);
      sprite.width = width;
      sprite.height = width * (sprite.texture.height / sprite.texture.width);
    });
  }

  private _createHotspot(
    x1: number, y1: number, x2: number, y2: number,
    onClick: () => void,
  ): void {
    const hotspot = new PIXI.Graphics();
    hotspot.beginFill(0xFFFFFF, 0.001);
    hotspot.drawRoundedRect(x1, y1, x2 - x1, y2 - y1, 18);
    hotspot.endFill();
    hotspot.eventMode = 'static';
    hotspot.cursor = 'pointer';
    hotspot.on('pointerdown', () => {
      AudioManager.play('button');
      onClick();
    });
    this.container.addChild(hotspot);
  }

  private _showComingSoon(message: string): void {
    Platform.showToast(message);
  }

  private _handleRewardsTap(): void {
    if (this._gameClubButton) return;
    Platform.showToast(Platform.isWechat ? '当前微信版本暂不支持游戏圈' : '请在微信小游戏中打开游戏圈');
  }

  private _addShareEntry(): void {
    const btn = new PIXI.Container();
    btn.x = Game.logicWidth - 78;
    btn.y = Math.max(70, Game.safeTop + 50);
    btn.eventMode = 'static';
    btn.cursor = 'pointer';
    this.container.addChild(btn);

    const bg = new PIXI.Graphics();
    bg.beginFill(0xFFB934, 0.95);
    bg.lineStyle(4, 0xFFFFFF, 0.95);
    bg.drawRoundedRect(-46, -25, 92, 50, 25);
    bg.endFill();
    btn.addChild(bg);

    const label = new PIXI.Text('分享', new PIXI.TextStyle({
      fontSize: 24,
      fill: 0xFFFFFF,
      fontWeight: 'bold',
      fontFamily: 'Arial',
      stroke: 0x8A3A00,
      strokeThickness: 4,
    }));
    label.anchor.set(0.5, 0.53);
    btn.addChild(label);

    btn.on('pointerdown', () => {
      AudioManager.play('button');
      btn.scale.set(0.94);
      shareToFriend('home_button');
    });
    btn.on('pointerup', () => btn.scale.set(1));
    btn.on('pointerupoutside', () => btn.scale.set(1));
  }

  private _createGameClubButton(x1: number, y1: number, x2: number, y2: number): void {
    if (!Platform.supportsGameClubButton) return;

    const rect = this._logicRectToScreenStyle(x1, y1, x2, y2);
    this._gameClubButton = Platform.createGameClubButton({
      type: 'text',
      text: '',
      style: {
        ...rect,
        backgroundColor: '#00000000',
        borderColor: '#00000000',
        borderWidth: 0,
        borderRadius: Math.round(rect.height / 2),
        color: '#00000000',
        fontSize: 1,
        lineHeight: rect.height,
      },
    });

    try { this._gameClubButton?.show?.(); } catch {}
  }

  private _logicRectToScreenStyle(x1: number, y1: number, x2: number, y2: number): { left: number; top: number; width: number; height: number } {
    const ratio = Game.screenWidth / Game.logicWidth;
    return {
      left: Math.round(x1 * ratio),
      top: Math.round(y1 * ratio),
      width: Math.round((x2 - x1) * ratio),
      height: Math.round((y2 - y1) * ratio),
    };
  }

  private _destroyGameClubButton(): void {
    try { this._gameClubButton?.destroy?.(); } catch {}
    this._gameClubButton = null;
  }

  private _maybeAddGmEntry(): void {
    if (!Platform.isSimulator) return;

    const btn = new PIXI.Container();
    btn.x = 70;
    btn.y = Math.max(70, Game.safeTop + 50);
    btn.eventMode = 'static';
    btn.cursor = 'pointer';
    this.container.addChild(btn);

    const bg = new PIXI.Graphics();
    bg.beginFill(0xE91E63, 0.92);
    bg.lineStyle(4, 0xFFFFFF, 0.95);
    bg.drawCircle(0, 0, 44);
    bg.endFill();
    btn.addChild(bg);

    const label = new PIXI.Text('GM', new PIXI.TextStyle({
      fontSize: 28,
      fill: 0xFFFFFF,
      fontWeight: 'bold',
      fontFamily: 'Arial',
      stroke: 0x6A002E,
      strokeThickness: 4,
    }));
    label.anchor.set(0.5, 0.55);
    btn.addChild(label);

    btn.on('pointerdown', () => {
      AudioManager.play('button');
      btn.scale.set(0.92);
      this._openGmOverlay();
    });
    btn.on('pointerup', () => btn.scale.set(1));
    btn.on('pointerupoutside', () => btn.scale.set(1));
  }

  private _openGmOverlay(): void {
    if (!this._gmOverlay) {
      this._gmOverlay = new GmOverlay();
      this.container.addChild(this._gmOverlay);
    } else {
      this.container.addChild(this._gmOverlay);
    }
    this._gmOverlay.show();
  }

  private _openSettingsOverlay(): void {
    this._destroyGameClubButton();
    if (!this._settingsOverlay) {
      this._settingsOverlay = new SettingsOverlay(() => {
        const W = Game.logicWidth;
        const H = Game.logicHeight;
        this._createGameClubButton(W * 0.51, H * 0.785, W * 0.91, H * 0.90);
      });
      this.container.addChild(this._settingsOverlay);
    } else {
      this.container.addChild(this._settingsOverlay);
    }
    this._settingsOverlay.show();
  }
}
