import * as PIXI from 'pixi.js';
import type { LevelDef } from '@/config/LevelConfig';
import { TweenManager, Ease } from '@/core/TweenManager';

/** Text readable on dark glass panels (level mode busy backgrounds) */
const C_LABEL = 0xE2E8F0;
const C_TITLE = 0xFFFFFF;
const C_SCORE = 0xFCD34D;
const C_LIMIT_OK = 0xF1F5F9;
const C_WARN = 0xFB923C;
const C_DANGER = 0xFCA5A5;

export class LevelHud extends PIXI.Container {
  private _levelText: PIXI.Text;
  private _targetText: PIXI.Text;
  private _limitText: PIXI.Text;
  private _scoreText: PIXI.Text;
  private _progressTrack: PIXI.Graphics;
  private _progressInner: PIXI.Graphics;
  private _progressFill: PIXI.Graphics;
  private _panel: PIXI.Graphics;

  private _levelDef: LevelDef;
  private _timeRemaining = 0;
  private _barWidth: number;
  private readonly _barH = 12;
  private readonly _barRadius = 6;

  constructor(levelDef: LevelDef, contentWidth = 300) {
    super();
    this._levelDef = levelDef;
    this._barWidth = contentWidth;

    const padX = 14;
    const padY = 12;
    const innerW = this._barWidth;
    const panelW = innerW + padX * 2;
    const panelH = 118;

    this._panel = new PIXI.Graphics();
    this._panel.beginFill(0x0F172A, 0.88);
    this._panel.drawRoundedRect(-padX, -padY, panelW, panelH, 16);
    this._panel.endFill();
    this._panel.lineStyle(1.5, 0xFFFFFF, 0.22);
    this._panel.drawRoundedRect(-padX, -padY, panelW, panelH, 16);
    this.addChild(this._panel);

    const titleStyle = new PIXI.TextStyle({
      fontSize: 26,
      fill: C_TITLE,
      fontFamily: 'Arial',
      fontWeight: 'bold',
      dropShadow: true,
      dropShadowColor: 0x000000,
      dropShadowBlur: 4,
      dropShadowDistance: 1,
      dropShadowAlpha: 0.55,
    });
    const labelStyle = new PIXI.TextStyle({
      fontSize: 19,
      fill: C_LABEL,
      fontFamily: 'Arial',
      fontWeight: 'bold',
      dropShadow: true,
      dropShadowColor: 0x000000,
      dropShadowBlur: 3,
      dropShadowDistance: 1,
      dropShadowAlpha: 0.45,
    });
    const limitStyle = new PIXI.TextStyle({
      fontSize: 22,
      fill: C_LIMIT_OK,
      fontWeight: 'bold',
      fontFamily: 'Arial',
      dropShadow: true,
      dropShadowColor: 0x000000,
      dropShadowBlur: 3,
      dropShadowDistance: 1,
      dropShadowAlpha: 0.45,
    });

    this._levelText = new PIXI.Text(`第 ${levelDef.id} 关`, titleStyle);
    this._levelText.anchor.set(0, 0);
    this._levelText.x = 0;
    this._levelText.y = 0;
    this.addChild(this._levelText);

    this._targetText = new PIXI.Text(`目标 ${levelDef.targetScore} 分`, labelStyle);
    this._targetText.anchor.set(1, 0);
    this._targetText.x = innerW;
    this._targetText.y = 2;
    this.addChild(this._targetText);

    const limitLabel = levelDef.type === 'timed'
      ? `⏱ ${levelDef.timeLimit} 秒`
      : `👣 ${levelDef.stepLimit} 步`;

    this._limitText = new PIXI.Text(limitLabel, limitStyle);
    this._limitText.anchor.set(0, 0);
    this._limitText.x = 0;
    this._limitText.y = 38;
    this.addChild(this._limitText);

    this._scoreText = new PIXI.Text('0 分', new PIXI.TextStyle({
      fontSize: 24,
      fill: C_SCORE,
      fontWeight: 'bold',
      fontFamily: 'Arial',
      dropShadow: true,
      dropShadowColor: 0x000000,
      dropShadowBlur: 4,
      dropShadowDistance: 1,
      dropShadowAlpha: 0.5,
    }));
    this._scoreText.anchor.set(1, 0);
    this._scoreText.x = innerW;
    this._scoreText.y = 38;
    this.addChild(this._scoreText);

    const barY = 78;
    this._progressTrack = new PIXI.Graphics();
    this._progressTrack.beginFill(0x020617, 0.55);
    this._progressTrack.drawRoundedRect(0, barY, innerW, this._barH, this._barRadius);
    this._progressTrack.endFill();
    this._progressTrack.lineStyle(1, 0xFFFFFF, 0.18);
    this._progressTrack.drawRoundedRect(0, barY, innerW, this._barH, this._barRadius);
    this.addChild(this._progressTrack);

    this._progressInner = new PIXI.Graphics();
    this._progressInner.beginFill(0xFFFFFF, 0.06);
    this._progressInner.drawRoundedRect(2, barY + 2, innerW - 4, this._barH - 4, this._barRadius - 2);
    this._progressInner.endFill();
    this.addChild(this._progressInner);

    this._progressFill = new PIXI.Graphics();
    this.addChild(this._progressFill);
    this._drawProgress(0);

    if (levelDef.type === 'timed') {
      this._timeRemaining = levelDef.timeLimit!;
    }
  }

  updateSteps(used: number): void {
    if (this._levelDef.type !== 'steps') return;
    const remaining = (this._levelDef.stepLimit ?? 0) - used;
    this._limitText.text = `👣 ${Math.max(0, remaining)} 步`;

    if (remaining <= 3) {
      this._limitText.style.fill = C_DANGER;
    } else if (remaining <= 5) {
      this._limitText.style.fill = C_WARN;
    } else {
      this._limitText.style.fill = C_LIMIT_OK;
    }
  }

  updateTime(remaining: number): void {
    this._timeRemaining = remaining;
    if (this._levelDef.type !== 'timed') return;
    const secs = Math.ceil(Math.max(0, remaining));
    this._limitText.text = `⏱ ${secs} 秒`;

    if (secs <= 10) {
      this._limitText.style.fill = C_DANGER;
    } else if (secs <= 20) {
      this._limitText.style.fill = C_WARN;
    } else {
      this._limitText.style.fill = C_LIMIT_OK;
    }
  }

  updateScore(score: number): void {
    this._scoreText.text = `${score} 分`;
    const ratio = Math.min(1, score / this._levelDef.targetScore);
    this._drawProgress(ratio);

    if (score > 0) {
      this._scoreText.scale.set(1.12);
      TweenManager.to({
        target: this._scoreText.scale,
        props: { x: 1, y: 1 },
        duration: 0.2,
        ease: Ease.easeOutQuad,
      });
    }
  }

  private _drawProgress(ratio: number): void {
    const g = this._progressFill;
    g.clear();
    const barY = 78;
    const innerW = this._barWidth;
    const inset = 3;
    const maxW = innerW - inset * 2;
    const h = this._barH - inset * 2;
    const r = this._barRadius - 2;

    if (ratio <= 0) return;

    const w = Math.max(6, maxW * ratio);
    const color = ratio >= 1 ? 0x34D399 : 0x38BDF8;
    const hi = ratio >= 1 ? 0x6EE7B7 : 0x7DD3FC;

    g.beginFill(color);
    g.drawRoundedRect(inset, barY + inset, w, h, r);
    g.endFill();

    g.beginFill(hi, 0.35);
    g.drawRoundedRect(inset, barY + inset, w * 0.55, h * 0.45, r);
    g.endFill();
  }
}
