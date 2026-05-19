import * as PIXI from 'pixi.js';
import { Game } from '@/core/Game';
import { Platform } from '@/core/PlatformService';
import { AudioManager } from '@/core/AudioManager';
import { BackendService } from '@/core/BackendService';
import { UserProfileManager } from '@/managers/UserProfileManager';
import { TweenManager, Ease } from '@/core/TweenManager';
import { addImageSprite } from '@/utils/imageTexture';

const PANEL_W = 640;
const PANEL_H = 700;
const FONT = 'PingFang SC, Microsoft YaHei, Arial';
const CARD_W = 500;

interface ToggleParts {
  track: PIXI.Graphics;
  knob: PIXI.Graphics;
  text: PIXI.Text;
}

export class SettingsOverlay extends PIXI.Container {
  private _panel: PIXI.Container;
  private _userIdText!: PIXI.Text;
  private _hintText!: PIXI.Text;
  private _musicToggle: ToggleParts;
  private _sfxToggle: ToggleParts;
  private _onClose: (() => void) | null = null;

  constructor(onClose?: () => void) {
    super();
    this._onClose = onClose || null;
    this.visible = false;
    this.eventMode = 'static';

    const backdrop = new PIXI.Graphics();
    backdrop.beginFill(0x000000, 0.35);
    backdrop.drawRect(0, 0, Game.logicWidth, Game.logicHeight);
    backdrop.endFill();
    backdrop.eventMode = 'static';
    backdrop.on('pointerdown', () => this.hide());
    this.addChild(backdrop);

    this._panel = new PIXI.Container();
    this._panel.eventMode = 'static';
    this._panel.on('pointerdown', (e) => e.stopPropagation());
    this.addChild(this._panel);

    this._drawPanel();
    this._musicToggle = this._createSettingRow(-155, '音乐', '背景音乐开关', !AudioManager.musicMuted, (enabled) => {
      AudioManager.musicMuted = !enabled;
    });
    this._sfxToggle = this._createSettingRow(-30, '音效', '点击、合成等奖励音效', !AudioManager.sfxMuted, (enabled) => {
      AudioManager.sfxMuted = !enabled;
      if (enabled) AudioManager.play('select');
    });
    this._createUserIdBlock(130);
  }

  show(): void {
    this._refreshToggles();
    this._refreshUserId();
    this._hintText.text = '联系客服或反馈问题时，可复制上方 usrid';
    this._panel.x = Game.logicWidth / 2;
    this._panel.y = Game.logicHeight / 2;
    this._panel.scale.set(0.62);
    this._panel.alpha = 0;
    this.visible = true;

    TweenManager.to({ target: this._panel.scale, props: { x: 1, y: 1 }, duration: 0.28, ease: Ease.easeOutBack });
    TweenManager.to({ target: this._panel, props: { alpha: 1 }, duration: 0.2 });

    void BackendService.ensureToken()
      .then(() => {
        UserProfileManager.setUserId(BackendService.userId);
        if (this.visible) this._refreshUserId();
      })
      .catch(() => {
        if (this.visible) this._refreshUserId();
      });
  }

  hide(): void {
    if (!this.visible) return;
    this.visible = false;
    this._onClose?.();
  }

