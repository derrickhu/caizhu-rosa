import * as PIXI from 'pixi.js';
import { BALL_PALETTE } from '@/config/GameConfig';
import { WILD_BALL, BOMB_BALL } from '@/config/PropConfig';
import { TweenManager, Ease } from '@/core/TweenManager';
import { getOrbTexture } from '@/utils/orbLoader';

const RAINBOW: [number, number, number][] = [
  [0xDC3545, 0xFF6B7A, 0x8B0000],
  [0xFFC107, 0xFFE066, 0xB8860B],
  [0x0D6EFD, 0x6EA8FE, 0x003580],
  [0x198754, 0x5DD39E, 0x004D25],
  [0x8B5CF6, 0xB794F6, 0x4C1D95],
];

export class BallSprite extends PIXI.Container {
  /** Set to false to use programmatic Graphics drawing instead of orb textures */
  static useTextures = true;

  private _gfx: PIXI.Graphics;
  private _sprite: PIXI.Sprite | null = null;
  private _colorIndex: number;
  private _radius: number;
  private _selected = false;
  private _bounceTween: any = null;
  private _inner: PIXI.Container;

  constructor(colorIndex: number, radius: number) {
    super();
    this._colorIndex = colorIndex;
    this._radius = radius;

    this._inner = new PIXI.Container();
    this.addChild(this._inner);

    this._gfx = new PIXI.Graphics();
    this._inner.addChild(this._gfx);

    this._draw();
  }

  get colorIndex(): number { return this._colorIndex; }

  setColor(colorIndex: number): void {
    this._colorIndex = colorIndex;
    this._draw();
  }

  private _draw(): void {
    this._gfx.clear();

    if (this._sprite) {
      this._inner.removeChild(this._sprite);
      this._sprite.destroy();
      this._sprite = null;
    }

    if (this._colorIndex === WILD_BALL) {
      this._drawWildBall(this._gfx);
    } else if (this._colorIndex === BOMB_BALL) {
      this._drawBombBall(this._gfx);
    } else {
      const tex = BallSprite.useTextures ? getOrbTexture(this._colorIndex) : null;
      if (tex) {
        this._drawOrbSprite(tex);
      } else {
        this._drawGlassBall(this._gfx);
      }
    }
  }

  /** Use the orb image texture */
  private _drawOrbSprite(tex: PIXI.Texture): void {
    const r = this._radius;

    const sprite = new PIXI.Sprite(tex);
    const displaySize = r * 2;
    sprite.width = displaySize;
    sprite.height = displaySize;
    sprite.anchor.set(0.5, 0.5);
    this._inner.addChild(sprite);
    this._sprite = sprite;
  }

  /** Fallback: glass marble rendering with multi-layer shading */
  private _drawGlassBall(g: PIXI.Graphics): void {
    const r = this._radius;
    const palette = BALL_PALETTE[this._colorIndex];
    if (!palette) return;
    const [main, hi, shadow] = palette;

    g.beginFill(0x000000, 0.2);
    g.drawEllipse(1.5, r * 0.2, r * 0.85, r * 0.35);
    g.endFill();

    g.beginFill(shadow, 0.6);
    g.drawCircle(0, 0, r);
    g.endFill();

    g.beginFill(main);
    g.drawCircle(0, -r * 0.05, r * 0.92);
    g.endFill();

    g.beginFill(hi, 0.45);
    g.drawEllipse(0, -r * 0.25, r * 0.75, r * 0.55);
    g.endFill();

    g.beginFill(0xFFFFFF, 0.65);
    g.drawEllipse(-r * 0.2, -r * 0.3, r * 0.32, r * 0.2);
    g.endFill();

    g.beginFill(0xFFFFFF, 0.85);
    g.drawEllipse(-r * 0.22, -r * 0.35, r * 0.12, r * 0.08);
    g.endFill();

    g.beginFill(0xFFFFFF, 0.12);
    g.drawEllipse(r * 0.1, r * 0.35, r * 0.4, r * 0.15);
    g.endFill();

    g.beginFill(shadow, 0.15);
    g.drawCircle(0, r * 0.08, r * 0.5);
    g.endFill();
  }

