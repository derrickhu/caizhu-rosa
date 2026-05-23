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
import { resolveCircleAvatarTexture } from '@/utils/avatarTexture';
import { resolveDisplayNickname } from '@/utils/defaultProfileDisplay';
import { BackendService } from '@/core/BackendService';
import { addImageSprite, loadImageTexture } from '@/utils/imageTexture';
import { AudioManager } from '@/core/AudioManager';
import { AUDIO_ASSETS, AUDIO_VOLUME } from '@/config/AudioConfig';

type ModeTab = 'classic' | 'level';
type ScopeTab = 'world' | 'friends';

// 列表行/间距与水果（hot-pot）保持一致量级，避免单行渲染时间被字体或描边推高
const ROW_HEIGHT = 76;
const ROW_GAP = 8;
const LIST_PADDING_X = 30;
const TOP3_HEIGHT = 300;
// 50 名上限：与 hot-pot RankService.list(board, 50, 0) 对齐
const WORLD_LIST_MAX = 50;

const RANK_ASSET_PREFIX = 'subpkg_assets/images/';
const RANK_PODIUM_SHEET = `${RANK_ASSET_PREFIX}rank_top_podium_sheet.png`;
const RANK_PODIUM_FRAMES = {
  top2: { x: 4, y: 88, w: 451, h: 663 },
  top1: { x: 467, y: 4, w: 494, h: 832 },
  top3: { x: 973, y: 104, w: 436, h: 632 },
} as const;
const RANK_PRELOAD_ASSETS = [
  RANK_PODIUM_SHEET,
  `${RANK_ASSET_PREFIX}rank_title_banner.png`,
  `${RANK_ASSET_PREFIX}rank_back_normal.png`,
  `${RANK_ASSET_PREFIX}rank_tab_mode_active_blue.png`,
  `${RANK_ASSET_PREFIX}rank_tab_mode_active_green.png`,
  `${RANK_ASSET_PREFIX}rank_tab_mode_inactive.png`,
  `${RANK_ASSET_PREFIX}rank_tab_scope_active.png`,
  `${RANK_ASSET_PREFIX}rank_tab_scope_inactive.png`,
  `${RANK_ASSET_PREFIX}rank_my_rank_panel.png`,
] as const;
const MODE_TAB_W = 230;
const MODE_TAB_H = 106;
const SCOPE_TAB_W = 118;
const SCOPE_TAB_H = 45;
// 虚拟列表上下额外预渲染 2 行，避免快速拖动时露白
const WORLD_VIRTUAL_BUFFER_ROWS = 2;

type WorldEntry = LeaderboardClassicEntry | LeaderboardLevelEntry;

/**
 * 复用型榜单行：滚动时把进入可视区的行从 pool 里 pop 出来 in-place 重写文本，
 * 避免重新创建 PIXI.Container / PIXI.Text（PIXI.Text 的 canvas rasterize 是最贵的一步）。
 */
interface RankRowView extends PIXI.Container {
  __rankText: PIXI.Text;
  __avatarSprite: PIXI.Sprite;
  __nickText: PIXI.Text;
  __valueText: PIXI.Text;
  __meTag: PIXI.Container;
  __bg: PIXI.Graphics;
  __avatarSeq: number;
  __lastAvatarKey?: string;
  __lastNick?: string;
  __lastValue?: string;
  __lastIsMe?: boolean;
}

const ROW_AVATAR_RADIUS = 24;

/**
 * 真机微信好友榜 sharedCanvas 上屏专用 PIXI Resource。
 *
 * 背景：
 *  - 开放数据域子进程画出来的 sharedCanvas 在真机微信里并不是普通 HTMLCanvasElement，
 *    主域 WebGL 不能用 texImage2D 把它当 canvas 直接上传，否则得到的纹理是空白；
 *  - 微信提供扩展 API `gl.wxBindCanvasTexture(TEXTURE_2D, sharedCanvas)`，
 *    专门用来把子域 canvas 绑成当前 TEXTURE_2D，再走正常的 PIXI 渲染管线即可。
 *  - 开发者工具里 sharedCanvas 跟主域同进程，普通 BaseTexture.from(canvas) 能上传，
 *    所以工具里能看到好友榜，但真机白屏——这是真机/工具行为差异的根因。
 *
 * 用法：构造一个空 PIXI.BaseTexture(resource)，每帧调用 baseTexture.update() 触发
 *      重新 upload，PIXI 会回调到本类的 upload()，里面调 wxBindCanvasTexture 绑定。
 */
class WxSharedCanvasResource extends PIXI.Resource {
  private readonly source: HTMLCanvasElement & { width: number; height: number };
  // 真机诊断：只在第一次 upload 时打印一次详细信息，避免每帧刷屏
  private _diagLogged = false;

  constructor(source: HTMLCanvasElement & { width: number; height: number }) {
    super(Math.max(1, source.width | 0), Math.max(1, source.height | 0));
    this.source = source;
  }

  upload(renderer: PIXI.Renderer, baseTexture: PIXI.BaseTexture, glTexture: any): boolean {
    const gl = renderer.gl as any;
    if (!gl || typeof gl.wxBindCanvasTexture !== 'function') {
      if (!this._diagLogged) {
        this._diagLogged = true;
        console.log('[RankDiag] WxSharedCanvasResource.upload: wxBindCanvasTexture missing, return false');
      }
      return false;
    }
    try {
      gl.wxBindCanvasTexture(gl.TEXTURE_2D, this.source);
      glTexture.width = baseTexture.realWidth;
      glTexture.height = baseTexture.realHeight;
      if (!this._diagLogged) {
        this._diagLogged = true;
        console.log(
          '[RankDiag] WxSharedCanvasResource.upload OK'
            + ' size=' + (this.source.width | 0) + 'x' + (this.source.height | 0)
            + ' glSize=' + baseTexture.realWidth + 'x' + baseTexture.realHeight
        );
      }
      return true;
    } catch (error) {
      if (!this._diagLogged) {
        this._diagLogged = true;
        console.warn('[RankDiag] WxSharedCanvasResource.upload threw', error);
      }
      return false;
    }
  }

  override update(): void {
    this.resize(Math.max(1, this.source.width | 0), Math.max(1, this.source.height | 0));
    super.update();
  }
}

/** 检测当前 WebGL 上下文是否支持微信 wxBindCanvasTexture 扩展（真机微信下为 true） */
function canBindWxSharedCanvas(): boolean {
  try {
    const gl = (Game.app?.renderer as any)?.gl;
    return !!gl && typeof gl.wxBindCanvasTexture === 'function';
  } catch {
    return false;
  }
}

export class RankScene implements Scene {
  readonly name = 'rank';
  readonly container = new PIXI.Container();

  private _modeTab: ModeTab = 'classic';
  private _scopeTab: ScopeTab = 'world';

  private _modeTabBtns: { tab: ModeTab; container: PIXI.Container; label: PIXI.Text }[] = [];
  private _scopeTabBtns: { tab: ScopeTab; container: PIXI.Container; label: PIXI.Text }[] = [];

  private _listArea!: PIXI.Container;
  private _meBar!: PIXI.Container;
  private _meBarRankText!: PIXI.Text;
  private _meBarAvatarHolder!: PIXI.Container;
  private _meBarNameText!: PIXI.Text;
  private _meBarScoreText!: PIXI.Text;

  private _classicData: LeaderboardWorldResult<LeaderboardClassicEntry> | null = null;
  private _levelData: LeaderboardWorldResult<LeaderboardLevelEntry> | null = null;
  private _loading = false;

  // ── 列表区域几何（设计像素，绝对坐标）──
  // 在 _listArea 容器内还要再减去 _listArea.y 才能拿到容器内 y
  private _listAreaRect = { x: 0, y: 0, w: 0, h: 0 };

