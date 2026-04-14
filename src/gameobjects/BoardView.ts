import * as PIXI from 'pixi.js';
import { BOARD_SIZE, CELL_GAP, BALL_COLORS, BALL_PALETTE, computeBoardLayout } from '@/config/GameConfig';
import { WILD_BALL, BOMB_BALL, isSpecialBall } from '@/config/PropConfig';
import { BallSprite } from './BallSprite';
import { BoardManager, type CellValue, type NewBall, type MoveResult } from '@/managers/BoardManager';
import { EventBus } from '@/core/EventBus';
import { TweenManager, Ease } from '@/core/TweenManager';
import { Game } from '@/core/Game';
import type { Point } from '@/systems/PathFinder';

export type BoardInteractionMode = 'normal' | 'removeBall';
export type BoardTheme = 'classic' | 'level';

export class BoardView extends PIXI.Container {
  private _cellSize = 72;
  private _boardPixelSize = 0;
  private _ballRadius = 0;
  private _theme: BoardTheme = 'classic';

  private _bgGraphics: PIXI.Graphics;
  private _ballContainer: PIXI.Container;
  private _overlayContainer: PIXI.Container;
  private _balls: (BallSprite | null)[][] = [];
  private _selectedPos: Point | null = null;
  private _isAnimating = false;

  private _interactionMode: BoardInteractionMode = 'normal';
  private _previewMarkers: PIXI.Graphics[] = [];

  constructor(theme: BoardTheme = 'classic') {
    super();
    this._theme = theme;

    this._bgGraphics = new PIXI.Graphics();
    this.addChild(this._bgGraphics);

    this._ballContainer = new PIXI.Container();
    this.addChild(this._ballContainer);

    this._overlayContainer = new PIXI.Container();
    this.addChild(this._overlayContainer);

    this._balls = Array.from({ length: BOARD_SIZE }, () =>
      Array(BOARD_SIZE).fill(null)
    );

    this._setupEvents();
  }

  layout(logicWidth: number, logicHeight: number, safeTop: number): void {
    const layoutOpts = this._theme === 'classic'
      ? { sidePadding: 10, maxCellSize: 100, bottomPadding: 130 }
      : undefined;
    const metrics = computeBoardLayout(logicWidth, logicHeight, safeTop, layoutOpts);
    this._cellSize = metrics.cellSize;
    this._boardPixelSize = metrics.boardPixelSize;
    this._ballRadius = Math.floor(this._cellSize * 0.40);

    this.x = metrics.boardX;
    this.y = metrics.boardY;

    this._drawBoard();
  }

  private _drawBoard(): void {
    if (this._theme === 'classic') {
      this._drawClassicBoard();
    } else {
      this._drawLevelBoard();
    }
  }

  /** Stone/slate textured board for classic mode */
  private _drawClassicBoard(): void {
    const g = this._bgGraphics;
    const size = this._boardPixelSize;
    const pad = 10;
    g.clear();

    // Outer stone frame - chiseled edge effect
    g.beginFill(0x4A5568);
    g.drawRoundedRect(-pad, -pad, size + pad * 2, size + pad * 2, 8);
    g.endFill();

    // Top-left bevel (light)
    g.beginFill(0x6B7B8D, 0.6);
    g.drawRoundedRect(-pad, -pad, size + pad * 2, 4, 8);
    g.endFill();
    g.beginFill(0x6B7B8D, 0.4);
    g.drawRoundedRect(-pad, -pad, 4, size + pad * 2, 8);
    g.endFill();

    // Bottom-right bevel (dark)
    g.beginFill(0x2D3748, 0.6);
    g.drawRoundedRect(-pad, size + pad - 4, size + pad * 2, 4, 8);
    g.endFill();
    g.beginFill(0x2D3748, 0.4);
    g.drawRoundedRect(size + pad - 4, -pad, 4, size + pad * 2, 8);
    g.endFill();

    // Inner board surface
    g.beginFill(0x3D4F5F);
    g.drawRoundedRect(0, 0, size, size, 4);
    g.endFill();

    for (let r = 0; r < BOARD_SIZE; r++) {
      for (let c = 0; c < BOARD_SIZE; c++) {
        const { x, y } = this._cellPos(r, c);
        const cs = this._cellSize;

        // Cell base with slight color variation for stone texture
        const shade = ((r + c) % 2 === 0) ? 0x2A3A4A : 0x283848;
        g.beginFill(shade);
        g.drawRoundedRect(x, y, cs, cs, 3);
        g.endFill();

        // Inner shadow (inset effect)
        g.beginFill(0x1A2A38, 0.4);
        g.drawRoundedRect(x, y, cs, 2, 3);
        g.endFill();
        g.beginFill(0x1A2A38, 0.3);
        g.drawRoundedRect(x, y, 2, cs, 3);
        g.endFill();

        // Bottom-right inner highlight
        g.beginFill(0x4A5A6A, 0.25);
        g.drawRoundedRect(x, y + cs - 2, cs, 2, 3);
        g.endFill();
        g.beginFill(0x4A5A6A, 0.15);
        g.drawRoundedRect(x + cs - 2, y, 2, cs, 3);
        g.endFill();
      }
    }
  }

