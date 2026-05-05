import * as PIXI from 'pixi.js';
import { Game } from '@/core/Game';
import { SceneManager, type Scene } from '@/core/SceneManager';
import { TweenManager, Ease } from '@/core/TweenManager';
import { Platform } from '@/core/PlatformService';
import { LevelManager } from '@/managers/LevelManager';
import { TOTAL_LEVELS } from '@/config/LevelConfig';
import { createBgSprite } from '@/utils/bgHelper';
import { addImageSprite, loadImageTexture } from '@/utils/imageTexture';

const NODE_SIZE = 64;
const CURRENT_NODE_SIZE = 76;
const STAR_SIZE = 32;
const LEVELS_PER_PAGE = 15;
const ENABLE_LEVEL_NODE_EDITOR = false;

const PAGE_POINTS: readonly { x: number; y: number }[] = [
  { x: 0.115, y: 0.889 },
  { x: 0.324, y: 0.820 },
  { x: 0.605, y: 0.800 },
  { x: 0.892, y: 0.757 },
  { x: 0.791, y: 0.648 },
  { x: 0.469, y: 0.624 },
  { x: 0.179, y: 0.602 },
  { x: 0.256, y: 0.496 },
  { x: 0.543, y: 0.483 },
  { x: 0.765, y: 0.453 },
  { x: 0.662, y: 0.390 },
  { x: 0.396, y: 0.368 },
  { x: 0.135, y: 0.333 },
  { x: 0.335, y: 0.269 },
  { x: 0.610, y: 0.240 },
];

export class LevelSelectScene implements Scene {
  readonly name = 'levelSelect';
  readonly container = new PIXI.Container();
  private _page = 0;
  private _draggingCell: PIXI.Container | null = null;
  private _dragStart = { x: 0, y: 0 };
  private _dragCellStart = { x: 0, y: 0 };
  private _editableCells: PIXI.Container[] = [];
  private _nativeTouchBound = false;

  onEnter(): void {
    this.container.removeChildren();
    this._unbindNativeEditorTouch();
    this._editableCells = [];
    this.container.eventMode = 'static';
    this.container.hitArea = new PIXI.Rectangle(0, 0, Game.logicWidth, Game.logicHeight);
    const W = Game.logicWidth;
    const H = Game.logicHeight;

    const bg = createBgSprite('subpkg_assets/images/level_select_bg.jpg', W, H, 0x2AC6E9);
    this.container.addChild(bg);

    const backBtn = this._createBackButton();
    backBtn.x = 24;
    backBtn.y = Game.safeTop + 22;
    this.container.addChild(backBtn);

    this._createTitlePanel(W / 2, Game.safeTop + 12);
    this._createStarCounter(W - 156, Game.safeTop + 74);

    const pageStart = this._page * LEVELS_PER_PAGE;
    const pageEnd = Math.min(pageStart + LEVELS_PER_PAGE, TOTAL_LEVELS);
    for (let i = pageStart; i < pageEnd; i++) {
      const point = PAGE_POINTS[i - pageStart] ?? PAGE_POINTS[PAGE_POINTS.length - 1];
      const cell = this._createLevelCell(i + 1, W * point.x, H * point.y, i - pageStart);
      (cell as any).__levelId = i + 1;
      this._editableCells.push(cell);
      this.container.addChild(cell);
    }

    this._createPageButtons(W, H);
    if (ENABLE_LEVEL_NODE_EDITOR) {
      this._bindNativeEditorTouch();
    }
  }

  onExit(): void {
    this._unbindNativeEditorTouch();
  }

  private _createTitlePanel(x: number, y: number): void {
    const panel = new PIXI.Container();
    panel.x = x;
    panel.y = y;

    addImageSprite(panel, 'subpkg_assets/images/level_select_title.png', (sprite) => {
      sprite.anchor.set(0.5, 0);
      sprite.width = 420;
      sprite.height = 150;
    });
    this.container.addChild(panel);
  }

