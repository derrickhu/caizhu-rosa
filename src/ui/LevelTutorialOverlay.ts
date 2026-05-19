import * as PIXI from 'pixi.js';
import { Game } from '@/core/Game';
import { TweenManager, Ease } from '@/core/TweenManager';
import { loadImageTexture } from '@/utils/imageTexture';
import type { Point } from '@/systems/PathFinder';

export type LevelTutorialStep = 'welcome' | 'preview' | 'select' | 'move' | 'complete';

type Highlight =
  | { kind: 'circle'; cx: number; cy: number; r: number }
  | { kind: 'rect'; cx: number; cy: number; w: number; h: number; cornerR: number };

export interface LevelTutorialTargets {
  preview: PIXI.Point;
  source: PIXI.Point;
  target: PIXI.Point;
  cellSize: number;
  ballRadius: number;
  previewBanner: { width: number; height: number };
}

const PANEL_ASSET = 'subpkg_assets/images/tutorial_panel.png';
const PANEL_W = 600;
const PANEL_H = 300;
const PANEL_INNER_INSET = { left: 60, right: 60, top: 50, bottom: 38 };

const HAND_ASSET = 'subpkg_assets/images/tutorial_hand_pointer.png';
const HAND_DISPLAY_WIDTH = 110;
// Fingertip pixel of the hand image is at (107, 2) in 160x149 → normalized (0.67, 0.014).
const HAND_TIP_ANCHOR = { x: 0.67, y: 0.014 };

const SHADE_COLOR = 0x05070D;
const SHADE_ALPHA = 0.62;

const STEP_TEXT: Record<LevelTutorialStep, { text: string; button?: string }> = {
  welcome: {
    text: '欢迎来到彩珠五连！\n横、竖、斜任意方向\n同色 5 连即可消除得分。',
    button: '知道了',
  },
  preview: {
    text: '这里是“下一步”预览。\n本回合若没有消除，\n这 3 颗珠子会随机落到棋盘。',
    button: '继续',
  },
  select: {
    text: '先点击高亮的红珠子。',
  },
  move: {
    text: '再点击高亮的空格。\n移过去即可 5 连消除！',
  },
  complete: {
    text: '太棒了！\n横、竖、斜方向\n同色 5 连都能消除得分。',
    button: '开始玩',
  },
};

export class LevelTutorialOverlay extends PIXI.Container {
  private readonly _dimMask: PIXI.Graphics;
  private readonly _highlightRing: PIXI.Graphics;
  private readonly _bubble: PIXI.Container;
  private readonly _text: PIXI.Text;
  private readonly _button: PIXI.Container;
  private readonly _buttonLabel: PIXI.Text;
  private readonly _hand: PIXI.Container;
  private _bubbleSprite: PIXI.Sprite | null = null;
  private _handSprite: PIXI.Sprite | null = null;

  private _targets: LevelTutorialTargets | null = null;
  private _step: LevelTutorialStep = 'welcome';
  private _onDone: (() => void) | null = null;
  private _highlight: Highlight | null = null;
  private _handHome: { x: number; y: number } | null = null;
  private _animTime = 0;
  private _tickerCb: ((t: PIXI.Ticker) => void) | null = null;

  constructor() {
    super();
    this.visible = false;
    this.eventMode = 'static';
    this.sortableChildren = false;

    this._dimMask = new PIXI.Graphics();
    this._dimMask.eventMode = 'static';
    this._dimMask.cursor = 'default';
    this.addChild(this._dimMask);

    this._highlightRing = new PIXI.Graphics();
    this._highlightRing.eventMode = 'none';
    this._highlightRing.visible = false;
    this.addChild(this._highlightRing);

    this._bubble = new PIXI.Container();
    this._bubble.eventMode = 'passive';
    this.addChild(this._bubble);

    this._initBubbleSprite();

    this._text = new PIXI.Text('', new PIXI.TextStyle({
      fontSize: 26,
      fill: 0x3B2A12,
      fontWeight: 'bold',
      fontFamily: 'PingFang SC, Hiragino Sans GB, Microsoft YaHei, Arial',
      wordWrap: true,
      wordWrapWidth: PANEL_W - PANEL_INNER_INSET.left - PANEL_INNER_INSET.right - 8,
      align: 'center',
      lineHeight: 38,
    }));
    this._text.anchor.set(0.5);
    this._bubble.addChild(this._text);

    this._button = this._createButton();
    this._bubble.addChild(this._button);

    this._buttonLabel = new PIXI.Text('', new PIXI.TextStyle({
      fontSize: 26,
      fill: 0xFFFFFF,
      fontWeight: 'bold',
      fontFamily: 'PingFang SC, Hiragino Sans GB, Microsoft YaHei, Arial',
    }));
    this._buttonLabel.anchor.set(0.5);
    this._button.addChild(this._buttonLabel);

    this._hand = new PIXI.Container();
    this._hand.visible = false;
    this._hand.eventMode = 'none';
    this.addChild(this._hand);

    this._initHandSprite();
  }

