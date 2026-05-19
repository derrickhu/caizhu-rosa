import * as PIXI from 'pixi.js';
import { Game } from '@/core/Game';
import { TweenManager, Ease } from '@/core/TweenManager';
import { EventBus } from '@/core/EventBus';
import { AudioManager } from '@/core/AudioManager';

export class GameOverOverlay extends PIXI.Container {
  private _panel: PIXI.Container;
  private _scoreText: PIXI.Text;
  private _bestText: PIXI.Text;

  constructor() {
    super();
    this.visible = false;

    const backdrop = new PIXI.Graphics();
    backdrop.beginFill(0x000000, 0.55);
    backdrop.drawRect(0, 0, Game.logicWidth, Game.logicHeight);
    backdrop.endFill();
    backdrop.eventMode = 'static';
    this.addChild(backdrop);

    this._panel = new PIXI.Container();
    this.addChild(this._panel);

    // Panel card
    const bg = new PIXI.Graphics();
    bg.beginFill(0xFFFFFF, 0.98);
    bg.drawRoundedRect(-195, -175, 390, 350, 24);
    bg.endFill();
    // Subtle shadow
    bg.beginFill(0x000000, 0.06);
    bg.drawRoundedRect(-192, -172, 390, 350, 24);
    bg.endFill();
    this._panel.addChild(bg);

    const title = new PIXI.Text('游戏结束', new PIXI.TextStyle({
      fontSize: 38, fill: 0x1F2937, fontWeight: 'bold', fontFamily: 'Arial',
    }));
    title.anchor.set(0.5, 0.5);
    title.y = -115;
    this._panel.addChild(title);

    const scoreLabel = new PIXI.Text('本局得分', new PIXI.TextStyle({
      fontSize: 22, fill: 0x6B7280, fontFamily: 'Arial',
    }));
    scoreLabel.anchor.set(0.5, 0.5);
    scoreLabel.y = -50;
    this._panel.addChild(scoreLabel);

    this._scoreText = new PIXI.Text('0', new PIXI.TextStyle({
      fontSize: 52, fill: 0xF59E0B, fontWeight: 'bold', fontFamily: 'Arial',
    }));
    this._scoreText.anchor.set(0.5, 0.5);
    this._scoreText.y = 10;
    this._panel.addChild(this._scoreText);

    this._bestText = new PIXI.Text('最高: 0', new PIXI.TextStyle({
      fontSize: 20, fill: 0x9CA3AF, fontFamily: 'Arial',
    }));
    this._bestText.anchor.set(0.5, 0.5);
    this._bestText.y = 55;
    this._panel.addChild(this._bestText);

    // Restart button
    this._createActionButton('再来一局', 0x2563EB, 120, () => {
      this.hide();
      EventBus.emit('game:restart');
    });
  }

  private _createActionButton(label: string, color: number, yOff: number, onClick: () => void): void {
    const btn = new PIXI.Container();
    btn.y = yOff;
    btn.eventMode = 'static';
    btn.cursor = 'pointer';

    const bg = new PIXI.Graphics();
    bg.beginFill(color);
    bg.drawRoundedRect(-110, -24, 220, 48, 24);
    bg.endFill();
    btn.addChild(bg);

    const text = new PIXI.Text(label, new PIXI.TextStyle({
      fontSize: 24, fill: 0xFFFFFF, fontWeight: 'bold', fontFamily: 'Arial',
    }));
    text.anchor.set(0.5, 0.5);
    btn.addChild(text);

    btn.on('pointerdown', () => {
      AudioManager.play('button');
      onClick();
    });
    this._panel.addChild(btn);
  }

  show(score: number, bestScore: number): void {
    this._scoreText.text = String(score);
    this._bestText.text = `最高: ${bestScore}`;

    this._panel.x = Game.logicWidth / 2;
    this._panel.y = Game.logicHeight / 2;
    this._panel.scale.set(0.5);
    this._panel.alpha = 0;
    this.visible = true;

    TweenManager.to({ target: this._panel.scale, props: { x: 1, y: 1 }, duration: 0.35, ease: Ease.easeOutBack });
    TweenManager.to({ target: this._panel, props: { alpha: 1 }, duration: 0.25 });
  }

  hide(): void {
    this.visible = false;
  }
}
