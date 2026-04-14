import * as PIXI from 'pixi.js';
import { Game } from '@/core/Game';
import { SceneManager, type Scene } from '@/core/SceneManager';
import { TweenManager, Ease } from '@/core/TweenManager';
import { BALL_PALETTE } from '@/config/GameConfig';
import { BallSprite } from '@/gameobjects/BallSprite';
import { createBgSprite } from '@/utils/bgHelper';

export class HomeScene implements Scene {
  readonly name = 'home';
  readonly container = new PIXI.Container();

  private _decorBalls: PIXI.Container[] = [];

  onEnter(): void {
    this.container.removeChildren();
    const W = Game.logicWidth;
    const H = Game.logicHeight;

    // Background
    const bg = createBgSprite('images/bg_home.jpg', W, H, 0x1C2833);
    this.container.addChild(bg);

    // Decorative floating balls
    this._createDecorBalls();

    // Title
    const title = new PIXI.Text('五彩连珠', new PIXI.TextStyle({
      fontSize: 58,
      fill: [0xFFFFFF, 0xE0E7EE],
      fontWeight: 'bold',
      fontFamily: 'Arial',
      letterSpacing: 6,
      dropShadow: true,
      dropShadowColor: 0x000000,
      dropShadowBlur: 12,
      dropShadowDistance: 2,
      dropShadowAlpha: 0.4,
    }));
    title.anchor.set(0.5, 0.5);
    title.x = W / 2;
    title.y = H * 0.26;
    this.container.addChild(title);

    // Subtitle
    const subtitle = new PIXI.Text('经典益智 · 策略消除', new PIXI.TextStyle({
      fontSize: 22,
      fill: 0x8899AA,
      fontFamily: 'Arial',
      letterSpacing: 3,
    }));
    subtitle.anchor.set(0.5, 0.5);
    subtitle.x = W / 2;
    subtitle.y = H * 0.33;
    this.container.addChild(subtitle);

    // Classic mode button
    this._createMenuButton(
      '经典模式',
      '无尽挑战 · 冲击高分',
      W / 2,
      H * 0.52,
      [0x2563EB, 0x1D4ED8],
      0.2,
      () => SceneManager.switchTo('classic'),
    );

    // Level mode button
    this._createMenuButton(
      '关卡模式',
      '休闲闯关 · 30关挑战',
      W / 2,
      H * 0.64,
      [0x059669, 0x047857],
      0.3,
      () => SceneManager.switchTo('levelSelect'),
    );

    // Leaderboard button
    this._createMenuButton(
      '排行榜',
      '经典最高分 · 关卡通关数',
      W / 2,
      H * 0.76,
      [0xD97706, 0xB45309],
      0.4,
      () => SceneManager.switchTo('rank'),
    );

    // Entrance animation for title
    title.alpha = 0;
    title.y -= 20;
    TweenManager.to({ target: title, props: { alpha: 1, y: title.y + 20 }, duration: 0.6, ease: Ease.easeOutQuad });
    subtitle.alpha = 0;
    TweenManager.to({ target: subtitle, props: { alpha: 1 }, duration: 0.5, delay: 0.15 });
  }

  onExit(): void {
    this._decorBalls = [];
  }

  private _createMenuButton(
    label: string,
    sublabel: string,
    x: number,
    y: number,
    color: [number, number],
    delay: number,
    onClick: () => void,
  ): void {
    const btn = new PIXI.Container();
    btn.x = x;
    btn.y = y;

    const bg = new PIXI.Graphics();
    // Main fill
    bg.beginFill(color[0], 0.92);
    bg.drawRoundedRect(-170, -38, 340, 76, 20);
    bg.endFill();
    // Bottom edge highlight
    bg.beginFill(color[1], 0.5);
    bg.drawRoundedRect(-170, 34, 340, 4, 20);
    bg.endFill();
    // Top inner glow
    bg.beginFill(0xFFFFFF, 0.08);
    bg.drawRoundedRect(-170, -38, 340, 20, 20);
    bg.endFill();
    btn.addChild(bg);

    const text = new PIXI.Text(label, new PIXI.TextStyle({
      fontSize: 30,
      fill: 0xFFFFFF,
      fontWeight: 'bold',
      fontFamily: 'Arial',
      letterSpacing: 2,
    }));
    text.anchor.set(0.5, 0.5);
    text.y = -6;
    btn.addChild(text);

    const sub = new PIXI.Text(sublabel, new PIXI.TextStyle({
      fontSize: 16,
      fill: 0xFFFFFF,
      fontFamily: 'Arial',
    }));
    sub.anchor.set(0.5, 0.5);
    sub.alpha = 0.65;
    sub.y = 18;
    btn.addChild(sub);

    btn.eventMode = 'static';
    btn.cursor = 'pointer';
    btn.on('pointerdown', onClick);

    btn.alpha = 0;
    btn.scale.set(0.85);
    TweenManager.to({ target: btn, props: { alpha: 1 }, duration: 0.4, delay });
    TweenManager.to({ target: btn.scale, props: { x: 1, y: 1 }, duration: 0.4, delay, ease: Ease.easeOutBack });

    this.container.addChild(btn);
  }

  private _createDecorBalls(): void {
    const W = Game.logicWidth;
    const H = Game.logicHeight;
    const positions = [
      { x: 70, y: H * 0.14, r: 18, c: 0, a: 0.18 },
      { x: W - 70, y: H * 0.11, r: 15, c: 1, a: 0.15 },
      { x: 110, y: H * 0.42, r: 13, c: 2, a: 0.12 },
      { x: W - 90, y: H * 0.39, r: 16, c: 3, a: 0.16 },
      { x: 55, y: H * 0.74, r: 11, c: 4, a: 0.12 },
      { x: W - 55, y: H * 0.77, r: 14, c: 5, a: 0.14 },
      { x: W / 2 - 140, y: H * 0.85, r: 10, c: 6, a: 0.10 },
      { x: W / 2 + 140, y: H * 0.87, r: 13, c: 0, a: 0.12 },
    ];

    for (const p of positions) {
      const ballSprite = new BallSprite(p.c, p.r);
      ballSprite.x = p.x;
      ballSprite.y = p.y;
      ballSprite.alpha = p.a;
      this.container.addChild(ballSprite);
      this._decorBalls.push(ballSprite);
    }
  }
}
