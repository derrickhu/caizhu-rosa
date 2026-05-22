import * as PIXI from 'pixi.js';
import { Game } from '@/core/Game';
import type { Scene } from '@/core/SceneManager';
import { HEALTH_GAME_ADVISORY } from '@/config/GameConfig';
import { addImageSprite } from '@/utils/imageTexture';

const GAME_TITLE_PATH = 'subpkg_assets/images/home_title_cz5.png';

export class LoadingScene implements Scene {
  readonly name = 'loading';
  readonly container = new PIXI.Container();

  private _barFill: PIXI.Graphics | null = null;
  private _percentText: PIXI.Text | null = null;
  private _loadedText: PIXI.Text | null = null;
  private _gameTitleAdded = false;
  private _barWidth = 420;
  private _barHeight = 26;

  /** 资源分包就绪后由 main 调用，在 loading 页顶部显示游戏标题图 */
  addGameTitle(): void {
    if (this._gameTitleAdded) return;
    this._gameTitleAdded = true;

    const W = Game.logicWidth;
    const H = Game.logicHeight;
    addImageSprite(this.container, GAME_TITLE_PATH, (sprite) => {
      sprite.anchor.set(0.5, 0.5);
      sprite.x = W / 2;
      sprite.y = Math.max(Game.safeTop + 72, H * 0.11);
      const targetWidth = W * 0.72;
      sprite.width = targetWidth;
      sprite.height = targetWidth * (sprite.texture.height / sprite.texture.width);
    });
  }

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

    const loadingLabel = new PIXI.Text('加载中', {
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
    loadingLabel.anchor.set(0.5);
    loadingLabel.x = W / 2;
    loadingLabel.y = H * 0.76;
    this.container.addChild(loadingLabel);

    this._percentText = new PIXI.Text('0%', {
      fontSize: 30,
      fontWeight: '700',
      fill: 0xFFFFFF,
      stroke: 0x3D2B9A,
      strokeThickness: 5,
    });
    this._percentText.anchor.set(0.5);
    this._percentText.x = W / 2;
    this._percentText.y = loadingLabel.y + 48;
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
    this._loadedText.y = barY + 52;
    this.container.addChild(this._loadedText);

    const healthAdvisory = new PIXI.Text(HEALTH_GAME_ADVISORY, new PIXI.TextStyle({
      fontSize: 18,
      fontWeight: '500',
      fill: 0xFFFFFF,
      align: 'center',
      lineHeight: 26,
      wordWrap: true,
      wordWrapWidth: W - 64,
      stroke: 0x2C2B72,
      strokeThickness: 2,
    }));
    healthAdvisory.anchor.set(0.5, 0);
    healthAdvisory.x = W / 2;
    healthAdvisory.y = barY + 82;
    this.container.addChild(healthAdvisory);

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
