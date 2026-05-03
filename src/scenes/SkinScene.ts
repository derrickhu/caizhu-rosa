import * as PIXI from 'pixi.js';
import { Game } from '@/core/Game';
import { SceneManager, type Scene } from '@/core/SceneManager';
import { Platform } from '@/core/PlatformService';
import { SkinManager } from '@/managers/SkinManager';
import { createBgSprite } from '@/utils/bgHelper';
import { addImageSprite, loadImageTexture } from '@/utils/imageTexture';
import { getOrbSkinTexture, refreshOrbTextures } from '@/utils/orbLoader';
import type { SkinCategory, SkinDef, OrbSkinDef, BackgroundSkinDef } from '@/config/SkinConfig';

const PANEL_PATH = 'images/skin_panel.png';
const TAB_ACTIVE_PATH = 'images/skin_tab_active.png';
const TAB_INACTIVE_PATH = 'images/skin_tab_inactive.png';
const CARD_PATH = 'images/skin_card_empty.png';

export class SkinScene implements Scene {
  readonly name = 'skin';
  readonly container = new PIXI.Container();

  private _activeTab: SkinCategory = 'orb';
  private _tabContainer!: PIXI.Container;
  private _viewport!: PIXI.Container;
  private _scrollContent!: PIXI.Container;
  private _viewportMask!: PIXI.Graphics;
  private _viewportW = 0;
  private _viewportH = 0;
  private _scrollY = 0;
  private _minScrollY = 0;
  private _dragging = false;
  private _dragStartY = 0;
  private _dragStartScrollY = 0;
  private _unlockingId: string | null = null;

  onEnter(): void {
    this.container.removeChildren();
    this._activeTab = 'orb';
    this._scrollY = 0;
    this._unlockingId = null;

    const W = Game.logicWidth;
    const H = Game.logicHeight;
    this.container.addChild(createBgSprite('images/home_bg_clean.png', W, H, 0x1C9DE6));

    const panelW = Math.min(704, W - 34);
    const panelH = Math.round(panelW * (1038 / 704));
    const panelX = (W - panelW) / 2;
    const panelY = Math.max(Game.safeTop + 36, 42);

    const panelHolder = new PIXI.Container();
    panelHolder.x = panelX;
    panelHolder.y = panelY;
    this.container.addChild(panelHolder);
    addImageSprite(panelHolder, PANEL_PATH, (sprite) => {
      sprite.width = panelW;
      sprite.height = panelH;
    });

    this._createTitle(W, panelY);
    this._createCloseButton(panelX + panelW - 78, panelY + 14);

    this._tabContainer = new PIXI.Container();
    this.container.addChild(this._tabContainer);
    this._renderTabs(W, panelY + 148, panelW);

    const viewportX = panelX + panelW * 0.045;
    const viewportY = panelY + panelH * 0.225;
    const viewportW = panelW * 0.91;
    const viewportH = panelH * 0.71;
    this._viewportW = viewportW;
    this._viewportH = viewportH;

    this._viewport = new PIXI.Container();
    this._viewport.x = viewportX;
    this._viewport.y = viewportY;
    this.container.addChild(this._viewport);

    this._viewportMask = new PIXI.Graphics();
    this._viewportMask.beginFill(0xFFFFFF);
    this._viewportMask.drawRoundedRect(viewportX, viewportY, viewportW, viewportH, 22);
    this._viewportMask.endFill();
    this._viewportMask.renderable = false;
    this.container.addChild(this._viewportMask);
    this._viewport.mask = this._viewportMask;

    this._scrollContent = new PIXI.Container();
    this._viewport.addChild(this._scrollContent);
    this._enableScroll(viewportW, viewportH);
    this._renderCards(viewportW, viewportH);
  }

  onExit(): void {}

  private _createTitle(W: number, panelY: number): void {
    const title = new PIXI.Text('我的皮肤', new PIXI.TextStyle({
      fontSize: 46,
      fill: 0xFFE48A,
      stroke: 0x634114,
      strokeThickness: 7,
      fontWeight: 'bold',
      fontFamily: 'Arial',
      letterSpacing: 3,
    }));
    title.anchor.set(0.5, 0);
    title.x = W / 2;
    title.y = panelY + 18;
    this.container.addChild(title);
  }

  private _createCloseButton(x: number, y: number): void {
    const btn = new PIXI.Container();
    btn.x = x;
    btn.y = y;
    btn.eventMode = 'static';
    btn.cursor = 'pointer';
    btn.hitArea = new PIXI.Circle(34, 34, 34);

    btn.on('pointerdown', () => SceneManager.switchTo('home'));
    this.container.addChild(btn);
  }