  private _createStarCounter(x: number, y: number): void {
    const counter = new PIXI.Container();
    counter.x = x;
    counter.y = y;

    const bg = new PIXI.Graphics();
    bg.beginFill(0x186AC0, 0.82);
    bg.drawRoundedRect(0, 0, 128, 48, 14);
    bg.endFill();
    bg.lineStyle(3, 0x7FE8FF, 0.9);
    bg.drawRoundedRect(0, 0, 128, 48, 14);
    counter.addChild(bg);

    addImageSprite(counter, 'subpkg_assets/images/level_select_star.png', (sprite) => {
      sprite.anchor.set(0.5, 0.5);
      sprite.width = 38;
      sprite.height = 38;
      sprite.x = 26;
      sprite.y = 24;
    });

    const text = new PIXI.Text(String(LevelManager.getTotalStars()), new PIXI.TextStyle({
      fontSize: 24,
      fill: 0xFFFFFF,
      stroke: 0x18477E,
      strokeThickness: 4,
      fontWeight: 'bold',
      fontFamily: 'Arial',
    }));
    text.anchor.set(0, 0.5);
    text.x = 52;
    text.y = 25;
    counter.addChild(text);
    this.container.addChild(counter);
  }

  private _createPageButtons(W: number, H: number): void {
    const totalPages = Math.ceil(TOTAL_LEVELS / LEVELS_PER_PAGE);
    if (this._page < totalPages - 1) {
      const next = this._createPageButton('next');
      next.x = W - 108;
      next.y = H * 0.52;
      this.container.addChild(next);
    }

    if (this._page > 0) {
      const prev = this._createPageButton('prev');
      prev.x = 20;
      prev.y = H * 0.52;
      this.container.addChild(prev);
    }
  }

  private _createPageButton(direction: 'prev' | 'next'): PIXI.Container {
    const btn = new PIXI.Container();
    btn.eventMode = 'static';
    btn.cursor = 'pointer';
    btn.hitArea = new PIXI.Circle(43, 43, 43);

    addImageSprite(btn, direction === 'next' ? 'subpkg_assets/images/level_page_next.png' : 'subpkg_assets/images/level_page_prev.png', (sprite) => {
      sprite.width = 86;
      sprite.height = 86;
    });

    btn.on('pointerdown', () => {
      this._page += direction === 'next' ? 1 : -1;
      this.onEnter();
    });

    return btn;
  }