  /** Bright, playful board for level mode */
  private _drawLevelBoard(): void {
    const g = this._bgGraphics;
    const size = this._boardPixelSize;
    const pad = 10;
    g.clear();

    // Soft rounded outer frame
    g.beginFill(0xE8D5B7, 0.85);
    g.drawRoundedRect(-pad, -pad, size + pad * 2, size + pad * 2, 14);
    g.endFill();

    // Light inner highlight
    g.beginFill(0xFFF8EE, 0.4);
    g.drawRoundedRect(-pad, -pad, size + pad * 2, 3, 14);
    g.endFill();

    // Inner board surface
    g.beginFill(0xF5EDE0);
    g.drawRoundedRect(0, 0, size, size, 6);
    g.endFill();

    for (let r = 0; r < BOARD_SIZE; r++) {
      for (let c = 0; c < BOARD_SIZE; c++) {
        const { x, y } = this._cellPos(r, c);
        const cs = this._cellSize;

        // Warm alternating cell colors
        const shade = ((r + c) % 2 === 0) ? 0xFAF3EA : 0xF0E6D6;
        g.beginFill(shade);
        g.drawRoundedRect(x, y, cs, cs, 5);
        g.endFill();

        // Soft inner shadow
        g.beginFill(0xD4C4A8, 0.3);
        g.drawRoundedRect(x, y, cs, 1.5, 5);
        g.endFill();
        g.beginFill(0xD4C4A8, 0.2);
        g.drawRoundedRect(x, y, 1.5, cs, 5);
        g.endFill();

        // Bottom inner glow
        g.beginFill(0xFFFFFF, 0.15);
        g.drawRoundedRect(x, y + cs - 1.5, cs, 1.5, 5);
        g.endFill();
      }
    }
  }

  private _cellPos(row: number, col: number): { x: number; y: number } {
    return {
      x: col * (this._cellSize + CELL_GAP),
      y: row * (this._cellSize + CELL_GAP),
    };
  }

  private _cellCenter(row: number, col: number): { x: number; y: number } {
    const pos = this._cellPos(row, col);
    return {
      x: pos.x + this._cellSize / 2,
      y: pos.y + this._cellSize / 2,
    };
  }

  private _posToCell(localX: number, localY: number): Point | null {
    for (let r = 0; r < BOARD_SIZE; r++) {
      for (let c = 0; c < BOARD_SIZE; c++) {
        const { x, y } = this._cellPos(r, c);
        if (localX >= x && localX < x + this._cellSize &&
            localY >= y && localY < y + this._cellSize) {
          return { row: r, col: c };
        }
      }
    }
    return null;
  }

  // ─── Interaction Mode ────────────────────────────────────

  setInteractionMode(mode: BoardInteractionMode): void {
    this._interactionMode = mode;
    if (mode === 'removeBall') {
      this._deselectBall();
      this._highlightAllBalls(true);
    } else {
      this._highlightAllBalls(false);
    }
  }

  get interactionMode(): BoardInteractionMode { return this._interactionMode; }

  private _highlightAllBalls(highlight: boolean): void {
    for (let r = 0; r < BOARD_SIZE; r++) {
      for (let c = 0; c < BOARD_SIZE; c++) {
        const ball = this._balls[r][c];
        if (ball) {
          ball.alpha = highlight ? 0.8 : 1;
        }
      }
    }
  }

  // ─── Position Preview ────────────────────────────────────

