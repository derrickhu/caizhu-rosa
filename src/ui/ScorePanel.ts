import * as PIXI from 'pixi.js';
import { EventBus } from '@/core/EventBus';
import { TweenManager, Ease } from '@/core/TweenManager';

export class ScorePanel extends PIXI.Container {
  private _scoreLabel: PIXI.Text;
  private _scoreValue: PIXI.Text;
  private _bestLabel: PIXI.Text;
  private _bestValue: PIXI.Text;

  constructor() {
    super();

    const labelStyle = new PIXI.TextStyle({
      fontSize: 20,
      fill: 0x8899AA,
      fontFamily: 'Arial',
      fontWeight: 'bold',
    });
    const valueStyle = new PIXI.TextStyle({
      fontSize: 38,
      fill: 0xFFFFFF,
      fontWeight: 'bold',
      fontFamily: 'Arial',
    });
    const bestValueStyle = new PIXI.TextStyle({
      fontSize: 26,
      fill: 0xF59E0B,
      fontWeight: 'bold',
      fontFamily: 'Arial',
    });

    this._scoreLabel = new PIXI.Text('得分', labelStyle);
    this._scoreLabel.anchor.set(0.5, 0);
    this._scoreLabel.x = 0;
    this._scoreLabel.y = 0;
    this.addChild(this._scoreLabel);

    this._scoreValue = new PIXI.Text('0', valueStyle);
    this._scoreValue.anchor.set(0.5, 0);
    this._scoreValue.x = 0;
    this._scoreValue.y = 24;
    this.addChild(this._scoreValue);

    this._bestLabel = new PIXI.Text('最高', labelStyle);
    this._bestLabel.anchor.set(0.5, 0);
    this._bestLabel.x = 240;
    this._bestLabel.y = 0;
    this.addChild(this._bestLabel);

    this._bestValue = new PIXI.Text('0', bestValueStyle);
    this._bestValue.anchor.set(0.5, 0);
    this._bestValue.x = 240;
    this._bestValue.y = 24;
    this.addChild(this._bestValue);

    EventBus.on('ui:scoreChanged', (_total: number, delta: number) => {
      this._animateScoreChange(delta);
    });
  }

  setScore(score: number): void {
    this._scoreValue.text = String(score);
  }

  setBestScore(score: number): void {
    this._bestValue.text = String(score);
  }

  private _animateScoreChange(delta: number): void {
    const floatText = new PIXI.Text(`+${delta}`, new PIXI.TextStyle({
      fontSize: 32,
      fill: 0x10B981,
      fontWeight: 'bold',
      fontFamily: 'Arial',
    }));
    floatText.anchor.set(0.5, 0.5);
    floatText.x = 0;
    floatText.y = 20;
    this.addChild(floatText);

    TweenManager.to({
      target: floatText,
      props: { y: -25, alpha: 0 },
      duration: 0.9,
      ease: Ease.easeOutQuad,
      onComplete: () => {
        this.removeChild(floatText);
        floatText.destroy();
      },
    });

    this._scoreValue.scale.set(1.2, 1.2);
    TweenManager.to({
      target: this._scoreValue.scale,
      props: { x: 1, y: 1 },
      duration: 0.3,
      ease: Ease.easeOutBack,
    });
  }
}