  private _createLevelCell(levelId: number, x: number, y: number, index: number): PIXI.Container {
    const cell = new PIXI.Container();
    cell.x = x;
    cell.y = y;

    const unlocked = LevelManager.isUnlocked(levelId);
    const stars = LevelManager.getStars(levelId);
    const isNext = levelId === LevelManager.maxUnlocked && stars === 0;
    const size = isNext ? CURRENT_NODE_SIZE : NODE_SIZE;
    const assetPath = !unlocked
      ? 'subpkg_assets/images/level_node_locked.png'
      : isNext ? 'subpkg_assets/images/level_node_current.png' : 'subpkg_assets/images/level_node_completed.png';

    loadImageTexture(assetPath).then((texture) => {
      if (!texture || cell.destroyed) return;
      const sprite = new PIXI.Sprite(texture);
      sprite.anchor.set(0.5, 0.5);
      sprite.width = size;
      sprite.height = size;
      cell.addChildAt(sprite, 0);
    });

    if (unlocked) {
      const numText = new PIXI.Text(String(levelId), new PIXI.TextStyle({
        fontSize: isNext ? 34 : 30,
        fill: 0xFFFFFF,
        stroke: isNext ? 0x9B6500 : 0x0962A8,
        strokeThickness: 5,
        fontWeight: 'bold',
        fontFamily: 'Arial',
      }));
      numText.anchor.set(0.5, 0.5);
      numText.y = -2;
      cell.addChild(numText);

      for (let s = 0; s < 3; s++) {
        const starHolder = new PIXI.Container();
        starHolder.x = (s - 1) * (STAR_SIZE * 0.62);
        starHolder.y = size * 0.62;
        starHolder.alpha = s < stars ? 1 : 0.25;
        addImageSprite(starHolder, 'subpkg_assets/images/level_select_star.png', (sprite) => {
          sprite.anchor.set(0.5, 0.5);
          sprite.width = STAR_SIZE;
          sprite.height = STAR_SIZE;
        });
        cell.addChild(starHolder);
      }

      cell.eventMode = 'static';
      cell.cursor = 'pointer';
      cell.hitArea = new PIXI.Circle(0, 0, size * 0.75);
      cell.on('pointerdown', (event) => {
        if (ENABLE_LEVEL_NODE_EDITOR) {
          this._startDrag(cell, event);
          return;
        }
        LevelManager.currentLevelId = levelId;
        SceneManager.switchTo('level');
      });
    } else {
      const numText = new PIXI.Text(String(levelId), new PIXI.TextStyle({
        fontSize: 28,
        fill: 0xF9FAFB,
        stroke: 0x6B7280,
        strokeThickness: 4,
        fontWeight: 'bold',
        fontFamily: 'Arial',
      }));
      numText.anchor.set(0.5, 0.5);
      numText.y = -2;
      cell.addChild(numText);
      this._drawLock(cell, size);
      if (ENABLE_LEVEL_NODE_EDITOR) {
        cell.eventMode = 'static';
        cell.cursor = 'grab';
        cell.hitArea = new PIXI.Circle(0, 0, size * 0.75);
        cell.on('pointerdown', (event) => this._startDrag(cell, event));
      }
    }

    cell.alpha = 0;
    cell.scale.set(0.85);
    TweenManager.to({ target: cell, props: { alpha: 1 }, duration: 0.3, delay: index * 0.025 });
    TweenManager.to({ target: cell.scale, props: { x: 1, y: 1 }, duration: 0.3, delay: index * 0.025, ease: Ease.easeOutBack });

    return cell;
  }

  private _startDrag(cell: PIXI.Container, event: PIXI.FederatedPointerEvent): void {
    event.stopPropagation();
    this._draggingCell = cell;
    this._dragStart = { x: event.global.x, y: event.global.y };
    this._dragCellStart = { x: cell.x, y: cell.y };
    cell.cursor = 'grabbing';
    cell.zIndex = 1000;
    this.container.sortableChildren = true;
    const stage = Game.stage ?? this.container;
    stage.eventMode = 'static';
    stage.hitArea = new PIXI.Rectangle(0, 0, Game.logicWidth, Game.logicHeight);
    stage.on('pointermove', this._onDragMove);
    stage.on('pointerup', this._onDragEnd);
    stage.on('pointerupoutside', this._onDragEnd);
  }

  private _onDragMove = (event: PIXI.FederatedPointerEvent): void => {
    if (!this._draggingCell) return;
    this._draggingCell.x = this._dragCellStart.x + event.global.x - this._dragStart.x;
    this._draggingCell.y = this._dragCellStart.y + event.global.y - this._dragStart.y;
  };

  private _onDragEnd = (): void => {
    if (!this._draggingCell) return;
    const cell = this._draggingCell;
    cell.cursor = 'grab';
    const levelId = (cell as any).__levelId as number;
    console.log(
      `[LevelNodeEditor] level ${levelId}: { x: ${(cell.x / Game.logicWidth).toFixed(3)}, y: ${(cell.y / Game.logicHeight).toFixed(3)} }`,
    );
    this._draggingCell = null;
    const stage = Game.stage ?? this.container;
    stage.off('pointermove', this._onDragMove);
    stage.off('pointerup', this._onDragEnd);
    stage.off('pointerupoutside', this._onDragEnd);
  };

  private _bindNativeEditorTouch(): void {
    const api = Platform.api;
    if (this._nativeTouchBound || !api?.onTouchStart || !api?.onTouchMove || !api?.onTouchEnd) return;
    api.onTouchStart(this._onNativeTouchStart);
    api.onTouchMove(this._onNativeTouchMove);
    api.onTouchEnd(this._onNativeTouchEnd);
    api.onTouchCancel?.(this._onNativeTouchEnd);
    this._nativeTouchBound = true;
    console.log('[LevelNodeEditor] native touch editor enabled');
  }

