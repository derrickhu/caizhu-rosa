import * as PIXI from 'pixi.js';
import { Game } from '@/core/Game';
import { SceneManager, type Scene } from '@/core/SceneManager';
import { TweenManager, Ease } from '@/core/TweenManager';
import { LevelManager } from '@/managers/LevelManager';
import { TOTAL_LEVELS, LEVELS } from '@/config/LevelConfig';
import { createBgSprite } from '@/utils/bgHelper';

const COLS = 5;
const CELL_W = 100;
const CELL_H = 100;
const GAP = 14;

const STAR_FILLED = 0xF59E0B;
const STAR_EMPTY_COLOR = 0xD1D5DB;

export class LevelSelectScene implements Scene {
  readonly name = 'levelSelect';
  readonly container = new PIXI.Container();

  onEnter(): void {
    this.container.removeChildren();
    const W = Game.logicWidth;
    const H = Game.logicHeight;

    // Background — warm bright
    const bg = createBgSprite('images/bg_level.jpg', W, H, 0xE8F4F8);
    this.container.addChild(bg);

    // Back button
    const backBtn = this._createBackButton();
    backBtn.x = 16;
    backBtn.y = Game.safeTop + 12;
    this.container.addChild(backBtn);

    // Title
    const title = new PIXI.Text('关卡模式', new PIXI.TextStyle({
      fontSize: 38, fill: 0x1F2937, fontWeight: 'bold', fontFamily: 'Arial', letterSpacing: 3,
    }));
    title.anchor.set(0.5, 0);
    title.x = W / 2;
    title.y = Game.safeTop + 10;
    this.container.addChild(title);

    // Total stars
    const totalStars = LevelManager.getTotalStars();
    const maxStars = TOTAL_LEVELS * 3;
    const starInfo = new PIXI.Text(`★ ${totalStars} / ${maxStars}`, new PIXI.TextStyle({
      fontSize: 22, fill: STAR_FILLED, fontWeight: 'bold', fontFamily: 'Arial',
    }));
    starInfo.anchor.set(0.5, 0);
    starInfo.x = W / 2;
    starInfo.y = Game.safeTop + 56;
    this.container.addChild(starInfo);

    // Grid
    const gridWidth = COLS * CELL_W + (COLS - 1) * GAP;
    const gridStartX = (W - gridWidth) / 2;
    const gridStartY = Game.safeTop + 100;

    for (let i = 0; i < TOTAL_LEVELS; i++) {
      const levelDef = LEVELS[i];
      const row = Math.floor(i / COLS);
      const col = i % COLS;
      const x = gridStartX + col * (CELL_W + GAP);
      const y = gridStartY + row * (CELL_H + GAP);
      const cell = this._createLevelCell(levelDef.id, x, y, i);
      this.container.addChild(cell);
    }
  }

