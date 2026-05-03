import * as PIXI from 'pixi.js';
import { BALL_PALETTE, BALLS_PER_TURN } from '@/config/GameConfig';
import { WILD_BALL, BOMB_BALL } from '@/config/PropConfig';
import { EventBus } from '@/core/EventBus';
import { BallSprite } from '@/gameobjects/BallSprite';
import { getOrbTexture } from '@/utils/orbLoader';
import { addImageSprite } from '@/utils/imageTexture';

export type PreviewPanelVariant = 'classic' | 'level';

export class PreviewPanel extends PIXI.Container {
  private _label: PIXI.Text;
  private _slots: PIXI.Container[] = [];
  private _dotRadius = 14;

  constructor(options?: { variant?: PreviewPanelVariant }) {
    super();

    const variant = options?.variant ?? 'classic';
    this._dotRadius = variant === 'classic' ? 23 : 34;
    const labelStyle = variant === 'level'
      ? new PIXI.TextStyle({
          fontSize: 28,
          fill: 0xFFFFFF,
          fontFamily: 'Arial',
          fontWeight: 'bold',
          stroke: 0x0F172A,
          strokeThickness: 4,
          dropShadow: true,
          dropShadowColor: 0x000000,
          dropShadowBlur: 6,
          dropShadowDistance: 1,
          dropShadowAlpha: 0.45,
        })
      : new PIXI.TextStyle({
          fontSize: 30,
          fill: 0xFFFFFF,
          fontFamily: 'Arial',
          fontWeight: 'bold',
          stroke: 0x1357A8,
          strokeThickness: 4,
        });

    if (variant === 'level') {
      const bannerHolder = new PIXI.Container();
      this.addChild(bannerHolder);
      addImageSprite(bannerHolder, 'images/level_next_banner.png', (sprite) => {
        sprite.x = -280;
        sprite.y = -36;
        sprite.width = 560;
        sprite.height = 101;
      });
    }

    this._label = new PIXI.Text(variant === 'classic' ? '下次' : '下一步', labelStyle);
    this._label.anchor.set(0.5, 0.5);
    this._label.x = variant === 'classic' ? 0 : -212;
    this._label.y = variant === 'classic' ? 8 : 14;
    this.addChild(this._label);

    for (let i = 0; i < BALLS_PER_TURN; i++) {
      const slot = new PIXI.Container();
      slot.x = variant === 'classic' ? -58 + i * 58 : -74 + i * 112;
      slot.y = variant === 'classic' ? 70 : 14;
      this.addChild(slot);
      this._slots.push(slot);
    }

    EventBus.on('board:nextColors', (colors: number[]) => {
      this.setColors(colors);
    });
  }

  setColors(colorIndices: number[]): void {
    for (let i = 0; i < this._slots.length; i++) {
      const slot = this._slots[i];
      slot.removeChildren();

      if (i >= colorIndices.length) continue;
      const idx = colorIndices[i];
      const r = this._dotRadius;

      if (idx === WILD_BALL) {
        const g = new PIXI.Graphics();
        this._drawMiniWild(g, r);
        slot.addChild(g);
      } else if (idx === BOMB_BALL) {
        const g = new PIXI.Graphics();
        this._drawMiniBomb(g, r);
        slot.addChild(g);
      } else {
        const tex = BallSprite.useTextures ? getOrbTexture(idx) : null;
        if (tex) {
          const sprite = new PIXI.Sprite(tex);
          sprite.width = r * 2;
          sprite.height = r * 2;
          sprite.anchor.set(0.5, 0.5);
          slot.addChild(sprite);
        } else {
          const g = new PIXI.Graphics();
          this._drawMiniGlass(g, idx, r);
          slot.addChild(g);
        }
      }
    }
  }

  private _drawMiniGlass(dot: PIXI.Graphics, idx: number, r: number): void {
    const palette = BALL_PALETTE[idx];
    if (!palette) return;
    const [main, hi, shadow] = palette;

    dot.beginFill(0x000000, 0.15);
    dot.drawEllipse(1, r * 0.15, r * 0.8, r * 0.3);
    dot.endFill();

    dot.beginFill(shadow, 0.5);
    dot.drawCircle(0, 0, r);
    dot.endFill();

    dot.beginFill(main);
    dot.drawCircle(0, -r * 0.05, r * 0.88);
    dot.endFill();

    dot.beginFill(hi, 0.4);
    dot.drawEllipse(0, -r * 0.25, r * 0.65, r * 0.4);
    dot.endFill();

    dot.beginFill(0xFFFFFF, 0.55);
    dot.drawEllipse(-r * 0.18, -r * 0.28, r * 0.25, r * 0.15);
    dot.endFill();

    dot.beginFill(0xFFFFFF, 0.75);
    dot.drawEllipse(-r * 0.2, -r * 0.32, r * 0.09, r * 0.06);
    dot.endFill();
  }

  private _drawMiniWild(g: PIXI.Graphics, r: number): void {
    const colors = [0xDC3545, 0xFFC107, 0x0D6EFD, 0x198754, 0x8B5CF6];
    g.beginFill(0xEEEEEE);
    g.drawCircle(0, 0, r);
    g.endFill();
    const step = (Math.PI * 2) / colors.length;
    for (let i = 0; i < colors.length; i++) {
      g.beginFill(colors[i], 0.6);
      g.moveTo(0, 0);
      g.arc(0, 0, r * 0.88, step * i - Math.PI / 2, step * (i + 1) - Math.PI / 2);
      g.lineTo(0, 0);
      g.endFill();
    }
    g.beginFill(0xFFFFFF, 0.5);
    g.drawCircle(0, 0, r * 0.35);
    g.endFill();
    g.beginFill(0xFFFFFF, 0.7);
    g.drawEllipse(-r * 0.18, -r * 0.28, r * 0.22, r * 0.13);
    g.endFill();
  }

  private _drawMiniBomb(g: PIXI.Graphics, r: number): void {
    g.beginFill(0x1A1A2E);
    g.drawCircle(0, 0, r);
    g.endFill();
    g.beginFill(0xC0392B, 0.3);
    g.drawCircle(0, 0, r * 0.75);
    g.endFill();
    g.beginFill(0xE67E22, 0.5);
    g.drawCircle(0, 0, r * 0.45);
    g.endFill();
    g.beginFill(0xF39C12, 0.7);
    g.drawCircle(0, 0, r * 0.2);
    g.endFill();
    g.beginFill(0xFFFFFF, 0.3);
    g.drawEllipse(-r * 0.18, -r * 0.25, r * 0.2, r * 0.12);
    g.endFill();
  }
}
