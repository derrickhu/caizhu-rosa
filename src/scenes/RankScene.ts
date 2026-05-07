import * as PIXI from 'pixi.js';
import { Game } from '@/core/Game';
import { SceneManager, type Scene } from '@/core/SceneManager';
import { TweenManager } from '@/core/TweenManager';
import { Platform } from '@/core/PlatformService';
import { LeaderboardManager } from '@/managers/LeaderboardManager';
import { UserProfileManager } from '@/managers/UserProfileManager';
import { LevelManager } from '@/managers/LevelManager';
import { TOTAL_LEVELS } from '@/config/LevelConfig';
import {
  type LeaderboardClassicEntry,
  type LeaderboardLevelEntry,
  type LeaderboardWorldResult,
} from '@/core/BackendService';
import { BEST_SCORE_KEY } from '@/config/CloudConfig';
import { PersistService } from '@/core/PersistService';
import { createBgSprite } from '@/utils/bgHelper';
import { createAvatarSprite } from '@/utils/avatarSprite';
import { addImageSprite, loadImageTexture } from '@/utils/imageTexture';

type ModeTab = 'classic' | 'level';
type ScopeTab = 'world' | 'friends';

const ROW_HEIGHT = 76;
const ROW_GAP = 8;
const LIST_PADDING_X = 30;
const RANK_ASSET_PREFIX = 'subpkg_assets/images/';
const MODE_TAB_W = 230;
const MODE_TAB_H = 106;
const SCOPE_TAB_W = 118;
const SCOPE_TAB_H = 45;

export class RankScene implements Scene {
  readonly name = 'rank';
  readonly container = new PIXI.Container();

  private _modeTab: ModeTab = 'classic';
  private _scopeTab: ScopeTab = 'world';

  private _modeTabBtns: { tab: ModeTab; bg: PIXI.Graphics; label: PIXI.Text; container: PIXI.Container }[] = [];
  private _scopeTabBtns: { tab: ScopeTab; bg: PIXI.Graphics; label: PIXI.Text; container: PIXI.Container }[] = [];

  private _listArea!: PIXI.Container;
  private _meBar!: PIXI.Container;
  private _meBarRankText!: PIXI.Text;
  private _meBarAvatarHolder!: PIXI.Container;
  private _meBarNameText!: PIXI.Text;
  private _meBarScoreText!: PIXI.Text;

  private _friendCanvasSprite: PIXI.Sprite | null = null;
  private _friendTickerCb: ((dt: number) => void) | null = null;

  private _profileUnsub: (() => void) | null = null;
  private _profilePrompted = false;

  private _classicData: LeaderboardWorldResult<LeaderboardClassicEntry> | null = null;
  private _levelData: LeaderboardWorldResult<LeaderboardLevelEntry> | null = null;

  private _loading = false;

  // ─── Lifecycle ─────────────────────────────────────────────

  onEnter(): void {
    this.container.removeChildren();
    this._modeTab = 'classic';
    this._scopeTab = 'world';

    const W = Game.logicWidth;
    const H = Game.logicHeight;

    const bg = createBgSprite('subpkg_assets/images/home_bg_clean.png', W, H, 0x1C2833);
    this.container.addChild(bg);

    const dim = new PIXI.Graphics();
    dim.beginFill(0x000000, 0.35);
    dim.drawRect(0, 0, W, H);
    dim.endFill();
    this.container.addChild(dim);

    const backBtn = this._createBackButton();
    backBtn.x = 24;
    backBtn.y = Game.safeTop + 14;
    this.container.addChild(backBtn);

    const title = this._createImageAsset('rank_title_banner.png', 560);
    title.x = W / 2;
    title.y = Game.safeTop - 4;
    this.container.addChild(title);

    let cursorY = Game.safeTop + 182;

    this._createModeTabs(W, cursorY);
    cursorY += 112;

    this._createScopeTabs(W, cursorY);
    cursorY += 60;

    this._listArea = new PIXI.Container();
    this._listArea.x = 0;
    this._listArea.y = cursorY;
    this.container.addChild(this._listArea);

    this._meBar = this._createMeBar(W);
    this._meBar.x = 0;
    this._meBar.y = H - 210;
    this.container.addChild(this._meBar);

    this._profileUnsub = UserProfileManager.subscribe(() => {
      this._refreshMeBar();
    });

    void this._promptUserProfileAuth();
    void this._loadInitialData();
    this._renderList();
    this._refreshMeBar();

    title.alpha = 0;
    TweenManager.to({ target: title, props: { alpha: 1 }, duration: 0.4 });
  }

