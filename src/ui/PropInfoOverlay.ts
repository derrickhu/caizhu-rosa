import * as PIXI from 'pixi.js';
import { Game } from '@/core/Game';
import { TweenManager, Ease } from '@/core/TweenManager';
import { PropType, PROP_DEFS } from '@/config/PropConfig';
import { PropManager } from '@/managers/PropManager';
import { addImageSprite } from '@/utils/imageTexture';

/** 确认按钮图最大显示区域（等比缩放） */
const BUTTON_MAX_W = 300;
const BUTTON_MAX_H = 80;
const PANEL_ART_SCALE = 1.35;

const PANEL_ASSETS: Record<PropType, string> = {
  [PropType.ColorBlast]: 'subpkg_assets/images/prop_panel_color_blast.png',
  [PropType.CrossClear]: 'subpkg_assets/images/prop_panel_cross_clear.png',
  [PropType.WildNext]: 'subpkg_assets/images/prop_panel_wild_next.png',
};

const BUTTON_ASSET = 'subpkg_assets/images/prop_info_button.png';

const STATUS_STYLE = new PIXI.TextStyle({
  fontSize: 21,
  fill: 0xFFFFFF,
  stroke: 0x1B5E7A,
  strokeThickness: 4,
  fontWeight: 'bold',
  fontFamily: 'PingFang SC, Microsoft YaHei, Arial',
  align: 'center',
  wordWrap: true,
  wordWrapWidth: 270,
  breakWords: true,
});

const DESC_STYLE = new PIXI.TextStyle({
  fontSize: 21,
  fill: 0x174B5E,
  stroke: 0xFFFFFF,
  strokeThickness: 3,
  fontWeight: 'bold',
  fontFamily: 'PingFang SC, Microsoft YaHei, Arial',
  align: 'center',
  wordWrap: true,
  wordWrapWidth: 245,
  breakWords: true,
  lineHeight: 30,
});

const TITLE_STYLE = new PIXI.TextStyle({
  fontSize: 36,
  fill: 0xFFFFFF,
  stroke: 0x9B4B00,
  strokeThickness: 6,
  fontWeight: 'bold',
  fontFamily: 'PingFang SC, Microsoft YaHei, Arial',
  align: 'center',
});

const BUTTON_STYLE = new PIXI.TextStyle({
  fontSize: 28,
  fill: 0xFFFFFF,
  stroke: 0x7A3A00,
  strokeThickness: 5,
  fontWeight: 'bold',
  fontFamily: 'PingFang SC, Microsoft YaHei, Arial',
});

export class PropInfoOverlay extends PIXI.Container {
  private _panel: PIXI.Container;
  private _imageLayer: PIXI.Container;
  private _titleText: PIXI.Text;
  private _descText: PIXI.Text;
  private _statusText: PIXI.Text;
  private _confirmText: PIXI.Text;
  private _activeType: PropType | null = null;
  private _onConfirm: (() => void) | null = null;

  constructor() {
    super();
    this.visible = false;

    const backdrop = new PIXI.Graphics();
    backdrop.beginFill(0x000000, 0.52);
    backdrop.drawRect(0, 0, Game.logicWidth, Game.logicHeight);
    backdrop.endFill();
    backdrop.eventMode = 'static';
    backdrop.on('pointerdown', () => this.hide());
    this.addChild(backdrop);

    this._panel = new PIXI.Container();
    this.addChild(this._panel);

    this._imageLayer = new PIXI.Container();
    this._panel.addChild(this._imageLayer);

    this._titleText = new PIXI.Text('', TITLE_STYLE);
    this._titleText.anchor.set(0.5, 0.5);
    this._titleText.y = -288;
    this._panel.addChild(this._titleText);

    this._descText = new PIXI.Text('', DESC_STYLE);
    this._descText.anchor.set(0.5, 0.5);
    this._descText.y = 116;
    this._panel.addChild(this._descText);

    this._statusText = new PIXI.Text('', STATUS_STYLE);
    this._statusText.anchor.set(0.5, 0.5);
    this._statusText.y = 216;
    this._panel.addChild(this._statusText);

    this._createConfirmButton();
  }

