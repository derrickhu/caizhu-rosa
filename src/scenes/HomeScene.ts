import * as PIXI from 'pixi.js';
import { Game } from '@/core/Game';
import { SceneManager, type Scene } from '@/core/SceneManager';
import { Platform } from '@/core/PlatformService';
import { createBgSprite } from '@/utils/bgHelper';
import { addImageSprite } from '@/utils/imageTexture';

export class HomeScene implements Scene {
  readonly name = 'home';
  readonly container = new PIXI.Container();

  onEnter(): void {
    this.container.removeChildren();
    const W = Game.logicWidth;
    const H = Game.logicHeight;

    const bg = createBgSprite('images/home_bg_clean.png', W, H, 0x39C7F3);
    this.container.addChild(bg);

    this._addImage('images/home_title_cz5.png', W / 2, H * 0.25, W * 0.76);
    this._addImage('images/home_btn_start.png', W / 2, H * 0.46, W * 0.58);
    this._addImage('images/home_btn_classic.png', W / 2, H * 0.57, W * 0.47);
    this._addImage('images/home_btn_rank.png', W * 0.29, H * 0.72, W * 0.34);
    this._addImage('images/home_btn_skin.png', W * 0.71, H * 0.72, W * 0.34);
    this._addImage('images/home_btn_settings.png', W * 0.29, H * 0.84, W * 0.34);
    this._addImage('images/home_btn_rewards.png', W * 0.71, H * 0.84, W * 0.34);

    this._createHotspot(W * 0.21, H * 0.415, W * 0.79, H * 0.505, () => SceneManager.switchTo('levelSelect'));
    this._createHotspot(W * 0.26, H * 0.525, W * 0.74, H * 0.615, () => SceneManager.switchTo('classic'));
    this._createHotspot(W * 0.09, H * 0.665, W * 0.49, H * 0.78, () => SceneManager.switchTo('rank'));
    this._createHotspot(W * 0.51, H * 0.665, W * 0.91, H * 0.78, () => SceneManager.switchTo('skin'));
    this._createHotspot(W * 0.09, H * 0.785, W * 0.49, H * 0.90, () => this._showComingSoon('设置功能即将开放'));
    this._createHotspot(W * 0.51, H * 0.785, W * 0.91, H * 0.90, () => this._showComingSoon('福利功能即将开放'));
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
}