  private _renderTabs(W: number, y: number, panelW: number): void {
    this._tabContainer.removeChildren();
    const tabW = Math.min(244, panelW * 0.37);
    const tabH = Math.round(tabW * (86 / 264));
    const gap = Math.max(22, panelW * 0.05);
    const leftX = W / 2 - tabW - gap / 2;
    const rightX = W / 2 + gap / 2;

    this._createTab('orb', '棋子皮肤', leftX, y, tabW, tabH);
    this._createTab('background', '对局背景', rightX, y, tabW, tabH);
  }

  private _createTab(category: SkinCategory, label: string, x: number, y: number, w: number, h: number): void {
    const tab = new PIXI.Container();
    tab.x = x;
    tab.y = y;
    tab.eventMode = 'static';
    tab.cursor = 'pointer';
    tab.hitArea = new PIXI.RoundedRectangle(0, 0, w, h, 24);

    loadImageTexture(this._activeTab === category ? TAB_ACTIVE_PATH : TAB_INACTIVE_PATH).then((texture) => {
      if (!texture || tab.destroyed) return;
      const sprite = new PIXI.Sprite(texture);
      sprite.width = w;
      sprite.height = h;
      tab.addChildAt(sprite, 0);
    });

    const text = new PIXI.Text(label, new PIXI.TextStyle({
      fontSize: 30,
      fill: 0xFFFFFF,
      stroke: 0x165197,
      strokeThickness: 5,
      fontWeight: 'bold',
      fontFamily: 'Arial',
    }));
    text.anchor.set(0.5, 0.5);
    text.x = w / 2;
    text.y = h / 2 + 1;
    tab.addChild(text);

    tab.on('pointerdown', () => {
      if (this._activeTab === category) return;
      this._activeTab = category;
      this._scrollY = 0;
      this._renderTabs(Game.logicWidth, y, Math.min(704, Game.logicWidth - 34));
      this._renderCards(this._viewportW, this._viewportH);
    });

    this._tabContainer.addChild(tab);
  }

  private _enableScroll(viewportW: number, viewportH: number): void {
    this._viewport.eventMode = 'static';
    this._viewport.hitArea = new PIXI.Rectangle(0, 0, viewportW, viewportH);
    this._viewport.on('pointerdown', (e) => {
      this._dragging = true;
      this._dragStartY = e.global.y;
      this._dragStartScrollY = this._scrollY;
    });
    this._viewport.on('pointermove', (e) => {
      if (!this._dragging) return;
      this._scrollY = this._clampScroll(this._dragStartScrollY + e.global.y - this._dragStartY);
      this._scrollContent.y = this._scrollY;
    });
    this._viewport.on('pointerup', () => { this._dragging = false; });
    this._viewport.on('pointerupoutside', () => { this._dragging = false; });
  }

  private _renderCards(viewportW: number, viewportH: number): void {
    this._scrollContent.removeChildren();
    const skins: readonly SkinDef[] = this._activeTab === 'orb'
      ? SkinManager.getOrbSkins()
      : SkinManager.getBackgroundSkins();
    const cols = 3;
    const cardW = 186;
    const cardH = 238;
    const gapX = Math.max(12, (viewportW - cols * cardW) / (cols - 1));
    const gapY = 24;

    skins.forEach((skin, index) => {
      const card = this._createCard(skin, cardW, cardH);
      const col = index % cols;
      const row = Math.floor(index / cols);
      card.x = col * (cardW + gapX);
      card.y = row * (cardH + gapY);
      this._scrollContent.addChild(card);
    });

    const rows = Math.ceil(skins.length / cols);
    const contentH = rows * cardH + Math.max(0, rows - 1) * gapY;
    this._minScrollY = Math.min(0, viewportH - contentH - 14);
    this._scrollY = this._clampScroll(this._scrollY);
    this._scrollContent.y = this._scrollY;
  }

  private _createCard(skin: SkinDef, w: number, h: number): PIXI.Container {
    const card = new PIXI.Container();
    card.eventMode = 'static';
    card.cursor = 'pointer';
    card.hitArea = new PIXI.RoundedRectangle(0, 0, w, h, 20);

    loadImageTexture(CARD_PATH).then((texture) => {
      if (!texture || card.destroyed) return;
      const sprite = new PIXI.Sprite(texture);
      sprite.width = w;
      sprite.height = h;
      card.addChildAt(sprite, 0);
    });

    if (skin.category === 'orb') {
      this._drawOrbPreview(card, skin);
    } else {
      this._drawBackgroundPreview(card, skin);
    }

    this._drawCardText(card, skin, w, h);
    this._drawCardState(card, skin, w, h);

    card.on('pointertap', () => {
      void this._handleSkinTap(skin);
    });

    return card;
  }