  private _drawPanel(): void {
    const imageLayer = new PIXI.Container();
    this._panel.addChild(imageLayer);
    addImageSprite(imageLayer, 'subpkg_assets/images/settings_panel_empty_blue.png', (sprite) => {
      sprite.anchor.set(0.5, 0.5);
      sprite.height = PANEL_H;
      sprite.width = PANEL_H * (sprite.texture.width / sprite.texture.height);
      sprite.eventMode = 'none';
    });

    const title = new PIXI.Text('设置', new PIXI.TextStyle({
      fontSize: 42,
      fill: 0xFFE66F,
      stroke: 0x7A4A00,
      strokeThickness: 6,
      fontWeight: 'bold',
      fontFamily: FONT,
      dropShadow: true,
      dropShadowColor: 0x003A8C,
      dropShadowBlur: 3,
      dropShadowDistance: 2,
      dropShadowAlpha: 0.55,
    }));
    title.anchor.set(0.5);
    title.x = -8;
    title.y = -298;
    this._panel.addChild(title);

    const close = new PIXI.Container();
    close.x = 273;
    close.y = -288;
    close.eventMode = 'static';
    close.cursor = 'pointer';
    close.hitArea = new PIXI.Circle(0, 0, 34);
    close.on('pointerdown', () => {
      AudioManager.play('button');
      this.hide();
    });
    this._panel.addChild(close);

    const closeX = new PIXI.Text('×', new PIXI.TextStyle({
      fontSize: 48,
      fill: 0xFFFFFF,
      stroke: 0x004A93,
      strokeThickness: 6,
      fontWeight: 'bold',
      fontFamily: 'Arial',
      dropShadow: true,
      dropShadowColor: 0x003B7A,
      dropShadowBlur: 2,
      dropShadowDistance: 1,
      dropShadowAlpha: 0.65,
    }));
    closeX.anchor.set(0.5, 0.55);
    closeX.x = 13;
    closeX.y = 13;
    close.addChild(closeX);
  }

  private _createSettingRow(y: number, title: string, subtitle: string, enabled: boolean, onToggle: (enabled: boolean) => void): ToggleParts {
    const row = new PIXI.Container();
    row.y = y;
    this._panel.addChild(row);

    const bg = new PIXI.Graphics();
    this._drawGlassCard(bg, CARD_W, 92, 26);
    row.addChild(bg);

    const titleText = new PIXI.Text(title, new PIXI.TextStyle({
      fontSize: 30,
      fill: 0xFFFFFF,
      stroke: 0x0756A8,
      strokeThickness: 4,
      fontWeight: 'bold',
      fontFamily: FONT,
    }));
    titleText.x = -196;
    titleText.y = -31;
    row.addChild(titleText);

    const subText = new PIXI.Text(subtitle, new PIXI.TextStyle({
      fontSize: 20,
      fill: 0xBFF7FF,
      stroke: 0x005092,
      strokeThickness: 3,
      fontWeight: 'bold',
      fontFamily: FONT,
    }));
    subText.x = -196;
    subText.y = 7;
    row.addChild(subText);

    const toggle = new PIXI.Container();
    toggle.x = 170;
    toggle.eventMode = 'static';
    toggle.cursor = 'pointer';
    row.addChild(toggle);

    const track = new PIXI.Graphics();
    const knob = new PIXI.Graphics();
    const text = new PIXI.Text('', new PIXI.TextStyle({
      fontSize: 22,
      fill: 0xFFFFFF,
      fontWeight: 'bold',
      fontFamily: FONT,
    }));
    text.anchor.set(0.5);
    text.x = -18;
    toggle.addChild(track, knob, text);

    const parts = { track, knob, text };
    this._drawToggle(parts, enabled);

    toggle.on('pointerdown', () => {
      AudioManager.play('button');
      const nextEnabled = parts.text.text !== '开';
      onToggle(nextEnabled);
      this._drawToggle(parts, nextEnabled);
    });

    return parts;
  }

