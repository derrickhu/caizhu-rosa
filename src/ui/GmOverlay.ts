import * as PIXI from 'pixi.js';
import { Game } from '@/core/Game';
import { Platform } from '@/core/PlatformService';
import { TweenManager, Ease } from '@/core/TweenManager';
import { GmManager } from '@/managers/GmManager';

const PANEL_W = 560;
const PANEL_H = 640;

interface ButtonSpec {
  label: string;
  bg: number;
  bgDark: number;
  textStroke: number;
  onPress: () => string;
}

export class GmOverlay extends PIXI.Container {
  private _panel: PIXI.Container;
  private _hintText: PIXI.Text;

  constructor() {
    super();
    this.visible = false;
    this.eventMode = 'static';

    const backdrop = new PIXI.Graphics();
    backdrop.beginFill(0x000000, 0.62);
    backdrop.drawRect(0, 0, Game.logicWidth, Game.logicHeight);
    backdrop.endFill();
    backdrop.eventMode = 'static';
    backdrop.on('pointerdown', () => this.hide());
    this.addChild(backdrop);

    this._panel = new PIXI.Container();
    this._panel.eventMode = 'static';
    this._panel.on('pointerdown', (e) => e.stopPropagation());
    this.addChild(this._panel);

    this._drawPanelBg();

    const title = new PIXI.Text('GM 调试工具', new PIXI.TextStyle({
      fontSize: 38,
      fill: 0xFFFFFF,
      stroke: 0x1B1B5A,
      strokeThickness: 5,
      fontWeight: 'bold',
      fontFamily: 'Arial',
      dropShadow: true,
      dropShadowColor: 0x000000,
      dropShadowBlur: 4,
      dropShadowDistance: 2,
      dropShadowAlpha: 0.4,
    }));
    title.anchor.set(0.5);
    title.y = -PANEL_H / 2 + 56;
    this._panel.addChild(title);

    const subtitle = new PIXI.Text('仅模拟器/开发工具可用', new PIXI.TextStyle({
      fontSize: 22,
      fill: 0xFFE07A,
      stroke: 0x5A2C00,
      strokeThickness: 3,
      fontWeight: 'bold',
      fontFamily: 'Arial',
    }));
    subtitle.anchor.set(0.5);
    subtitle.y = -PANEL_H / 2 + 100;
    this._panel.addChild(subtitle);

    this._buildButtons();

    this._hintText = new PIXI.Text('', new PIXI.TextStyle({
      fontSize: 22,
      fill: 0xA8FFA8,
      stroke: 0x113311,
      strokeThickness: 3,
      fontWeight: 'bold',
      fontFamily: 'Arial',
      wordWrap: true,
      wordWrapWidth: PANEL_W - 60,
      align: 'center',
    }));
    this._hintText.anchor.set(0.5);
    this._hintText.y = PANEL_H / 2 - 56;
    this._panel.addChild(this._hintText);
  }

  show(): void {
    this._hintText.text = '点击空白处或关闭按钮退出';
    this._panel.x = Game.logicWidth / 2;
    this._panel.y = Game.logicHeight / 2;
    this._panel.scale.set(0.6);
    this._panel.alpha = 0;
    this.visible = true;

    TweenManager.to({ target: this._panel.scale, props: { x: 1, y: 1 }, duration: 0.28, ease: Ease.easeOutBack });
    TweenManager.to({ target: this._panel, props: { alpha: 1 }, duration: 0.2 });
  }

  hide(): void {
    this.visible = false;
  }

