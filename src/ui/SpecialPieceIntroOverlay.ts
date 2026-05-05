import * as PIXI from 'pixi.js';
import { Game } from '@/core/Game';
import { TweenManager, Ease } from '@/core/TweenManager';
import { addImageSprite } from '@/utils/imageTexture';
import { BallSprite } from '@/gameobjects/BallSprite';
import type { SpecialPieceIntroDef } from '@/config/SpecialPieceIntroConfig';

const PANEL_W = 520;
const PANEL_H = 470;

export class SpecialPieceIntroOverlay extends PIXI.Container {
  private _panel: PIXI.Container;
  private _iconHolder: PIXI.Container;
  private _titleText: PIXI.Text;
  private _descText: PIXI.Text;
  private _tipText: PIXI.Text;
  private _onClose: (() => void) | null = null;

  constructor() {
    super();
    this.visible = false;

    const backdrop = new PIXI.Graphics();
    backdrop.beginFill(0x000000, 0.58);
    backdrop.drawRect(0, 0, Game.logicWidth, Game.logicHeight);
    backdrop.endFill();
    backdrop.eventMode = 'static';
    this.addChild(backdrop);

    this._panel = new PIXI.Container();
    this.addChild(this._panel);

    addImageSprite(this._panel, 'subpkg_assets/images/special_intro_panel.png', (sprite) => {
      sprite.anchor.set(0.5);
      sprite.width = PANEL_W;
      sprite.height = PANEL_H;
    });

    this._titleText = new PIXI.Text('', new PIXI.TextStyle({
      fontSize: 34,
      fill: 0xFFFFFF,
      stroke: 0x0B3A88,
      strokeThickness: 5,
      fontWeight: 'bold',
      fontFamily: 'Arial',
      dropShadow: true,
      dropShadowColor: 0x000000,
      dropShadowBlur: 3,
      dropShadowDistance: 2,
      dropShadowAlpha: 0.35,
    }));
    this._titleText.anchor.set(0.5);
    this._titleText.y = -205;
    this._panel.addChild(this._titleText);

    this._iconHolder = new PIXI.Container();
    this._iconHolder.y = -82;
    this._panel.addChild(this._iconHolder);

    this._descText = new PIXI.Text('', new PIXI.TextStyle({
      fontSize: 25,
      fill: 0xFFFFFF,
      stroke: 0x0B3A88,
      strokeThickness: 4,
      fontWeight: 'bold',
      fontFamily: 'Arial',
      wordWrap: true,
      wordWrapWidth: 410,
      align: 'center',
      lineHeight: 34,
    }));
    this._descText.anchor.set(0.5);
    this._descText.y = 44;
    this._panel.addChild(this._descText);

    this._tipText = new PIXI.Text('', new PIXI.TextStyle({
      fontSize: 21,
      fill: 0xFFF3B0,
      stroke: 0x7A3A00,
      strokeThickness: 3,
      fontWeight: 'bold',
      fontFamily: 'Arial',
      wordWrap: true,
      wordWrapWidth: 390,
      align: 'center',
      lineHeight: 30,
    }));
    this._tipText.anchor.set(0.5);
    this._tipText.y = 126;
    this._panel.addChild(this._tipText);

    this._createStartButton();
  }

  show(intro: SpecialPieceIntroDef, onClose: () => void): void {
    this._onClose = onClose;
    this._titleText.text = intro.title;
    this._descText.text = intro.description;
    this._tipText.text = intro.tip;

    this._iconHolder.removeChildren();
    if (intro.iconPiece) {
      this._iconHolder.addChild(new BallSprite(intro.iconPiece, 59));
    } else if (intro.iconPath) {
      addImageSprite(this._iconHolder, intro.iconPath, (sprite) => {
        sprite.anchor.set(0.5);
        sprite.width = 118;
        sprite.height = 118;
      });
    }

    this._panel.x = Game.logicWidth / 2;
    this._panel.y = Game.logicHeight / 2 + 10;
    this._panel.scale.set(0.55);
    this._panel.alpha = 0;
    this.visible = true;

    TweenManager.to({ target: this._panel.scale, props: { x: 1, y: 1 }, duration: 0.32, ease: Ease.easeOutBack });
    TweenManager.to({ target: this._panel, props: { alpha: 1 }, duration: 0.22 });
  }

  hide(): void {
    this.visible = false;
    this._onClose = null;
  }

  private _createStartButton(): void {
    const btn = new PIXI.Container();
    btn.y = 198;
    btn.eventMode = 'static';
    btn.cursor = 'pointer';
    this._panel.addChild(btn);

    const hit = new PIXI.Graphics();
    hit.beginFill(0xFFFFFF, 0.001);
    hit.drawRoundedRect(-124, -27, 248, 54, 27);
    hit.endFill();
    btn.addChild(hit);

    const label = new PIXI.Text('开始挑战', new PIXI.TextStyle({
      fontSize: 28,
      fill: 0xFFFFFF,
      stroke: 0x1E6C00,
      strokeThickness: 4,
      fontWeight: 'bold',
      fontFamily: 'Arial',
    }));
    label.anchor.set(0.5);
    btn.addChild(label);

    btn.on('pointerdown', () => {
      const cb = this._onClose;
      this.hide();
      cb?.();
    });
  }
}
