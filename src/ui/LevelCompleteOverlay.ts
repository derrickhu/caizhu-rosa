import * as PIXI from 'pixi.js';
import { Game } from '@/core/Game';
import { TweenManager, Ease } from '@/core/TweenManager';
import { EventBus } from '@/core/EventBus';

const STAR_FILLED = 0xF59E0B;
const STAR_EMPTY_COLOR = 0xE5E7EB;

export class LevelCompleteOverlay extends PIXI.Container {
  private _panel: PIXI.Container;
  private _scoreText: PIXI.Text;
  private _starTexts: PIXI.Text[] = [];

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
    bg.drawRoundedRect(-205, -215, 410, 430, 24);
    bg.endFill();
    this._panel.addChild(bg);

    // Green accent bar at top
    const accent = new PIXI.Graphics();
    accent.beginFill(0x10B981);
    accent.drawRoundedRect(-205, -215, 410, 6, 24);
    accent.endFill();
    this._panel.addChild(accent);

    const title = new PIXI.Text('通关成功', new PIXI.TextStyle({
      fontSize: 38, fill: 0x059669, fontWeight: 'bold', fontFamily: 'Arial',
    }));
    title.anchor.set(0.5, 0.5);
    title.y = -155;
    this._panel.addChild(title);

    // Stars
    for (let i = 0; i < 3; i++) {
      const star = new PIXI.Text('★', new PIXI.TextStyle({
        fontSize: 48, fill: STAR_EMPTY_COLOR, fontFamily: 'Arial',
      }));
      star.anchor.set(0.5, 0.5);
      star.x = (i - 1) * 65;
      star.y = -80;
      this._panel.addChild(star);
      this._starTexts.push(star);
    }

    this._scoreText = new PIXI.Text('0分', new PIXI.TextStyle({
      fontSize: 44, fill: 0xF59E0B, fontWeight: 'bold', fontFamily: 'Arial',
    }));
    this._scoreText.anchor.set(0.5, 0.5);
    this._scoreText.y = -5;
    this._panel.addChild(this._scoreText);

    this._createButton('下一关', 0x2563EB, 70, () => { this.hide(); EventBus.emit('level:next'); });
    this._createButton('重玩', 0x6B7280, 128, () => { this.hide(); EventBus.emit('level:retry'); });
    this._createButton('返回', 0x9CA3AF, 186, () => { this.hide(); EventBus.emit('level:back'); });
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

  show(score: number, stars: number, isLastLevel: boolean): void {
    this._scoreText.text = `${score}分`;

    for (let i = 0; i < 3; i++) {
      this._starTexts[i].style.fill = STAR_EMPTY_COLOR;
      this._starTexts[i].scale.set(0);
    }

    this._panel.x = Game.logicWidth / 2;
    this._panel.y = Game.logicHeight / 2;
    this._panel.scale.set(0.5);
    this._panel.alpha = 0;
    this.visible = true;

    TweenManager.to({ target: this._panel.scale, props: { x: 1, y: 1 }, duration: 0.35, ease: Ease.easeOutBack });
    TweenManager.to({ target: this._panel, props: { alpha: 1 }, duration: 0.25 });

    for (let i = 0; i < 3; i++) {
      if (i < stars) {
        TweenManager.to({
          target: this._starTexts[i].scale,
          props: { x: 1, y: 1 },
          duration: 0.3,
          delay: 0.4 + i * 0.2,
          ease: Ease.easeOutBack,
          onComplete: () => { this._starTexts[i].style.fill = STAR_FILLED; },
        });
      }
    }
  }

  hide(): void { this.visible = false; }
}