  onExit(): void {
    if (this._profileUnsub) {
      this._profileUnsub();
      this._profileUnsub = null;
    }
    this._teardownFriendCanvas();
  }

  private async _promptUserProfileAuth(): Promise<void> {
    if (this._profilePrompted) return;
    this._profilePrompted = true;
    if (UserProfileManager.profile.authorized) return;
    const profile = await Platform.getUserProfile('用于排行榜显示');
    if (profile && (profile.nickName || profile.avatarUrl)) {
      await UserProfileManager.updateProfile(profile.nickName, profile.avatarUrl);
      LeaderboardManager.invalidateCache();
      void this._loadInitialData(true);
    }
  }

  // ─── Tabs ──────────────────────────────────────────────────

  private _createModeTabs(W: number, y: number): void {
    const gap = 16;
    const totalW = MODE_TAB_W * 2 + gap;
    const startX = (W - totalW) / 2;

    this._modeTabBtns = [];
    (['classic', 'level'] as ModeTab[]).forEach((tab, idx) => {
      const c = new PIXI.Container();
      c.x = startX + idx * (MODE_TAB_W + gap);
      c.y = y;
      c.eventMode = 'static';
      c.cursor = 'pointer';
      c.hitArea = new PIXI.RoundedRectangle(0, 0, MODE_TAB_W, MODE_TAB_H, 26);
      c.on('pointerdown', () => this._switchMode(tab));

      const bg = new PIXI.Graphics();
      c.addChild(bg);

      const label = new PIXI.Text(tab === 'classic' ? '经典版' : '关卡版', new PIXI.TextStyle({
        fontSize: 28,
        fill: 0xFFFFFF,
        fontWeight: 'bold',
        fontFamily: 'Arial',
        stroke: 0x0A4D9B,
        strokeThickness: 5,
      }));
      label.anchor.set(0.5, 0.5);
      label.x = MODE_TAB_W / 2;
      label.y = MODE_TAB_H / 2 - 2;
      c.addChild(label);

      this.container.addChild(c);
      this._modeTabBtns.push({ tab, bg, label, container: c });
    });
    this._restyleModeTabs();
  }

  private _restyleModeTabs(): void {
    for (const item of this._modeTabBtns) {
      item.bg.clear();
      item.bg.visible = false;
      const active = item.tab === this._modeTab;
      const asset = active
        ? item.tab === 'classic' ? 'rank_tab_mode_active_blue.png' : 'rank_tab_mode_active_green.png'
        : 'rank_tab_mode_inactive.png';
      this._setButtonAsset(item.container, asset, MODE_TAB_W);
      if (active) {
        item.label.style.fill = 0xFFFFFF;
      } else {
        item.label.style.fill = 0xD9EEF8;
      }
    }
  }

  private _createScopeTabs(W: number, y: number): void {
    const gap = 12;
    const totalW = SCOPE_TAB_W * 2 + gap;
    const startX = (W - totalW) / 2;

    this._scopeTabBtns = [];
    (['world', 'friends'] as ScopeTab[]).forEach((tab, idx) => {
      const c = new PIXI.Container();
      c.x = startX + idx * (SCOPE_TAB_W + gap);
      c.y = y;
      c.eventMode = 'static';
      c.cursor = 'pointer';
      c.hitArea = new PIXI.RoundedRectangle(0, 0, SCOPE_TAB_W, SCOPE_TAB_H, 18);
      c.on('pointerdown', () => { void this._switchScope(tab); });

      const bg = new PIXI.Graphics();
      c.addChild(bg);

      const label = new PIXI.Text(tab === 'world' ? '全服' : '好友', new PIXI.TextStyle({
        fontSize: 18,
        fill: 0xFFFFFF,
        fontWeight: 'bold',
        fontFamily: 'Arial',
        stroke: 0x7C3F00,
        strokeThickness: 3,
      }));
      label.anchor.set(0.5, 0.5);
      label.x = SCOPE_TAB_W / 2;
      label.y = SCOPE_TAB_H / 2 - 1;
      c.addChild(label);

      this.container.addChild(c);
      this._scopeTabBtns.push({ tab, bg, label, container: c });
    });
    this._restyleScopeTabs();
  }

  private _restyleScopeTabs(): void {
    for (const item of this._scopeTabBtns) {
      item.bg.clear();
      item.bg.visible = false;
      const active = item.tab === this._scopeTab;
      this._setButtonAsset(item.container, active ? 'rank_tab_scope_active.png' : 'rank_tab_scope_inactive.png', SCOPE_TAB_W);
      if (active) {
        item.label.style.fill = 0xFFFFFF;
        item.label.style.stroke = 0x7C3F00;
      } else {
        item.label.style.fill = 0xEAFBFF;
        item.label.style.stroke = 0x1787A9;
      }
    }
  }

