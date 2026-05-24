import * as PIXI from 'pixi.js';
import { Game } from '@/core/Game';
import { TweenManager, Ease } from '@/core/TweenManager';
import { EventBus } from '@/core/EventBus';
import { AudioManager } from '@/core/AudioManager';
import { shareClassicRecord } from '@/core/ShareService';
import { addImageSprite } from '@/utils/imageTexture';

/** Max display size — keep aspect ratio from texture (panels are ~square). */
const PANEL_MAX_W = 500;
const PANEL_MAX_H = 500;

const SCORE_STYLE = new PIXI.TextStyle({
  fontSize: 64,
  fill: 0xFFE566,
  stroke: 0xB45309,
  strokeThickness: 7,
  fontWeight: 'bold',
  fontFamily: 'Arial',
  dropShadow: true,
  dropShadowColor: 0x000000,
  dropShadowBlur: 4,
  dropShadowDistance: 2,
  dropShadowAlpha: 0.35,
});

const BEST_STYLE = new PIXI.TextStyle({
  fontSize: 24,
  fill: 0xBFDBFE,
  fontFamily: 'Arial',
  fontWeight: 'bold',
  dropShadow: true,
  dropShadowColor: 0x000000,
  dropShadowBlur: 2,
  dropShadowDistance: 1,
  dropShadowAlpha: 0.3,
});

const RECORD_SCORE_STYLE = new PIXI.TextStyle({
  fontSize: 72,
  fill: 0xFFE566,
  stroke: 0xB45309,
  strokeThickness: 8,
  fontWeight: 'bold',
  fontFamily: 'Arial',
  dropShadow: true,
  dropShadowColor: 0x000000,
  dropShadowBlur: 5,
  dropShadowDistance: 2,
  dropShadowAlpha: 0.4,
});

function fitPanelSprite(sprite: PIXI.Sprite): { w: number; h: number } {
  const tex = sprite.texture;
  const tw = tex?.orig?.width || tex?.width || 1;
  const th = tex?.orig?.height || tex?.height || 1;
  const aspect = tw / th;

  let w = PANEL_MAX_W;
  let h = w / aspect;
  if (h > PANEL_MAX_H) {
    h = PANEL_MAX_H;
    w = h * aspect;
  }

  sprite.anchor.set(0.5, 0.5);
  sprite.width = w;
  sprite.height = h;
  return { w, h };
}

export class GameOverOverlay extends PIXI.Container {
  private _panel: PIXI.Container;
  private _normalArt: PIXI.Container;
  private _recordArt: PIXI.Container;
  private _normalTextLayer!: PIXI.Container;
  private _recordTextLayer!: PIXI.Container;

  private _normalScore!: PIXI.Text;
  private _normalBest!: PIXI.Text;
  private _recordScore!: PIXI.Text;

  private _normalPanelH = PANEL_MAX_H;
  private _recordPanelH = PANEL_MAX_H;
  private _recordShareScore = 0;
  private _normalHitLayer!: PIXI.Container;
  private _recordHitLayer!: PIXI.Container;

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

    this._normalArt = new PIXI.Container();
    this._recordArt = new PIXI.Container();
    this._panel.addChild(this._normalArt);
    this._panel.addChild(this._recordArt);

    this._normalArt.sortableChildren = true;
    this._recordArt.sortableChildren = true;

    const normalImageLayer = new PIXI.Container();
    this._normalHitLayer = new PIXI.Container();
    this._normalTextLayer = new PIXI.Container();
    normalImageLayer.zIndex = 0;
    this._normalHitLayer.zIndex = 5;
    this._normalTextLayer.zIndex = 10;
    this._normalArt.addChild(normalImageLayer, this._normalHitLayer, this._normalTextLayer);

    const recordImageLayer = new PIXI.Container();
    this._recordHitLayer = new PIXI.Container();
    this._recordTextLayer = new PIXI.Container();
    recordImageLayer.zIndex = 0;
    this._recordHitLayer.zIndex = 5;
    this._recordTextLayer.zIndex = 10;
    this._recordArt.addChild(recordImageLayer, this._recordHitLayer, this._recordTextLayer);