  showPositionPreview(positions: Point[], colors: number[]): void {
    this.clearPositionPreview();
    for (let i = 0; i < positions.length && i < colors.length; i++) {
      const pos = positions[i];
      const color = colors[i];
      const center = this._cellCenter(pos.row, pos.col);

      const marker = new PIXI.Graphics();
      const displayColor = color === WILD_BALL ? 0xFFFFFF
        : color === BOMB_BALL ? 0xF39C12
        : (BALL_COLORS[color] ?? 0xCCCCCC);

      marker.beginFill(displayColor, 0.35);
      marker.drawCircle(0, 0, this._ballRadius);
      marker.endFill();

      marker.lineStyle(2, displayColor, 0.6);
      marker.drawCircle(0, 0, this._ballRadius + 2);
      marker.lineStyle(0);

      marker.x = center.x;
      marker.y = center.y;
      this._overlayContainer.addChild(marker);
      this._previewMarkers.push(marker);

      TweenManager.to({
        target: marker,
        props: { alpha: 0.5 },
        duration: 0.6,
        ease: Ease.easeInOutQuad,
      });
    }
  }

  clearPositionPreview(): void {
    for (const m of this._previewMarkers) {
      this._overlayContainer.removeChild(m);
      m.destroy();
    }
    this._previewMarkers = [];
  }

  // ─── Events ──────────────────────────────────────────────

  private _setupEvents(): void {
    this.eventMode = 'static';
    this.cursor = 'pointer';

    this.on('pointerdown', (e: PIXI.FederatedPointerEvent) => {
      if (this._isAnimating) return;

      const local = this.toLocal(e.global);
      const cell = this._posToCell(local.x, local.y);
      if (!cell) return;

      if (this._interactionMode === 'removeBall') {
        this._handleRemoveBall(cell);
        return;
      }

      const grid = BoardManager.grid;
      const cellValue = grid[cell.row][cell.col];

      if (this._selectedPos === null) {
        if (cellValue !== null) {
          this._selectBall(cell);
        }
      } else {
        if (cellValue !== null) {
          this._deselectBall();
          this._selectBall(cell);
        } else {
          this._tryMove(this._selectedPos, cell);
        }
      }
    });
  }

  private _handleRemoveBall(pos: Point): void {
    const grid = BoardManager.grid;
    if (grid[pos.row][pos.col] === null) return;

    const success = BoardManager.removeBallAt(pos);
    if (success) {
      const ball = this._balls[pos.row][pos.col];
      if (ball) {
        ball.animateEliminate(() => {
          this._ballContainer.removeChild(ball);
          ball.destroy();
        });
        this._balls[pos.row][pos.col] = null;
      }
      this.setInteractionMode('normal');
      EventBus.emit('prop:removeBallDone');
    }
  }

  private _selectBall(pos: Point): void {
    this._selectedPos = pos;
    const ball = this._balls[pos.row][pos.col];
    ball?.setSelected(true);
    EventBus.emit('board:selected', pos);
  }

  private _deselectBall(): void {
    if (this._selectedPos) {
      const ball = this._balls[this._selectedPos.row][this._selectedPos.col];
      ball?.setSelected(false);
      this._selectedPos = null;
    }
  }

  private async _tryMove(from: Point, to: Point): Promise<void> {
    this._isAnimating = true;
    this._deselectBall();
    this.clearPositionPreview();

    const result = BoardManager.moveBall(from, to);

    if (!result.moved) {
      this._isAnimating = false;
      this._flashCell(to);
      return;
    }

    if (result.path) {
      await this._animateMove(from, to, result.path);
    }

    if (result.eliminated.length > 0) {
      await this._animateElimination(result.eliminated);
    }

    if (result.newBalls.length > 0) {
      this._spawnBallSprites(result.newBalls);
    }

    if (result.autoEliminated && result.autoEliminated.length > 0) {
      await this._animateElimination(result.autoEliminated);
    }

    if (result.score > 0) {
      EventBus.emit('ui:scoreChanged', BoardManager.score, result.score);
    }

    if (result.gameOver) {
      EventBus.emit('ui:gameOver', BoardManager.score);
    }

    this._isAnimating = false;
  }

  private _flashCell(pos: Point): void {
    const { x, y } = this._cellPos(pos.row, pos.col);
    const flash = new PIXI.Graphics();
    flash.beginFill(0xFF0000, 0.3);
    flash.drawRoundedRect(x, y, this._cellSize, this._cellSize, 4);
    flash.endFill();
    this.addChild(flash);

    TweenManager.to({
      target: flash,
      props: { alpha: 0 },
      duration: 0.4,
      onComplete: () => {
        this.removeChild(flash);
        flash.destroy();
      },
    });
  }