  private _switchMode(tab: ModeTab): void {
    if (this._modeTab === tab) return;
    this._modeTab = tab;
    this._restyleModeTabs();
    this._renderList();
    this._refreshMeBar();
    if (this._scopeTab === 'friends') {
      this._postFriendRender();
    }
  }

  private async _switchScope(tab: ScopeTab): Promise<void> {
    if (this._scopeTab === tab) return;
    if (tab === 'friends' && !Platform.supportsOpenData) {
      Platform.showToast('好友榜仅在微信小游戏环境可用');
      return;
    }
    if (tab === 'friends') {
      const ok = await Platform.authorizeWxFriendInteraction();
      if (!ok) {
        Platform.showToast('需要允许好友关系授权后查看好友榜');
        return;
      }
    }
    this._scopeTab = tab;
    this._restyleScopeTabs();
    this._renderList();
    this._refreshMeBar();
  }

  // ─── List rendering ────────────────────────────────────────

  private _renderList(): void {
    this._listArea.removeChildren();
    this._teardownFriendCanvas();

    if (this._scopeTab === 'world') {
      this._renderWorldList();
    } else {
      this._renderFriendList();
    }
  }

  private _renderWorldList(): void {
    const W = Game.logicWidth;
    const data = this._modeTab === 'classic' ? this._classicData : this._levelData;

    if (this._loading) {
      this._listArea.addChild(this._renderEmpty('加载中...', W));
      return;
    }

    const items = data?.items || [];
    const scroll = new PIXI.Container();
    this._listArea.addChild(scroll);

    const podium = this._createTop3Podium(items.slice(0, 3), W);
    podium.x = 18;
    podium.y = 0;
    scroll.addChild(podium);
    const startY = 300;

    const listItems = items.slice(3);
    if (listItems.length === 0 && items.length === 0) {
      const text = this._modeTab === 'classic'
        ? '还没有人提交分数\n快去经典模式挑战吧！'
        : '还没有人完成关卡\n快去关卡模式挑战吧！';
      const empty = this._renderEmpty(text, W);
      empty.y = startY - 8;
      scroll.addChild(empty);
    }

    listItems.forEach((entry, idx) => {
      const row = this._modeTab === 'classic'
        ? this._createClassicRow(entry as LeaderboardClassicEntry, W)
        : this._createLevelRow(entry as LeaderboardLevelEntry, W);
      row.x = LIST_PADDING_X;
      row.y = startY + idx * (ROW_HEIGHT + ROW_GAP);
      row.alpha = 0;
      TweenManager.to({ target: row, props: { alpha: 1 }, duration: 0.25, delay: Math.min(idx * 0.02, 0.4) });
      scroll.addChild(row);
    });

    this._setupListScroll(scroll, listItems.length, startY);
  }

  private _renderFriendList(): void {
    const W = Game.logicWidth;
    if (!Platform.supportsOpenData) {
      this._listArea.addChild(this._renderEmpty('当前环境不支持好友榜\n请在微信小游戏中体验', W));
      return;
    }

    const podium = this._createTop3Podium([], W);
    podium.x = 18;
    podium.y = 0;
    this._listArea.addChild(podium);

    const sharedCanvas = Platform.getSharedCanvas();
    if (!sharedCanvas) {
      const empty = this._renderEmpty('正在加载好友榜...', W);
      empty.y = 300;
      this._listArea.addChild(empty);
      return;
    }

    try {
      const baseTexture = PIXI.BaseTexture.from(sharedCanvas as any);
      const texture = new PIXI.Texture(baseTexture);
      const sprite = new PIXI.Sprite(texture);
      sprite.x = LIST_PADDING_X;
      sprite.y = 300;
      const targetW = W - LIST_PADDING_X * 2;
      const screenScale = sharedCanvas.width > 0 ? targetW / sharedCanvas.width : 1;
      sprite.scale.set(screenScale, screenScale);
      this._friendCanvasSprite = sprite;
      this._listArea.addChild(sprite);

      const ticker = (_dt: number) => {
        try { baseTexture.update(); } catch {}
      };
      this._friendTickerCb = ticker;
      Game.ticker.add(ticker);
    } catch (error) {
      console.warn('[RankScene] sharedCanvas sprite failed', error);
      this._listArea.addChild(this._renderEmpty('好友榜渲染失败', W));
      return;
    }

    this._postFriendRender();
  }