    addImageSprite(normalImageLayer, 'subpkg_assets/images/classic_gameover_panel_normal.png', (sprite) => {
      const { h } = fitPanelSprite(sprite);
      this._normalPanelH = h;
      this._layoutNormalTexts();
    });

    addImageSprite(recordImageLayer, 'subpkg_assets/images/classic_gameover_panel_record.png', (sprite) => {
      const { h } = fitPanelSprite(sprite);
      this._recordPanelH = h;
      this._layoutRecordTexts();
    });

    this._normalScore = new PIXI.Text('0', SCORE_STYLE);
    this._normalScore.anchor.set(0.5, 0.5);
    this._normalTextLayer.addChild(this._normalScore);

    this._normalBest = new PIXI.Text('最高记录 0', BEST_STYLE);
    this._normalBest.anchor.set(0.5, 0.5);
    this._normalTextLayer.addChild(this._normalBest);

    this._recordScore = new PIXI.Text('0', RECORD_SCORE_STYLE);
    this._recordScore.anchor.set(0.5, 0.5);
    this._recordTextLayer.addChild(this._recordScore);

    this._layoutNormalTexts();
    this._layoutRecordTexts();
  }

  /** Positions relative to fitted panel height (ratios tuned to baked art). */
  private _layoutNormalTexts(): void {
    const h = this._normalPanelH;
    const scoreSize = Math.round(h * 0.13);
    this._normalScore.style.fontSize = scoreSize;
    this._normalScore.style.strokeThickness = Math.max(4, Math.round(scoreSize * 0.11));
    this._normalScore.y = h * 0.04;
    this._normalBest.style.fontSize = Math.round(h * 0.048);
    this._normalBest.y = h * 0.18;
    this._createHitArea(this._normalHitLayer, 0, h * 0.34, h * 0.52, h * 0.1, () => {
      AudioManager.play('button');
      this.hide();
      EventBus.emit('game:restart');
    }, '_normalRestartHit');
  }

  private _layoutRecordTexts(): void {
    const h = this._recordPanelH;
    const scoreSize = Math.round(h * 0.15);
    this._recordScore.style.fontSize = scoreSize;
    this._recordScore.style.strokeThickness = Math.max(5, Math.round(scoreSize * 0.11));
    this._recordScore.y = h * 0.06;
    this._createHitArea(this._recordHitLayer, -h * 0.22, h * 0.32, h * 0.28, h * 0.09, () => {
      AudioManager.play('button');
      shareClassicRecord(this._recordShareScore);
    }, '_recordShareHit');
    this._createHitArea(this._recordHitLayer, h * 0.22, h * 0.32, h * 0.28, h * 0.09, () => {
      AudioManager.play('button');
      this.hide();
      EventBus.emit('game:restart');
    }, '_recordRestartHit');
  }

  private _createHitArea(
    layer: PIXI.Container,
    x: number,
    y: number,
    w: number,
    h: number,
    onClick: () => void,
    name: string,
  ): void {
    const existing = layer.getChildByName(name);
    if (existing) existing.destroy();

    const btn = new PIXI.Container();
    btn.name = name;
    btn.x = x;
    btn.y = y;
    btn.eventMode = 'static';
    btn.cursor = 'pointer';

    const hit = new PIXI.Graphics();
    hit.beginFill(0xFFFFFF, 0.001);
    hit.drawRoundedRect(-w / 2, -h / 2, w, h, h / 2);
    hit.endFill();
    btn.addChild(hit);

    btn.on('pointerdown', onClick);
    layer.addChild(btn);
  }

  show(score: number, bestScore: number): void {
    const isNewRecord = score > 0 && score >= bestScore;

    this._normalArt.visible = !isNewRecord;
    this._recordArt.visible = isNewRecord;

    if (isNewRecord) {
      this._recordShareScore = score;
      this._recordScore.text = String(score);
    } else {
      this._normalScore.text = String(score);
      this._normalBest.text = `最高记录 ${bestScore}`;
    }

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
