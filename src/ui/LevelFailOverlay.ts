import * as PIXI from 'pixi.js';
import { Game } from '@/core/Game';
import { TweenManager, Ease } from '@/core/TweenManager';
import { EventBus } from '@/core/EventBus';
import { addImageSprite } from '@/utils/imageTexture';

const PANEL_W = 430;
const PANEL_H = 560;

export class LevelFailOverlay extends PIXI.Container {
  private _panel: PIXI.Container;
  private _scoreText: PIXI.Text;
  private _targetText: PIXI.Text;

  constructor() {
    super();
    this.visible = false;

    const backdrop = new PIXI.Graphics();
    backdrop.beginFill(0x000000, 0.5);
    backdrop.drawRect(0, 0, Game.logicWidth, Game.logicHeight);
    backdrop.endFill();
    backdrop.eventMode = 'static';
    this.addChild(backdrop);

    this._panel = new PIXI.Container();
    this.addChild(this._panel);

    const imageLayer = new PIXI.Container();
    this._panel.addChild(imageLayer);
    addImageSprite(imageLayer, 'subpkg_assets/images/level_complete_panel.png', (sprite) => {
      sprite.anchor.set(0.5, 0.5);
      sprite.width = PANEL_W;
      sprite.height = PANEL_H;
    });

    const title = new PIXI.Text('挑战失败', new PIXI.TextStyle({
      fontSize: 40,
      fill: 0xFFFFFF,
      stroke: 0x7A1233,
      strokeThickness: 5,
      fontWeight: 'bold',
      fontFamily: 'Arial',
      dropShadow: true,
      dropShadowColor: 0x000000,
      dropShadowBlur: 3,
      dropShadowDistance: 2,
      dropShadowAlpha: 0.35,
    }));
    title.anchor.set(0.5, 0.5);
    title.y = -224;
    this._panel.addChild(title);

    this._scoreText = new PIXI.Text('当前: 0分', new PIXI.TextStyle({
      fontSize: 42,
      fill: 0xFFE082,
      stroke: 0x8A3A00,
      strokeThickness: 5,
      fontFamily: 'Arial',
      fontWeight: 'bold',
      dropShadow: true,
      dropShadowColor: 0x000000,
      dropShadowBlur: 3,
      dropShadowDistance: 2,
      dropShadowAlpha: 0.3,
    }));
    this._scoreText.anchor.set(0.5, 0.5);
    this._scoreText.y = -74;
    this._panel.addChild(this._scoreText);

    this._targetText = new PIXI.Text('目标: 0分', new PIXI.TextStyle({
      fontSize: 27,
      fill: 0xFFFFFF,
      stroke: 0x174078,
      strokeThickness: 4,
      fontWeight: 'bold',
      fontFamily: 'Arial',
      wordWrap: true,
      wordWrapWidth: 310,
      align: 'center',
    }));
    this._targetText.anchor.set(0.5, 0.5);
    this._targetText.y = 5;
    this._panel.addChild(this._targetText);

    this._createButtonHitArea('重试', 92, () => { this.hide(); EventBus.emit('level:retry'); });
    this._createButtonHitArea('返回', 158, () => { this.hide(); EventBus.emit('level:back'); });
  }

  private _createButtonHitArea(label: string, yOff: number, onClick: () => void): void {
    const btn = new PIXI.Container();
    btn.y = yOff;
    btn.eventMode = 'static';
    btn.cursor = 'pointer';

    const hit = new PIXI.Graphics();
    hit.beginFill(0xFFFFFF, 0.001);
    hit.drawRoundedRect(-132, -24, 264, 48, 24);
    hit.endFill();
    btn.addChild(hit);

    const text = new PIXI.Text(label, new PIXI.TextStyle({
      fontSize: 25,
      fill: 0xFFFFFF,
      stroke: 0x174078,
      strokeThickness: 4,
      fontWeight: 'bold',
      fontFamily: 'Arial',
    }));
    text.anchor.set(0.5, 0.5);
    btn.addChild(text);

    btn.on('pointerdown', onClick);
    this._panel.addChild(btn);
  }

  show(score: number, passScore: number): void {
    this._scoreText.text = `当前: ${score}分`;
    this._targetText.text = `一星目标: ${passScore}分`;

    this._panel.x = Game.logicWidth / 2;
    this._panel.y = Game.logicHeight / 2;
    this._panel.scale.set(0.5);
    this._panel.alpha = 0;
    this.visible = true;

    TweenManager.to({ target: this._panel.scale, props: { x: 1, y: 1 }, duration: 0.35, ease: Ease.easeOutBack });
    TweenManager.to({ target: this._panel, props: { alpha: 1 }, duration: 0.25 });
  }

  hide(): void { this.visible = false; }
}
