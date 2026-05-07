import * as PIXI from 'pixi.js';
import { Game } from '@/core/Game';
import { SceneManager, type Scene } from '@/core/SceneManager';
import { Platform } from '@/core/PlatformService';
import { createBgSprite } from '@/utils/bgHelper';
import { addImageSprite } from '@/utils/imageTexture';
import { GmOverlay } from '@/ui/GmOverlay';

export class HomeScene implements Scene {
  readonly name = 'home';
  readonly container = new PIXI.Container();

  private _gmOverlay: GmOverlay | null = null;

  onEnter(): void {
    this.container.removeChildren();
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
    this._createHotspot(W * 0.09, H * 0.785, W * 0.49, H * 0.90, () => this._showComingSoon('设置功能即将开放'));
    this._createHotspot(W * 0.51, H * 0.785, W * 0.91, H * 0.90, () => this._showComingSoon('福利功能即将开放'));

    this._maybeAddGmEntry();
  }

  onExit(): void {}

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
    hotspot.on('pointerdown', onClick);
    this.container.addChild(hotspot);
  }

  private _showComingSoon(message: string): void {
    Platform.showToast(message);
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
}