  private _postFriendRender(): void {
    if (!Platform.supportsOpenData) return;
    const W = Game.logicWidth;
    const targetW = W - LIST_PADDING_X * 2;
    Platform.postOpenDataMessage({
      type: 'render',
      tab: this._modeTab,
      viewport: {
        width: 750,
        height: Math.max(900, Math.floor(targetW * 1.4)),
        startY: 28,
      },
    });
  }

  private _teardownFriendCanvas(): void {
    if (this._friendTickerCb) {
      try { Game.ticker.remove(this._friendTickerCb); } catch {}
      this._friendTickerCb = null;
    }
    if (this._friendCanvasSprite) {
      try {
        this._friendCanvasSprite.parent?.removeChild(this._friendCanvasSprite);
        this._friendCanvasSprite.destroy({ children: true });
      } catch {}
      this._friendCanvasSprite = null;
    }
  }

  private _setupListScroll(scroll: PIXI.Container, rowCount: number, extraHeight = 0): void {
    const W = Game.logicWidth;
    const H = Game.logicHeight;
    const visibleH = H - 226 - this._listArea.y - 8;
    const contentH = extraHeight + rowCount * (ROW_HEIGHT + ROW_GAP);

    const mask = new PIXI.Graphics();
    mask.beginFill(0xFFFFFF, 1);
    mask.drawRect(0, 0, W, visibleH);
    mask.endFill();
    mask.x = 0;
    mask.y = 0;
    this._listArea.addChild(mask);
    scroll.mask = mask;

    if (contentH <= visibleH) return;

    let dragging = false;
    let dragStartY = 0;
    let scrollStartY = 0;
    const minY = visibleH - contentH;
    const maxY = 0;

    const hit = new PIXI.Graphics();
    hit.beginFill(0xFFFFFF, 0.001);
    hit.drawRect(0, 0, W, visibleH);
    hit.endFill();
    hit.eventMode = 'static';
    hit.cursor = 'grab';
    this._listArea.addChildAt(hit, 0);

    hit.on('pointerdown', (event: PIXI.FederatedPointerEvent) => {
      dragging = true;
      dragStartY = event.global.y;
      scrollStartY = scroll.y;
    });
    hit.on('pointermove', (event: PIXI.FederatedPointerEvent) => {
      if (!dragging) return;
      const dy = event.global.y - dragStartY;
      // event.global 在 PIXI 7 中是屏幕物理像素；stage 应用了 Game.scale 缩放
      let next = scrollStartY + dy / Game.scale;
      if (next > maxY) next = maxY;
      if (next < minY) next = minY;
      scroll.y = next;
    });
    const endDrag = () => { dragging = false; };
    hit.on('pointerup', endDrag);
    hit.on('pointerupoutside', endDrag);
    hit.on('pointercancel', endDrag);
  }

  private _createTop3Podium(
    items: Array<LeaderboardClassicEntry | LeaderboardLevelEntry>,
    W: number,
  ): PIXI.Container {
    const c = new PIXI.Container();
    const sideW = 165;
    const centerW = 190;
    const leftX = 56;
    const centerX = W / 2 - centerW / 2;
    const rightX = W - sideW - 64;
    const placements = [
      { item: items[1], x: leftX, y: 80, asset: 'rank_top2_panel.png', w: sideW },
      { item: items[0], x: centerX, y: 0, asset: 'rank_top1_panel.png', w: centerW },
      { item: items[2], x: rightX, y: 78, asset: 'rank_top3_panel.png', w: sideW },
    ];

    for (const p of placements) {
      const card = new PIXI.Container();
      card.x = p.x;
      card.y = p.y;
      c.addChild(card);

      const panelHolder = new PIXI.Container();
      card.addChild(panelHolder);
      addImageSprite(panelHolder, RANK_ASSET_PREFIX + p.asset, (sprite) => {
        sprite.width = p.w;
        sprite.height = p.w * (sprite.texture.height / sprite.texture.width);
      });

      if (!p.item) continue;

      const avatar = createAvatarSprite(p.item.avatarUrl, p.asset === 'rank_top1_panel.png' ? 32 : 27);
      avatar.x = p.w / 2 - (p.asset === 'rank_top1_panel.png' ? 32 : 27);
      avatar.y = p.asset === 'rank_top1_panel.png' ? 82 : 30;
      card.addChild(avatar);

      const name = new PIXI.Text(this._truncateNickname(p.item.nickname || '玩家'), new PIXI.TextStyle({
        fontSize: p.asset === 'rank_top1_panel.png' ? 20 : 17,
        fill: 0x1E3A5F,
        fontWeight: 'bold',
        fontFamily: 'Arial',
        stroke: 0xFFFFFF,
        strokeThickness: 2,
      }));
      name.anchor.set(0.5, 0);
      name.x = p.w / 2;
      name.y = p.asset === 'rank_top1_panel.png' ? 154 : 96;
      card.addChild(name);

      const value = this._modeTab === 'classic'
        ? `${(p.item as LeaderboardClassicEntry).bestScore}`
        : `★ ${(p.item as LeaderboardLevelEntry).totalStars}`;
      const score = new PIXI.Text(value, new PIXI.TextStyle({
        fontSize: p.asset === 'rank_top1_panel.png' ? 22 : 18,
        fill: 0xB45309,
        fontWeight: 'bold',
        fontFamily: 'Arial',
        stroke: 0xFFF2B8,
        strokeThickness: 2,
      }));
      score.anchor.set(0.5, 0);
      score.x = p.w / 2;
      score.y = p.asset === 'rank_top1_panel.png' ? 184 : 124;
      card.addChild(score);
    }

    return c;
  }

