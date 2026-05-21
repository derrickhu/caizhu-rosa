import * as PIXI from 'pixi.js';
import { PropType, PROP_DEFS, ALL_PROPS } from '@/config/PropConfig';
import { PropManager } from '@/managers/PropManager';
import { EventBus } from '@/core/EventBus';
import { TweenManager, Ease } from '@/core/TweenManager';
import { getPropIconTexture } from '@/utils/iconLoader';
import { AudioManager } from '@/core/AudioManager';

/** Slot width per prop (icon + label) */
const BTN_SIZE = 114;
const BTN_GAP = 18;
/** Icon graphic size inside the slot */
const ICON_DISPLAY_SIZE = 114;

const LABEL_STYLE = new PIXI.TextStyle({
  fontSize: 23,
  fill: 0xFFFFFF,
  fontWeight: 'bold',
  fontFamily: 'PingFang SC, Microsoft YaHei, Arial',
  align: 'center',
  stroke: 0x1A1A1A,
  strokeThickness: 5,
  lineHeight: 26,
  dropShadow: true,
  dropShadowColor: 0x000000,
  dropShadowBlur: 2,
  dropShadowDistance: 1,
  dropShadowAlpha: 0.55,
});

/** 文案大致占两行时的内容底边（与 LABEL_STYLE.lineHeight 一致） */
const PROP_LABEL_BLOCK_H = 2 * LABEL_STYLE.lineHeight! + 8;

export class PropBar extends PIXI.Container {
  private _buttons: Map<PropType, PropButton> = new Map();

  constructor() {
    super();
    const props = ALL_PROPS;
    const totalWidth = props.length * BTN_SIZE + (props.length - 1) * BTN_GAP;
    this._addBackdrop(totalWidth);
    this._createButtons();
    this._bindEvents();
  }

  private _addBackdrop(totalWidth: number): void {
    const contentBottom = BTN_SIZE + 2 + PROP_LABEL_BLOCK_H;
    const padX = 22;
    const padY = 14;
    const w = totalWidth + padX * 2;
    const h = contentBottom + padY * 2;
    const radius = 20;
    const g = new PIXI.Graphics();
    g.beginFill(0x061018, 0.5);
    g.drawRoundedRect(0, 0, w, h, radius);
    g.endFill();
    g.x = -w / 2;
    g.y = -padY;
    this.addChildAt(g, 0);
  }

  private _createButtons(): void {
    const props = ALL_PROPS;
    const totalWidth = props.length * BTN_SIZE + (props.length - 1) * BTN_GAP;
    let x = -totalWidth / 2;

    for (const def of props) {
      const btn = new PropButton(def.type);
      btn.x = x;
      this.addChild(btn);
      this._buttons.set(def.type, btn);
      x += BTN_SIZE + BTN_GAP;
    }
  }

  refresh(): void {
    for (const [, btn] of this._buttons) {
      btn.refresh();
    }
  }

  private _onStockChanged = () => { this.refresh(); };
  private _onPropUsed = () => { this.refresh(); };
  private _onSessionReset = () => { this.refresh(); };

  private _bindEvents(): void {
    EventBus.on('prop:stockChanged', this._onStockChanged);
    EventBus.on('prop:used', this._onPropUsed);
    EventBus.on('prop:sessionReset', this._onSessionReset);
  }

  destroy(): void {
    EventBus.off('prop:stockChanged', this._onStockChanged);
    EventBus.off('prop:used', this._onPropUsed);
    EventBus.off('prop:sessionReset', this._onSessionReset);
    super.destroy();
  }
}

class PropButton extends PIXI.Container {
  private _type: PropType;
  private _iconContainer: PIXI.Container;
  private _stockBadge: PIXI.Container;
  private _stockText: PIXI.Text;
  private _nameLabel: PIXI.Text;

  constructor(type: PropType) {
    super();
    this._type = type;
    const def = PROP_DEFS[type];

    this._iconContainer = new PIXI.Container();
    this._iconContainer.x = BTN_SIZE / 2;
    this._iconContainer.y = BTN_SIZE / 2;
    this.addChild(this._iconContainer);
    this._buildIcon(def.icon);

    this._stockBadge = new PIXI.Container();
    this._stockBadge.x = BTN_SIZE - 8;
    this._stockBadge.y = 8;
    this.addChild(this._stockBadge);

    this._stockText = new PIXI.Text('0', new PIXI.TextStyle({
      fontSize: 12,
      fill: 0xFFFFFF,
      fontWeight: 'bold',
      fontFamily: 'Arial',
    }));
    this._stockText.anchor.set(0.5, 0.5);
    this._stockBadge.addChild(this._stockText);

    this._nameLabel = new PIXI.Text(def.name, LABEL_STYLE);
    this._nameLabel.anchor.set(0.5, 0);
    this._nameLabel.x = BTN_SIZE / 2;
    this._nameLabel.y = BTN_SIZE + 2;
    this._nameLabel.wordWrap = true;
    this._nameLabel.wordWrapWidth = BTN_SIZE + 8;
    this.addChild(this._nameLabel);

    this.eventMode = 'static';
    this.cursor = 'pointer';
    this.hitArea = new PIXI.RoundedRectangle(0, 0, BTN_SIZE, BTN_SIZE, 18);
    this.on('pointerdown', () => {
      AudioManager.play('button');
      EventBus.emit('prop:request', this._type);
    });

    this.refresh();
  }

  private _buildIcon(fallbackEmoji: string): void {
    this._iconContainer.removeChildren();

    const texture = getPropIconTexture(this._type);
    if (texture) {
      const sprite = new PIXI.Sprite(texture);
      sprite.width = ICON_DISPLAY_SIZE;
      sprite.height = ICON_DISPLAY_SIZE;
      sprite.anchor.set(0.5, 0.5);
      this._iconContainer.addChild(sprite);
    } else {
      const text = new PIXI.Text(fallbackEmoji, new PIXI.TextStyle({
        fontSize: 28, fontFamily: 'Arial',
      }));
      text.anchor.set(0.5, 0.5);
      this._iconContainer.addChild(text);
    }
  }

  refresh(): void {
    const canRequestUse = PropManager.canRequestUse(this._type);

    this._stockBadge.removeChildren();
    this._stockBadge.visible = false;

    this._iconContainer.alpha = canRequestUse ? 1 : 0.42;
    this._nameLabel.alpha = canRequestUse ? 1 : 0.55;
  }

  animateUse(): void {
    TweenManager.to({
      target: this.scale,
      props: { x: 0.85, y: 0.85 },
      duration: 0.1,
      ease: Ease.easeOutQuad,
      onComplete: () => {
        TweenManager.to({
          target: this.scale,
          props: { x: 1, y: 1 },
          duration: 0.15,
          ease: Ease.easeOutBack,
        });
      },
    });
  }
}
