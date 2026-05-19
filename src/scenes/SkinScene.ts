import * as PIXI from 'pixi.js';
import { Game } from '@/core/Game';
import { SceneManager, type Scene } from '@/core/SceneManager';
import { Platform } from '@/core/PlatformService';
import { SkinManager } from '@/managers/SkinManager';
import { createBgSprite } from '@/utils/bgHelper';
import { addImageSprite, loadImageTexture } from '@/utils/imageTexture';
import { getOrbSkinTexture, refreshOrbTextures } from '@/utils/orbLoader';
import type { SkinCategory, SkinDef, OrbSkinDef, BackgroundSkinDef } from '@/config/SkinConfig';
import { AudioManager } from '@/core/AudioManager';
import { AUDIO_ASSETS, AUDIO_VOLUME } from '@/config/AudioConfig';

const PANEL_PATH = 'subpkg_assets/images/skin_panel.png';
const TAB_ACTIVE_PATH = 'subpkg_assets/images/skin_tab_active.png';
const TAB_INACTIVE_PATH = 'subpkg_assets/images/skin_tab_inactive.png';
const CARD_PATH = 'subpkg_assets/images/skin_card_empty.png';

/** 卡片资源原始比例（与皮肤面板美术对齐） */
const CARD_BASE_W = 186;
const CARD_BASE_H = 238;

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
  private _unlockingId: string | null = null;
  private _boundScrollMove!: (e: PIXI.FederatedPointerEvent) => void;
  private _boundScrollUp!: () => void;
  /** 按下时指针的全局 Y（渲染坐标），与 mapPositionToPoint / e.global 一致 */
  private _scrollDragStartGlobalY = 0;
  private _scrollDragStartScrollY = 0;
  /** 皮肤页在小游戏上额外挂 wx 触摸（部分机型上子节点按下后 stage 收不到 pointermove） */
  private _wxSkinTouchBound = false;

  constructor() {
    this._boundScrollMove = (e: PIXI.FederatedPointerEvent) => {
      if (!this._dragging) return;
      const dy = (e.global.y - this._scrollDragStartGlobalY) / Game.scale;
      this._scrollY = this._clampScroll(this._scrollDragStartScrollY + dy);
      this._scrollContent.y = this._scrollY;
    };
    this._boundScrollUp = () => {
      this._dragging = false;
    };
  }

  onEnter(): void {
    this.container.removeChildren();
    AudioManager.playBGM(AUDIO_ASSETS.bgmClassic, AUDIO_VOLUME.bgmClassic);
    this._activeTab = 'orb';
    this._scrollY = 0;
    this._unlockingId = null;

    const W = Game.logicWidth;
    const H = Game.logicHeight;
    this.container.eventMode = 'static';
    this.container.hitArea = new PIXI.Rectangle(0, 0, W, H);
    this.container.addChild(createBgSprite('subpkg_assets/images/home_bg_clean.png', W, H, 0x1C9DE6));

    const panelW = Math.min(704, W - 34);
    const panelH = Math.round(panelW * (1038 / 704));
    const panelX = (W - panelW) / 2;
    /** 相对原位置整体下移，避免面板视觉上过靠上；矮屏则贴底留白 */
    const panelDrop = 90;
    const basePanelY = Math.max(Game.safeTop + 36, 42);
    const panelY = Math.min(basePanelY + panelDrop, H - panelH - 16);

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
    this._registerWxSkinScroll();
  }

  private _onScrollPointerDown = (e: PIXI.FederatedPointerEvent): void => {
    this._dragging = true;
    this._scrollDragStartGlobalY = e.global.y;
    this._scrollDragStartScrollY = this._scrollY;
  };

  private _registerWxSkinScroll(): void {
    const api = Platform.api as any;
    if (!Platform.isMinigame || !api?.onTouchMove || this._wxSkinTouchBound) return;
    this._wxSkinTouchBound = true;
    api.onTouchMove(this._onWxTouchMove);
    api.onTouchEnd(this._onWxTouchEnd);
    api.onTouchCancel?.(this._onWxTouchEnd);
  }

  private _unregisterWxSkinScroll(): void {
    const api = Platform.api as any;
    if (!this._wxSkinTouchBound || !api) return;
    this._wxSkinTouchBound = false;
    api.offTouchMove?.(this._onWxTouchMove);
    api.offTouchEnd?.(this._onWxTouchEnd);
    api.offTouchCancel?.(this._onWxTouchEnd);
  }

  private _onWxTouchMove = (e: any): void => {
    if (!this._dragging || !this._scrollContent) return;
    const t = e.changedTouches?.[0] ?? e.touches?.[0];
    if (!t) return;
    const ev = (Game.app?.renderer as any)?.events;
    let y: number;
    if (ev?.mapPositionToPoint) {
      const pt = new PIXI.Point();
      ev.mapPositionToPoint(pt, t.clientX, t.clientY);
      y = pt.y;
    } else {
      const rh = Game.app?.renderer?.height || 1;
      const sh = Game.screenHeight || 1;
      y = t.clientY * (rh / sh);
    }
    const dy = (y - this._scrollDragStartGlobalY) / Game.scale;
    this._scrollY = this._clampScroll(this._scrollDragStartScrollY + dy);
    this._scrollContent.y = this._scrollY;
  };

  private _onWxTouchEnd = (): void => {
    this._boundScrollUp();
  };

  onExit(): void {
    this._dragging = false;
    this._unregisterWxSkinScroll();
    const vo = this._viewport;
    if (vo) {
      vo.off('pointerdown', this._onScrollPointerDown);
      vo.off('pointermove', this._boundScrollMove);
      vo.off('pointerup', this._boundScrollUp);
      vo.off('pointerupoutside', this._boundScrollUp);
      vo.off('pointercancel', this._boundScrollUp);
    }
  }

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

    btn.on('pointerdown', () => {
      AudioManager.play('button');
      SceneManager.switchTo('home');
    });
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
      AudioManager.play('button');
      this._activeTab = category;
      this._scrollY = 0;
      this._renderTabs(Game.logicWidth, y, Math.min(704, Game.logicWidth - 34));
      this._renderCards(this._viewportW, this._viewportH);
    });

    this._tabContainer.addChild(tab);
  }

  private _enableScroll(viewportW: number, viewportH: number): void {
    const vo = this._viewport;
    vo.eventMode = 'static';
    vo.hitArea = new PIXI.Rectangle(0, 0, viewportW, viewportH);
    vo.off('pointerdown', this._onScrollPointerDown);
    vo.off('pointermove', this._boundScrollMove);
    vo.off('pointerup', this._boundScrollUp);
    vo.off('pointerupoutside', this._boundScrollUp);
    vo.off('pointercancel', this._boundScrollUp);
    vo.on('pointerdown', this._onScrollPointerDown);
    vo.on('pointermove', this._boundScrollMove);
    vo.on('pointerup', this._boundScrollUp);
    vo.on('pointerupoutside', this._boundScrollUp);
    vo.on('pointercancel', this._boundScrollUp);
  }

  private _renderCards(viewportW: number, viewportH: number): void {
    this._scrollContent.removeChildren();
    const skins: readonly SkinDef[] = this._activeTab === 'orb'
      ? SkinManager.getOrbSkins()
      : SkinManager.getBackgroundSkins();
    const cols = 3;
    const gapX = 4;
    const gapY = 16;
    // 不超过美术基准尺寸，避免被拉宽导致贴边/溢出；过窄时再缩小
    const cardW = Math.min(
      CARD_BASE_W,
      Math.max(130, Math.floor((viewportW - gapX * (cols - 1)) / cols)),
    );
    const cardH = Math.round(cardW * (CARD_BASE_H / CARD_BASE_W));
    const rowW = cols * cardW + (cols - 1) * gapX;
    const startX = Math.max(0, (viewportW - rowW) / 2);

    skins.forEach((skin, index) => {
      const card = this._createCard(skin, cardW, cardH);
      const col = index % cols;
      const row = Math.floor(index / cols);
      card.x = startX + col * (cardW + gapX);
      card.y = row * (cardH + gapY);
      this._scrollContent.addChild(card);
    });

    const rows = Math.ceil(skins.length / cols);
    const contentH = rows * cardH + Math.max(0, rows - 1) * gapY;
    this._minScrollY = Math.min(0, viewportH - contentH - 8);
    this._scrollY = this._clampScroll(this._scrollY);
    this._scrollContent.y = this._scrollY;
  }

  private _createCard(skin: SkinDef, w: number, h: number): PIXI.Container {
    const card = new PIXI.Container();
    card.eventMode = 'static';
    card.cursor = 'pointer';
    const hitR = Math.max(12, Math.round(20 * Math.min(w / CARD_BASE_W, h / CARD_BASE_H)));
    card.hitArea = new PIXI.RoundedRectangle(0, 0, w, h, hitR);

    loadImageTexture(CARD_PATH).then((texture) => {
      if (!texture || card.destroyed) return;
      const sprite = new PIXI.Sprite(texture);
      sprite.eventMode = 'none';
      sprite.width = w;
      sprite.height = h;
      card.addChildAt(sprite, 0);
    });

    if (skin.category === 'orb') {
      this._drawOrbPreview(card, skin, w, h);
    } else {
      this._drawBackgroundPreview(card, skin, w, h);
    }

    this._drawCardText(card, skin, w, h);
    this._drawCardState(card, skin, w, h);

    card.on('pointerdown', this._onScrollPointerDown);
    card.on('pointermove', this._boundScrollMove);
    card.on('pointerup', this._boundScrollUp);
    card.on('pointerupoutside', this._boundScrollUp);
    card.on('pointercancel', this._boundScrollUp);
    card.on('pointertap', () => {
      void this._handleSkinTap(skin);
    });

    this._muteCardSubtreeForHit(card);
    return card;
  }

  /** 避免 Text/Sprite 抢走命中，保证滚动手势落在卡片容器上 */
  private _muteCardSubtreeForHit(root: PIXI.Container): void {
    for (const ch of root.children) {
      ch.eventMode = 'none';
      if (ch instanceof PIXI.Container) this._muteCardSubtreeForHit(ch);
    }
  }

  private _drawOrbPreview(card: PIXI.Container, skin: OrbSkinDef, w: number, h: number): void {
    const sx = w / CARD_BASE_W;
    const sy = h / CARD_BASE_H;
    const colors = [0, 2, 3];
    colors.forEach((colorIndex, i) => {
      const tex = getOrbSkinTexture(skin.sheetRow, colorIndex);
      const baseX = 54 + i * 40;
      const baseY = 70;
      if (!tex) {
        const dot = new PIXI.Graphics();
        dot.beginFill([0xF45A5A, 0x2D8BFF, 0x44C95F][i]);
        dot.drawCircle(0, 0, 24 * sx);
        dot.endFill();
        dot.x = baseX * sx;
        dot.y = baseY * sy;
        card.addChild(dot);
        return;
      }
      const sprite = new PIXI.Sprite(tex);
      sprite.anchor.set(0.5, 0.5);
      const size = 58 * sx;
      sprite.width = size;
      sprite.height = size;
      sprite.x = baseX * sx;
      sprite.y = baseY * sy;
      card.addChild(sprite);
    });
  }

  private _drawBackgroundPreview(card: PIXI.Container, skin: BackgroundSkinDef, w: number, h: number): void {
    const sx = w / CARD_BASE_W;
    const sy = h / CARD_BASE_H;
    const previewX = Math.round(18 * sx);
    const previewY = Math.round(17 * sy);
    const previewW = Math.round(150 * sx);
    const previewH = Math.round(96 * sy);
    const corner = Math.max(6, Math.round(12 * sx));
    const holder = new PIXI.Container();
    holder.x = previewX;
    holder.y = previewY;
    card.addChild(holder);

    const mask = new PIXI.Graphics();
    mask.beginFill(0xFFFFFF);
    mask.drawRoundedRect(previewX, previewY, previewW, previewH, corner);
    mask.endFill();
    mask.renderable = false;
    card.addChild(mask);
    holder.mask = mask;

    loadImageTexture(skin.previewPath).then((texture) => {
      if (!texture || card.destroyed) return;
      const tw = texture.width;
      const th = texture.height;
      const coverScale = Math.max(previewW / tw, previewH / th);
      const sprite = new PIXI.Sprite(texture);
      sprite.anchor.set(0.5, 0.5);
      sprite.x = previewW / 2;
      sprite.y = previewH / 2;
      sprite.width = tw * coverScale;
      sprite.height = th * coverScale;
      sprite.eventMode = 'none';
      holder.addChild(sprite);
    });
  }

  private _drawCardText(card: PIXI.Container, skin: SkinDef, w: number, h: number): void {
    const nameY = Math.round(132 * (h / CARD_BASE_H));
    const statusY = h - Math.round(76 * (h / CARD_BASE_H));
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
    name.y = nameY;
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
    status.y = statusY;
    card.addChild(status);
  }

  private _drawCardState(card: PIXI.Container, skin: SkinDef, w: number, h: number): void {
    const sx = w / CARD_BASE_W;
    const sy = h / CARD_BASE_H;
    const rr = Math.max(12, Math.round(20 * Math.min(sx, sy)));

    if (SkinManager.isSelected(skin)) {
      const border = new PIXI.Graphics();
      border.lineStyle(6, 0x5EF041, 1);
      border.drawRoundedRect(4, 4, w - 8, h - 8, rr);
      card.addChild(border);
    }

    if (!SkinManager.isUnlocked(skin)) {
      const cover = new PIXI.Graphics();
      cover.beginFill(0x0A2452, 0.45);
      const cx = Math.round(16 * sx);
      const cy = Math.round(14 * sy);
      const cw = w - Math.round(32 * sx);
      const ch = Math.round(108 * sy);
      cover.drawRoundedRect(cx, cy, cw, ch, Math.round(14 * sx));
      cover.endFill();
      card.addChild(cover);

      const lock = new PIXI.Graphics();
      lock.lineStyle(6, 0xE9F4FF, 1);
      lock.arc(0, -8, 20 * sx, Math.PI, Math.PI * 2);
      lock.beginFill(0xDCEBFA, 1);
      lock.drawRoundedRect(-26 * sx, -6 * sy, 52 * sx, 38 * sy, 8 * sx);
      lock.endFill();
      lock.lineStyle(0);
      lock.beginFill(0x6D7F98, 1);
      lock.drawCircle(0, 10 * sy, 5 * sx);
      lock.drawRect(-2 * sx, 11 * sy, 4 * sx, 11 * sy);
      lock.endFill();
      lock.x = w / 2;
      lock.y = 72 * sy;
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