  private _animateMove(from: Point, to: Point, path: Point[]): Promise<void> {
    return new Promise((resolve) => {
      const ball = this._balls[from.row][from.col];
      if (!ball) { resolve(); return; }

      this._balls[from.row][from.col] = null;
      this._balls[to.row][to.col] = ball;

      let stepIndex = 1;
      const moveNext = () => {
        if (stepIndex >= path.length) {
          resolve();
          return;
        }
        const nextPos = path[stepIndex];
        const center = this._cellCenter(nextPos.row, nextPos.col);

        TweenManager.to({
          target: ball,
          props: { x: center.x, y: center.y },
          duration: 0.04,
          ease: Ease.linear,
          onComplete: () => {
            stepIndex++;
            moveNext();
          },
        });
      };
      moveNext();
    });
  }

  private _animateElimination(eliminated: Point[]): Promise<void> {
    return new Promise((resolve) => {
      if (eliminated.length === 0) { resolve(); return; }

      const sorted = [...eliminated].sort((a, b) =>
        a.row !== b.row ? a.row - b.row : a.col - b.col
      );

      let remaining = sorted.length;
      const STAGGER = 0.05;

      sorted.forEach((pos, i) => {
        const ball = this._balls[pos.row][pos.col];
        if (!ball) {
          remaining--;
          if (remaining === 0) { this._boardShake(); resolve(); }
          return;
        }

        const center = this._cellCenter(pos.row, pos.col);
        const palette = BALL_PALETTE[ball.colorIndex];
        const mainColor = palette ? palette[0] : 0xFFFFFF;
        const hiColor = palette ? palette[1] : 0xFFFFFF;
        const delay = i * STAGGER;

        const trigger = { _v: 0 };
        TweenManager.to({
          target: trigger,
          props: { _v: 1 },
          duration: 0.001,
          delay,
          onComplete: () => {
            this._spawnFlash(center);
            this._flashEliminateCell(pos, mainColor);
            this._spawnShockwave(center, mainColor);
            this._spawnEliminateParticles(center, mainColor, hiColor);

            ball.animateEliminate(() => {
              this._ballContainer.removeChild(ball);
              ball.destroy();
              this._balls[pos.row][pos.col] = null;
              remaining--;
              if (remaining === 0) {
                this._boardShake();
                resolve();
              }
            });
          },
        });
      });
    });
  }

  /** White burst flash at elimination point */
  private _spawnFlash(center: { x: number; y: number }): void {
    const flash = new PIXI.Graphics();
    flash.beginFill(0xFFFFFF, 0.75);
    flash.drawCircle(0, 0, this._cellSize * 0.45);
    flash.endFill();
    flash.x = center.x;
    flash.y = center.y;
    this._overlayContainer.addChild(flash);

    TweenManager.to({
      target: flash.scale,
      props: { x: 2.2, y: 2.2 },
      duration: 0.22,
      ease: Ease.easeOutQuad,
    });
    TweenManager.to({
      target: flash,
      props: { alpha: 0 },
      duration: 0.25,
      onComplete: () => {
        this._overlayContainer.removeChild(flash);
        flash.destroy();
      },
    });
  }

  /** Colored glow behind the ball on the cell */
  private _flashEliminateCell(pos: Point, color: number): void {
    const { x, y } = this._cellPos(pos.row, pos.col);
    const glow = new PIXI.Graphics();
    glow.beginFill(color, 0.45);
    glow.drawRoundedRect(x, y, this._cellSize, this._cellSize, 4);
    glow.endFill();

    const idx = this.getChildIndex(this._ballContainer);
    this.addChildAt(glow, idx);

    TweenManager.to({
      target: glow,
      props: { alpha: 0 },
      duration: 0.45,
      ease: Ease.easeOutQuad,
      onComplete: () => {
        this.removeChild(glow);
        glow.destroy();
      },
    });
  }

