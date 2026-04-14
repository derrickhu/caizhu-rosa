import * as PIXI from 'pixi.js';
import { TweenManager } from './TweenManager';

declare const GameGlobal: any;

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

  constructor() {
    this.stage = new PIXI.Container();
    this.ticker = new PIXI.Ticker();
  }

  init(canvas: any): void {
    if (this._initialized) return;

    const sysInfo = (typeof wx !== 'undefined' ? wx : typeof tt !== 'undefined' ? tt : null)
      ?.getSystemInfoSync?.();
    if (sysInfo) {
      this.screenWidth = sysInfo.screenWidth;
      this.screenHeight = sysInfo.screenHeight;
      this.dpr = sysInfo.pixelRatio || 2;
    }

    const _api: any = typeof wx !== 'undefined' ? wx : typeof tt !== 'undefined' ? tt : null;
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

    let renderer: PIXI.IRenderer | null = null;
    let app: PIXI.Application | null = null;

    try {
      app = new PIXI.Application({
        view: canvas, width: realWidth, height: realHeight,
        backgroundColor: 0x2C3E50, resolution: 1, antialias: true,
        preferWebGLVersion: 1,
      } as any);
    } catch (e) { console.error('[Game] PIXI.Application 失败:', e); }

    if (app?.stage && app?.ticker && app?.renderer) {
      this.app = app;
      this.stage = app.stage;
      this.ticker = app.ticker;
      renderer = app.renderer;
    } else {
      if (app?.renderer) renderer = app.renderer;
      if (!renderer) {
        try { renderer = new PIXI.Renderer({ view: canvas, width: realWidth, height: realHeight, backgroundColor: 0x2C3E50, resolution: 1, antialias: true, preferWebGLVersion: 1 } as any); } catch {}
      }
      if (!renderer) {
        try { renderer = PIXI.autoDetectRenderer({ view: canvas, width: realWidth, height: realHeight, backgroundColor: 0x2C3E50, resolution: 1, antialias: true, preferWebGLVersion: 1 } as any); } catch {}
      }
      this.stage = new PIXI.Container();
      this.ticker = new PIXI.Ticker();
      this.ticker.start();
      if (renderer) { this.ticker.add(() => { renderer!.render(this.stage); }); }
      this.app = { stage: this.stage, ticker: this.ticker, renderer, view: canvas } as any;
    }

    try { (GameGlobal as any).__gameRendered = true; } catch {}

    this.stage.scale.set(this.scale, this.scale);

    this.ticker.add(() => {
      const dt = this.ticker.deltaMS / 1000;
      TweenManager.update(dt);
    });

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
    console.log(`[Game] 初始化完成: ${realWidth}x${realHeight}, scale=${this.scale.toFixed(2)}`);
  }

  get logicWidth(): number { return this.designWidth; }
  get logicHeight(): number { return this.screenHeight / this.screenWidth * this.designWidth; }
}

const _global: any = typeof GameGlobal !== 'undefined' ? GameGlobal
  : typeof window !== 'undefined' ? window
  : typeof globalThis !== 'undefined' ? globalThis : {};

if (!_global.__gameInstance) { _global.__gameInstance = new GameClass(); }
export const Game: GameClass = _global.__gameInstance;
