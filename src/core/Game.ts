import * as PIXI from 'pixi.js';
import { TweenManager } from './TweenManager';

declare const GameGlobal: any;

/**
 * 好友榜 sharedCanvas 上屏 overlay：
 * - canvas：开放数据域子进程画好的 sharedCanvas（wx.getOpenDataContext().canvas）
 * - x/y/width/height：上屏目标矩形，单位是设计像素（跟 Game.logicWidth 同一坐标系）
 *
 * 真机微信下 sharedCanvas 不能贴到 PIXI WebGL 纹理上（除非 iOS 提供 gl.wxBindCanvasTexture，
 * 实测 iOS 16+ / 部分基础库已经拿不到这个扩展，安卓更是从来没有）；
 * 因此采用「PIXI 渲染到离屏 canvas，再用主屏 2D ctx 合成 PIXI 帧 + sharedCanvas」的方案，
 * 跟水果（hot-pot）线上保持一致。
 */
export type OpenDataOverlay = {
  canvas: HTMLCanvasElement & { width: number; height: number };
  x: number;
  y: number;
  width: number;
  height: number;
};

class GameClass {
  app!: PIXI.Application;
  stage: PIXI.Container;
  ticker: PIXI.Ticker;

  designWidth = 750;
  designHeight = 1334;
  screenWidth = 375;
  screenHeight = 667;
  scale = 1;
  dpr = 1;
  safeTop = 0;

  private _initialized = false;
  // ── 双 canvas 上屏合成相关字段 ────────────────────────────────
  // screenCanvas：真正的上屏 canvas（main.ts 拿到的那个 wx 主 canvas），用 2D ctx 做最终合成
  // renderCanvas：PIXI 用来渲染的离屏 canvas（wx.createCanvas() 第 N 次创建的离屏 canvas）
  // 当 screenCtx2d 拿到且 renderCanvas !== screenCanvas 时，启用 2D 合成模式；
  // 否则退化为原来的 direct-webgl（PIXI 直接渲染到主 canvas），好友榜 sharedCanvas 上屏失效。
  private _screenCanvas: any | null = null;
  private _renderCanvas: any | null = null;
  private _screenCtx2d: any | null = null;
  private _openDataOverlay: OpenDataOverlay | null = null;
  private _compositorWarned = false;

  constructor() {
    this.stage = new PIXI.Container();
    this.ticker = new PIXI.Ticker();
  }