  show(type: PropType, canDirectUse: boolean, onConfirm: () => void): void {
    this._activeType = type;
    this._onConfirm = onConfirm;
    this._titleText.text = PROP_DEFS[type].name;
    this._descText.text = getPropDescription(type);
    this._statusText.text = this._getStatusText(type, canDirectUse);
    this._confirmText.text = canDirectUse ? '使用' : '看广告使用';
    this._showPanelAsset(type);

    this._panel.x = Game.logicWidth / 2;
    this._panel.y = Game.logicHeight / 2;
    this._panel.scale.set(0.5);
    this._panel.alpha = 0;
    this.visible = true;

    TweenManager.to({
      target: this._panel.scale,
      props: { x: 1, y: 1 },
      duration: 0.3,
      ease: Ease.easeOutBack,
    });
    TweenManager.to({ target: this._panel, props: { alpha: 1 }, duration: 0.2 });
  }

  hide(): void {
    this.visible = false;
    this._onConfirm = null;
  }

  private _showPanelAsset(type: PropType): void {
    this._imageLayer.removeChildren();
    addImageSprite(this._imageLayer, PANEL_ASSETS[type], (sprite) => {
      if (this._activeType !== type) {
        sprite.visible = false;
        return;
      }
      sprite.anchor.set(0.5, 0.5);
      sprite.scale.set(PANEL_ART_SCALE);
    });
  }

  private _createConfirmButton(): void {
    const btn = new PIXI.Container();
    btn.y = 297;
    btn.eventMode = 'static';
    btn.cursor = 'pointer';

    const imageLayer = new PIXI.Container();
    btn.addChild(imageLayer);
    addImageSprite(imageLayer, BUTTON_ASSET, (sprite) => {
      sprite.anchor.set(0.5, 0.5);
      fitSpriteToMax(sprite, BUTTON_MAX_W, BUTTON_MAX_H);
      sprite.eventMode = 'none';
      const bw = sprite.texture.width * sprite.scale.x;
      const bh = sprite.texture.height * sprite.scale.y;
      const pad = 8;
      btn.hitArea = new PIXI.Rectangle(-bw / 2 - pad, -bh / 2 - pad, bw + pad * 2, bh + pad * 2);
    });

    this._confirmText = new PIXI.Text('', BUTTON_STYLE);
    this._confirmText.anchor.set(0.5, 0.5);
    btn.addChild(this._confirmText);

    btn.on('pointerdown', () => {
      const confirm = this._onConfirm;
      this.hide();
      confirm?.();
    });
    this._panel.addChild(btn);
  }

  private _getStatusText(type: PropType, canDirectUse: boolean): string {
    const stock = PropManager.getStock(type);
    const limit = PROP_DEFS[type].maxPerGame;
    if (canDirectUse) {
      return `当前库存 ${stock}`;
    }
    if (stock <= 0) {
      return '库存不足，看完广告可立即使用一次';
    }
    return `本局普通使用已达上限 ${limit} 次，可看广告继续使用`;
  }
}

/** 将精灵等比缩放到不超过 maxW×maxH，保持原始宽高比 */
function fitSpriteToMax(sprite: PIXI.Sprite, maxW: number, maxH: number): void {
  const tex = sprite.texture;
  const w = tex.width;
  const h = tex.height;
  if (w <= 0 || h <= 0) return;
  const scale = Math.min(maxW / w, maxH / h);
  sprite.scale.set(scale);
}

function getPropDescription(type: PropType): string {
  switch (type) {
    case PropType.ColorBlast:
      return '随机选中棋盘上一种颜色，并消除该颜色的全部珠子';
    case PropType.CrossClear:
      return '点击任意格子，消除它所在横排和竖排的所有珠子';
    case PropType.WildNext:
      return '把下一轮待出现珠子变成万能珠，更容易接出五连';
  }
}