  private _drawWildBall(g: PIXI.Graphics): void {
    const r = this._radius;

    g.beginFill(0x000000, 0.2);
    g.drawEllipse(1.5, r * 0.2, r * 0.85, r * 0.35);
    g.endFill();

    g.beginFill(0xEEEEEE);
    g.drawCircle(0, 0, r);
    g.endFill();

    const segCount = RAINBOW.length;
    const angleStep = (Math.PI * 2) / segCount;
    for (let i = 0; i < segCount; i++) {
      g.beginFill(RAINBOW[i][0], 0.7);
      g.moveTo(0, 0);
      g.arc(0, 0, r * 0.92, angleStep * i - Math.PI / 2, angleStep * (i + 1) - Math.PI / 2);
      g.lineTo(0, 0);
      g.endFill();
    }

    g.beginFill(0xFFFFFF, 0.5);
    g.drawCircle(0, 0, r * 0.45);
    g.endFill();

    g.beginFill(0xFFFFFF, 0.7);
    g.drawEllipse(-r * 0.2, -r * 0.3, r * 0.3, r * 0.18);
    g.endFill();

    g.beginFill(0xFFFFFF, 0.9);
    g.drawEllipse(-r * 0.22, -r * 0.35, r * 0.1, r * 0.06);
    g.endFill();

    g.beginFill(0xFFFFFF, 0.95);
    g.drawCircle(0, 0, r * 0.12);
    g.endFill();
  }

  private _drawBombBall(g: PIXI.Graphics): void {
    const r = this._radius;

    g.beginFill(0x000000, 0.2);
    g.drawEllipse(1.5, r * 0.2, r * 0.85, r * 0.35);
    g.endFill();

    g.beginFill(0x1A1A2E);
    g.drawCircle(0, 0, r);
    g.endFill();

    g.beginFill(0xC0392B, 0.35);
    g.drawCircle(0, r * 0.05, r * 0.8);
    g.endFill();

    g.beginFill(0xE67E22, 0.5);
    g.drawCircle(0, 0, r * 0.5);
    g.endFill();

    g.beginFill(0xF39C12, 0.8);
    g.drawCircle(0, 0, r * 0.22);
    g.endFill();

    g.beginFill(0xFFFFFF, 0.35);
    g.drawEllipse(-r * 0.2, -r * 0.3, r * 0.28, r * 0.16);
    g.endFill();

    g.lineStyle(2.5, 0x95A5A6);
    g.moveTo(r * 0.35, -r * 0.4);
    g.bezierCurveTo(r * 0.5, -r * 0.6, r * 0.6, -r * 0.55, r * 0.7, -r * 0.7);
    g.lineStyle(0);

    g.beginFill(0xFFD700, 0.9);
    g.drawCircle(r * 0.7, -r * 0.7, 3);
    g.endFill();
    g.beginFill(0xFFFFFF, 0.6);
    g.drawCircle(r * 0.7, -r * 0.72, 1.5);
    g.endFill();
  }

  setSelected(selected: boolean): void {
    if (this._selected === selected) return;
    this._selected = selected;

    if (this._bounceTween) {
      TweenManager.cancel(this._bounceTween);
      this._bounceTween = null;
    }

    if (selected) {
      this._startBounce();
    } else {
      this._inner.y = 0;
    }
  }

  private _startBounce(): void {
    const bounce = () => {
      if (!this._selected) return;
      this._bounceTween = TweenManager.to({
        target: this._inner,
        props: { y: -6 },
        duration: 0.3,
        ease: Ease.easeOutQuad,
        onComplete: () => {
          if (!this._selected) return;
          this._bounceTween = TweenManager.to({
            target: this._inner,
            props: { y: 0 },
            duration: 0.3,
            ease: Ease.easeInQuad,
            onComplete: bounce,
          });
        },
      });
    };
    bounce();
  }

  animateAppear(): void {
    this.scale.set(0, 0);
    this.alpha = 0;
    TweenManager.to({
      target: this.scale,
      props: { x: 1, y: 1 },
      duration: 0.25,
      ease: Ease.easeOutBack,
    });
    TweenManager.to({
      target: this,
      props: { alpha: 1 },
      duration: 0.2,
    });
  }

  animateEliminate(onComplete?: () => void): void {
    TweenManager.to({
      target: this.scale,
      props: { x: 1.22, y: 1.22 },
      duration: 0.055,
      ease: Ease.easeOutQuad,
      onComplete: () => {
        TweenManager.to({
          target: this.scale,
          props: { x: 0.72, y: 0.72 },
          duration: 0.055,
          ease: Ease.easeInQuad,
          onComplete: () => {
            TweenManager.to({
              target: this.scale,
              props: { x: 2.15, y: 2.15 },
              duration: 0.16,
              ease: Ease.easeOutQuad,
            });
          },
        });
        TweenManager.to({
          target: this,
          props: { alpha: 0 },
          duration: 0.18,
          delay: 0.055,
          onComplete,
        });
      },
    });
  }

  animateExplode(onComplete?: () => void): void {
    TweenManager.to({
      target: this.scale,
      props: { x: 2.0, y: 2.0 },
      duration: 0.2,
      ease: Ease.easeOutQuad,
      onComplete: () => {
        TweenManager.to({
          target: this,
          props: { alpha: 0 },
          duration: 0.15,
          onComplete: () => {
            TweenManager.to({
              target: this.scale,
              props: { x: 0, y: 0 },
              duration: 0.1,
              onComplete,
            });
          },
        });
      },
    });
  }
}