  // ─── Public API ─────────────────────────────────────────

  show(targets: LevelTutorialTargets, onDone: () => void): void {
    this._targets = targets;
    this._onDone = onDone;
    this.visible = true;
    this._animTime = 0;
    this.setStep('welcome');
    this._startTicker();
  }

  setStep(step: LevelTutorialStep): void {
    this._step = step;
    this._render();
  }

  get currentStep(): LevelTutorialStep {
    return this._step;
  }

  allowsCell(cell: Point, source: Point, target: Point): boolean {
    if (this._step === 'select') return cell.row === source.row && cell.col === source.col;
    if (this._step === 'move') return cell.row === target.row && cell.col === target.col;
    return false;
  }

  flashRejected(): void {
    const baseX = this._bubble.x;
    TweenManager.cancelTarget(this._bubble);
    TweenManager.to({ target: this._bubble, props: { x: baseX - 14 }, duration: 0.05 });
    TweenManager.to({
      target: this._bubble,
      props: { x: baseX + 14 },
      duration: 0.08,
      delay: 0.05,
      onComplete: () => {
        TweenManager.to({ target: this._bubble, props: { x: baseX }, duration: 0.08 });
      },
    });
  }

  hide(): void {
    this.visible = false;
    this._onDone = null;
    this._targets = null;
    this._highlight = null;
    this._handHome = null;
    this._stopTicker();
    TweenManager.cancelTarget(this._bubble);
    TweenManager.cancelTarget(this._bubble.scale);
  }

  // ─── Step rendering ─────────────────────────────────────

  private _render(): void {
    this._highlight = this._computeHighlight(this._step);
    this._handHome = this._computeHandHome(this._step);

    this._drawDim();
    this._drawRing();
    this._setupBubble();
    this._layoutBubble();
    this._layoutHand(0);

    this._hand.visible = !!this._handHome;

    TweenManager.cancelTarget(this._bubble);
    TweenManager.cancelTarget(this._bubble.scale);
    this._bubble.alpha = 1;
    this._bubble.scale.set(0.94);
    TweenManager.to({
      target: this._bubble.scale,
      props: { x: 1, y: 1 },
      duration: 0.18,
      ease: Ease.easeOutBack,
    });
  }

  private _setupBubble(): void {
    const copy = STEP_TEXT[this._step];
    this._text.text = copy.text;

    const hasButton = !!copy.button;
    this._button.visible = hasButton;
    this._buttonLabel.text = copy.button ?? '';

    if (hasButton) {
      this._text.x = PANEL_W / 2;
      this._text.y = PANEL_INNER_INSET.top + 52;
      this._button.x = PANEL_W / 2;
      this._button.y = PANEL_H - PANEL_INNER_INSET.bottom - 28;
    } else {
      this._text.x = PANEL_W / 2;
      this._text.y = PANEL_H / 2;
    }
  }

  // ─── Highlight & hand geometry ─────────────────────────

