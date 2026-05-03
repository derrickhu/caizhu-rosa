import * as PIXI from 'pixi.js';
import { getLevelStars, getMaxStarScore, type LevelDef } from '@/config/LevelConfig';
import { TweenManager, Ease } from '@/core/TweenManager';
import { addImageSprite } from '@/utils/imageTexture';

/** Text readable on dark glass panels (level mode busy backgrounds) */
const C_LABEL = 0xE2E8F0;
const C_TITLE = 0xFFFFFF;
const C_SCORE = 0xFCD34D;
const C_LIMIT_OK = 0xF1F5F9;
const C_WARN = 0xFB923C;
const C_DANGER = 0xFCA5A5;

export class LevelHud extends PIXI.Container {
  private _levelText: PIXI.Text;
  private _limitLabel: PIXI.Text;
  private _limitText: PIXI.Text;
  private _scoreText: PIXI.Text;
  private _progressTrack: PIXI.Graphics;
  private _progressFill: PIXI.Graphics;
  private _starMarkers: PIXI.Container[] = [];
  private _earnedStars = 0;
  private _progressRatio = 0;

  private _levelDef: LevelDef;
  private _timeRemaining = 0;
  private _barWidth: number;
  private readonly _panelW: number;
  private readonly _panelH: number;
  private readonly _barX: number;
  private readonly _barY: number;
  private readonly _barH: number;
  private readonly _barRadius: number;

  constructor(levelDef: LevelDef, panelWidth = 660) {
    super();
    this._levelDef = levelDef;
    this._panelW = panelWidth;
    this._panelH = Math.round(panelWidth * 0.385);
    this._barX = Math.round(panelWidth * 0.13);
    this._barY = Math.round(this._panelH * 0.60);
    this._barWidth = Math.min(340, Math.round(panelWidth * 0.52));
    this._barH = Math.max(18, Math.round(this._panelH * 0.09));
    this._barRadius = this._barH / 2;

    const panelHolder = new PIXI.Container();
    this.addChild(panelHolder);
    addImageSprite(panelHolder, 'images/level_hud_panel.png', (panelSprite) => {
      panelSprite.width = this._panelW;
      panelSprite.height = this._panelH;
    });

    this._progressTrack = new PIXI.Graphics();
    this.addChild(this._progressTrack);
    this._drawProgressTrack();

    this._progressFill = new PIXI.Graphics();
    this.addChild(this._progressFill);
    this._drawProgress(0);

    this._createStarMarkers();

    const hourglassHolder = new PIXI.Container();
    this.addChild(hourglassHolder);
    addImageSprite(hourglassHolder, 'images/level_hourglass_icon.png', (sprite) => {
      sprite.width = Math.round(this._panelW * 0.06);
      sprite.height = Math.round(this._panelW * 0.09);
      sprite.anchor.set(0.5, 0.5);
      sprite.x = this._panelW * 0.78;
      sprite.y = this._barY + this._barH / 2;
    });

    const titleStyle = new PIXI.TextStyle({
      fontSize: 40,
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
      fontSize: 24,
      fill: C_TITLE,
      fontFamily: 'Arial',
      fontWeight: 'bold',
      dropShadow: true,
      dropShadowColor: 0x000000,
      dropShadowBlur: 3,
      dropShadowDistance: 1,
      dropShadowAlpha: 0.45,
    });
    const limitStyle = new PIXI.TextStyle({
      fontSize: 40,
      fill: C_SCORE,
      fontWeight: 'bold',
      fontFamily: 'Arial',
      stroke: 0x6B3F00,
      strokeThickness: 4,
      dropShadow: true,
      dropShadowColor: 0x000000,
      dropShadowBlur: 3,
      dropShadowDistance: 1,
      dropShadowAlpha: 0.45,
    });

    this._levelText = new PIXI.Text(`第 ${levelDef.id} 关`, titleStyle);
    this._levelText.anchor.set(0.5, 0.5);
    this._levelText.x = this._panelW / 2;
    this._levelText.y = this._panelH * 0.16;
    this.addChild(this._levelText);

    this._scoreText = new PIXI.Text('当前分数: 0', labelStyle);
    this._scoreText.anchor.set(0, 0.5);
    this._scoreText.x = this._panelW * 0.10;
    this._scoreText.y = this._panelH * 0.39;
    this.addChild(this._scoreText);

    this._limitLabel = new PIXI.Text(levelDef.type === 'timed' ? '剩余时间:' : '剩余步数:', labelStyle);
    this._limitLabel.anchor.set(1, 0.5);
    this._limitLabel.x = this._panelW * 0.88;
    this._limitLabel.y = this._panelH * 0.39;
    this.addChild(this._limitLabel);

    const initialLimit = levelDef.type === 'timed' ? levelDef.timeLimit : levelDef.stepLimit;
    this._limitText = new PIXI.Text(String(initialLimit ?? 0), limitStyle);
    this._limitText.anchor.set(0.5, 0.5);
    this._limitText.x = this._panelW * 0.86;
    this._limitText.y = this._panelH * 0.68;
    this.addChild(this._limitText);

    if (levelDef.type === 'timed') {
      this._timeRemaining = levelDef.timeLimit!;
    }
  }