  private _createClassicRow(entry: LeaderboardClassicEntry, W: number): PIXI.Container {
    return this._createRowFrame(entry.rank, entry.isMe, entry.nickname, entry.avatarUrl, String(entry.bestScore), '分', W);
  }

  private _createLevelRow(entry: LeaderboardLevelEntry, W: number): PIXI.Container {
    const row = this._createRowFrame(entry.rank, entry.isMe, entry.nickname, entry.avatarUrl, String(entry.totalStars), '星', W);
    const sub = new PIXI.Text(`累计 ${entry.totalScore}`, new PIXI.TextStyle({
      fontSize: 14, fill: 0xCBD5E1, fontFamily: 'Arial',
    }));
    sub.anchor.set(1, 0.5);
    sub.x = (W - LIST_PADDING_X * 2) - 18;
    sub.y = ROW_HEIGHT - 16;
    row.addChild(sub);
    return row;
  }

  private _createRowFrame(
    rank: number, isMe: boolean,
    nickname: string, avatarUrl: string,
    valueText: string, valueUnit: string,
    W: number,
  ): PIXI.Container {
    const row = new PIXI.Container();
    const w = W - LIST_PADDING_X * 2;
    const h = ROW_HEIGHT;

    const bg = new PIXI.Container();
    this._addNineSliceImage(bg, 'rank_row_panel.png', 0, 0, w, h, { left: 90, top: 110, right: 90, bottom: 110 });
    row.addChild(bg);

    const rankText = rank <= 3 && !isMe
      ? new PIXI.Text(['🥇', '🥈', '🥉'][rank - 1], new PIXI.TextStyle({ fontSize: 28, fontFamily: 'Arial' }))
      : new PIXI.Text(String(rank), new PIXI.TextStyle({
          fontSize: 24,
          fill: 0x0B4A8B,
          fontWeight: 'bold',
          fontFamily: 'Arial',
          stroke: 0xFFFFFF,
          strokeThickness: 3,
        }));
    rankText.anchor.set(0.5, 0.5);
    rankText.x = 30;
    rankText.y = h / 2;
    row.addChild(rankText);

    const avatar = createAvatarSprite(avatarUrl, 24);
    avatar.x = 60;
    avatar.y = h / 2 - 24;
    row.addChild(avatar);

    const nick = new PIXI.Text(this._truncateNickname(nickname || '游客'), new PIXI.TextStyle({
      fontSize: 22, fill: 0x102F64, fontWeight: 'bold', fontFamily: 'Arial',
    }));
    nick.anchor.set(0, 0.5);
    nick.x = 116;
    nick.y = h / 2 - 12;
    row.addChild(nick);

    if (isMe) {
      const meTag = new PIXI.Text('我', new PIXI.TextStyle({
        fontSize: 12, fill: 0x1F2937, fontFamily: 'Arial', fontWeight: 'bold',
      }));
      const tagBg = new PIXI.Graphics();
      const tagW = 24;
      const tagH = 18;
      tagBg.beginFill(0xFACC15, 0.95);
      tagBg.drawRoundedRect(0, 0, tagW, tagH, 6);
      tagBg.endFill();
      meTag.anchor.set(0.5, 0.5);
      meTag.x = tagW / 2;
      meTag.y = tagH / 2 + 1;
      const tagWrap = new PIXI.Container();
      tagWrap.addChild(tagBg);
      tagWrap.addChild(meTag);
      tagWrap.x = nick.x + nick.width + 6;
      tagWrap.y = h / 2 - 21;
      row.addChild(tagWrap);
    }

    const valueT = new PIXI.Text(valueText, new PIXI.TextStyle({
      fontSize: 24, fill: 0x0B4A8B, fontWeight: 'bold', fontFamily: 'Arial',
    }));
    valueT.anchor.set(1, 0.5);
    valueT.x = w - 18;
    valueT.y = h / 2 - 4;
    row.addChild(valueT);

    const unitT = new PIXI.Text(valueUnit, new PIXI.TextStyle({
      fontSize: 14, fill: 0xCBD5E1, fontFamily: 'Arial',
    }));
    unitT.anchor.set(1, 0.5);
    unitT.x = w - 18;
    unitT.y = h / 2 + 14;
    row.addChild(unitT);

    return row;
  }