  private _drawOrbPreview(card: PIXI.Container, skin: OrbSkinDef): void {
    const colors = [0, 2, 3];
    colors.forEach((colorIndex, i) => {
      const tex = getOrbSkinTexture(skin.sheetRow, colorIndex);
      if (!tex) {
        const dot = new PIXI.Graphics();
        dot.beginFill([0xF45A5A, 0x2D8BFF, 0x44C95F][i]);
        dot.drawCircle(0, 0, 24);
        dot.endFill();
        dot.x = 54 + i * 40;
        dot.y = 70;
        card.addChild(dot);
        return;
      }
      const sprite = new PIXI.Sprite(tex);
      sprite.anchor.set(0.5, 0.5);
      sprite.width = 58;
      sprite.height = 58;
      sprite.x = 54 + i * 40;
      sprite.y = 70;
      card.addChild(sprite);
    });
  }

  private _drawBackgroundPreview(card: PIXI.Container, skin: BackgroundSkinDef): void {
    const previewX = 18;
    const previewY = 17;
    const previewW = 150;
    const previewH = 96;
    const holder = new PIXI.Container();
    holder.x = previewX;
    holder.y = previewY;
    card.addChild(holder);

    const mask = new PIXI.Graphics();
    mask.beginFill(0xFFFFFF);
    mask.drawRoundedRect(previewX, previewY, previewW, previewH, 12);
    mask.endFill();
    mask.renderable = false;
    card.addChild(mask);
    holder.mask = mask;

    loadImageTexture(skin.previewPath).then((texture) => {
      if (!texture || card.destroyed) return;
      const sprite = new PIXI.Sprite(texture);
      sprite.width = previewW;
      sprite.height = previewH;
      holder.addChild(sprite);
    });
  }

  private _drawCardText(card: PIXI.Container, skin: SkinDef, w: number, h: number): void {
    const unlocked = SkinManager.isUnlocked(skin);
    const name = new PIXI.Text(skin.name, new PIXI.TextStyle({
      fontSize: 24,
      fill: 0x0D2B52,
      stroke: 0xFFFFFF,
      strokeThickness: 3,
      fontWeight: 'bold',
      fontFamily: 'Arial',
      align: 'center',
      wordWrap: true,
      wordWrapWidth: w - 20,
    }));
    name.anchor.set(0.5, 0);
    name.x = w / 2;
    name.y = 132;
    card.addChild(name);

    const statusText = SkinManager.isSelected(skin)
      ? '使用中'
      : unlocked ? '点击使用' : SkinManager.getUnlockText(skin);
    const status = new PIXI.Text(statusText, new PIXI.TextStyle({
      fontSize: 18,
      fill: SkinManager.isSelected(skin) ? 0x31B51F : unlocked ? 0x1D6CBB : 0x6A7788,
      stroke: 0xFFFFFF,
      strokeThickness: 3,
      fontWeight: 'bold',
      fontFamily: 'Arial',
      align: 'center',
      wordWrap: true,
      wordWrapWidth: w - 22,
      lineHeight: 22,
    }));
    status.anchor.set(0.5, 0);
    status.x = w / 2;
    status.y = h - 76;
    card.addChild(status);
  }

  private _drawCardState(card: PIXI.Container, skin: SkinDef, w: number, h: number): void {
    if (SkinManager.isSelected(skin)) {
      const border = new PIXI.Graphics();
      border.lineStyle(6, 0x5EF041, 1);
      border.drawRoundedRect(4, 4, w - 8, h - 8, 20);
      card.addChild(border);
    }

    if (!SkinManager.isUnlocked(skin)) {
      const cover = new PIXI.Graphics();
      cover.beginFill(0x0A2452, 0.45);
      cover.drawRoundedRect(16, 14, w - 32, 108, 14);
      cover.endFill();
      card.addChild(cover);

      const lock = new PIXI.Graphics();
      lock.lineStyle(6, 0xE9F4FF, 1);
      lock.arc(0, -8, 20, Math.PI, Math.PI * 2);
      lock.beginFill(0xDCEBFA, 1);
      lock.drawRoundedRect(-26, -6, 52, 38, 8);
      lock.endFill();
      lock.lineStyle(0);
      lock.beginFill(0x6D7F98, 1);
      lock.drawCircle(0, 10, 5);
      lock.drawRect(-2, 11, 4, 11);
      lock.endFill();
      lock.x = w / 2;
      lock.y = 72;
      card.addChild(lock);
    }
  }

  private async _handleSkinTap(skin: SkinDef): Promise<void> {
    if (this._unlockingId) return;

    if (!SkinManager.isUnlocked(skin)) {
      if (skin.unlock.type === 'ad') {
        this._unlockingId = skin.id;
        const unlocked = await SkinManager.unlockByAd(skin.id);
        this._unlockingId = null;
        if (!unlocked) return;
      } else {
        Platform.showToast(SkinManager.getUnlockText(skin));
        return;
      }
    }

    const selected = SkinManager.selectSkin(skin.id);
    if (!selected) return;
    if (skin.category === 'orb') {
      await refreshOrbTextures();
    }
    Platform.showToast('已使用', 'success');
    this._renderCards(this._viewportW, this._viewportH);
  }

  private _clampScroll(value: number): number {
    return Math.max(this._minScrollY, Math.min(0, value));
  }
}