  init(canvas: any): void {
    if (this._initialized) return;

    const _api: any = typeof wx !== 'undefined' ? wx : typeof tt !== 'undefined' ? tt : null;
    const sysInfo = _api?.getSystemInfoSync?.();
    if (sysInfo) {
      this.screenWidth = sysInfo.screenWidth;
      this.screenHeight = sysInfo.screenHeight;
      this.dpr = sysInfo.pixelRatio || 2;
    }

    let safeTopPx = 0;
    try {
      const capsule = _api?.getMenuButtonBoundingClientRect?.();
      if (capsule?.top) safeTopPx = capsule.top;
      else if (sysInfo?.statusBarHeight) safeTopPx = sysInfo.statusBarHeight + 6;
    } catch {}
    if (safeTopPx <= 0) safeTopPx = 40;
    this.safeTop = Math.round(safeTopPx * (this.designWidth / this.screenWidth));

    this.scale = this.screenWidth / this.designWidth * this.dpr;

    const realWidth = this.screenWidth * this.dpr;
    const realHeight = this.screenHeight * this.dpr;
    canvas.width = realWidth;
    canvas.height = realHeight;

    // ── 选择渲染拓扑（双 canvas / direct-webgl）────────────────
    // 优先 xiao_chu 方式：game.js 入口已经把第一次 wx.createCanvas() 的主 canvas
    //   提前 getContext('2d') 锁定并挂到 GameGlobal.__mainCanvas / __mainCtx2d。
    //   这里直接拿过来作为合成上屏 canvas；main.ts 传进来的 canvas 是 pixi-adapter
    //   第二次 createCanvas 拿到的离屏 canvas，自带 addEventListener / style 等 polyfill，
    //   PIXI 直接用它作为 WebGL 渲染目标即可，pointer 事件由 pixi-adapter 正常路由。
    // 兜底：如果 __mainCanvas 不存在（旧 game.js / 抖音 / 浏览器预览），在这里再 createCanvas
    //   一次拿离屏，并尝试给主 canvas 拿 2D ctx；都失败就退化到 direct-webgl。
    this._screenCanvas = canvas;
    this._renderCanvas = canvas;
    this._screenCtx2d = null;

    let pixiViewCanvas: any = canvas;
    const preBoundMain = (typeof GameGlobal !== 'undefined' ? (GameGlobal as any).__mainCanvas : null) || null;
    const preBoundCtx2d = (typeof GameGlobal !== 'undefined' ? (GameGlobal as any).__mainCtx2d : null) || null;

    if (preBoundMain && preBoundCtx2d && preBoundMain !== canvas) {
      // 主路径：game.js 提前准备好了，pixi-adapter 的 canvas 直接给 PIXI 当 view
      try { preBoundMain.width = realWidth; } catch {}
      try { preBoundMain.height = realHeight; } catch {}
      this._screenCanvas = preBoundMain;
      this._screenCtx2d = preBoundCtx2d;
      this._renderCanvas = canvas;
      pixiViewCanvas = canvas;
    } else if (!!_api?.getOpenDataContext && typeof _api?.createCanvas === 'function') {
      // 兜底路径：在 init 内部 createCanvas() 拿离屏给 PIXI，主 canvas 再尝试拿 2D ctx
      try {
        const offscreen = _api.createCanvas();
        if (offscreen && typeof offscreen.getContext === 'function' && offscreen !== canvas) {
          offscreen.width = realWidth;
          offscreen.height = realHeight;
          // 离屏 canvas 没有 addEventListener / style 等 DOM 方法，PIXI EventSystem
          // 会调 view.addEventListener('pointerdown', ...) 直接抛 TypeError；这里 no-op patch。
          this._patchOffscreenCanvasDom(offscreen);
          this._renderCanvas = offscreen;
          pixiViewCanvas = offscreen;
        }
      } catch (error) {
        console.warn('[Game] createCanvas (offscreen) failed', error);
      }
    }

    const tryCreateRuntime = (view: any): { app: PIXI.Application | null; renderer: PIXI.IRenderer | null } => {
      let r: PIXI.IRenderer | null = null;
      let a: PIXI.Application | null = null;
      try {
        a = new PIXI.Application({
          view, width: realWidth, height: realHeight,
          backgroundColor: 0x2C3E50, resolution: 1, antialias: true,
          preferWebGLVersion: 1,
        } as any);
      } catch (e) {
        console.error('[Game] PIXI.Application 失败:', e);
      }
      if (a?.stage && a?.ticker && a?.renderer) return { app: a, renderer: a.renderer };
      if (a?.renderer) r = a.renderer;
      if (!r) {
        try { r = new PIXI.Renderer({ view, width: realWidth, height: realHeight, backgroundColor: 0x2C3E50, resolution: 1, antialias: true, preferWebGLVersion: 1 } as any); } catch {}
      }
      if (!r) {
        try { r = PIXI.autoDetectRenderer({ view, width: realWidth, height: realHeight, backgroundColor: 0x2C3E50, resolution: 1, antialias: true, preferWebGLVersion: 1 } as any); } catch {}
      }
      return { app: a, renderer: r };
    };

    let { app, renderer } = tryCreateRuntime(pixiViewCanvas);

    // 双 canvas 模式下 PIXI 仍然失败：典型原因是离屏 canvas 缺关键 DOM 方法。
    // 自动降级到 direct-webgl（PIXI 直接渲染到主 canvas，好友榜 sharedCanvas 上屏不可用），
    // 至少保证主游戏画面正常起来。
    if ((!app || !app.renderer) && pixiViewCanvas !== canvas) {
      console.warn('[Game] composite mode PIXI failed, fallback to direct-webgl');
      this._renderCanvas = canvas;
      pixiViewCanvas = canvas;
      const retry = tryCreateRuntime(pixiViewCanvas);
      app = retry.app;
      renderer = retry.renderer;
    }

    if (app?.stage && app?.ticker && app?.renderer) {
      this.app = app;
      this.stage = app.stage;
      this.ticker = app.ticker;
      renderer = app.renderer;
    } else {
      this.stage = new PIXI.Container();
      this.ticker = new PIXI.Ticker();
      this.ticker.start();
      if (renderer) { this.ticker.add(() => { renderer!.render(this.stage); }); }
      this.app = { stage: this.stage, ticker: this.ticker, renderer, view: pixiViewCanvas } as any;
    }

    // 启用 2D 合成：兜底路径下 PIXI 创建完后再去拿主 canvas 的 2D ctx
    // （主路径已经在 game.js 入口提前 getContext('2d') 过，这里再拿一次返回同一个 ctx；
    //   兜底路径下主 canvas 一直没被 PIXI 占用 webgl ctx，可以安全拿 2d ctx）
    if (this._renderCanvas !== this._screenCanvas) {
      try {
        const ctx = this._screenCanvas.getContext('2d') as CanvasRenderingContext2D | null;
        if (ctx) {
          this._screenCtx2d = ctx;
        } else {
          console.warn('[Game] screenCanvas getContext("2d") returned null, fallback to direct-webgl');
          this._renderCanvas = this._screenCanvas;
        }
      } catch (error) {
        console.warn('[Game] screenCanvas getContext("2d") threw', error);
        this._renderCanvas = this._screenCanvas;
      }
    }

    try { (GameGlobal as any).__gameRendered = true; } catch {}

    this.stage.scale.set(this.scale, this.scale);

    this.ticker.add(() => {
      const dt = this.ticker.deltaMS / 1000;
      TweenManager.update(dt);
    });

    // 2D 合成上屏：必须排在所有渲染之后；用最低优先级保证 PIXI render 完了再 drawImage
    if (this._screenCtx2d && this._renderCanvas !== this._screenCanvas) {
      this.ticker.add(() => {
        this._compositeToScreen();
      }, undefined, PIXI.UPDATE_PRIORITY.LOW);
      console.log(
        '[Game] render mode=2d-compositor'
          + ' screen=' + this._screenCanvas.width + 'x' + this._screenCanvas.height
          + ' render=' + this._renderCanvas.width + 'x' + this._renderCanvas.height
      );
    } else {
      console.log(
        '[Game] render mode=direct-webgl'
          + ' canvas=' + canvas.width + 'x' + canvas.height
      );
    }

    // EventSystem coordinate fix for real devices
    try {
      const evtSys = (this.app.renderer as any).events;
      if (evtSys?.domElement) {
        const dom = evtSys.domElement;
        evtSys.mapPositionToPoint = (point: any, x: number, y: number) => {
          let rect: any;
          try { rect = dom.getBoundingClientRect(); } catch { rect = null; }
          if (!rect || !rect.width || !rect.height) {
            rect = { left: 0, top: 0, width: this.screenWidth, height: this.screenHeight };
          }
          const resMul = 1.0 / (evtSys.resolution || 1);
          point.x = ((x - (rect.left || 0)) * (dom.width / rect.width)) * resMul;
          point.y = ((y - (rect.top || 0)) * (dom.height / rect.height)) * resMul;
        };
      }
    } catch {}

    this._initialized = true;
  }