  private _createLevelCell(levelId: number, x: number, y: number, index: number): PIXI.Container {
    const cell = new PIXI.Container();
    cell.x = x;
    cell.y = y;

    const unlocked = LevelManager.isUnlocked(levelId);
    const stars = LevelManager.getStars(levelId);
    const isNext = levelId === LevelManager.maxUnlocked && stars === 0;

    const bg = new PIXI.Graphics();

    if (!unlocked) {
      // Locked — faded
      bg.beginFill(0xF3F4F6, 0.7);
      bg.drawRoundedRect(0, 0, CELL_W, CELL_H, 14);
      bg.endFill();
      bg.lineStyle(1.5, 0xE5E7EB);
      bg.drawRoundedRect(0, 0, CELL_W, CELL_H, 14);
    } else if (isNext) {
      // Next to play — highlighted
      bg.beginFill(0xFFFFFF, 0.95);
      bg.drawRoundedRect(0, 0, CELL_W, CELL_H, 14);
      bg.endFill();
      bg.lineStyle(2.5, 0x3B82F6);
      bg.drawRoundedRect(0, 0, CELL_W, CELL_H, 14);
    } else if (stars > 0) {
      // Completed
      bg.beginFill(0xFFFFFF, 0.92);
      bg.drawRoundedRect(0, 0, CELL_W, CELL_H, 14);
      bg.endFill();
      bg.lineStyle(1.5, 0x86EFAC);
      bg.drawRoundedRect(0, 0, CELL_W, CELL_H, 14);
    } else {
      // Unlocked but not played
      bg.beginFill(0xFFFFFF, 0.9);
      bg.drawRoundedRect(0, 0, CELL_W, CELL_H, 14);
      bg.endFill();
      bg.lineStyle(1.5, 0xD1D5DB);
      bg.drawRoundedRect(0, 0, CELL_W, CELL_H, 14);
    }
    cell.addChild(bg);

    if (unlocked) {
      // Level number
      const numText = new PIXI.Text(String(levelId), new PIXI.TextStyle({
        fontSize: 30,
        fill: isNext ? 0x2563EB : (stars > 0 ? 0x059669 : 0x374151),
        fontWeight: 'bold',
        fontFamily: 'Arial',
      }));
      numText.anchor.set(0.5, 0.5);
      numText.x = CELL_W / 2;
      numText.y = CELL_H / 2 - 10;
      cell.addChild(numText);

      // Stars row
      const starY = CELL_H - 20;
      const starSpacing = 18;
      const starStartX = CELL_W / 2 - starSpacing;
      for (let s = 0; s < 3; s++) {
        const starText = new PIXI.Text('★', new PIXI.TextStyle({
          fontSize: 14,
          fill: s < stars ? STAR_FILLED : STAR_EMPTY_COLOR,
          fontFamily: 'Arial',
        }));
        starText.anchor.set(0.5, 0.5);
        starText.x = starStartX + s * starSpacing;
        starText.y = starY;
        cell.addChild(starText);
      }

      // Type badge
      const levelDef = LEVELS[levelId - 1];
      if (levelDef) {
        const badgeLabel = levelDef.type === 'timed' ? '⏱' : '👣';
        const badge = new PIXI.Text(badgeLabel, new PIXI.TextStyle({
          fontSize: 12, fill: 0x9CA3AF, fontFamily: 'Arial',
        }));
        badge.anchor.set(1, 0);
        badge.x = CELL_W - 8;
        badge.y = 6;
        cell.addChild(badge);
      }

      cell.eventMode = 'static';
      cell.cursor = 'pointer';
      cell.on('pointerdown', () => {
        LevelManager.currentLevelId = levelId;
        SceneManager.switchTo('level');
      });
    } else {
      const lock = new PIXI.Text('🔒', new PIXI.TextStyle({
        fontSize: 24, fontFamily: 'Arial',
      }));
      lock.anchor.set(0.5, 0.5);
      lock.x = CELL_W / 2;
      lock.y = CELL_H / 2;
      lock.alpha = 0.5;
      cell.addChild(lock);
    }

    // Entrance animation
    cell.alpha = 0;
    cell.scale.set(0.85);
    TweenManager.to({ target: cell, props: { alpha: 1 }, duration: 0.3, delay: index * 0.025 });
    TweenManager.to({ target: cell.scale, props: { x: 1, y: 1 }, duration: 0.3, delay: index * 0.025, ease: Ease.easeOutBack });

    return cell;
  }

  private _createBackButton(): PIXI.Container {
    const btn = new PIXI.Container();
    btn.eventMode = 'static';
    btn.cursor = 'pointer';

    const bg = new PIXI.Graphics();
    bg.beginFill(0xFFFFFF, 0.85);
    bg.drawRoundedRect(0, 0, 80, 38, 10);
    bg.endFill();
    bg.lineStyle(1.5, 0xD1D5DB);
    bg.drawRoundedRect(0, 0, 80, 38, 10);
    btn.addChild(bg);

    const text = new PIXI.Text('← 返回', new PIXI.TextStyle({
      fontSize: 18, fill: 0x4B5563, fontWeight: 'bold', fontFamily: 'Arial',
    }));
    text.anchor.set(0.5, 0.5);
    text.x = 40;
    text.y = 19;
    btn.addChild(text);

    btn.on('pointerdown', () => SceneManager.switchTo('home'));
    return btn;
  }
}