  private _drawPanelBg(): void {
    const bg = new PIXI.Graphics();

    bg.beginFill(0x1A1A4D);
    bg.lineStyle(6, 0xFFD64A, 1);
    bg.drawRoundedRect(-PANEL_W / 2, -PANEL_H / 2, PANEL_W, PANEL_H, 30);
    bg.endFill();

    bg.beginFill(0x252880, 0.85);
    bg.drawRoundedRect(-PANEL_W / 2 + 14, -PANEL_H / 2 + 14, PANEL_W - 28, PANEL_H - 28, 22);
    bg.endFill();

    this._panel.addChild(bg);

    const close = new PIXI.Container();
    close.x = PANEL_W / 2 - 36;
    close.y = -PANEL_H / 2 + 36;
    close.eventMode = 'static';
    close.cursor = 'pointer';
    close.on('pointerdown', () => this.hide());
    this._panel.addChild(close);

    const closeBg = new PIXI.Graphics();
    closeBg.beginFill(0xE74C3C);
    closeBg.lineStyle(3, 0xFFFFFF, 1);
    closeBg.drawCircle(0, 0, 24);
    closeBg.endFill();
    close.addChild(closeBg);

    const closeX = new PIXI.Text('×', new PIXI.TextStyle({
      fontSize: 32,
      fill: 0xFFFFFF,
      fontWeight: 'bold',
      fontFamily: 'Arial',
    }));
    closeX.anchor.set(0.5, 0.55);
    close.addChild(closeX);
  }

  private _buildButtons(): void {
    const specs: ButtonSpec[] = [
      {
        label: '一键解锁全部（皮肤+关卡+道具）',
        bg: 0x4CAF50,
        bgDark: 0x2D6E2F,
        textStroke: 0x1E4D1E,
        onPress: () => {
          GmManager.unlockAll();
          return '已解锁全部内容';
        },
      },
      {
        label: '解锁全部皮肤',
        bg: 0x2196F3,
        bgDark: 0x1565C0,
        textStroke: 0x0D3F70,
        onPress: () => {
          GmManager.unlockAllSkins();
          return '已解锁全部棋子皮肤与背景';
        },
      },
      {
        label: '解锁全部关卡（含特殊棋子）',
        bg: 0x9C27B0,
        bgDark: 0x6A1B9A,
        textStroke: 0x3A0B57,
        onPress: () => {
          GmManager.unlockAllLevels();
          return '已解锁全部关卡，特殊棋子可在对应关卡触发';
        },
      },
      {
        label: '道具补满 99',
        bg: 0xFF9800,
        bgDark: 0xC56500,
        textStroke: 0x6E3700,
        onPress: () => {
          GmManager.restockAllProps(99);
          return '所有道具已补至 99';
        },
      },
      {
        label: '关闭皮肤全解锁（恢复正常）',
        bg: 0x607D8B,
        bgDark: 0x37474F,
        textStroke: 0x1F2D33,
        onPress: () => {
          GmManager.disableSkinUnlockAll();
          return '已关闭 GM 皮肤全解锁';
        },
      },
    ];

    const btnWidth = PANEL_W - 80;
    const btnHeight = 72;
    const gap = 20;
    const startY = -PANEL_H / 2 + 160;

    specs.forEach((spec, i) => {
      const btn = this._createButton(spec, btnWidth, btnHeight);
      btn.y = startY + i * (btnHeight + gap);
      this._panel.addChild(btn);
    });
  }

  private _createButton(spec: ButtonSpec, w: number, h: number): PIXI.Container {
    const btn = new PIXI.Container();
    btn.eventMode = 'static';
    btn.cursor = 'pointer';

    const bg = new PIXI.Graphics();
    bg.beginFill(spec.bgDark);
    bg.drawRoundedRect(-w / 2, -h / 2 + 4, w, h, 18);
    bg.endFill();
    bg.beginFill(spec.bg);
    bg.lineStyle(3, 0xFFFFFF, 0.45);
    bg.drawRoundedRect(-w / 2, -h / 2, w, h - 6, 18);
    bg.endFill();
    btn.addChild(bg);

    const label = new PIXI.Text(spec.label, new PIXI.TextStyle({
      fontSize: 26,
      fill: 0xFFFFFF,
      stroke: spec.textStroke,
      strokeThickness: 4,
      fontWeight: 'bold',
      fontFamily: 'Arial',
    }));
    label.anchor.set(0.5, 0.55);
    btn.addChild(label);

    btn.on('pointerdown', () => {
      btn.scale.set(0.95);
      try {
        const msg = spec.onPress();
        this._hintText.text = msg;
        Platform.showToast(msg, 'success');
      } catch (e) {
        this._hintText.text = `执行失败：${(e as Error)?.message || e}`;
      }
    });
    btn.on('pointerup', () => btn.scale.set(1));
    btn.on('pointerupoutside', () => btn.scale.set(1));

    return btn;
  }
}