  /**
   * 给 wx.createCanvas() 返回的离屏 canvas 补齐 PIXI 期望的 DOM stub：
   *  - addEventListener / removeEventListener：no-op；真正的 pointer 事件由 pixi-adapter 在
   *    globalThis 上分发，离屏 canvas 不参与
   *  - style：PIXI EventSystem.addEvents 里有 `style.touchAction = 'none'` 这种赋值
   *  - getBoundingClientRect：mapPositionToPoint 默认实现会调它
   *  - clientWidth / clientHeight：少数模块会读
   * 只在缺失时加，避免覆盖真实实现。
   */
  private _patchOffscreenCanvasDom(target: any): void {
    if (!target) return;
    const safeAssign = (key: string, value: any) => {
      try {
        if (target[key] === undefined || target[key] === null) {
          target[key] = value;
        }
      } catch {
        try {
          Object.defineProperty(target, key, { value, writable: true, configurable: true });
        } catch {}
      }
    };
    if (typeof target.addEventListener !== 'function') {
      safeAssign('addEventListener', function _noopAdd() {});
    }
    if (typeof target.removeEventListener !== 'function') {
      safeAssign('removeEventListener', function _noopRemove() {});
    }
    if (typeof target.dispatchEvent !== 'function') {
      safeAssign('dispatchEvent', function _noopDispatch() { return true; });
    }
    if (!target.style) {
      safeAssign('style', {});
    }
    if (typeof target.getBoundingClientRect !== 'function') {
      const sw = this.screenWidth || 375;
      const sh = this.screenHeight || 667;
      safeAssign('getBoundingClientRect', function _rect() {
        return { x: 0, y: 0, top: 0, left: 0, right: sw, bottom: sh, width: sw, height: sh };
      });
    }
    if (target.clientWidth === undefined) {
      try { Object.defineProperty(target, 'clientWidth', { get: () => this.screenWidth, configurable: true }); } catch {}
    }
    if (target.clientHeight === undefined) {
      try { Object.defineProperty(target, 'clientHeight', { get: () => this.screenHeight, configurable: true }); } catch {}
    }
    if (!target.ownerDocument) {
      try { Object.defineProperty(target, 'ownerDocument', { value: (globalThis as any).document || null, configurable: true }); } catch {}
    }
  }