  // ── 世界榜虚拟列表 + 行复用 ──
  private _worldListContent: PIXI.Container | null = null;
  private _worldListRecords: WorldEntry[] = [];
  private _worldVisibleStart = -1;
  private _worldVisibleEnd = -1;
  private _worldScrollY = 0;
  private _worldRowByIndex = new Map<number, RankRowView>();
  private _worldRowPool: RankRowView[] = [];

  // ── 拖动状态 ──
  // 真机 wx.onTouchMove 可能 60~120Hz 触发，
  // 这里只暂存最新 Y，真正的 scroll 应用和虚拟列表刷新由 update(dt) 每帧 commit 一次，
  // 避免一帧内重复 renderWorldVisibleRows / postMessage 排版。
  private _sceneActive = false;
  private _nativeTouchBound = false;
  private _dragKind: ScopeTab | null = null;
  private _dragStartY = 0;
  private _dragStartScrollY = 0;
  private _dragMoved = false;
  private _pendingDragY: number | null = null;
  // 好友榜 sharedCanvas 的滚动偏移（仅 <= 0），透传给开放数据域
  private _friendScrollY = 0;

  // ── 好友榜 sharedCanvas ──
  private _friendCanvasSprite: PIXI.Sprite | null = null;
  private _friendBaseTexture: PIXI.BaseTexture | null = null;
  private _friendTickerCb: ((dt: number) => void) | null = null;
  private _friendListWidth = 0;

  // ── 用户资料 ──
  private _profileUnsub: (() => void) | null = null;
  private _meBarAvatarKey = '';

  // ── 微信资料授权 CTA（"使用微信昵称头像上榜 [授权]"）──
  // 抄水果方案：PIXI 只画黄底提示条，「授权」绿色按钮上面用 CSS 像素
  // 覆盖一个透明 wx.createUserInfoButton —— 用户点的是微信原生按钮，
  // 弹出的就是微信原生授权框（主域 wx.getUserProfile 在新基础库已基本失效）。
  private _wxCtaContainer: PIXI.Container | null = null;
  private _wxCtaBtnRect = { x: 0, y: 0, w: 0, h: 0 };
  private _wxCtaNativeBtn: any = null;
  private _wxCtaLastCss: { left: number; top: number; width: number; height: number } | null = null;

  // ─── Lifecycle ─────────────────────────────────────────────

  onEnter(): void {
    this._sceneActive = true;
    this._installNativeTouchHandlers();
    this.container.removeChildren();
    this._preloadRankAssets();
    AudioManager.playBGM(AUDIO_ASSETS.bgmClassic, AUDIO_VOLUME.bgmClassic);
    this._modeTab = 'classic';
    this._scopeTab = 'world';
    this._worldScrollY = 0;
    this._friendScrollY = 0;
    this._resetWorldRowPool();

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

    // 计算列表可视区域（绝对设计像素），拖动判定和虚拟列表都用它
    this._recalcListAreaRect();

    this._profileUnsub = UserProfileManager.subscribe(() => {
      void this._onProfileChanged();
    });

    void this._loadInitialData();
    this._renderList();
    this._refreshMeBar();
    // 未授权微信资料时，在 me-bar 上方显示 CTA + 覆盖透明原生按钮，跨 tab 常驻
    this._refreshWxProfileCta();

    title.alpha = 0;
    TweenManager.to({ target: title, props: { alpha: 1 }, duration: 0.4 });
  }

  onExit(): void {
    this._sceneActive = false;
    this._dragKind = null;
    this._pendingDragY = null;
    this._dragMoved = false;
    if (this._profileUnsub) {
      this._profileUnsub();
      this._profileUnsub = null;
    }
    // 退出场景时务必销毁透明微信原生按钮，否则它会留在屏幕上盖住 HomeScene
    this._destroyWxProfileNativeBtn();
    this._teardownFriendCanvas();
    // 行池里的 PIXI.Text 一并销毁，避免下次进入复用到已 detach 但未清理的旧节点
    this._destroyWorldRowPool();
    this._worldListContent = null;
    this._worldListRecords = [];
  }

  /** 每帧由 SceneManager → main.ts ticker 转发回来，仅做最近一次拖动 Y 的 commit */
  update(_dt: number): void {
    if (this._pendingDragY != null) {
      this._commitPendingDrag();
    }
  }

  private _recalcListAreaRect(): void {
    const W = Game.logicWidth;
    const visibleH = Math.max(120, Game.logicHeight - 226 - this._listArea.y - 8);
    this._listAreaRect = {
      x: LIST_PADDING_X,
      y: this._listArea.y,
      w: W - LIST_PADDING_X * 2,
      h: visibleH,
    };
  }

  // ─── User profile ──────────────────────────────────────────

