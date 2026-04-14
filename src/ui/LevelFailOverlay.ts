import * as PIXI from 'pixi.js';
import { Game } from '@/core/Game';
import { TweenManager, Ease } from '@/core/TweenManager';
import { EventBus } from '@/core/EventBus';

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

    // White card
    const bg = new PIXI.Graphics();
    bg.beginFill(0xFFFFFF, 0.98);
    bg.drawRoundedRect(-195, -155, 390, 310, 24);
    bg.endFill();
    this._panel.addChild(bg);

    // Red accent bar
    const accent = new PIXI.Graphics();
    accent.beginFill(0xDC2626);
    accent.drawRoundedRect(-195, -155, 390, 6, 24);
    accent.endFill();
    this._panel.addChild(accent);

    const title = new PIXI.Text('挑战失败', new PIXI.TextStyle({
      fontSize: 36, fill: 0xDC2626, fontWeight: 'bold', fontFamily: 'Arial',
    }));
    title.anchor.set(0.5, 0.5);
    title.y = -105;
    this._panel.addChild(title);

    this._scoreText = new PIXI.Text('当前: 0分', new PIXI.TextStyle({
      fontSize: 26, fill: 0x1F2937, fontFamily: 'Arial', fontWeight: 'bold',
    }));
    this._scoreText.anchor.set(0.5, 0.5);
    this._scoreText.y = -40;
    this._panel.addChild(this._scoreText);

    this._targetText = new PIXI.Text('目标: 0分', new PIXI.TextStyle({
      fontSize: 22, fill: 0x9CA3AF, fontFamily: 'Arial',
    }));
    this._targetText.anchor.set(0.5, 0.5);
    this._targetText.y = 0;
    this._panel.addChild(this._targetText);

    // Retry button
    this._createButton('重试', 0xDC2626, 65, () => { this.hide(); EventBus.emit('level:retry'); });
    this._createButton('返回', 0x9CA3AF, 123, () => { this.hide(); EventBus.emit('level:back'); });
  }

  private _createButton(label: string, color: number, yOff: number, onClick: () => void): void {
    const btn = new PIXI.Container();
    btn.y = yOff;
    btn.eventMode = 'static';
    btn.cursor = 'pointer';

    const bg = new PIXI.Graphics();
    bg.beginFill(color);
    bg.drawRoundedRect(-95, -21, 190, 42, 21);
    bg.endFill();
    btn.addChild(bg);

    const text = new PIXI.Text(label, new PIXI.TextStyle({
      fontSize: 22, fill: 0xFFFFFF, fontWeight: 'bold', fontFamily: 'Arial',
    }));
    text.anchor.set(0.5, 0.5);
    btn.addChild(text);

    btn.on('pointerdown', onClick);
    this._panel.addChild(btn);
  }

  show(score: number, targetScore: number): void {
    this._scoreText.text = `当前: ${score}分`;
    this._targetText.text = `目标: ${targetScore}分`;

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