  // ─── Bottom me bar ─────────────────────────────────────────

  private _createMeBar(W: number): PIXI.Container {
    const bar = new PIXI.Container();
    const h = 190;
    const w = W;

    const bg = new PIXI.Graphics();
    bg.beginFill(0x0F172A, 0.001);
    bg.drawRoundedRect(18, 0, w - 36, h, 18);
    bg.endFill();
    bar.addChild(bg);
    const panelHolder = new PIXI.Container();
    bar.addChild(panelHolder);
    addImageSprite(panelHolder, RANK_ASSET_PREFIX + 'rank_my_rank_panel.png', (sprite) => {
      sprite.anchor.set(0.5, 0);
      sprite.x = w / 2;
      sprite.y = 0;
      sprite.width = w - 44;
      sprite.height = sprite.width * (sprite.texture.height / sprite.texture.width);
    });

    const title = new PIXI.Text('MY RANK', new PIXI.TextStyle({
      fontSize: 24,
      fill: 0xFFE66D,
      fontFamily: 'Arial',
      fontWeight: 'bold',
      stroke: 0x233B65,
      strokeThickness: 5,
    }));
    title.anchor.set(0.5, 0.5);
    title.x = w / 2;
    title.y = 32;
    bar.addChild(title);

    const meTag = new PIXI.Text('我', new PIXI.TextStyle({
      fontSize: 24,
      fill: 0x8A3A00,
      fontFamily: 'Arial',
      fontWeight: 'bold',
      stroke: 0xFFF0A8,
      strokeThickness: 3,
    }));
    meTag.anchor.set(0.5, 0.5);
    meTag.x = w - 70;
    meTag.y = 65;
    bar.addChild(meTag);

    this._meBarRankText = new PIXI.Text('', new PIXI.TextStyle({
      fontSize: 34,
      fill: 0xFFFFFF,
      fontFamily: 'Arial',
      fontWeight: 'bold',
      stroke: 0x0B2445,
      strokeThickness: 5,
    }));
    this._meBarRankText.anchor.set(0, 0.5);
    this._meBarRankText.x = 62;
    this._meBarRankText.y = 108;
    bar.addChild(this._meBarRankText);

    this._meBarAvatarHolder = new PIXI.Container();
    this._meBarAvatarHolder.x = 235;
    this._meBarAvatarHolder.y = 72;
    bar.addChild(this._meBarAvatarHolder);

    this._meBarNameText = new PIXI.Text('', new PIXI.TextStyle({
      fontSize: 34,
      fill: 0xFFFFFF,
      fontFamily: 'Arial',
      fontWeight: 'bold',
      stroke: 0x0B2445,
      strokeThickness: 5,
    }));
    this._meBarNameText.anchor.set(0, 0.5);
    this._meBarNameText.x = 320;
    this._meBarNameText.y = 108;
    bar.addChild(this._meBarNameText);

    this._meBarScoreText = new PIXI.Text('', new PIXI.TextStyle({
      fontSize: 34,
      fill: 0xFFFFFF,
      fontFamily: 'Arial',
      fontWeight: 'bold',
      stroke: 0x0B2445,
      strokeThickness: 5,
    }));
    this._meBarScoreText.anchor.set(1, 0.5);
    this._meBarScoreText.x = w - 54;
    this._meBarScoreText.y = 108;
    bar.addChild(this._meBarScoreText);

    return bar;
  }