  private _computeHighlight(step: LevelTutorialStep): Highlight | null {
    if (!this._targets) return null;
    const { preview, source, target, cellSize, ballRadius, previewBanner } = this._targets;
    const ringPad = 8;

    if (step === 'preview') {
      return {
        kind: 'rect',
        cx: preview.x,
        cy: preview.y,
        w: previewBanner.width + ringPad * 2,
        h: previewBanner.height + ringPad * 2,
        cornerR: 28,
      };
    }
    if (step === 'select') {
      return { kind: 'circle', cx: source.x, cy: source.y, r: Math.max(ballRadius, cellSize / 2) - 2 };
    }
    if (step === 'move') {
      return { kind: 'circle', cx: target.x, cy: target.y, r: Math.max(ballRadius, cellSize / 2) - 2 };
    }
    return null;
  }

  /**
   * Hand "home" point = where the fingertip pixel should sit. Hand body extends down-left from the tip
   * (image fingertip at top-center-right of the sprite).
   */
  private _computeHandHome(step: LevelTutorialStep): { x: number; y: number } | null {
    if (!this._targets) return null;
    const { preview, source, target, ballRadius } = this._targets;

    if (step === 'preview') {
      // Middle preview ball (slot[1] is +38 right of panel center) — finger tip on the ball center.
      return { x: preview.x + 38, y: preview.y };
    }
    if (step === 'select') {
      // Tip slightly inside the ball so the gesture clearly lands on it; body extends below.
      return { x: source.x + ballRadius * 0.18, y: source.y + ballRadius * 0.18 };
    }
    if (step === 'move') {
      return { x: target.x + ballRadius * 0.18, y: target.y + ballRadius * 0.18 };
    }
    return null;
  }

  // ─── Drawing ────────────────────────────────────────────

  private _drawDim(): void {
    const g = this._dimMask;
    g.clear();
    g.beginFill(SHADE_COLOR, SHADE_ALPHA);
    g.drawRect(0, 0, Game.logicWidth, Game.logicHeight);
    if (this._highlight) {
      g.beginHole();
      const h = this._highlight;
      if (h.kind === 'circle') {
        g.drawCircle(h.cx, h.cy, h.r);
      } else {
        g.drawRoundedRect(h.cx - h.w / 2, h.cy - h.h / 2, h.w, h.h, h.cornerR);
      }
      g.endHole();
    }
    g.endFill();
  }

  private _drawRing(): void {
    const g = this._highlightRing;
    g.clear();

    if (!this._highlight) {
      g.visible = false;
      return;
    }
    g.visible = true;

    const h = this._highlight;
    if (h.kind === 'circle') {
      g.lineStyle({ width: 4, color: 0xFFD24A, alpha: 0.95, alignment: 0.5 });
      g.drawCircle(h.cx, h.cy, h.r + 2);
      g.lineStyle({ width: 2, color: 0xFFFFFF, alpha: 0.6, alignment: 0.5 });
      g.drawCircle(h.cx, h.cy, h.r + 10);
    } else {
      g.lineStyle({ width: 4, color: 0xFFD24A, alpha: 0.95, alignment: 0.5 });
      g.drawRoundedRect(h.cx - h.w / 2 - 2, h.cy - h.h / 2 - 2, h.w + 4, h.h + 4, h.cornerR + 2);
      g.lineStyle({ width: 2, color: 0xFFFFFF, alpha: 0.55, alignment: 0.5 });
      g.drawRoundedRect(h.cx - h.w / 2 - 8, h.cy - h.h / 2 - 8, h.w + 16, h.h + 16, h.cornerR + 6);
    }
  }

  // ─── Layout ─────────────────────────────────────────────

  private _layoutBubble(): void {
    const w = Game.logicWidth;
    const h = Game.logicHeight;
    const x = (w - PANEL_W) / 2;
    let y = (h - PANEL_H) / 2;

    if (this._highlight) {
      const center = this._highlightCenter(this._highlight);
      const halfH = this._highlightHalfH(this._highlight);
      const margin = 60; // leave room for the hand between bubble and highlight
      const aboveY = center.y - halfH - margin - PANEL_H;
      const belowY = center.y + halfH + margin;
      y = center.y < h * 0.5 ? belowY : aboveY;
      y = Math.max(Game.safeTop + 24, Math.min(h - PANEL_H - 28, y));
    }

    this._bubble.x = Math.max(16, Math.min(w - PANEL_W - 16, x));
    this._bubble.y = y;
  }

