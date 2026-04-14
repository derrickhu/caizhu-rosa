import * as PIXI from 'pixi.js';
import { PropType, PROP_DEFS, ALL_PROPS } from '@/config/PropConfig';
import { PropManager } from '@/managers/PropManager';
import { EventBus } from '@/core/EventBus';
import { TweenManager, Ease } from '@/core/TweenManager';
import { getPropIconTexture } from '@/utils/iconLoader';

/** Slot width per prop (icon + label) */
const BTN_SIZE = 76;
const BTN_GAP = 12;
const BTN_RADIUS = 18;
/** Icon graphic size inside the slot */
const ICON_DISPLAY_SIZE = 56;

const LABEL_STYLE = new PIXI.TextStyle({
  fontSize: 15,
  fill: 0xFFFFFF,
  fontWeight: 'bold',
  fontFamily: 'PingFang SC, Microsoft YaHei, Arial',
  align: 'center',
  stroke: 0x1A1A1A,
  strokeThickness: 4,
  lineHeight: 18,
  dropShadow: true,
  dropShadowColor: 0x000000,
  dropShadowBlur: 2,
  dropShadowDistance: 1,
  dropShadowAlpha: 0.55,
});

export class PropBar extends PIXI.Container {
  private _buttons: Map<PropType, PropButton> = new Map();

  constructor() {
    super();
    this._createButtons();
    this._bindEvents();
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

  private _bindEvents(): void {
    EventBus.on('prop:stockChanged', this._onStockChanged);
    EventBus.on('prop:used', this._onPropUsed);
  }

  destroy(): void {
    EventBus.off('prop:stockChanged', this._onStockChanged);
    EventBus.off('prop:used', this._onPropUsed);
    super.destroy();
  }
}

class PropButton extends PIXI.Container {
  private _type: PropType;
  private _bg: PIXI.Graphics;
  private _iconContainer: PIXI.Container;
  private _stockBadge: PIXI.Container;
  private _stockText: PIXI.Text;
  private _nameLabel: PIXI.Text;

  constructor(type: PropType) {
    super();
    this._type = type;
    const def = PROP_DEFS[type];

    this._bg = new PIXI.Graphics();
    this.addChild(this._bg);

    this._iconContainer = new PIXI.Container();
    this._iconContainer.x = BTN_SIZE / 2;
    this._iconContainer.y = BTN_SIZE / 2 - 4;
    this.addChild(this._iconContainer);
    this._buildIcon(def.icon);

    this._stockBadge = new PIXI.Container();
    this._stockBadge.x = BTN_SIZE - 6;
    this._stockBadge.y = 6;
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
    this._nameLabel.y = BTN_SIZE + 6;
    this._nameLabel.wordWrap = true;
    this._nameLabel.wordWrapWidth = BTN_SIZE + 8;
    this.addChild(this._nameLabel);

    this.eventMode = 'static';
    this.cursor = 'pointer';
    this.on('pointerdown', () => {
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
    const stock = PropManager.getStock(this._type);
    const canUse = PropManager.canUse(this._type);

    this._bg.clear();

    // 不透明白底，避免关卡条纹背景透出造成「遮罩」感
    if (canUse) {
      this._bg.beginFill(0xFFFFFF, 1);
      this._bg.drawRoundedRect(0, 0, BTN_SIZE, BTN_SIZE, BTN_RADIUS);
      this._bg.endFill();
      this._bg.lineStyle(2, 0x2563EB, 0.85);
      this._bg.drawRoundedRect(0, 0, BTN_SIZE, BTN_SIZE, BTN_RADIUS);
    } else {
      this._bg.beginFill(0xF3F4F6, 1);
      this._bg.drawRoundedRect(0, 0, BTN_SIZE, BTN_SIZE, BTN_RADIUS);
      this._bg.endFill();
      this._bg.lineStyle(1.5, 0xD1D5DB, 1);
      this._bg.drawRoundedRect(0, 0, BTN_SIZE, BTN_SIZE, BTN_RADIUS);
    }

    this._stockBadge.removeChildren();
    this._stockBadge.visible = stock > 0;

    if (stock > 0) {
      const circle = new PIXI.Graphics();
      circle.beginFill(0x2563EB);
      circle.drawCircle(0, 0, 10);
      circle.endFill();
      this._stockBadge.addChild(circle);

      this._stockText.text = String(stock);
      this._stockText.style.fontSize = 12;
      this._stockBadge.addChild(this._stockText);
    }

    this._iconContainer.alpha = canUse ? 1 : 0.55;
    this._nameLabel.alpha = canUse ? 1 : 0.75;
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