  private _refreshMeBar(): void {
    if (!this._meBarRankText || !this._meBarNameText || !this._meBarScoreText || !this._meBarAvatarHolder) return;
    const profile = UserProfileManager.profile;
    this._meBarAvatarHolder.removeChildren();
    this._meBarAvatarHolder.addChild(createAvatarSprite(profile.avatarUrl, 38));

    if (this._scopeTab === 'friends') {
      this._meBarRankText.text = '好友榜';
      this._meBarNameText.text = this._truncateNickname(profile.nickname || '我');
      this._meBarScoreText.text = Platform.supportsOpenData ? '微信提供' : '不可用';
      return;
    }

    const data = this._modeTab === 'classic' ? this._classicData : this._levelData;
    if (!data || !data.me) {
      const localValue = this._localFallbackValue();
      this._meBarRankText.text = '未上榜';
      this._meBarNameText.text = this._truncateNickname(profile.nickname || '我');
      this._meBarScoreText.text = this._modeTab === 'classic' ? `${localValue} 分` : `★ ${localValue}`;
      return;
    }
    const me = data.me;
    if (this._modeTab === 'classic') {
      const cm = me as LeaderboardClassicEntry;
      this._meBarRankText.text = `第 ${cm.rank} 名`;
      this._meBarNameText.text = this._truncateNickname(profile.nickname || cm.nickname || '我');
      this._meBarScoreText.text = `${cm.bestScore} 分`;
    } else {
      const lm = me as LeaderboardLevelEntry;
      this._meBarRankText.text = `第 ${lm.rank} 名`;
      this._meBarNameText.text = this._truncateNickname(profile.nickname || lm.nickname || '我');
      this._meBarScoreText.text = `★ ${lm.totalStars}`;
    }
  }

  private _localFallbackValue(): number {
    if (this._modeTab === 'classic') {
      return this._localClassicScore();
    }
    return this._localLevelStars();
  }

  private _localClassicScore(): number {
    const raw = PersistService.readRaw(BEST_SCORE_KEY);
    const v = Number(raw || 0);
    return Number.isFinite(v) && v > 0 ? Math.floor(v) : 0;
  }

  private _localLevelStars(): number {
    let stars = 0;
    for (let i = 1; i <= TOTAL_LEVELS; i++) {
      stars += LevelManager.getStars(i);
    }
    return stars;
  }

  // ─── Loading ───────────────────────────────────────────────

  private async _loadInitialData(force = false): Promise<void> {
    this._loading = true;
    this._renderList();
    try {
      const synced = await this._syncLocalProgressToLeaderboard();
      const [classic, level] = await Promise.all([
        LeaderboardManager.fetchClassicWorld(force || synced),
        LeaderboardManager.fetchLevelWorld(force || synced),
      ]);
      this._classicData = this._withLocalClassicMe(classic);
      this._levelData = this._withLocalLevelMe(level);
    } catch (error) {
      console.warn('[RankScene] load failed', error);
    } finally {
      this._loading = false;
      this._renderList();
      this._refreshMeBar();
    }
  }

  private async _syncLocalProgressToLeaderboard(): Promise<boolean> {
    const classicScore = this._localClassicScore();
    const totalStars = this._localLevelStars();
    const totalScore = LevelManager.getTotalBestScore();

    const tasks: Promise<void>[] = [];
    if (classicScore > 0) {
      tasks.push(LeaderboardManager.submitClassicScore(classicScore));
    }
    if (totalStars > 0 || totalScore > 0) {
      tasks.push(LeaderboardManager.submitLevelProgress({
        totalStars,
        totalScore,
        maxUnlocked: LevelManager.maxUnlocked,
      }));
    }
    if (tasks.length > 0) {
      await Promise.all(tasks);
      return true;
    }
    return false;
  }

  private _withLocalClassicMe(
    data: LeaderboardWorldResult<LeaderboardClassicEntry>,
  ): LeaderboardWorldResult<LeaderboardClassicEntry> {
    if (data.me) return data;
    const bestScore = this._localClassicScore();
    if (bestScore <= 0) return data;

    const profile = UserProfileManager.profile;
    const higherCount = data.items.filter((item) => item.bestScore > bestScore).length;
    const me: LeaderboardClassicEntry = {
      rank: higherCount + 1,
      isMe: true,
      userId: 'local',
      nickname: profile.nickname || '我',
      avatarUrl: profile.avatarUrl,
      bestScore,
      updatedAt: Date.now(),
    };

    const items = data.items
      .filter((item) => !item.isMe)
      .concat(me)
      .sort((a, b) => b.bestScore - a.bestScore || a.updatedAt - b.updatedAt)
      .map((item, idx) => ({ ...item, rank: idx + 1 }));
    const mergedMe = items.find((item) => item.isMe) || me;
    return { ...data, items, me: mergedMe, total: Math.max(data.total, items.length) };
  }