  private _createUserIdBlock(y: number): void {
    const block = new PIXI.Container();
    block.y = y;
    this._panel.addChild(block);

    const bg = new PIXI.Graphics();
    this._drawGlassCard(bg, CARD_W, 174, 28);
    block.addChild(bg);

    const title = new PIXI.Text('游戏 usrid', new PIXI.TextStyle({
      fontSize: 28,
      fill: 0xFFE66F,
      stroke: 0x0A5A9E,
      strokeThickness: 4,
      fontWeight: 'bold',
      fontFamily: FONT,
    }));
    title.x = -196;
    title.y = -60;
    block.addChild(title);

    this._userIdText = new PIXI.Text('', new PIXI.TextStyle({
      fontSize: 21,
      fill: 0xFFFFFF,
      stroke: 0x0A5A9E,
      strokeThickness: 3,
      fontWeight: 'bold',
      fontFamily: FONT,
      wordWrap: true,
      wordWrapWidth: 335,
      breakWords: true,
      lineHeight: 26,
    }));
    this._userIdText.x = -196;
    this._userIdText.y = -20;
    block.addChild(this._userIdText);

    const copy = this._createCopyButton();
    copy.x = 176;
    copy.y = -38;
    block.addChild(copy);

    this._hintText = new PIXI.Text('', new PIXI.TextStyle({
      fontSize: 20,
      fill: 0xBFF7FF,
      stroke: 0x005092,
      strokeThickness: 3,
      fontWeight: 'bold',
      fontFamily: FONT,
      align: 'center',
      wordWrap: true,
      wordWrapWidth: 390,
    }));
    this._hintText.anchor.set(0.5);
    this._hintText.y = 52;
    block.addChild(this._hintText);
  }

  private _createCopyButton(): PIXI.Container {
    const btn = new PIXI.Container();
    btn.eventMode = 'static';
    btn.cursor = 'pointer';

    const bg = new PIXI.Graphics();
    bg.beginFill(0x0058B8, 0.98);
    bg.lineStyle(3, 0x7CEBFF, 1);
    bg.drawRoundedRect(-44, -25, 88, 50, 16);
    bg.endFill();
    btn.addChild(bg);

    const label = new PIXI.Text('复制', new PIXI.TextStyle({
      fontSize: 23,
      fill: 0xFFE66F,
      stroke: 0x074D99,
      strokeThickness: 3,
      fontWeight: 'bold',
      fontFamily: FONT,
    }));
    label.anchor.set(0.5);
    btn.addChild(label);

    btn.on('pointerdown', () => {
      AudioManager.play('button');
      const userId = this._getUserId();
      if (!userId) {
        Platform.showToast('usrid 获取中');
        return;
      }
      void Platform.setClipboardData(userId).then((ok) => {
        Platform.showToast(ok ? 'usrid 已复制' : '复制失败，请长按选择', ok ? 'success' : 'none');
      });
    });

    return btn;
  }

  private _drawGlassCard(g: PIXI.Graphics, w: number, h: number, radius: number): void {
    g.beginFill(0x004FAE, 0.72);
    g.lineStyle(4, 0x6FEAFF, 0.95);
    g.drawRoundedRect(-w / 2, -h / 2, w, h, radius);
    g.endFill();

    g.beginFill(0x42DFFF, 0.20);
    g.lineStyle(2, 0xE7FFFF, 0.72);
    g.drawRoundedRect(-w / 2 + 7, -h / 2 + 7, w - 14, h - 14, Math.max(10, radius - 6));
    g.endFill();
  }

  private _refreshToggles(): void {
    this._drawToggle(this._musicToggle, !AudioManager.musicMuted);
    this._drawToggle(this._sfxToggle, !AudioManager.sfxMuted);
  }

  private _refreshUserId(): void {
    const userId = this._getUserId();
    this._userIdText.text = userId || '获取中...';
  }

  private _getUserId(): string {
    return BackendService.userId || UserProfileManager.userId || '';
  }

  private _drawToggle(parts: ToggleParts, enabled: boolean): void {
    parts.track.clear();
    parts.track.beginFill(enabled ? 0x63D650 : 0x5A7FA8);
    parts.track.lineStyle(3, enabled ? 0xD7FFB5 : 0xB9D7F4, 1);
    parts.track.drawRoundedRect(-52, -24, 104, 48, 24);
    parts.track.endFill();

    parts.knob.clear();
    parts.knob.beginFill(0xFFFFFF);
    parts.knob.lineStyle(3, enabled ? 0x45A93C : 0x47739F, 1);
    parts.knob.drawCircle(enabled ? 28 : -28, 0, 22);
    parts.knob.endFill();

    parts.text.text = enabled ? '开' : '关';
    parts.text.x = enabled ? -22 : 22;
  }
}