  private _layoutHand(tapPulse: number): void {
    if (!this._handHome || !this._hand.visible) return;
    // Tap pulse: fingertip pushes a little toward the target (down-right by a few px) on each beat.
    const reach = tapPulse * 4;
    this._hand.x = this._handHome.x + reach * 0.5;
    this._hand.y = this._handHome.y + reach;
    const baseScale = 1;
    const s = baseScale * (1 + tapPulse * 0.06);
    this._hand.scale.set(s);
  }

  private _highlightCenter(h: Highlight): { x: number; y: number } {
    return { x: h.cx, y: h.cy };
  }

  private _highlightHalfH(h: Highlight): number {
    return h.kind === 'circle' ? h.r : h.h / 2;
  }

  // ─── Ticker for breathing & ring pulse ─────────────────

  private _startTicker(): void {
    if (this._tickerCb) return;
    this._tickerCb = (ticker: PIXI.Ticker) => {
      if (!this.visible) return;
      const dt = ticker.deltaMS / 1000;
      this._animTime += dt;
      const tapPulse = (Math.sin(this._animTime * 4.2) + 1) * 0.5;
      this._layoutHand(tapPulse);
      const breath = (Math.sin(this._animTime * 3.0) + 1) * 0.5;
      this._highlightRing.alpha = 0.55 + breath * 0.4;
    };
    Game.ticker.add(this._tickerCb);
  }

  private _stopTicker(): void {
    if (!this._tickerCb) return;
    Game.ticker.remove(this._tickerCb);
    this._tickerCb = null;
  }

  // ─── Bubble interaction ─────────────────────────────────

  private _handleTapNext(): void {
    if (this._step === 'welcome') {
      this.setStep('preview');
    } else if (this._step === 'preview') {
      this.setStep('select');
    } else if (this._step === 'complete') {
      const done = this._onDone;
      this.hide();
      done?.();
    }
  }

  private _initBubbleSprite(): void {
    void loadImageTexture(PANEL_ASSET).then((texture) => {
      if (!texture || this.destroyed) return;
      const sprite = new PIXI.Sprite(texture);
      sprite.width = PANEL_W;
      sprite.height = PANEL_H;
      sprite.eventMode = 'static';
      this._bubbleSprite = sprite;
      this._bubble.addChildAt(sprite, 0);
    });
  }

  private _createButton(): PIXI.Container {
    const btn = new PIXI.Container();
    btn.eventMode = 'static';
    btn.cursor = 'pointer';
    btn.on('pointerdown', () => this._handleTapNext());

    const w = 220;
    const h = 56;
    const radius = 28;

    const shadow = new PIXI.Graphics();
    shadow.beginFill(0x05070D, 0.28);
    shadow.drawRoundedRect(-w / 2, -h / 2 + 4, w, h, radius);
    shadow.endFill();
    btn.addChild(shadow);

    const bg = new PIXI.Graphics();
    bg.lineStyle(3, 0x1F6F33, 1);
    bg.beginFill(0x37B65A, 1);
    bg.drawRoundedRect(-w / 2, -h / 2, w, h, radius);
    bg.endFill();
    btn.addChild(bg);

    const highlight = new PIXI.Graphics();
    highlight.beginFill(0xFFFFFF, 0.35);
    highlight.drawRoundedRect(-w / 2 + 12, -h / 2 + 6, w - 24, 12, 6);
    highlight.endFill();
    btn.addChild(highlight);

    btn.hitArea = new PIXI.Rectangle(-w / 2, -h / 2, w, h);
    return btn;
  }

  private _initHandSprite(): void {
    void loadImageTexture(HAND_ASSET).then((texture) => {
      if (!texture || this.destroyed) return;
      const sprite = new PIXI.Sprite(texture);
      sprite.anchor.set(HAND_TIP_ANCHOR.x, HAND_TIP_ANCHOR.y);
      const ratio = texture.width > 0 ? texture.height / texture.width : 1;
      sprite.width = HAND_DISPLAY_WIDTH;
      sprite.height = HAND_DISPLAY_WIDTH * ratio;
      this._handSprite = sprite;
      this._hand.addChild(sprite);
    });
  }
}