  private _withLocalLevelMe(
    data: LeaderboardWorldResult<LeaderboardLevelEntry>,
  ): LeaderboardWorldResult<LeaderboardLevelEntry> {
    if (data.me) return data;
    const totalStars = this._localLevelStars();
    const totalScore = LevelManager.getTotalBestScore();
    if (totalStars <= 0 && totalScore <= 0) return data;

    const profile = UserProfileManager.profile;
    const me: LeaderboardLevelEntry = {
      rank: 1,
      isMe: true,
      userId: 'local',
      nickname: profile.nickname || '我',
      avatarUrl: profile.avatarUrl,
      totalStars,
      totalScore,
      maxUnlocked: LevelManager.maxUnlocked,
      updatedAt: Date.now(),
    };

    const items = data.items
      .filter((item) => !item.isMe)
      .concat(me)
      .sort((a, b) => b.totalStars - a.totalStars || b.totalScore - a.totalScore || a.updatedAt - b.updatedAt)
      .map((item, idx) => ({ ...item, rank: idx + 1 }));
    const mergedMe = items.find((item) => item.isMe) || me;
    return { ...data, items, me: mergedMe, total: Math.max(data.total, items.length) };
  }

  // ─── Helpers ───────────────────────────────────────────────

  private _renderEmpty(message: string, W: number): PIXI.Container {
    const c = new PIXI.Container();
    const text = new PIXI.Text(message, new PIXI.TextStyle({
      fontSize: 20, fill: 0x94A3B8, fontFamily: 'Arial', align: 'center', lineHeight: 32,
    }));
    text.anchor.set(0.5, 0);
    text.x = W / 2;
    text.y = 80;
    c.addChild(text);
    return c;
  }

  private _createImageAsset(path: string, width: number): PIXI.Container {
    const c = new PIXI.Container();
    addImageSprite(c, RANK_ASSET_PREFIX + path, (sprite) => {
      sprite.anchor.set(0.5, 0);
      sprite.width = width;
      sprite.height = width * (sprite.texture.height / sprite.texture.width);
    });
    return c;
  }

  private _addNineSlicePanel(
    parent: PIXI.Container,
    path: string,
    x: number,
    y: number,
    width: number,
    height: number,
  ): void {
    void loadImageTexture(RANK_ASSET_PREFIX + path).then((texture) => {
      if (!texture || parent.destroyed) return;
      const NineSlicePlane = (PIXI as any).NineSlicePlane;
      if (!NineSlicePlane) {
        const sprite = new PIXI.Sprite(texture);
        sprite.x = x;
        sprite.y = y;
        sprite.width = width;
        sprite.height = height;
        parent.addChild(sprite);
        return;
      }
      const plane = new NineSlicePlane(texture, 110, 150, 110, 90) as PIXI.Container & { width: number; height: number };
      plane.x = x;
      plane.y = y;
      plane.width = width;
      plane.height = height;
      parent.addChild(plane);
    });
  }

  private _addNineSliceImage(
    parent: PIXI.Container,
    path: string,
    x: number,
    y: number,
    width: number,
    height: number,
    border: { left: number; top: number; right: number; bottom: number },
  ): void {
    void loadImageTexture(RANK_ASSET_PREFIX + path).then((texture) => {
      if (!texture || parent.destroyed) return;
      const NineSlicePlane = (PIXI as any).NineSlicePlane;
      if (!NineSlicePlane) {
        const sprite = new PIXI.Sprite(texture);
        sprite.x = x;
        sprite.y = y;
        sprite.width = width;
        sprite.height = height;
        parent.addChild(sprite);
        return;
      }
      const plane = new NineSlicePlane(texture, border.left, border.top, border.right, border.bottom) as PIXI.Container & { width: number; height: number };
      plane.x = x;
      plane.y = y;
      plane.width = width;
      plane.height = height;
      parent.addChild(plane);
    });
  }

  private _setButtonAsset(container: PIXI.Container, path: string, width: number): void {
    const old = container.getChildByName('assetBg');
    if (old) {
      container.removeChild(old);
      old.destroy({ children: true });
    }
    const holder = new PIXI.Container();
    holder.name = 'assetBg';
    container.addChildAt(holder, 0);
    addImageSprite(holder, RANK_ASSET_PREFIX + path, (sprite) => {
      sprite.width = width;
      sprite.height = width * (sprite.texture.height / sprite.texture.width);
    });
  }

  private _truncateNickname(name: string): string {
    const s = String(name || '').trim();
    if (s.length <= 8) return s;
    return s.slice(0, 8) + '...';
  }

  private _createBackButton(): PIXI.Container {
    const btn = new PIXI.Container();
    btn.eventMode = 'static';
    btn.cursor = 'pointer';

    const bg = new PIXI.Graphics();
    bg.beginFill(0xFFFFFF, 0.001);
    bg.drawRoundedRect(0, 0, 88, 54, 18);
    bg.endFill();
    btn.addChild(bg);
    addImageSprite(btn, RANK_ASSET_PREFIX + 'rank_back_normal.png', (sprite) => {
      sprite.width = 88;
      sprite.height = 54;
    });

    btn.on('pointerdown', () => SceneManager.switchTo('home'));
    return btn;
  }
}
