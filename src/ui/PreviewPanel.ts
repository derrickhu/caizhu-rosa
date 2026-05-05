import * as PIXI from 'pixi.js';
import { BALLS_PER_TURN } from '@/config/GameConfig';
import { EventBus } from '@/core/EventBus';
import { BallSprite } from '@/gameobjects/BallSprite';
import { addImageSprite } from '@/utils/imageTexture';
import type { Piece } from '@/config/PieceConfig';

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
      addImageSprite(bannerHolder, 'subpkg_assets/images/level_next_banner.png', (sprite) => {
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

    EventBus.on('board:nextColors', (pieces: Piece[]) => {
      this.setColors(pieces);
    });
  }

  setColors(pieces: Piece[]): void {
    for (let i = 0; i < this._slots.length; i++) {
      const slot = this._slots[i];
      slot.removeChildren();

      if (i >= pieces.length) continue;
      const r = this._dotRadius;
      slot.addChild(new BallSprite(pieces[i], r));
    }
  }
}