  /** 每帧把 PIXI 离屏帧 + 好友榜 sharedCanvas overlay 合成到主上屏 canvas */
  private _compositeToScreen(): void {
    const ctx = this._screenCtx2d;
    const screen = this._screenCanvas;
    const render = this._renderCanvas;
    if (!ctx || !screen || !render || screen === render) return;

    try {
      ctx.clearRect(0, 0, screen.width, screen.height);
      ctx.drawImage(render, 0, 0, screen.width, screen.height);
      const overlay = this._openDataOverlay;
      if (overlay?.canvas) {
        ctx.drawImage(
          overlay.canvas,
          0,
          0,
          overlay.canvas.width,
          overlay.canvas.height,
          Math.round(overlay.x * this.scale),
          Math.round(overlay.y * this.scale),
          Math.round(overlay.width * this.scale),
          Math.round(overlay.height * this.scale)
        );
      }
    } catch (error) {
      if (!this._compositorWarned) {
        this._compositorWarned = true;
        console.warn('[Game] 2d compositor draw failed', error);
      }
    }
  }

  /** 当前是否真的能把开放数据域 sharedCanvas 通过主屏 2D ctx 合成上屏 */
  canCompositeOpenDataOverlay(): boolean {
    return !!this._screenCtx2d
      && !!this._screenCanvas
      && !!this._renderCanvas
      && this._screenCanvas !== this._renderCanvas;
  }

  /** iOS 微信新基础库提供的 WebGL 绑定 Canvas 纹理能力；Android / 部分 iOS 没有 */
  canBindCanvasTexture(): boolean {
    try {
      const renderer = this.app?.renderer as PIXI.Renderer | undefined;
      const gl = renderer?.gl as any;
      return !!gl && typeof gl.wxBindCanvasTexture === 'function';
    } catch {
      return false;
    }
  }

  /** 设置开放数据域显示区域（坐标使用设计像素），由 RankScene 在进入好友榜时调用 */
  setOpenDataOverlay(overlay: OpenDataOverlay): boolean {
    if (!this.canCompositeOpenDataOverlay()) {
      console.warn('[Game] openData overlay unavailable: render mode is direct-webgl');
      return false;
    }
    this._openDataOverlay = overlay;
    console.log(
      '[Game] openData overlay set'
        + ' src=' + (overlay.canvas?.width | 0) + 'x' + (overlay.canvas?.height | 0)
        + ' dst=' + Math.round(overlay.x) + ',' + Math.round(overlay.y)
        + ' ' + Math.round(overlay.width) + 'x' + Math.round(overlay.height)
    );
    return true;
  }

  /** 清理开放数据域显示区域，避免离开好友榜后 sharedCanvas 残留在其他场景 */
  clearOpenDataOverlay(): void {
    if (this._openDataOverlay) {
      console.log('[Game] openData overlay cleared');
    }
    this._openDataOverlay = null;
  }

  get logicWidth(): number { return this.designWidth; }
  get logicHeight(): number { return this.screenHeight / this.screenWidth * this.designWidth; }

  /**
   * 真正上屏的 canvas：
   *  - xiao_chu 主路径：game.js 里第一次 wx.createCanvas() 拿到、立刻 getContext('2d') 锁定的主屏 canvas；
   *  - 兜底路径：等于 PIXI 直接渲染的主 canvas（pixi-adapter 那块，有 listener polyfill）。
   * 这块 canvas 不一定带 addEventListener；想监听 pointer/touch 请用 Game.app.view（pixi-adapter canvas）。
   */
  get screenCanvas(): any {
    return this._screenCanvas;
  }
}

const _global: any = typeof GameGlobal !== 'undefined' ? GameGlobal
  : typeof window !== 'undefined' ? window
  : typeof globalThis !== 'undefined' ? globalThis : {};

if (!_global.__gameInstance) { _global.__gameInstance = new GameClass(); }
export const Game: GameClass = _global.__gameInstance;