  private _unbindNativeEditorTouch(): void {
    const api = Platform.api;
    if (!this._nativeTouchBound || !api) return;
    api.offTouchStart?.(this._onNativeTouchStart);
    api.offTouchMove?.(this._onNativeTouchMove);
    api.offTouchEnd?.(this._onNativeTouchEnd);
    api.offTouchCancel?.(this._onNativeTouchEnd);
    this._nativeTouchBound = false;
  }

  private _onNativeTouchStart = (event: any): void => {
    const pos = this._nativeTouchToLogic(event);
    if (!pos) return;

    const cell = this._findCellAt(pos.x, pos.y);
    if (!cell) return;

    this._draggingCell = cell;
    this._dragStart = pos;
    this._dragCellStart = { x: cell.x, y: cell.y };
    cell.zIndex = 1000;
    this.container.sortableChildren = true;
    console.log(`[LevelNodeEditor] drag start level ${(cell as any).__levelId}`);
  };

  private _onNativeTouchMove = (event: any): void => {
    if (!this._draggingCell) return;
    const pos = this._nativeTouchToLogic(event);
    if (!pos) return;
    this._draggingCell.x = this._dragCellStart.x + pos.x - this._dragStart.x;
    this._draggingCell.y = this._dragCellStart.y + pos.y - this._dragStart.y;
  };

  private _onNativeTouchEnd = (): void => {
    if (!this._draggingCell) return;
    const cell = this._draggingCell;
    const levelId = (cell as any).__levelId as number;
    console.log(
      `[LevelNodeEditor] level ${levelId}: { x: ${(cell.x / Game.logicWidth).toFixed(3)}, y: ${(cell.y / Game.logicHeight).toFixed(3)} }`,
    );
    this._draggingCell = null;
  };

  private _nativeTouchToLogic(event: any): { x: number; y: number } | null {
    const touch = event?.touches?.[0] ?? event?.changedTouches?.[0];
    if (!touch) return null;
    return {
      x: (touch.clientX / Game.screenWidth) * Game.logicWidth,
      y: (touch.clientY / Game.screenHeight) * Game.logicHeight,
    };
  }

  private _findCellAt(x: number, y: number): PIXI.Container | null {
    let best: PIXI.Container | null = null;
    let bestDist = Number.POSITIVE_INFINITY;
    for (const cell of this._editableCells) {
      const dx = cell.x - x;
      const dy = cell.y - y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < bestDist) {
        best = cell;
        bestDist = dist;
      }
    }
    return bestDist <= 70 ? best : null;
  }

  private _drawLock(parent: PIXI.Container, nodeSize: number): void {
    const lock = new PIXI.Graphics();
    lock.lineStyle(4, 0xF2F6FA, 1);
    lock.arc(0, -4, 16, Math.PI, Math.PI * 2);
    lock.beginFill(0xE8EEF5, 1);
    lock.drawRoundedRect(-20, -2, 40, 30, 7);
    lock.endFill();
    lock.lineStyle(0);
    lock.beginFill(0x6E7782, 1);
    lock.drawCircle(0, 10, 4);
    lock.drawRect(-2, 11, 4, 8);
    lock.endFill();
    lock.x = 0;
    lock.y = nodeSize * 0.32;
    parent.addChild(lock);
  }

  private _createBackButton(): PIXI.Container {
    const btn = new PIXI.Container();
    btn.eventMode = 'static';
    btn.cursor = 'pointer';

    addImageSprite(btn, 'subpkg_assets/images/classic_back_button.png', (sprite) => {
      sprite.width = 74;
      sprite.height = 74;
    });
    btn.hitArea = new PIXI.Circle(37, 37, 37);

    btn.on('pointerdown', () => SceneManager.switchTo('home'));
    return btn;
  }
}