  /** Expanding colored ring */
  private _spawnShockwave(center: { x: number; y: number }, color: number): void {
    const ring = new PIXI.Graphics();
    ring.lineStyle(2.5, color, 0.7);
    ring.drawCircle(0, 0, this._cellSize * 0.35);
    ring.x = center.x;
    ring.y = center.y;
    this._overlayContainer.addChild(ring);

    TweenManager.to({
      target: ring.scale,
      props: { x: 2.8, y: 2.8 },
      duration: 0.35,
      ease: Ease.easeOutQuad,
    });
    TweenManager.to({
      target: ring,
      props: { alpha: 0 },
      duration: 0.38,
      onComplete: () => {
        this._overlayContainer.removeChild(ring);
        ring.destroy();
      },
    });
  }

  /** Burst of small colored dots flying outward */
  private _spawnEliminateParticles(
    center: { x: number; y: number },
    mainColor: number,
    hiColor: number,
  ): void {
    const count = 8;
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 / count) * i + (Math.random() - 0.5) * 0.6;
      const dist = 35 + Math.random() * 50;
      const size = 2 + Math.random() * 2.5;
      const color = Math.random() > 0.4 ? mainColor : hiColor;

      const p = new PIXI.Graphics();
      p.beginFill(color);
      p.drawCircle(0, 0, size);
      p.endFill();
      p.beginFill(0xFFFFFF, 0.55);
      p.drawCircle(0, 0, size * 0.35);
      p.endFill();

      p.x = center.x;
      p.y = center.y;
      this._overlayContainer.addChild(p);

      const dur = 0.28 + Math.random() * 0.18;
      TweenManager.to({
        target: p,
        props: {
          x: center.x + Math.cos(angle) * dist,
          y: center.y + Math.sin(angle) * dist,
        },
        duration: dur,
        ease: Ease.easeOutQuad,
      });
      TweenManager.to({
        target: p.scale,
        props: { x: 0.15, y: 0.15 },
        duration: dur + 0.05,
      });
      TweenManager.to({
        target: p,
        props: { alpha: 0 },
        duration: dur + 0.03,
        onComplete: () => {
          this._overlayContainer.removeChild(p);
          p.destroy();
        },
      });
    }
  }

  /** Quick board shake for impact feedback */
  private _boardShake(): void {
    const ox = this.x;
    const oy = this.y;
    const amp = 5;

    TweenManager.to({
      target: this,
      props: { x: ox + amp, y: oy - amp * 0.5 },
      duration: 0.035,
      onComplete: () => {
        TweenManager.to({
          target: this,
          props: { x: ox - amp, y: oy + amp * 0.3 },
          duration: 0.035,
          onComplete: () => {
            TweenManager.to({
              target: this,
              props: { x: ox + amp * 0.4, y: oy - amp * 0.2 },
              duration: 0.03,
              onComplete: () => {
                TweenManager.to({
                  target: this,
                  props: { x: ox, y: oy },
                  duration: 0.04,
                  ease: Ease.easeOutQuad,
                });
              },
            });
          },
        });
      },
    });
  }

  private _spawnBallSprites(newBalls: NewBall[]): void {
    for (const ball of newBalls) {
      const center = this._cellCenter(ball.position.row, ball.position.col);
      const sprite = new BallSprite(ball.color, this._ballRadius);
      sprite.x = center.x;
      sprite.y = center.y;
      this._ballContainer.addChild(sprite);
      this._balls[ball.position.row][ball.position.col] = sprite;
      sprite.animateAppear();
    }
  }

  syncWithBoard(): void {
    for (let r = 0; r < BOARD_SIZE; r++) {
      for (let c = 0; c < BOARD_SIZE; c++) {
        const ball = this._balls[r][c];
        if (ball) {
          this._ballContainer.removeChild(ball);
          ball.destroy();
          this._balls[r][c] = null;
        }
      }
    }

    const grid = BoardManager.grid;
    for (let r = 0; r < BOARD_SIZE; r++) {
      for (let c = 0; c < BOARD_SIZE; c++) {
        if (grid[r][c] !== null) {
          const center = this._cellCenter(r, c);
          const sprite = new BallSprite(grid[r][c]!, this._ballRadius);
          sprite.x = center.x;
          sprite.y = center.y;
          this._ballContainer.addChild(sprite);
          this._balls[r][c] = sprite;
        }
      }
    }

    this.clearPositionPreview();
    this._interactionMode = 'normal';
  }

  get cellSize(): number { return this._cellSize; }
  get boardPixelSize(): number { return this._boardPixelSize; }
}
