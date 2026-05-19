import * as PIXI from 'pixi.js';
import { BOARD_SIZE, CELL_GAP, BALL_PALETTE, computeBoardLayout, scoreForLine } from '@/config/GameConfig';
import { BallSprite } from './BallSprite';
import { BoardManager, type ChangedPiece, type NewBall, type PropClearResult } from '@/managers/BoardManager';
import { EventBus } from '@/core/EventBus';
import { TweenManager, Ease } from '@/core/TweenManager';
import { Game } from '@/core/Game';
import type { Point } from '@/systems/PathFinder';
import { loadImageTexture } from '@/utils/imageTexture';
import { getPieceDisplayColor, isMovablePiece, type Piece } from '@/config/PieceConfig';
import { AudioManager } from '@/core/AudioManager';

export type BoardInteractionMode = 'normal' | 'crossClear';
export type BoardTheme = 'classic' | 'level';
export type BoardTutorialGate = (cell: Point) => boolean;

type BoardPoint = { x: number; y: number };

export class BoardView extends PIXI.Container {
  private _cellSize = 72;
  private _boardPixelSize = 0;
  private _ballRadius = 0;
  private _theme: BoardTheme = 'classic';

  private _bgGraphics: PIXI.Graphics;
  private _levelBoardArt: PIXI.Container;
  private _ballContainer: PIXI.Container;
  private _overlayContainer: PIXI.Container;
  private _balls: (BallSprite | null)[][] = [];
  private _selectedPos: Point | null = null;
  private _isAnimating = false;

  private _interactionMode: BoardInteractionMode = 'normal';
  private _previewMarkers: PIXI.Graphics[] = [];
  private _tutorialGate: BoardTutorialGate | null = null;

