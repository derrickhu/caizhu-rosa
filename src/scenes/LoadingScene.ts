import * as PIXI from 'pixi.js';
import { Game } from '@/core/Game';
import type { Scene } from '@/core/SceneManager';
import { addImageSprite } from '@/utils/imageTexture';

export class LoadingScene implements Scene {
  readonly name = 'loading';
  readonly container = new PIXI.Container();

  private _barFill: PIXI.Graphics | null = null;
  private _percentText: PIXI.Text | null = null;
  private _loadedText: PIXI.Text | null = null;
  private _barWidth = 420;
  private _barHeight = 26;

  onEnter(): void {
    this.container.removeChildren();

    const W = Game.logicWidth;
    const H = Game.logicHeight;

    const fallback = new PIXI.Graphics();
    fallback.beginFill(0x4D7BFF);
    fallback.drawRect(0, 0, W, H);
    fallback.endFill();
    this.container.addChild(fallback);

    const imageLayer = new PIXI.Container();
    this.container.addChild(imageLayer);
    addImageSprite(imageLayer, 'images/loading_screen.png', (sprite) => {
      sprite.width = W;
      sprite.height = H;
    });

    const title = new PIXI.Text('加载中', {
      fontSize: 48,
      fontWeight: '800',
      fill: 0xFFFFFF,
      stroke: 0x3D2B9A,
      strokeThickness: 8,
      dropShadow: true,
      dropShadowColor: 0x1F1666,
      dropShadowDistance: 4,
      dropShadowBlur: 0,
    });
    title.anchor.set(0.5);
    title.x = W / 2;
    title.y = H * 0.76;
    this.container.addChild(title);

    this._percentText = new PIXI.Text('0%', {
      fontSize: 30,
      fontWeight: '700',
      fill: 0xFFFFFF,
      stroke: 0x3D2B9A,
      strokeThickness: 5,
    });
    this._percentText.anchor.set(0.5);
    this._percentText.x = W / 2;
    this._percentText.y = title.y + 48;
    this.container.addChild(this._percentText);

    const barX = (W - this._barWidth) / 2;
    const barY = H * 0.84;

    const barBg = new PIXI.Graphics();
    barBg.beginFill(0x311D72, 0.82);
    barBg.drawRoundedRect(barX, barY, this._barWidth, this._barHeight, this._barHeight / 2);
    barBg.endFill();
    barBg.lineStyle(4, 0xFFFFFF, 0.85);
    barBg.drawRoundedRect(barX, barY, this._barWidth, this._barHeight, this._barHeight / 2);
    this.container.addChild(barBg);

    this._barFill = new PIXI.Graphics();
    this.container.addChild(this._barFill);

    this._loadedText = new PIXI.Text('正在准备游戏资源', {
      fontSize: 24,
      fontWeight: '600',
      fill: 0xFFFFFF,
      stroke: 0x2C2B72,
      strokeThickness: 4,
    });
    this._loadedText.anchor.set(0.5);
    this._loadedText.x = W / 2;
    this._loadedText.y = barY + 58;
    this.container.addChild(this._loadedText);

    this.setProgress(0, 1);
  }

  setProgress(loaded: number, total: number): void {
    const progress = total > 0 ? Math.min(1, loaded / total) : 0;
    const W = Game.logicWidth;
    const H = Game.logicHeight;
    const barX = (W - this._barWidth) / 2;
    const barY = H * 0.84;
    const fillWidth = Math.max(this._barHeight, Math.round(this._barWidth * progress));

    if (this._barFill) {
      this._barFill.clear();
      this._barFill.beginFill(0xFFE36E);
      this._barFill.drawRoundedRect(barX, barY, fillWidth, this._barHeight, this._barHeight / 2);
      this._barFill.endFill();
      this._barFill.beginFill(0xFFFFFF, 0.35);
      this._barFill.drawRoundedRect(barX + 8, barY + 5, Math.max(0, fillWidth - 16), 7, 4);
      this._barFill.endFill();
    }

    if (this._percentText) {
      this._percentText.text = `${Math.round(progress * 100)}%`;
    }
    if (this._loadedText) {
      this._loadedText.text = loaded >= total ? '准备完成' : `正在加载 ${loaded}/${total}`;
    }
  }
}