  private async _onProfileChanged(): Promise<void> {
    this._refreshMeBar();
    // 授权状态可能变了——已授权时销毁 CTA 和透明原生按钮，未授权时确保挂上
    this._refreshWxProfileCta();
    if (!UserProfileManager.isAuthorized) return;
    await LeaderboardManager.resyncAuthorizedProfile();
    if (this._classicData) {
      this._classicData = this._patchWorldWithLocalProfile(this._classicData);
    }
    if (this._levelData) {
      this._levelData = this._patchWorldWithLocalProfile(this._levelData);
    }
    this._renderList();
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
      c.on('pointertap', () => {
        AudioManager.play('button');
        this._switchMode(tab);
      });

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
      this._modeTabBtns.push({ tab, container: c, label });
    });
    this._restyleModeTabs();
  }

  private _restyleModeTabs(): void {
    for (const item of this._modeTabBtns) {
      const active = item.tab === this._modeTab;
      const asset = active
        ? item.tab === 'classic' ? 'rank_tab_mode_active_blue.png' : 'rank_tab_mode_active_green.png'
        : 'rank_tab_mode_inactive.png';
      this._setButtonAsset(item.container, asset, MODE_TAB_W);
      item.label.alpha = active ? 1 : 0.82;
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
      c.on('pointertap', () => {
        AudioManager.play('button');
        void this._switchScope(tab);
      });

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
      this._scopeTabBtns.push({ tab, container: c, label });
    });
    this._restyleScopeTabs();
  }

  private _restyleScopeTabs(): void {
    for (const item of this._scopeTabBtns) {
      const active = item.tab === this._scopeTab;
      this._setButtonAsset(item.container, active ? 'rank_tab_scope_active.png' : 'rank_tab_scope_inactive.png', SCOPE_TAB_W);
      item.label.alpha = active ? 1 : 0.78;
    }
  }

  private _switchMode(tab: ModeTab): void {
    if (this._modeTab === tab) return;
    this._modeTab = tab;
    this._worldScrollY = 0;
    this._dragKind = null;
    this._pendingDragY = null;
    this._restyleModeTabs();
    this._renderList();
    this._refreshMeBar();
  }

  private async _switchScope(tab: ScopeTab): Promise<void> {
    if (this._scopeTab === tab) return;
    console.log('[RankDiag] _switchScope start tab=' + tab + ' scope=' + this._scopeTab);
    if (tab === 'friends' && !Platform.supportsOpenData) {
      console.log('[RankDiag] _switchScope abort: supportsOpenData=false');
      Platform.showToast('好友榜仅在微信小游戏环境可用');
      return;
    }

    // 切到好友 tab 同步发一次 authorize（_switchScope 是 PIXI pointerdown 同步链路里，
    // 此处仍在用户手势内）。已授权立刻 resolve，未授权弹微信原生授权框；用户拒绝过则
    // 走 openSetting 兜底入口。
    if (tab === 'friends') {
      const granted = await Platform.authorizeWxFriendInteraction();
      console.log('[RankDiag] friend auth granted=' + granted);
    }

    this._scopeTab = tab;
    this._dragKind = null;
    this._pendingDragY = null;
    this._friendScrollY = 0;
    this._restyleScopeTabs();
    console.log('[RankDiag] _switchScope -> _renderList scope=' + tab);
    this._renderList();
    this._refreshMeBar();
  }

  // ─── List rendering ────────────────────────────────────────

  /**
   * 单一入口：清空 listArea → 按当前 scope 直接重画。
   * 跟 hot-pot 一致，不做 cache / placeholder / defer / prewarm，
   * 每次重画都是 O(可视行数) 的虚拟列表，性能足够。
   */
  private _renderList(): void {
    if (!this._listArea) return;
    this._listArea.removeChildren();
    // listArea.removeChildren 把行容器 detach 了，但 worldRowByIndex 仍持有引用，
    // 统一回收到 pool 里供下次复用，避免重建 PIXI.Text。
    this._reclaimWorldRowsToPool();
    this._worldListContent = null;
    this._worldListRecords = [];
    this._worldVisibleStart = -1;
    this._worldVisibleEnd = -1;
    this._recalcListAreaRect();

    if (this._scopeTab === 'friends') {
      this._renderFriendList();
      return;
    }
    this._teardownFriendCanvas();
    this._renderWorldList();
  }

  private _renderWorldList(): void {
    const W = Game.logicWidth;
    const data = this._modeTab === 'classic' ? this._classicData : this._levelData;

    if (this._loading) {
      this._listArea.addChild(this._renderEmpty('加载中...', W));
      return;
    }

    if (data?.fetch && data.fetch.ok === false) {
      const code = data.fetch.code || '';
      const hint = code === 'NOT_FOUND'
        ? '全服榜接口未部署或版本过旧\n请更新云函数 caizhu-api 后重新打开排行榜'
        : code === 'DATABASE_COLLECTION_NOT_EXIST'
          ? '全服榜数据库集合未创建\n请在云开发控制台创建 caizhu_leaderboard_classic / level'
          : `全服榜加载失败\n${data.fetch.message || code || '请稍后重试'}`;
      this._listArea.addChild(this._renderEmpty(hint, W));
      return;
    }

    const items = (data?.items || []).slice(0, WORLD_LIST_MAX);
    this._worldListRecords = items;

    // 顶部 Top3 奖台（固定不滚动，单独贴在 listArea 顶上）
    const podiumLayer = new PIXI.Container();
    podiumLayer.x = 18;
    podiumLayer.y = 0;
    this._listArea.addChild(podiumLayer);
    this._renderTop3Podium(podiumLayer, items.slice(0, 3), W);

    // 排行 4 起的可滚动列表
    const listItems = items.slice(3);
    if (items.length === 0) {
      const text = this._modeTab === 'classic'
        ? '还没有人提交分数\n快去经典模式挑战吧！'
        : '还没有人完成关卡\n快去关卡模式挑战吧！';
      const empty = this._renderEmpty(text, W);
      empty.y = TOP3_HEIGHT - 8;
      this._listArea.addChild(empty);
      return;
    }
    if (listItems.length === 0) {
      // 只有前三：不需要列表，但保留底色一致的占位
      return;
    }

    // viewport + mask + content：mask 用绝对坐标的矩形，content 通过 y 偏移做滚动
    const area = this._listAreaRect;
    const listTopAbs = area.y + TOP3_HEIGHT;
    const listH = Math.max(80, area.y + area.h - listTopAbs);

    const mask = new PIXI.Graphics();
    mask.beginFill(0xFFFFFF, 1);
    // 用绝对设计坐标，listArea 没有缩放/平移，所以 mask 可直接挂在 listArea 上
    mask.drawRect(area.x - 8, TOP3_HEIGHT - 4, area.w + 16, listH + 8);
    mask.endFill();
    mask.renderable = false;
    this._listArea.addChild(mask);

    const viewport = new PIXI.Container();
    viewport.eventMode = 'none';
    viewport.mask = mask;
    this._listArea.addChild(viewport);

    const content = new PIXI.Container();
    content.eventMode = 'none';
    content.y = TOP3_HEIGHT + this._worldScrollY;
    viewport.addChild(content);
    this._worldListContent = content;

    // 拖动范围 clamp：在写入 scrollY 前算一遍最小值，保证 scroll 不会停在非法位置
    this._worldScrollY = this._clampScrollY(this._worldScrollY, listItems.length, listH);
    content.y = TOP3_HEIGHT + this._worldScrollY;

    this._renderWorldVisibleRows(listH);
  }

  /**
   * 世界榜虚拟列表：仅渲染当前 scrollY 可见区窗口内的行。
   * 1) 行容器 + 内部 PIXI.Text 走对象池复用，避免滚动时重复创建/销毁；
   * 2) 同 index 行已在显示 → 不动；
   * 3) 滚出可视区的行 detach 进池子，下一次滚入时 in-place 重写内容。
   */
  private _renderWorldVisibleRows(listH: number): void {
    const content = this._worldListContent;
    if (!content) return;
    const items = this._worldListRecords.slice(3);
    if (items.length === 0) return;

    const W = Game.logicWidth;
    const step = ROW_HEIGHT + ROW_GAP;
    // content.y = TOP3_HEIGHT + scrollY，可见区 absolute y 是 [TOP3_HEIGHT, TOP3_HEIGHT + listH)
    // 行 i 的 content 内 y = i * step，绝对 y = content.y + i * step
    // 可见条件：absoluteY + ROW_HEIGHT >= TOP3_HEIGHT && absoluteY < TOP3_HEIGHT + listH
    // 转换得 i ∈ [(- scrollY - ROW_HEIGHT) / step, (- scrollY + listH) / step]
    const sy = this._worldScrollY;
    const startIndex = Math.max(0, Math.floor((-sy - ROW_HEIGHT) / step) - WORLD_VIRTUAL_BUFFER_ROWS);
    const endIndex = Math.min(
      items.length,
      Math.ceil((-sy + listH) / step) + WORLD_VIRTUAL_BUFFER_ROWS,
    );

    if (startIndex === this._worldVisibleStart && endIndex === this._worldVisibleEnd) return;
    this._worldVisibleStart = startIndex;
    this._worldVisibleEnd = endIndex;

    // 1) 不再可见的行 → pool
    for (const [idx, row] of this._worldRowByIndex) {
      if (idx < startIndex || idx >= endIndex) {
        row.parent?.removeChild(row);
        this._worldRowByIndex.delete(idx);
        this._worldRowPool.push(row);
      }
    }

    // 2) 新进入可视区的 index：先从 pool 复用，不够再 new
    for (let i = startIndex; i < endIndex; i += 1) {
      const entry = items[i];
      if (!entry) continue;
      let row = this._worldRowByIndex.get(i);
      if (!row) {
        row = this._worldRowPool.pop() || this._createRankRowTemplate(W);
        this._updateRankRowContent(row, entry, this._modeTab, W);
        content.addChild(row);
        this._worldRowByIndex.set(i, row);
      }
      row.x = LIST_PADDING_X;
      row.y = i * step;
    }
  }

  private _clampScrollY(scrollY: number, itemCount: number, viewportH: number): number {
    const contentH = itemCount > 0 ? itemCount * ROW_HEIGHT + Math.max(0, itemCount - 1) * ROW_GAP : 0;
    const minScrollY = Math.min(0, viewportH - contentH);
    return Math.max(minScrollY, Math.min(0, scrollY));
  }

  // ─── 世界榜行池：detach 但不销毁，下次进入时 in-place 重写文本 ──
  private _reclaimWorldRowsToPool(): void {
    for (const row of this._worldRowByIndex.values()) {
      row.parent?.removeChild(row);
      this._worldRowPool.push(row);
    }
    this._worldRowByIndex.clear();
  }

  private _resetWorldRowPool(): void {
    this._reclaimWorldRowsToPool();
  }

  /** 场景退出时彻底销毁池内行，下次进入会重新建立 */
  private _destroyWorldRowPool(): void {
    this._reclaimWorldRowsToPool();
    for (const row of this._worldRowPool) {
      if (!row.destroyed) row.destroy({ children: true });
    }
    this._worldRowPool.length = 0;
  }

  // ─── Friend board (sharedCanvas) ────────────────────────────

  private _renderFriendList(): void {
    const W = Game.logicWidth;
    const diagLine = '_renderFriendList enter'
      + ' supportsOpenData=' + Platform.supportsOpenData
      + ' isWechat=' + Platform.isWechat
      + ' isSimulator=' + Platform.isSimulator
      + ' canBindWx=' + canBindWxSharedCanvas()
      + ' canComposite=' + Game.canCompositeOpenDataOverlay();
    console.log('[RankDiag] ' + diagLine);
    if (!Platform.supportsOpenData) {
      this._listArea.addChild(this._renderEmpty('当前环境不支持好友榜\n请在微信小游戏中体验', W));
      return;
    }

    const sharedCanvas = Platform.getSharedCanvas();
    if (!sharedCanvas) {
      console.log('[RankDiag] sharedCanvas null -> show loading placeholder');
      this._listArea.addChild(this._renderEmpty('正在加载好友榜...', W));
      return;
    }

    const area = this._listAreaRect;
    const listW = area.w;
    const listH = area.h;
    this._friendListWidth = listW;

    // 主域同步 sharedCanvas 物理像素尺寸，使其与目标显示区域 1:1 对应。
    // 子域内 sharedCanvas.width/height 是只读的，必须由主域设。
    // pixelRatio=2 保证文字/头像在高 DPR 屏上仍清晰。
    const pixelRatio = 2;
    const physW = Math.max(1, Math.round(listW * pixelRatio));
    const physH = Math.max(1, Math.round(listH * pixelRatio));
    try {
      const sc: any = sharedCanvas;
      if (sc.width !== physW) sc.width = physW;
      if (sc.height !== physH) sc.height = physH;
    } catch (error) {
      console.warn('[RankDiag] resize sharedCanvas failed', error);
    }
    console.log(
      '[RankDiag] sharedCanvas init'
        + ' size=' + (sharedCanvas.width | 0) + 'x' + (sharedCanvas.height | 0)
        + ' listW=' + Math.round(listW) + ' listH=' + Math.round(listH)
    );
    this._postFriendRender();

    // ── 主路径：双 canvas 2D 合成（真机 iOS/Android 微信都走这条） ──
    if (Game.canCompositeOpenDataOverlay()) {
      const ok = Game.setOpenDataOverlay({
        canvas: sharedCanvas as HTMLCanvasElement & { width: number; height: number },
        x: area.x,
        y: area.y,
        width: listW,
        height: listH,
      });
      if (ok) {
        // 2D 合成模式下不需要 PIXI sprite，sharedCanvas 由 Game 的合成器每帧
        // 直接 drawImage 到主屏 canvas 上层。listArea 留空即可。
        console.log('[RankDiag] friend overlay path=composite');
        return;
      }
    }

    // ── 兜底路径：direct-webgl，把 sharedCanvas 当 PIXI 纹理 ──
    // 仅开发者工具/无 createCanvas/无 2D ctx 的极端情况下生效；真机几乎不会走到。
    try {
      const useWxBind = canBindWxSharedCanvas();
      console.log('[RankDiag] friend overlay path=sprite useWxBind=' + useWxBind);
      let baseTexture: PIXI.BaseTexture;
      if (useWxBind) {
        const resource = new WxSharedCanvasResource(
          sharedCanvas as HTMLCanvasElement & { width: number; height: number }
        );
        baseTexture = new PIXI.BaseTexture(resource, {
          mipmap: PIXI.MIPMAP_MODES.OFF,
          scaleMode: PIXI.SCALE_MODES.LINEAR,
          wrapMode: PIXI.WRAP_MODES.CLAMP,
        });
        baseTexture.setRealSize(
          Math.max(1, sharedCanvas.width | 0),
          Math.max(1, sharedCanvas.height | 0)
        );
      } else {
        baseTexture = PIXI.BaseTexture.from(sharedCanvas as any, {
          scaleMode: PIXI.SCALE_MODES.LINEAR,
          resourceOptions: { autoLoad: true },
        });
      }
      this._friendBaseTexture = baseTexture;
      const texture = new PIXI.Texture(baseTexture);
      const sprite = new PIXI.Sprite(texture);
      sprite.x = LIST_PADDING_X;
      sprite.y = 0;

      const applyDisplayScale = () => {
        const cw = sharedCanvas.width || W;
        const ch = sharedCanvas.height || 0;
        if (cw <= 0 || ch <= 0) return;
        const s = listW / cw;
        const rect = new PIXI.Rectangle(0, 0, cw, ch);
        const tex = sprite.texture as PIXI.Texture & {
          frame?: PIXI.Rectangle;
          orig?: PIXI.Rectangle;
          trim?: PIXI.Rectangle | null;
          updateUvs?: () => void;
        };
        tex.frame = rect;
        tex.orig = rect;
        (tex as { trim?: PIXI.Rectangle | null }).trim = null;
        tex.updateUvs?.();
        sprite.scale.set(s, s);
      };
      applyDisplayScale();

      this._listArea.addChild(sprite);
      this._friendCanvasSprite = sprite;

      const ticker = (_dt: number) => {
        try { baseTexture.update(); } catch {}
        applyDisplayScale();
      };
      this._friendTickerCb = ticker;
      Game.ticker.add(ticker);
    } catch (error) {
      console.warn('[RankScene] sharedCanvas sprite failed', error);
      this._listArea.addChild(this._renderEmpty('好友榜渲染失败', W));
    }
  }

  /** 通知开放数据域子项目刷新好友榜（含滚动偏移） */
  private _postFriendRender(): void {
    if (!Platform.supportsOpenData) return;
    Platform.postOpenDataMessage({
      type: 'render',
      tab: this._modeTab,
      listWidth: Math.round(this._friendListWidth),
      rowHeight: ROW_HEIGHT,
      scrollY: Math.round(this._friendScrollY),
    });
  }

  private _teardownFriendCanvas(): void {
    // 2D 合成路径：通知 Game 不再把 sharedCanvas 合成到主屏
    try { Game.clearOpenDataOverlay(); } catch {}
    if (this._friendTickerCb) {
      try { Game.ticker.remove(this._friendTickerCb); } catch {}
      this._friendTickerCb = null;
    }
    if (this._friendCanvasSprite) {
      try {
        this._friendCanvasSprite.parent?.removeChild(this._friendCanvasSprite);
        this._friendCanvasSprite.destroy({ children: true, texture: false });
      } catch {}
      this._friendCanvasSprite = null;
    }
    if (this._friendBaseTexture) {
      try { this._friendBaseTexture.destroy(); } catch {}
      this._friendBaseTexture = null;
    }
  }

  // ─── Native touch handlers（参考 hot-pot.LeaderboardScene）──
  //
  // 微信小游戏下 Pixi pointer 在好友榜 sharedCanvas 那一层经常收不到 move，
  // 而且 PIXI EventSystem 路径上同一次手势会被 Sprite/Container 重复 hit-test，
  // 直接监听 wx.onTouchStart/Move/End 是公认更稳的方案，
  // 实际表现也跟水果完全一致。

  private _installNativeTouchHandlers(): void {
    if (this._nativeTouchBound) return;
    const api = Platform.api;
    if (!api?.onTouchStart || !api?.onTouchMove || !api?.onTouchEnd) return;
    this._nativeTouchBound = true;
    try {
      api.onTouchStart((event: any) => this._onNativeTouchStart(event));
      api.onTouchMove((event: any) => this._onNativeTouchMove(event));
      api.onTouchEnd(() => this._onNativeTouchEnd());
      api.onTouchCancel?.(() => this._onNativeTouchEnd());
    } catch (error) {
      console.warn('[RankScene] install native touch handlers failed', error);
    }
  }

  private _firstTouch(event: any): { clientX: number; clientY: number } | null {
    const touches = event?.touches || event?.changedTouches;
    const t = touches && touches[0];
    if (!t || !Number.isFinite(t.clientX) || !Number.isFinite(t.clientY)) return null;
    return { clientX: t.clientX, clientY: t.clientY };
  }

  /**
   * CSS px → 画布物理像素（× dpr）→ 除以舞台缩放 → 设计像素。
   * caizhu 的 stage 只 scale 不 translate，所以不需要扣 letterbox 偏移。
   */
  private _touchToDesign(touch: { clientX: number; clientY: number }): { x: number; y: number } {
    const dpr = Math.max(1, Game.dpr || 1);
    const scale = Math.max(0.0001, Game.scale || 1);
    return {
      x: (touch.clientX * dpr) / scale,
      y: (touch.clientY * dpr) / scale,
    };
  }

  private _onNativeTouchStart(event: any): void {
    if (!this._sceneActive) return;
    const touch = this._firstTouch(event);
    if (!touch) return;
    const p = this._touchToDesign(touch);
    const area = this._listAreaRect;
    // 拖动区只覆盖 Top3 下方的列表区，避免点 mebar/tab 也被当成拖动
    const dragTop = area.y + TOP3_HEIGHT;
    if (p.x < area.x || p.x > area.x + area.w || p.y < dragTop || p.y > area.y + area.h) {
      return;
    }
    this._dragKind = this._scopeTab;
    this._dragStartY = p.y;
    this._dragStartScrollY = this._scopeTab === 'friends' ? this._friendScrollY : this._worldScrollY;
    this._dragMoved = false;
  }

  private _onNativeTouchMove(event: any): void {
    if (!this._sceneActive || !this._dragKind) return;
    const touch = this._firstTouch(event);
    if (!touch) return;
    this._pendingDragY = this._touchToDesign(touch).y;
  }

  /** 帧驱动提交：把最近一次 touchmove 的 Y 真正应用到 scrollY 上 */
  private _commitPendingDrag(): void {
    if (this._pendingDragY == null || !this._dragKind) {
      this._pendingDragY = null;
      return;
    }
    const currentY = this._pendingDragY;
    this._pendingDragY = null;
    const dy = currentY - this._dragStartY;
    if (Math.abs(dy) > 3) this._dragMoved = true;

    if (this._dragKind === 'friends') {
      // 主域不知道好友总人数，先只 clamp 不能往下拉超过顶部；
      // 子域按真实列表长度二次 clamp 下界即可。
      this._friendScrollY = Math.min(0, this._dragStartScrollY + dy);
      this._postFriendRender();
      return;
    }

    if (!this._worldListContent) return;
    const items = this._worldListRecords.slice(3);
    const area = this._listAreaRect;
    const listH = Math.max(80, area.h - TOP3_HEIGHT);
    this._worldScrollY = this._clampScrollY(this._dragStartScrollY + dy, items.length, listH);
    this._worldListContent.y = TOP3_HEIGHT + this._worldScrollY;
    this._renderWorldVisibleRows(listH);
  }

  private _onNativeTouchEnd(): void {
    this._dragKind = null;
    this._dragMoved = false;
    this._pendingDragY = null;
  }

  // ─── Top3 podium ───────────────────────────────────────────

  private _renderTop3Podium(
    container: PIXI.Container,
    items: WorldEntry[],
    W: number,
  ): void {
    const sideW = 165;
    const centerW = 190;
    const leftX = 56;
    const centerX = W / 2 - centerW / 2;
    const rightX = W - sideW - 64;
    const placements = [
      { item: items[1], x: leftX, y: 80, frame: 'top2' as const, w: sideW },
      { item: items[0], x: centerX, y: 0, frame: 'top1' as const, w: centerW },
      { item: items[2], x: rightX, y: 78, frame: 'top3' as const, w: sideW },
    ];

    for (const p of placements) {
      const card = new PIXI.Container();
      card.x = p.x;
      card.y = p.y;
      container.addChild(card);

      const panelHolder = new PIXI.Container();
      card.addChild(panelHolder);
      this._addPodiumFrameSprite(panelHolder, p.frame, p.w);

      if (!p.item) continue;

      const avatarR = p.frame === 'top1' ? 40 : 34;
      const avatarY = p.frame === 'top1' ? 100 : 50;
      const avatar = createAvatarSprite(p.item.avatarUrl, avatarR, p.item.userId);
      avatar.x = p.w / 2 - avatarR;
      avatar.y = avatarY;
      card.addChild(avatar);

      const name = new PIXI.Text(
        this._truncateNickname(resolveDisplayNickname(p.item.nickname, p.item.userId)),
        new PIXI.TextStyle({
          fontSize: p.frame === 'top1' ? 20 : 17,
          fill: 0x1E3A5F,
          fontWeight: 'bold',
          fontFamily: 'Arial',
          stroke: 0xFFFFFF,
          strokeThickness: 2,
        }),
      );
      name.anchor.set(0.5, 0);
      name.x = p.w / 2;
      name.y = avatarY + avatarR * 2 + 6;
      card.addChild(name);

      const value = this._modeTab === 'classic'
        ? `${(p.item as LeaderboardClassicEntry).bestScore}`
        : `★ ${(p.item as LeaderboardLevelEntry).totalStars}`;
      const score = new PIXI.Text(value, new PIXI.TextStyle({
        fontSize: p.frame === 'top1' ? 26 : 22,
        fill: 0xFFF8E7,
        fontWeight: 'bold',
        fontFamily: 'PingFang SC, Microsoft YaHei, Arial',
        stroke: 0x7A3A08,
        strokeThickness: 5,
        dropShadow: true,
        dropShadowColor: 0x1A0F05,
        dropShadowBlur: 3,
        dropShadowDistance: 2,
        dropShadowAlpha: 0.45,
      }));
      const scoreGapBelowName = p.frame === 'top1' ? 10 : 8;
      const nameLineH = p.frame === 'top1' ? 24 : 20;
      score.anchor.set(0.5, 0);
      score.x = p.w / 2;
      score.y = name.y + nameLineH + scoreGapBelowName;
      card.addChild(score);
    }
  }

  // ─── Rank row template & in-place update ──────────────────

  private _createRankRowTemplate(W: number): RankRowView {
    const row = new PIXI.Container() as RankRowView;
    row.eventMode = 'none';
    const w = W - LIST_PADDING_X * 2;
    const h = ROW_HEIGHT;

    const bg = new PIXI.Graphics();
    bg.beginFill(0xF8FBFF, 0.96);
    bg.lineStyle(2, 0xB9D9F2, 0.9);
    bg.drawRoundedRect(0, 0, w, h, 20);
    bg.endFill();
    row.addChild(bg);
    row.__bg = bg;

    const rankText = new PIXI.Text('', new PIXI.TextStyle({
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
    row.__rankText = rankText;

    // 头像 sprite：行复用时只切 .texture，不重建/不挂 Graphics mask。
    // 真机上 Graphics mask 会破坏 batch（每行一个 stencil），是滚动卡顿的最大头。
    const avatarSprite = new PIXI.Sprite();
    avatarSprite.width = ROW_AVATAR_RADIUS * 2;
    avatarSprite.height = ROW_AVATAR_RADIUS * 2;
    avatarSprite.x = 60;
    avatarSprite.y = h / 2 - ROW_AVATAR_RADIUS;
    avatarSprite.eventMode = 'none';
    row.addChild(avatarSprite);
    row.__avatarSprite = avatarSprite;
    row.__avatarSeq = 0;

    const nick = new PIXI.Text('', new PIXI.TextStyle({
      fontSize: 22,
      fill: 0x102F64,
      fontWeight: 'bold',
      fontFamily: 'Arial',
    }));
    nick.anchor.set(0, 0.5);
    nick.x = 116;
    nick.y = h / 2;
    row.addChild(nick);
    row.__nickText = nick;

    const meTag = this._createMeTag();
    meTag.visible = false;
    row.addChild(meTag);
    row.__meTag = meTag;

    // 分数/星数：单行展示。
    //  - 经典模式：`{best} 分`
    //  - 关卡模式：`★ {stars}`（★ 与奖台一致，避免再单独画一颗星图标）
    // 不再单独显示 "星/分" 副文字，也不再展示 "累计 XX"，避免右侧多行挤在一起。
    const valueT = new PIXI.Text('', new PIXI.TextStyle({
      fontSize: 26,
      fill: 0xD25A36,
      fontWeight: 'bold',
      fontFamily: 'PingFang SC, Microsoft YaHei, Arial',
      stroke: 0xFFFFFF,
      strokeThickness: 2,
    }));
    valueT.anchor.set(1, 0.5);
    valueT.x = w - 22;
    valueT.y = h / 2;
    row.addChild(valueT);
    row.__valueText = valueT;

    return row;
  }

  private _updateRankRowContent(
    row: RankRowView,
    entry: WorldEntry,
    mode: ModeTab,
    W: number,
  ): void {
    const w = W - LIST_PADDING_X * 2;
    const h = ROW_HEIGHT;
    // 自己行高亮（背景变金）：只在 isMe 状态变化时重画
    const desiredIsMe = !!entry.isMe;
    if (row.__lastIsMe !== desiredIsMe) {
      row.__lastIsMe = desiredIsMe;
      const bg = row.__bg;
      bg.clear();
      if (desiredIsMe) {
        bg.beginFill(0xFFEDB0, 1);
        bg.lineStyle(2, 0xEFBD48, 1);
      } else {
        bg.beginFill(0xF8FBFF, 0.96);
        bg.lineStyle(2, 0xB9D9F2, 0.9);
      }
      bg.drawRoundedRect(0, 0, w, h, 20);
      bg.endFill();
    }

    const rankText = String(entry.rank);
    if (row.__rankText.text !== rankText) row.__rankText.text = rankText;

    const nickname = this._truncateNickname(resolveDisplayNickname(entry.nickname, entry.userId));
    if (row.__lastNick !== nickname) {
      row.__lastNick = nickname;
      row.__nickText.text = nickname;
    }

    const avatarKey = `${entry.avatarUrl || ''}|${entry.userId || 'rank'}`;
    if (row.__lastAvatarKey !== avatarKey) {
      row.__lastAvatarKey = avatarKey;
      const seq = ++row.__avatarSeq;
      const sprite = row.__avatarSprite;
      const initialTex = resolveCircleAvatarTexture(
        entry.avatarUrl,
        entry.userId,
        ROW_AVATAR_RADIUS,
        (finalTex) => {
          // 异步远程头像加载完成时，只有这行依然展示同一用户（seq 不变）才换贴图，
          // 防止滚动太快把贴图覆盖到已经被复用为别的 user 的行上。
          if (sprite.destroyed) return;
          if (row.__avatarSeq !== seq) return;
          sprite.texture = finalTex;
        },
      );
      sprite.texture = initialTex || PIXI.Texture.EMPTY;
    }

    row.__meTag.visible = desiredIsMe;
    if (desiredIsMe) {
      row.__meTag.x = Math.min(row.__nickText.x + row.__nickText.width + 6, w - 132);
      row.__meTag.y = ROW_HEIGHT / 2 - 9;
    }

    const valueText = mode === 'classic'
      ? `${(entry as LeaderboardClassicEntry).bestScore} 分`
      : `★ ${(entry as LeaderboardLevelEntry).totalStars}`;
    if (row.__lastValue !== valueText) {
      row.__lastValue = valueText;
      row.__valueText.text = valueText;
    }
  }

  private _createMeTag(): PIXI.Container {
    const tagWrap = new PIXI.Container();
    const tagBg = new PIXI.Graphics();
    const tagW = 24;
    const tagH = 18;
    tagBg.beginFill(0xFACC15, 0.95);
    tagBg.drawRoundedRect(0, 0, tagW, tagH, 6);
    tagBg.endFill();
    tagWrap.addChild(tagBg);

    const meTag = new PIXI.Text('我', new PIXI.TextStyle({
      fontSize: 12,
      fill: 0x1F2937,
      fontFamily: 'Arial',
      fontWeight: 'bold',
    }));
    meTag.anchor.set(0.5, 0.5);
    meTag.x = tagW / 2;
    meTag.y = tagH / 2 + 1;
    tagWrap.addChild(meTag);
    return tagWrap;
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
    const meUserId = BackendService.userId || UserProfileManager.userId || 'local';
    const avatarKey = `${profile.avatarUrl}|${meUserId}`;
    if (this._meBarAvatarKey !== avatarKey) {
      this._meBarAvatarKey = avatarKey;
      this._meBarAvatarHolder.removeChildren();
      this._meBarAvatarHolder.addChild(createAvatarSprite(profile.avatarUrl, 38, meUserId));
    }

    if (this._scopeTab === 'friends') {
      const localValue = this._localFallbackValue();
      this._meBarRankText.text = '好友榜';
      this._meBarNameText.text = this._truncateNickname(resolveDisplayNickname(profile.nickname, meUserId));
      this._meBarScoreText.text = Platform.supportsOpenData
        ? this._modeTab === 'classic' ? `${localValue} 分` : `★ ${localValue}`
        : '不可用';
      return;
    }

    const data = this._modeTab === 'classic' ? this._classicData : this._levelData;
    if (!data || !data.me) {
      const localValue = this._localFallbackValue();
      this._meBarRankText.text = '未上榜';
      this._meBarNameText.text = this._truncateNickname(resolveDisplayNickname(profile.nickname, meUserId));
      this._meBarScoreText.text = this._modeTab === 'classic' ? `${localValue} 分` : `★ ${localValue}`;
      return;
    }
    const me = data.me;
    if (this._modeTab === 'classic') {
      const cm = me as LeaderboardClassicEntry;
      this._meBarRankText.text = `第 ${cm.rank} 名`;
      this._meBarNameText.text = this._truncateNickname(
        resolveDisplayNickname(profile.nickname || cm.nickname, cm.userId || meUserId),
      );
      this._meBarScoreText.text = `${cm.bestScore} 分`;
    } else {
      const lm = me as LeaderboardLevelEntry;
      this._meBarRankText.text = `第 ${lm.rank} 名`;
      this._meBarNameText.text = this._truncateNickname(
        resolveDisplayNickname(profile.nickname || lm.nickname, lm.userId || meUserId),
      );
      this._meBarScoreText.text = `★ ${lm.totalStars}`;
    }
  }

  // ─── 微信资料授权 CTA ─────────────────────────────────────
  //
  // 抄水果（hot-pot）方案：PIXI 画黄底「使用微信昵称头像上榜 [授权]」提示条，
  // 「授权」绿色按钮对应的物理矩形上盖一个透明 wx.createUserInfoButton。
  // 用户点击 → 微信原生授权框 → onTap 拿到 nickName / avatarUrl → 写 UserProfileManager。
  // me-bar 在 4 个 tab（经典/关卡 × 全服/好友）都常驻，CTA 也跟着常驻。

  private _refreshWxProfileCta(): void {
    if (!this._sceneActive) return;
    const needCta = !UserProfileManager.isAuthorized && Platform.isWechat;
    if (!needCta) {
      this._removeWxProfileCta();
      this._destroyWxProfileNativeBtn();
      return;
    }
    if (!this._wxCtaContainer) {
      this._wxCtaContainer = this._createWxProfileCta(Game.logicWidth);
      const cta = this._wxCtaContainer;
      cta.x = Game.logicWidth / 2;
      cta.y = this._meBar.y - 36;
      this.container.addChild(cta);
      this._applyWxProfileCtaRect(cta);
    } else {
      this._syncWxProfileNativeBtn();
    }
  }

  private _removeWxProfileCta(): void {
    if (this._wxCtaContainer) {
      try { this._wxCtaContainer.destroy({ children: true }); } catch {}
      this._wxCtaContainer = null;
    }
    this._wxCtaBtnRect = { x: 0, y: 0, w: 0, h: 0 };
  }

  private _createWxProfileCta(W: number): PIXI.Container {
    const root = new PIXI.Container();
    const w = W - 44;
    const h = 64;

    const bg = new PIXI.Graphics();
    bg.beginFill(0xFFF3D6, 1);
    bg.lineStyle(2, 0xF5B94A, 1);
    bg.drawRoundedRect(-w / 2, -h / 2, w, h, 20);
    bg.endFill();
    root.addChild(bg);

    const icon = new PIXI.Text('💚', new PIXI.TextStyle({ fontSize: 30 }));
    icon.anchor.set(0.5);
    icon.position.set(-w / 2 + 36, 0);
    root.addChild(icon);

    const label = new PIXI.Text('使用微信昵称头像上榜', new PIXI.TextStyle({
      fontSize: 24,
      fill: 0x8A5A2B,
      fontFamily: 'Arial',
      fontWeight: 'bold',
    }));
    label.anchor.set(0, 0.5);
    label.position.set(-w / 2 + 64, 0);
    root.addChild(label);

    const btnW = 120;
    const btnH = 48;
    const btnCenterX = w / 2 - btnW / 2 - 14;
    const btnBg = new PIXI.Graphics();
    btnBg.beginFill(0x07C160, 1);
    btnBg.lineStyle(2, 0x059149, 1);
    btnBg.drawRoundedRect(-btnW / 2, -btnH / 2, btnW, btnH, 24);
    btnBg.endFill();
    btnBg.position.set(btnCenterX, 0);
    root.addChild(btnBg);

    const btnLabel = new PIXI.Text('授权', new PIXI.TextStyle({
      fontSize: 24,
      fill: 0xFFFFFF,
      fontFamily: 'Arial',
      fontWeight: 'bold',
      stroke: 0x059149,
      strokeThickness: 3,
    }));
    btnLabel.anchor.set(0.5);
    btnLabel.position.set(btnCenterX, 0);
    root.addChild(btnLabel);

    // 缓存「授权」按钮在 root 局部坐标系下的位置，挂到父容器后由 applyWxProfileCtaRect
    // 用 toGlobal 换算成全局物理像素再除 stage scale 得到设计像素矩形。
    (root as any)._authBtnLocalX = btnCenterX;
    (root as any)._authBtnW = btnW;
    (root as any)._authBtnH = btnH;
    return root;
  }

  private _applyWxProfileCtaRect(cta: PIXI.Container): void {
    const btnCenterX = (cta as any)._authBtnLocalX as number;
    const btnW = (cta as any)._authBtnW as number;
    const btnH = (cta as any)._authBtnH as number;
    if (!Number.isFinite(btnCenterX) || !Number.isFinite(btnW) || !Number.isFinite(btnH)) return;
    const global = cta.toGlobal(new PIXI.Point(btnCenterX, 0));
    const stageScale = Math.max(0.0001, Game.scale || 1);
    // caizhu 没有 stage letterbox（直接铺满），不需要再减 stageOffsetX/Y
    const designX = global.x / stageScale;
    const designY = global.y / stageScale;
    this._wxCtaBtnRect = {
      x: designX - btnW / 2,
      y: designY - btnH / 2,
      w: btnW,
      h: btnH,
    };
    this._syncWxProfileNativeBtn();
  }

  private _syncWxProfileNativeBtn(): void {
    const api = Platform.api;
    if (!api?.createUserInfoButton) return;
    const rect = this._wxCtaBtnRect;
    if (!rect.w || !rect.h) {
      this._destroyWxProfileNativeBtn();
      return;
    }
    const dpr = Math.max(1, Game.dpr || 1);
    const scale = Math.max(0.0001, Game.scale || 1);
    // rect 是设计像素 → 物理像素（× scale）→ CSS 像素（÷ dpr）
    const cssLeft = Math.round((rect.x * scale) / dpr);
    const cssTop = Math.round((rect.y * scale) / dpr);
    const cssW = Math.max(1, Math.round((rect.w * scale) / dpr));
    const cssH = Math.max(1, Math.round((rect.h * scale) / dpr));

    if (!this._wxCtaNativeBtn) {
      try {
        this._wxCtaLastCss = { left: cssLeft, top: cssTop, width: cssW, height: cssH };
        // text 必须非空、fontSize 最低 12，部分基础库下 text='' 或 fontSize<12 按钮不响应。
        // backgroundColor / color 都设全透明，让玩家看到的是下面 PIXI 画的绿色按钮。
        const btn = api.createUserInfoButton({
          type: 'text',
          text: ' ',
          style: {
            left: cssLeft,
            top: cssTop,
            width: cssW,
            height: cssH,
            backgroundColor: 'rgba(0,0,0,0)',
            borderColor: 'rgba(0,0,0,0)',
            borderWidth: 0,
            borderRadius: Math.round(cssH / 2),
            color: 'rgba(0,0,0,0)',
            fontSize: 12,
            textAlign: 'center',
            lineHeight: cssH,
          },
          withCredentials: false,
        });
        if (!btn) {
          console.warn('[RankScene] createUserInfoButton returned falsy');
          return;
        }
        this._wxCtaNativeBtn = btn;
        btn.onTap?.((res: any) => this._handleWxProfileTap(res));
        btn.show?.();
        console.log(
          `[RankScene] wxCtaBtn created css(left=${cssLeft} top=${cssTop} w=${cssW} h=${cssH})`
          + ` screen(${Game.screenWidth}x${Game.screenHeight})`,
        );
      } catch (error) {
        console.warn('[RankScene] createUserInfoButton failed', error);
      }
      return;
    }

    const last = this._wxCtaLastCss;
    if (last && last.left === cssLeft && last.top === cssTop && last.width === cssW && last.height === cssH) {
      return;
    }
    try {
      this._wxCtaLastCss = { left: cssLeft, top: cssTop, width: cssW, height: cssH };
      Object.assign(this._wxCtaNativeBtn.style, {
        left: cssLeft,
        top: cssTop,
        width: cssW,
        height: cssH,
        lineHeight: cssH,
        borderRadius: Math.round(cssH / 2),
      });
    } catch (error) {
      console.warn('[RankScene] sync wxCtaBtn style failed', error);
    }
  }

  private _destroyWxProfileNativeBtn(): void {
    this._wxCtaLastCss = null;
    if (!this._wxCtaNativeBtn) return;
    try { this._wxCtaNativeBtn.hide?.(); } catch {}
    try { this._wxCtaNativeBtn.destroy?.(); } catch (error) {
      console.warn('[RankScene] destroy wxCtaBtn failed', error);
    }
    this._wxCtaNativeBtn = null;
  }

  private async _handleWxProfileTap(res: any): Promise<void> {
    const errMsg = String(res?.errMsg || '');
    const info = res?.userInfo;
    console.log('[RankScene] wxCtaBtn onTap:', JSON.stringify({
      hasUserInfo: !!info,
      nick: info?.nickName,
      errMsg,
      errCode: res?.err_code,
    }));

    // 隐私协议未配置：兜底提示
    if (errMsg.includes('no privacy api permission') || res?.err_code === -12034) {
      Platform.showToast('隐私协议未配置');
      return;
    }
    // 用户拒绝授权 → 提示一下，CTA 继续保留
    if (errMsg.includes('fail') && errMsg.includes('deny')) {
      Platform.showToast('已取消授权');
      return;
    }

    const nick = String(info?.nickName || '').trim();
    const avatar = String(info?.avatarUrl || '').trim();
    if (!nick && !avatar) {
      Platform.showToast('微信限制，未获取到真实昵称');
      return;
    }
    try {
      await UserProfileManager.updateProfile(nick, avatar);
      await LeaderboardManager.resyncAuthorizedProfile();
    } catch (error) {
      console.warn('[RankScene] apply wxProfile failed', error);
    }
    Platform.showToast('已带微信昵称上榜');
    // 强制重拉数据，让自己最新的真实昵称/头像出现在世界榜
    void this._loadInitialData(true);
  }

  private _localFallbackValue(): number {
    if (this._modeTab === 'classic') return this._localClassicScore();
    return this._localLevelStars();
  }

  private _localClassicScore(): number {
    const raw = PersistService.readRaw(BEST_SCORE_KEY);
    const v = Number(raw || 0);
    return Number.isFinite(v) && v > 0 ? Math.floor(v) : 0;
  }

  private _localLevelStars(): number {
    let stars = 0;
    for (let i = 1; i <= TOTAL_LEVELS; i++) stars += LevelManager.getStars(i);
    return stars;
  }

  // ─── Data loading ─────────────────────────────────────────

  private async _loadInitialData(force = false): Promise<void> {
    this._loading = true;
    this._renderList();
    try {
      await this._syncLocalProgressToLeaderboard();
      if (UserProfileManager.isAuthorized) {
        await LeaderboardManager.resyncAuthorizedProfile();
      }
      const [classic, level] = await Promise.all([
        LeaderboardManager.fetchClassicWorld(force),
        LeaderboardManager.fetchLevelWorld(force),
      ]);
      this._classicData = this._patchWorldWithLocalProfile(this._withLocalClassicMe(classic));
      this._levelData = this._patchWorldWithLocalProfile(this._withLocalLevelMe(level));
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

  private _myUserId(): string {
    return BackendService.userId || UserProfileManager.userId || '';
  }

  private _isMyEntry(userId: string, isMe: boolean): boolean {
    const myId = this._myUserId();
    return isMe || (!!myId && userId === myId);
  }

  /** 领奖台/列表与底部「我的」一致：自己的条目用本地授权资料覆盖服务端旧数据 */
  private _patchWorldWithLocalProfile<T extends WorldEntry>(
    data: LeaderboardWorldResult<T>,
  ): LeaderboardWorldResult<T> {
    if (!UserProfileManager.isAuthorized) return data;
    const patchOne = (entry: T): T => {
      if (!this._isMyEntry(entry.userId, entry.isMe)) return entry;
      const meUserId = this._myUserId();
      return {
        ...entry,
        nickname: UserProfileManager.profile.nickname || resolveDisplayNickname(entry.nickname, meUserId),
        avatarUrl: UserProfileManager.avatarUrl,
      };
    };
    return {
      ...data,
      items: data.items.map(patchOne),
      me: data.me ? patchOne(data.me) : data.me,
    };
  }

  private _withLocalClassicMe(
    data: LeaderboardWorldResult<LeaderboardClassicEntry>,
  ): LeaderboardWorldResult<LeaderboardClassicEntry> {
    if (data.fetch && data.fetch.ok === false) return data;
    if (data.me) return data;
    const bestScore = this._localClassicScore();
    if (bestScore <= 0) return data;

    const profile = UserProfileManager.profile;
    const meUserId = BackendService.userId || UserProfileManager.userId || 'local';
    const higherCount = data.items.filter((item) => item.bestScore > bestScore).length;
    const me: LeaderboardClassicEntry = {
      rank: higherCount + 1,
      isMe: true,
      userId: meUserId,
      nickname: UserProfileManager.isAuthorized
        ? (profile.nickname || resolveDisplayNickname('', meUserId))
        : resolveDisplayNickname(profile.nickname, meUserId),
      avatarUrl: UserProfileManager.avatarUrl,
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
    if (data.fetch && data.fetch.ok === false) return data;
    if (data.me) return data;
    const totalStars = this._localLevelStars();
    const totalScore = LevelManager.getTotalBestScore();
    if (totalStars <= 0 && totalScore <= 0) return data;

    const profile = UserProfileManager.profile;
    const meUserId = BackendService.userId || UserProfileManager.userId || 'local';
    const me: LeaderboardLevelEntry = {
      rank: 1,
      isMe: true,
      userId: meUserId,
      nickname: UserProfileManager.isAuthorized
        ? (profile.nickname || resolveDisplayNickname('', meUserId))
        : resolveDisplayNickname(profile.nickname, meUserId),
      avatarUrl: UserProfileManager.avatarUrl,
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

  private _preloadRankAssets(): void {
    for (const path of RANK_PRELOAD_ASSETS) void loadImageTexture(path);
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

  private _addPodiumFrameSprite(
    parent: PIXI.Container,
    frameKey: keyof typeof RANK_PODIUM_FRAMES,
    width: number,
  ): void {
    void loadImageTexture(RANK_PODIUM_SHEET).then((texture) => {
      if (!texture || parent.destroyed) return;
      const frame = RANK_PODIUM_FRAMES[frameKey];
      const cropped = new PIXI.Texture(
        texture.baseTexture,
        new PIXI.Rectangle(frame.x, frame.y, frame.w, frame.h),
      );
      const sprite = new PIXI.Sprite(cropped);
      sprite.width = width;
      sprite.height = width * (frame.h / frame.w);
      parent.addChild(sprite);
    });
  }

  /**
   * Tab 按钮的图片复用：同一个 container 内的不同 asset 都保留为子节点，
   * 切 tab 时只切换 visible，不重新解码/上传纹理。
   */
  private _setButtonAsset(container: PIXI.Container, path: string, width: number): void {
    let matched: (PIXI.Container & { __assetPath?: string }) | null = null;
    for (const child of container.children) {
      const holder = child as PIXI.Container & { __assetPath?: string };
      if (holder.name !== 'assetBg') continue;
      if (holder.__assetPath === path) {
        matched = holder;
        holder.visible = true;
      } else {
        holder.visible = false;
      }
    }
    if (matched) return;
    const holder = new PIXI.Container();
    holder.name = 'assetBg';
    (holder as PIXI.Container & { __assetPath?: string }).__assetPath = path;
    container.addChildAt(holder, 0);
    addImageSprite(holder, RANK_ASSET_PREFIX + path, (sprite) => {
      sprite.width = width;
      sprite.height = width * (sprite.texture.height / sprite.texture.width);
    });
  }

  private _destroyChildren(container: PIXI.Container): void {
    const children = container.removeChildren();
    for (const child of children) {
      if (!child.destroyed) child.destroy({ children: true });
    }
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

    btn.on('pointertap', () => {
      AudioManager.play('button');
      SceneManager.switchTo('home');
    });
    return btn;
  }
}