  constructor(theme: BoardTheme = 'classic') {
    super();
    this._theme = theme;

    this._bgGraphics = new PIXI.Graphics();
    this.addChild(this._bgGraphics);

    this._levelBoardArt = new PIXI.Container();
    this.addChild(this._levelBoardArt);

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
    this._ballRadius = Math.floor(this._cellSize * 0.45);

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

  /** Glossy light board for classic mode */
  private _drawClassicBoard(): void {
    const g = this._bgGraphics;
    const size = this._boardPixelSize;
    g.clear();
    this._levelBoardArt.removeChildren();

    const pad = Math.round(this._cellSize * 0.52);
    const boardSize = size + pad * 2;

    Promise.all([
      loadImageTexture('subpkg_assets/images/classic_board_base.png'),
      loadImageTexture('subpkg_assets/images/classic_board_cell_light.png'),
      loadImageTexture('subpkg_assets/images/classic_board_cell_lavender.png'),
    ]).then(([baseTex, lightTex, lavenderTex]) => {
      if (this.destroyed || this._theme !== 'classic') return;
      if (baseTex) {
        const base = new PIXI.Sprite(baseTex);
        base.x = -pad;
        base.y = -pad;
        base.width = boardSize;
        base.height = boardSize;
        this._levelBoardArt.addChild(base);
      }

      if (!lightTex && !lavenderTex) return;
      for (let r = 0; r < BOARD_SIZE; r++) {
        for (let c = 0; c < BOARD_SIZE; c++) {
          const tex = ((r + c) % 2 === 0 ? lightTex : lavenderTex) ?? lightTex ?? lavenderTex;
          if (!tex) continue;
          const { x, y } = this._cellPos(r, c);
          const cell = new PIXI.Sprite(tex);
          cell.x = x;
          cell.y = y;
          cell.width = this._cellSize;
          cell.height = this._cellSize;
          this._levelBoardArt.addChild(cell);
        }
      }
    });
  }

  /** Bright, playful board for level mode */
  private _drawLevelBoard(): void {
    const g = this._bgGraphics;
    g.clear();
    this._levelBoardArt.removeChildren();

    const size = this._boardPixelSize;
    const pad = Math.round(this._cellSize * 0.52);
    const boardSize = size + pad * 2;

    Promise.all([
      loadImageTexture('subpkg_assets/images/level_board_base.png'),
      loadImageTexture('subpkg_assets/images/level_board_cell_light.png'),
      loadImageTexture('subpkg_assets/images/level_board_cell_blue.png'),
    ]).then(([baseTex, lightTex, blueTex]) => {
      if (this.destroyed || this._theme !== 'level') return;
      if (baseTex) {
        const base = new PIXI.Sprite(baseTex);
        base.x = -pad;
        base.y = -pad;
        base.width = boardSize;
        base.height = boardSize;
        this._levelBoardArt.addChild(base);
      }

      if (!lightTex && !blueTex) return;
      for (let r = 0; r < BOARD_SIZE; r++) {
        for (let c = 0; c < BOARD_SIZE; c++) {
          const tex = ((r + c) % 2 === 0 ? lightTex : blueTex) ?? lightTex ?? blueTex;
          if (!tex) continue;
          const { x, y } = this._cellPos(r, c);
          const cell = new PIXI.Sprite(tex);
          cell.x = x;
          cell.y = y;
          cell.width = this._cellSize;
          cell.height = this._cellSize;
          this._levelBoardArt.addChild(cell);
        }
      }
    });
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

  getCellCenter(row: number, col: number): PIXI.Point {
    const center = this._cellCenter(row, col);
    return new PIXI.Point(center.x, center.y);
  }

  getCellCenterGlobal(row: number, col: number): PIXI.Point {
    return this.toGlobal(this.getCellCenter(row, col));
  }

  // ─── Interaction Mode ────────────────────────────────────

  setTutorialGate(gate: BoardTutorialGate | null): void {
    this._tutorialGate = gate;
  }

  setInteractionMode(mode: BoardInteractionMode): void {
    this._interactionMode = mode;
    if (mode === 'crossClear') {
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

  showPositionPreview(positions: Point[], pieces: Piece[]): void {
    this.clearPositionPreview();
    for (let i = 0; i < positions.length && i < pieces.length; i++) {
      const pos = positions[i];
      const piece = pieces[i];
      const center = this._cellCenter(pos.row, pos.col);

      const marker = new PIXI.Graphics();
      const displayColor = getPieceDisplayColor(piece);

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

      if (this._tutorialGate && !this._tutorialGate(cell)) {
        EventBus.emit('tutorial:rejected', cell);
        return;
      }

      if (this._interactionMode === 'crossClear') {
        void this._handleCrossClear(cell);
        return;
      }

      const grid = BoardManager.grid;
      const cellValue = grid[cell.row][cell.col];

      if (this._selectedPos === null) {
        if (isMovablePiece(cellValue)) {
          this._selectBall(cell);
        }
      } else {
        if (isMovablePiece(cellValue)) {
          this._deselectBall();
          this._selectBall(cell);
        } else if (cellValue !== null) {
          this._deselectBall();
          this._flashCell(cell);
        } else {
          this._tryMove(this._selectedPos, cell);
        }
      }
    });
  }

  private async _handleCrossClear(pos: Point): Promise<void> {
    const result = BoardManager.clearCrossAt(pos);
    if (result.positions.length === 0) {
      this._flashCell(pos);
      return;
    }

    this.setInteractionMode('normal');
    await this.animatePropClear(result);
    EventBus.emit('prop:crossClearDone', result);
  }

  async animatePropClear(result: PropClearResult): Promise<void> {
    if (result.positions.length === 0) return;
    this._isAnimating = true;
    await this._animateElimination(result.positions, result.score);
    this._isAnimating = false;
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
      const activeScore = result.autoEliminated?.length
        ? scoreForLine(result.eliminated.length)
        : result.score;
      await this._animateElimination(result.eliminated, activeScore);
      this._refreshChangedPieces(result.changedPieces);
    }

    if (result.newBalls.length > 0) {
      this._spawnBallSprites(result.newBalls);
    }

    if (result.autoEliminated && result.autoEliminated.length > 0) {
      await this._animateElimination(result.autoEliminated, scoreForLine(result.autoEliminated.length));
      this._refreshChangedPieces(result.autoChangedPieces);
    }

    if (result.score > 0) {
      EventBus.emit('ui:scoreChanged', BoardManager.score, result.score);
    }

    EventBus.emit('ui:moveComplete', result.stepsUsed);

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
          AudioManager.play('moveLand');
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

  private _animateElimination(eliminated: Point[], scoreDelta = 0): Promise<void> {
    return new Promise((resolve) => {
      if (eliminated.length === 0) { resolve(); return; }

      const sorted = [...eliminated].sort((a, b) =>
        a.row !== b.row ? a.row - b.row : a.col - b.col
      );
      const lineGroups = this._groupEliminationLines(sorted);
      AudioManager.play(eliminated.length >= 6 || scoreDelta >= 16 ? 'eliminateBig' : 'eliminate');
      lineGroups.forEach((line) => this._spawnLineGlow(line));
      if (scoreDelta > 0) {
        this._spawnScorePopup(sorted, scoreDelta);
      }

      let remaining = sorted.length;
      const STAGGER = 0.035;

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

  private _groupEliminationLines(points: Point[]): Point[][] {
    const key = (p: Point) => `${p.row},${p.col}`;
    const pointMap = new Map(points.map((p) => [key(p), p]));
    const groups: Point[][] = [];
    const directions = [
      { row: 0, col: 1 },
      { row: 1, col: 0 },
      { row: 1, col: 1 },
      { row: 1, col: -1 },
    ];

    for (const point of points) {
      for (const dir of directions) {
        const prevKey = `${point.row - dir.row},${point.col - dir.col}`;
        if (pointMap.has(prevKey)) continue;

        const line: Point[] = [];
        let row = point.row;
        let col = point.col;
        while (pointMap.has(`${row},${col}`)) {
          line.push(pointMap.get(`${row},${col}`)!);
          row += dir.row;
          col += dir.col;
        }

        if (line.length >= 2) {
          groups.push(line);
        }
      }
    }

    if (groups.length === 0) return [points];
    return groups;
  }

  private _spawnLineGlow(line: Point[]): void {
    if (line.length < 2) return;

    const centers = line.map((pos) => this._cellCenter(pos.row, pos.col));
    const glow = new PIXI.Container();
    glow.alpha = 0;
    this._overlayContainer.addChild(glow);

    const outer = new PIXI.Graphics();
    outer.lineStyle(this._cellSize * 0.38, 0xFFD94A, 0.22);
    this._drawPolyline(outer, centers);
    glow.addChild(outer);

    const mid = new PIXI.Graphics();
    mid.lineStyle(this._cellSize * 0.22, 0xFFE86B, 0.65);
    this._drawPolyline(mid, centers);
    glow.addChild(mid);

    const core = new PIXI.Graphics();
    core.lineStyle(this._cellSize * 0.08, 0xFFFFFF, 0.95);
    this._drawPolyline(core, centers);
    glow.addChild(core);

    for (const center of centers) {
      const nodeGlow = new PIXI.Graphics();
      nodeGlow.beginFill(0xFFF3A4, 0.28);
      nodeGlow.drawCircle(0, 0, this._cellSize * 0.43);
      nodeGlow.endFill();
      nodeGlow.beginFill(0xFFFFFF, 0.55);
      nodeGlow.drawCircle(0, 0, this._cellSize * 0.16);
      nodeGlow.endFill();
      nodeGlow.x = center.x;
      nodeGlow.y = center.y;
      glow.addChild(nodeGlow);
    }

    TweenManager.to({
      target: glow,
      props: { alpha: 1 },
      duration: 0.08,
      ease: Ease.easeOutQuad,
    });
    TweenManager.to({
      target: glow,
      props: { alpha: 0 },
      duration: 0.34,
      delay: 0.18,
      ease: Ease.easeOutQuad,
      onComplete: () => {
        this._overlayContainer.removeChild(glow);
        glow.destroy({ children: true });
      },
    });

    centers.forEach((center, index) => {
      const trigger = { _v: 0 };
      TweenManager.to({
        target: trigger,
        props: { _v: 1 },
        duration: 0.001,
        delay: index * 0.025,
        onComplete: () => this._spawnSparkle(center),
      });
    });
  }

  private _drawPolyline(g: PIXI.Graphics, points: BoardPoint[]): void {
    if (points.length === 0) return;
    g.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
      g.lineTo(points[i].x, points[i].y);
    }
  }

  private _spawnScorePopup(points: Point[], scoreDelta: number): void {
    const center = this._averageCenter(points);
    const popup = new PIXI.Text(`+${scoreDelta}`, new PIXI.TextStyle({
      fontSize: Math.round(this._cellSize * 0.66),
      fill: 0xFFF36A,
      stroke: 0x8B3300,
      strokeThickness: 7,
      fontWeight: 'bold',
      fontFamily: 'Arial',
      dropShadow: true,
      dropShadowColor: 0x7A2D00,
      dropShadowBlur: 2,
      dropShadowDistance: 3,
      dropShadowAlpha: 0.45,
    }));
    popup.anchor.set(0.5, 0.5);
    popup.x = Math.max(this._cellSize, Math.min(this._boardPixelSize - this._cellSize, center.x));
    popup.y = Math.max(this._cellSize * 0.8, center.y - this._cellSize * 0.52);
    popup.scale.set(0.45);
    this._overlayContainer.addChild(popup);

    TweenManager.to({
      target: popup.scale,
      props: { x: 1.22, y: 1.22 },
      duration: 0.16,
      ease: Ease.easeOutBack,
      onComplete: () => {
        TweenManager.to({
          target: popup.scale,
          props: { x: 1, y: 1 },
          duration: 0.12,
          ease: Ease.easeOutQuad,
        });
      },
    });
    TweenManager.to({
      target: popup,
      props: { y: popup.y - this._cellSize * 0.85 },
      duration: 0.72,
      ease: Ease.easeOutQuad,
    });
    TweenManager.to({
      target: popup,
      props: { alpha: 0 },
      duration: 0.28,
      delay: 0.46,
      onComplete: () => {
        this._overlayContainer.removeChild(popup);
        popup.destroy();
      },
    });
  }

  private _averageCenter(points: Point[]): BoardPoint {
    const sum = points.reduce((acc, p) => {
      const center = this._cellCenter(p.row, p.col);
      acc.x += center.x;
      acc.y += center.y;
      return acc;
    }, { x: 0, y: 0 });
    return {
      x: sum.x / points.length,
      y: sum.y / points.length,
    };
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
    const count = 16;
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 / count) * i + (Math.random() - 0.5) * 0.75;
      const dist = this._cellSize * 0.55 + Math.random() * this._cellSize * 0.85;
      const size = 2.6 + Math.random() * 4.2;
      const color = Math.random() > 0.35 ? mainColor : hiColor;

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

      const dur = 0.34 + Math.random() * 0.22;
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

    for (let i = 0; i < 4; i++) {
      const sparkCenter = {
        x: center.x + (Math.random() - 0.5) * this._cellSize * 0.45,
        y: center.y + (Math.random() - 0.5) * this._cellSize * 0.45,
      };
      this._spawnSparkle(sparkCenter);
    }
  }

  private _spawnSparkle(center: BoardPoint): void {
    const sparkle = new PIXI.Graphics();
    const r = this._cellSize * (0.12 + Math.random() * 0.08);
    sparkle.beginFill(0xFFFFFF, 0.95);
    sparkle.moveTo(0, -r * 1.7);
    sparkle.lineTo(r * 0.36, -r * 0.36);
    sparkle.lineTo(r * 1.7, 0);
    sparkle.lineTo(r * 0.36, r * 0.36);
    sparkle.lineTo(0, r * 1.7);
    sparkle.lineTo(-r * 0.36, r * 0.36);
    sparkle.lineTo(-r * 1.7, 0);
    sparkle.lineTo(-r * 0.36, -r * 0.36);
    sparkle.closePath();
    sparkle.endFill();
    sparkle.beginFill(0xFFF3A4, 0.75);
    sparkle.drawCircle(0, 0, r * 0.38);
    sparkle.endFill();
    sparkle.x = center.x;
    sparkle.y = center.y;
    sparkle.rotation = Math.random() * Math.PI;
    sparkle.scale.set(0.2);
    this._overlayContainer.addChild(sparkle);

    TweenManager.to({
      target: sparkle.scale,
      props: { x: 1.25, y: 1.25 },
      duration: 0.13,
      ease: Ease.easeOutBack,
    });
    TweenManager.to({
      target: sparkle,
      props: { alpha: 0 },
      duration: 0.22,
      delay: 0.1,
      onComplete: () => {
        this._overlayContainer.removeChild(sparkle);
        sparkle.destroy();
      },
    });
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
    if (newBalls.length > 0) {
      AudioManager.play('nextBalls');
    }
    for (const ball of newBalls) {
      const center = this._cellCenter(ball.position.row, ball.position.col);
      const sprite = new BallSprite(ball.piece, this._ballRadius);
      sprite.x = center.x;
      sprite.y = center.y;
      this._ballContainer.addChild(sprite);
      this._balls[ball.position.row][ball.position.col] = sprite;
      sprite.animateAppear();
    }
  }

  private _refreshChangedPieces(changedPieces: ChangedPiece[] | undefined): void {
    if (!changedPieces || changedPieces.length === 0) return;
    for (const changed of changedPieces) {
      const { row, col } = changed.position;
      const old = this._balls[row][col];
      if (old) {
        this._ballContainer.removeChild(old);
        old.destroy();
      }
      const center = this._cellCenter(row, col);
      const sprite = new BallSprite(changed.piece, this._ballRadius);
      sprite.x = center.x;
      sprite.y = center.y;
      this._ballContainer.addChild(sprite);
      this._balls[row][col] = sprite;
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
  get ballRadius(): number { return this._ballRadius; }
  get boardPixelSize(): number { return this._boardPixelSize; }
}
