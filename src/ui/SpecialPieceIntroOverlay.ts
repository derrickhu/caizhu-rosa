import * as PIXI from 'pixi.js';
import { Game } from '@/core/Game';
import { TweenManager, Ease } from '@/core/TweenManager';
import { addImageSprite } from '@/utils/imageTexture';
import { AudioManager } from '@/core/AudioManager';
import { BallSprite } from '@/gameobjects/BallSprite';
import type { SpecialPieceIntroDef } from '@/config/SpecialPieceIntroConfig';

/** 与 special_intro_panel.png 原生尺寸一致，勿改比例 */
const PANEL_W = 520;
const PANEL_H = 470;

/** 相对面板中心 (0,0) 的固定槽位，对齐底图蓝框/黄框/绿按钮 */
const SLOT = {
  titleY: -205,
  iconY: -82,
  nameY: -6,
  descY: 58,
  tipY: 136,
  btnY: 198,
} as const;

const DESC_WRAP_W = 400;
const TIP_WRAP_W = 380;
const ICON_BALL_SIZE = 56;
const ICON_IMAGE_SIZE = 112;

export class SpecialPieceIntroOverlay extends PIXI.Container {
  private _panel: PIXI.Container;
  private _contentLayer: PIXI.Container;
  private _iconHolder: PIXI.Container;
  private _titleText: PIXI.Text;
  private _nameText: PIXI.Text;
  private _descText: PIXI.Text;
  private _tipText: PIXI.Text;
  private _targetPanelScale = 1;
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

    const bgLayer = new PIXI.Container();
    this._panel.addChild(bgLayer);
    addImageSprite(bgLayer, 'subpkg_assets/images/special_intro_panel.png', (sprite) => {
      sprite.anchor.set(0.5);
      sprite.width = PANEL_W;
      sprite.height = PANEL_H;
    });

    this._contentLayer = new PIXI.Container();
    this._panel.addChild(this._contentLayer);

    this._titleText = new PIXI.Text('', new PIXI.TextStyle({
      fontSize: 34,
      fill: 0xFFE86A,
      stroke: 0x7A3A00,
      strokeThickness: 5,
      fontWeight: 'bold',
      fontFamily: 'PingFang SC, Microsoft YaHei, Arial',
      dropShadow: true,
      dropShadowColor: 0x000000,
      dropShadowBlur: 3,
      dropShadowDistance: 2,
      dropShadowAlpha: 0.35,
    }));
    this._titleText.anchor.set(0.5);
    this._titleText.y = SLOT.titleY;
    this._contentLayer.addChild(this._titleText);

    this._iconHolder = new PIXI.Container();
    this._iconHolder.y = SLOT.iconY;
    this._contentLayer.addChild(this._iconHolder);

    this._nameText = new PIXI.Text('', new PIXI.TextStyle({
      fontSize: 26,
      fill: 0xFFF36A,
      stroke: 0x07488E,
      strokeThickness: 4,
      fontWeight: 'bold',
      fontFamily: 'PingFang SC, Microsoft YaHei, Arial',
      align: 'center',
    }));
    this._nameText.anchor.set(0.5);
    this._nameText.y = SLOT.nameY;
    this._contentLayer.addChild(this._nameText);

    this._descText = new PIXI.Text('', new PIXI.TextStyle({
      fontSize: 22,
      fill: 0xFFFFFF,
      stroke: 0x0B3A88,
      strokeThickness: 4,
      fontWeight: 'bold',
      fontFamily: 'PingFang SC, Microsoft YaHei, Arial',
      wordWrap: true,
      wordWrapWidth: DESC_WRAP_W,
      align: 'center',
      lineHeight: 28,
    }));
    this._descText.anchor.set(0.5);
    this._descText.y = SLOT.descY;
    this._contentLayer.addChild(this._descText);

    this._tipText = new PIXI.Text('', new PIXI.TextStyle({
      fontSize: 20,
      fill: 0xFFF3B0,
      stroke: 0x7A3A00,
      strokeThickness: 3,
      fontWeight: 'bold',
      fontFamily: 'PingFang SC, Microsoft YaHei, Arial',
      wordWrap: true,
      wordWrapWidth: TIP_WRAP_W,
      align: 'center',
      lineHeight: 28,
    }));
    this._tipText.anchor.set(0.5);
    this._tipText.y = SLOT.tipY;
    this._contentLayer.addChild(this._tipText);

    this._createStartButton();
  }

  show(intro: SpecialPieceIntroDef, onClose: () => void): void {
    this._onClose = onClose;
    this._titleText.text = intro.id.startsWith('color-') ? '新棋子' : '新机制';
    this._nameText.text = intro.title;
    this._descText.text = intro.description;
    this._tipText.text = intro.tip;

    this._iconHolder.removeChildren();
    if (intro.iconPiece) {
      const icon = new BallSprite(intro.iconPiece, ICON_BALL_SIZE);
      this._iconHolder.addChild(icon);
    } else if (intro.iconPath) {
      addImageSprite(this._iconHolder, intro.iconPath, (sprite) => {
        sprite.anchor.set(0.5);
        sprite.width = ICON_IMAGE_SIZE;
        sprite.height = ICON_IMAGE_SIZE;
      });
    }

    this._panel.x = Game.logicWidth / 2;
    this._panel.y = Game.logicHeight / 2 + 10;
    this._targetPanelScale = this._computePanelScale();
    this._panel.scale.set(this._targetPanelScale * 0.55);
    this._panel.alpha = 0;
    this.visible = true;

    TweenManager.to({
      target: this._panel.scale,
      props: { x: this._targetPanelScale, y: this._targetPanelScale },
      duration: 0.32,
      ease: Ease.easeOutBack,
    });
    TweenManager.to({ target: this._panel, props: { alpha: 1 }, duration: 0.22 });
  }

  hide(): void {
    this.visible = false;
    this._onClose = null;
  }

  /** 整体等比放大面板，不拉伸底图、不改槽位 */
  private _computePanelScale(): number {
    const margin = 36;
    const fitW = (Game.logicWidth - margin * 2) / PANEL_W;
    const fitH = (Game.logicHeight - margin * 2) / PANEL_H;
    return Math.min(1.26, fitW, fitH);
  }

  private _createStartButton(): void {
    const btn = new PIXI.Container();
    btn.y = SLOT.btnY;
    btn.eventMode = 'static';
    btn.cursor = 'pointer';
    this._contentLayer.addChild(btn);

    const hit = new PIXI.Graphics();
    hit.beginFill(0xFFFFFF, 0.001);
    hit.drawRoundedRect(-124, -27, 248, 54, 27);
    hit.endFill();
    btn.addChild(hit);

    const label = new PIXI.Text('确定', new PIXI.TextStyle({
      fontSize: 28,
      fill: 0xFFFFFF,
      stroke: 0x1E6C00,
      strokeThickness: 4,
      fontWeight: 'bold',
      fontFamily: 'PingFang SC, Microsoft YaHei, Arial',
    }));
    label.anchor.set(0.5);
    btn.addChild(label);

    btn.on('pointerdown', () => {
      AudioManager.play('button');
      const cb = this._onClose;
      this.hide();
      cb?.();
    });
  }
}