  updateSteps(used: number): void {
    if (this._levelDef.type !== 'steps') return;
    const remaining = (this._levelDef.stepLimit ?? 0) - used;
    this._limitText.text = String(Math.max(0, remaining));

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
    this._limitText.text = String(secs);

    if (secs <= 10) {
      this._limitText.style.fill = C_DANGER;
    } else if (secs <= 20) {
      this._limitText.style.fill = C_WARN;
    } else {
      this._limitText.style.fill = C_LIMIT_OK;
    }
  }

  updateScore(score: number): void {
    this._scoreText.text = `当前分数: ${score}`;
    const ratio = Math.min(1, score / getMaxStarScore(this._levelDef.starScores));
    this._drawProgress(ratio);
    this._updateStarMarkers(score);

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

  private _drawProgressTrack(): void {
    const g = this._progressTrack;
    const inset = 0;
    g.clear();
    g.beginFill(0x0F3D8E, 0.78);
    g.drawRoundedRect(this._barX + inset, this._barY + inset, this._barWidth, this._barH, this._barRadius);
    g.endFill();
  }

  private _drawProgress(ratio: number): void {
    const g = this._progressFill;
    g.clear();
    const clampedRatio = Math.max(0, Math.min(1, ratio));
    this._progressRatio = clampedRatio;

    const inset = 3;
    const maxW = this._barWidth - inset * 2;
    const h = this._barH - inset * 2;
    const r = this._barRadius - 2;

    if (clampedRatio <= 0) return;

    const w = Math.max(6, maxW * clampedRatio);
    const color = clampedRatio >= 1 ? 0x34D399 : 0x38BDF8;
    const hi = clampedRatio >= 1 ? 0x6EE7B7 : 0x7DD3FC;

    g.beginFill(color);
    g.drawRoundedRect(this._barX + inset, this._barY + inset, w, h, r);
    g.endFill();

    g.beginFill(hi, 0.35);
    g.drawRoundedRect(this._barX + inset, this._barY + inset, w * 0.55, h * 0.45, r);
    g.endFill();
  }

  private _createStarMarkers(): void {
    const maxScore = getMaxStarScore(this._levelDef.starScores);
    this._levelDef.starScores.forEach((score, index) => {
      const marker = new PIXI.Container();
      const ratio = Math.min(1, score / maxScore);
      marker.x = this._barX + this._barWidth * ratio;
      marker.y = this._barY + this._barH / 2;
      marker.alpha = 0.55;
      this.addChild(marker);
      this._starMarkers[index] = marker;

      const badge = new PIXI.Graphics();
      badge.beginFill(0x0B3A88, 0.92);
      badge.drawRoundedRect(-28, 30, 56, 25, 10);
      badge.endFill();
      badge.lineStyle(2, 0x7DD3FC, 0.95);
      badge.drawRoundedRect(-28, 30, 56, 25, 10);
      marker.addChild(badge);

      addImageSprite(marker, 'images/level_star_icon.png', (sprite) => {
        const size = Math.round(this._panelW * 0.075);
        sprite.width = size;
        sprite.height = size;
        sprite.anchor.set(0.5, 0.5);
        sprite.x = 0;
        sprite.y = -4;
      });

      const scoreText = new PIXI.Text(String(score), new PIXI.TextStyle({
        fontSize: 18,
        fill: 0xFFFFFF,
        stroke: 0x12315F,
        strokeThickness: 3,
        fontWeight: 'bold',
        fontFamily: 'Arial',
      }));
      scoreText.anchor.set(0.5, 0.5);
      scoreText.y = 43;
      marker.addChild(scoreText);
    });
  }

  private _updateStarMarkers(score: number): void {
    const stars = getLevelStars(score, this._levelDef.starScores);
    this._starMarkers.forEach((marker, index) => {
      const earned = index < stars;
      marker.alpha = earned ? 1 : 0.55;
      if (earned && index + 1 > this._earnedStars) {
        marker.scale.set(1.35);
        TweenManager.to({
          target: marker.scale,
          props: { x: 1, y: 1 },
          duration: 0.24,
          ease: Ease.easeOutBack,
        });
      }
    });
    this._earnedStars = stars;
  }
}
