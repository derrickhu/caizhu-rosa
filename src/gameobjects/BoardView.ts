import * as PIXI from 'pixi.js';
import { BOARD_SIZE, CELL_GAP, BALL_PALETTE, computeBoardLayout } from '@/config/GameConfig';
import { BallSprite } from './BallSprite';
import { BoardManager, type ChangedPiece, type NewBall, type PropClearResult } from '@/managers/BoardManager';
import { EventBus } from '@/core/EventBus';
import { TweenManager, Ease } from '@/core/TweenManager';
import { Game } from '@/core/Game';
import type { Point } from '@/systems/PathFinder';
import { loadImageTexture } from '@/utils/imageTexture';
import { getPieceDisplayColor, isMovablePiece, type Piece } from '@/config/PieceConfig';
import { AudioManager } from '@/core/AudioManager';
import { Platform } from '@/core/PlatformService';

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
  private _lastSelectVibrateAt = 0;

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
    this._vibrateSelect();
    EventBus.emit('board:selected', pos);
  }

  private _vibrateSelect(): void {
    const now = Date.now();
    if (now - this._lastSelectVibrateAt < 80) return;
    this._lastSelectVibrateAt = now;
    Platform.vibrateShort();
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
      await this._animateElimination(result.eliminated, result.score, result.bombCells, result.changedPieces);
    }

    if (result.newBalls.length > 0) {
      this._spawnBallSprites(result.newBalls);
    }

    if (result.autoEliminated && result.autoEliminated.length > 0) {
      await this._animateElimination(result.autoEliminated, result.score, result.autoBombCells, result.autoChangedPieces);
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

  private _animateElimination(
    eliminated: Point[],
    scoreDelta = 0,
    bombCells: Point[] = [],
    changedPieces: ChangedPiece[] = [],
  ): Promise<void> {
    return new Promise((resolve) => {
      if (eliminated.length === 0) { resolve(); return; }

      const sorted = [...eliminated].sort((a, b) =>
        a.row !== b.row ? a.row - b.row : a.col - b.col
      );
      const bombSet = new Set(bombCells.map(p => `${p.row},${p.col}`));
      const changedMap = new Map(changedPieces.map(changed => [
        `${changed.position.row},${changed.position.col}`,
        changed,
      ]));
      const lineGroups = this._groupEliminationLines(sorted);
      AudioManager.play(eliminated.length >= 6 || scoreDelta >= 16 ? 'eliminateBig' : 'eliminate');
      lineGroups.forEach((line) => this._spawnLineGlow(line));
      if (bombCells.length > 0) {
        this._spawnBombBlast(sorted, bombCells);
      }
      if (scoreDelta > 0) {
        this._spawnScorePopupsByColor(sorted, scoreDelta);
      }

      let remaining = sorted.length;
      const STAGGER = bombCells.length > 0 ? 0.028 : 0.045;
      const blastCenter = bombCells.length > 0 ? this._averageCenter(bombCells) : null;

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
        const isBombTarget = bombSet.has(`${pos.row},${pos.col}`);
        const changed = changedMap.get(`${pos.row},${pos.col}`);
        const distanceDelay = blastCenter
          ? Math.hypot(center.x - blastCenter.x, center.y - blastCenter.y) / this._cellSize * 0.022
          : 0;
        const delay = isBombTarget ? 0.08 + distanceDelay : i * STAGGER;

        const trigger = { _v: 0 };
        TweenManager.to({
          target: trigger,
          props: { _v: 1 },
          duration: 0.001,
          delay,
          onComplete: () => {
            this._flashEliminateCell(pos, mainColor, isBombTarget);
            if (changed) {
              this._spawnLayerBreak(center, mainColor, hiColor, isBombTarget);
              ball.setPiece(changed.piece);
              this._animateLayerRemoved(ball, () => {
                remaining--;
                if (remaining === 0) {
                  this._boardShake();
                  resolve();
                }
              });
              return;
            }

            this._spawnOrbDissolve(center, mainColor, hiColor, isBombTarget);
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
    const firstBall = this._balls[line[0].row][line[0].col];
    const palette = firstBall && firstBall.colorIndex >= 0 ? BALL_PALETTE[firstBall.colorIndex] : null;
    const mainColor = palette ? palette[0] : 0xFFD94A;
    const hiColor = palette ? palette[1] : 0xFFFFFF;
    const glow = new PIXI.Container();
    glow.alpha = 0;
    glow.blendMode = PIXI.BLEND_MODES.ADD;
    this._overlayContainer.addChild(glow);

    const outer = new PIXI.Graphics();
    outer.lineStyle(this._cellSize * 0.48, mainColor, 0.2);
    this._drawPolyline(outer, centers);
    glow.addChild(outer);

    const mid = new PIXI.Graphics();
    mid.lineStyle(this._cellSize * 0.24, hiColor, 0.62);
    this._drawPolyline(mid, centers);
    glow.addChild(mid);

    const core = new PIXI.Graphics();
    core.lineStyle(this._cellSize * 0.065, 0xFFFFFF, 0.92);
    this._drawPolyline(core, centers);
    glow.addChild(core);

    for (const center of centers) {
      const nodeGlow = new PIXI.Graphics();
      nodeGlow.beginFill(mainColor, 0.16);
      nodeGlow.drawCircle(0, 0, this._cellSize * 0.34);
      nodeGlow.endFill();
      nodeGlow.beginFill(0xFFFFFF, 0.36);
      nodeGlow.drawCircle(0, 0, this._cellSize * 0.1);
      nodeGlow.endFill();
      nodeGlow.x = center.x;
      nodeGlow.y = center.y;
      glow.addChild(nodeGlow);
    }

    TweenManager.to({
      target: glow,
      props: { alpha: 1 },
      duration: 0.1,
      ease: Ease.easeOutQuad,
    });
    TweenManager.to({
      target: glow,
      props: { alpha: 0 },
      duration: 0.42,
      delay: 0.24,
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
        delay: index * 0.045,
        onComplete: () => this._spawnLineSweepNode(center, hiColor),
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

  private _spawnScorePopupsByColor(points: Point[], scoreDelta: number): void {
    type ScoreGroup = { colorIndex: number | null; points: Point[]; score: number };
    const groupMap = new Map<number | 'neutral', ScoreGroup>();

    for (const point of points) {
      const ball = this._balls[point.row][point.col];
      const colorIndex = ball && ball.colorIndex >= 0 ? ball.colorIndex : null;
      const key = colorIndex ?? 'neutral';
      const group = groupMap.get(key);
      if (group) {
        group.points.push(point);
      } else {
        groupMap.set(key, { colorIndex, points: [point], score: 0 });
      }
    }

    const groups = Array.from(groupMap.values());
    if (groups.length === 0) {
      this._spawnScorePopup(points, scoreDelta, null, 0);
      return;
    }

    const rankedGroups = groups
      .map(group => ({
        group,
        exactScore: scoreDelta * group.points.length / points.length,
      }))
      .sort((a, b) => (b.exactScore % 1) - (a.exactScore % 1));
    if (scoreDelta < groups.length) {
      rankedGroups.forEach(({ group }, index) => {
        group.score = index < scoreDelta ? 1 : 0;
      });
    } else {
      let assignedScore = 0;
      for (const { group, exactScore } of rankedGroups) {
        group.score = Math.max(1, Math.floor(exactScore));
        assignedScore += group.score;
      }
      for (let i = 0; assignedScore < scoreDelta; i = (i + 1) % rankedGroups.length) {
        rankedGroups[i].group.score++;
        assignedScore++;
      }
      for (let i = rankedGroups.length - 1; assignedScore > scoreDelta && i >= 0; i--) {
        const group = rankedGroups[i].group;
        const removable = Math.min(group.score - 1, assignedScore - scoreDelta);
        group.score -= removable;
        assignedScore -= removable;
      }
    }

    const visibleGroups = groups.filter(group => group.score > 0);
    visibleGroups.forEach((group, index) => {
      const offsetIndex = index - (visibleGroups.length - 1) / 2;
      this._spawnScorePopup(group.points, group.score, group.colorIndex, offsetIndex);
    });
  }

  private _spawnScorePopup(
    points: Point[],
    scoreDelta: number,
    colorIndex: number | null,
    offsetIndex: number,
  ): void {
    const center = this._averageCenter(points);
    const palette = colorIndex === null ? null : BALL_PALETTE[colorIndex];
    const fill = palette ? palette[1] : 0xFFF36A;
    const stroke = palette ? palette[2] : 0x8B3300;
    const popup = new PIXI.Text(`+${scoreDelta}`, new PIXI.TextStyle({
      fontSize: Math.round(this._cellSize * 0.66),
      fill,
      stroke,
      strokeThickness: 7,
      fontWeight: 'bold',
      fontFamily: 'Arial',
      dropShadow: true,
      dropShadowColor: stroke,
      dropShadowBlur: 2,
      dropShadowDistance: 3,
      dropShadowAlpha: 0.45,
    }));
    popup.anchor.set(0.5, 0.5);
    popup.x = Math.max(
      this._cellSize,
      Math.min(this._boardPixelSize - this._cellSize, center.x + offsetIndex * this._cellSize * 0.58)
    );
    popup.y = Math.max(this._cellSize * 0.8, center.y - this._cellSize * (0.52 + Math.abs(offsetIndex) * 0.18));
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

  /** Colored glow behind the ball on the cell */
  private _flashEliminateCell(pos: Point, color: number, intense = false): void {
    const { x, y } = this._cellPos(pos.row, pos.col);
    const glow = new PIXI.Graphics();
    glow.blendMode = PIXI.BLEND_MODES.ADD;
    glow.beginFill(color, intense ? 0.3 : 0.16);
    glow.drawRoundedRect(x + 2, y + 2, this._cellSize - 4, this._cellSize - 4, this._cellSize * 0.12);
    glow.endFill();
    glow.beginFill(0xFFFFFF, intense ? 0.18 : 0.08);
    glow.drawCircle(x + this._cellSize / 2, y + this._cellSize / 2, this._cellSize * (intense ? 0.42 : 0.3));
    glow.endFill();

    const idx = this.getChildIndex(this._ballContainer);
    this.addChildAt(glow, idx);

    TweenManager.to({
      target: glow,
      props: { alpha: 0 },
      duration: intense ? 0.5 : 0.34,
      ease: Ease.easeOutQuad,
      onComplete: () => {
        this.removeChild(glow);
        glow.destroy();
      },
    });
  }

  private _spawnLineSweepNode(center: BoardPoint, color: number): void {
    const sweep = new PIXI.Graphics();
    sweep.blendMode = PIXI.BLEND_MODES.ADD;
    sweep.beginFill(0xFFFFFF, 0.75);
    sweep.drawCircle(0, 0, this._cellSize * 0.1);
    sweep.endFill();
    sweep.lineStyle(this._cellSize * 0.035, color, 0.9);
    sweep.moveTo(-this._cellSize * 0.22, 0);
    sweep.lineTo(this._cellSize * 0.22, 0);
    sweep.x = center.x;
    sweep.y = center.y;
    sweep.rotation = -0.55;
    sweep.scale.set(0.25);
    this._overlayContainer.addChild(sweep);

    TweenManager.to({
      target: sweep.scale,
      props: { x: 1.25, y: 1.25 },
      duration: 0.14,
      ease: Ease.easeOutBack,
    });
    TweenManager.to({
      target: sweep,
      props: { alpha: 0 },
      duration: 0.22,
      delay: 0.08,
      ease: Ease.easeOutQuad,
      onComplete: () => {
        this._overlayContainer.removeChild(sweep);
        sweep.destroy();
      },
    });
  }

  /** Expanding colored ring */
  private _spawnShockwave(center: { x: number; y: number }, color: number, radiusScale = 2.8): void {
    const ring = new PIXI.Graphics();
    ring.blendMode = PIXI.BLEND_MODES.ADD;
    ring.lineStyle(3.5, color, 0.72);
    ring.drawCircle(0, 0, this._cellSize * 0.35);
    ring.x = center.x;
    ring.y = center.y;
    this._overlayContainer.addChild(ring);

    TweenManager.to({
      target: ring.scale,
      props: { x: radiusScale, y: radiusScale },
      duration: 0.38,
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

  private _spawnBombBlast(allPoints: Point[], bombCells: Point[]): void {
    const center = this._averageCenter(bombCells.length > 0 ? bombCells : allPoints);
    const blast = new PIXI.Container();
    blast.blendMode = PIXI.BLEND_MODES.ADD;
    blast.x = center.x;
    blast.y = center.y;
    this._overlayContainer.addChild(blast);

    const halo = new PIXI.Graphics();
    halo.beginFill(0xFFB13B, 0.22);
    halo.drawCircle(0, 0, this._cellSize * 0.52);
    halo.endFill();
    halo.lineStyle(4, 0xFFFFFF, 0.72);
    halo.drawCircle(0, 0, this._cellSize * 0.5);
    blast.addChild(halo);

    const warmRing = new PIXI.Graphics();
    warmRing.lineStyle(8, 0xFF7A2B, 0.55);
    warmRing.drawCircle(0, 0, this._cellSize * 0.36);
    blast.addChild(warmRing);

    TweenManager.to({
      target: blast.scale,
      props: { x: 2.45, y: 2.45 },
      duration: 0.34,
      ease: Ease.easeOutQuad,
    });
    TweenManager.to({
      target: blast,
      props: { alpha: 0 },
      duration: 0.28,
      delay: 0.12,
      ease: Ease.easeOutQuad,
      onComplete: () => {
        this._overlayContainer.removeChild(blast);
        blast.destroy({ children: true });
      },
    });

    for (const pos of bombCells) {
      const targetCenter = this._cellCenter(pos.row, pos.col);
      const trigger = { _v: 0 };
      const delay = Math.hypot(targetCenter.x - center.x, targetCenter.y - center.y) / this._cellSize * 0.025;
      TweenManager.to({
        target: trigger,
        props: { _v: 1 },
        duration: 0.001,
        delay,
        onComplete: () => this._spawnShockwave(targetCenter, 0xFFD66B, 1.65),
      });
    }
  }

  private _spawnLayerBreak(
    center: { x: number; y: number },
    mainColor: number,
    hiColor: number,
    intense = false,
  ): void {
    const ring = new PIXI.Graphics();
    ring.blendMode = PIXI.BLEND_MODES.ADD;
    ring.lineStyle(this._cellSize * 0.055, 0xFFFFFF, intense ? 0.72 : 0.52);
    ring.drawCircle(0, 0, this._cellSize * 0.32);
    ring.lineStyle(this._cellSize * 0.035, hiColor, 0.75);
    ring.drawCircle(0, 0, this._cellSize * 0.39);
    ring.x = center.x;
    ring.y = center.y;
    this._overlayContainer.addChild(ring);

    TweenManager.to({
      target: ring.scale,
      props: { x: intense ? 1.65 : 1.35, y: intense ? 1.65 : 1.35 },
      duration: 0.22,
      ease: Ease.easeOutQuad,
    });
    TweenManager.to({
      target: ring,
      props: { alpha: 0 },
      duration: 0.26,
      ease: Ease.easeOutQuad,
      onComplete: () => {
        this._overlayContainer.removeChild(ring);
        ring.destroy();
      },
    });

    const count = intense ? 10 : 7;
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 / count) * i + (Math.random() - 0.5) * 0.45;
      const dist = this._cellSize * (0.34 + Math.random() * 0.36);
      const shard = new PIXI.Graphics();
      shard.blendMode = PIXI.BLEND_MODES.ADD;
      shard.beginFill(Math.random() > 0.45 ? 0xFFFFFF : hiColor, 0.88);
      shard.drawPolygon([
        -this._cellSize * 0.025, -this._cellSize * 0.055,
        this._cellSize * 0.045, 0,
        -this._cellSize * 0.025, this._cellSize * 0.055,
      ]);
      shard.endFill();
      shard.x = center.x;
      shard.y = center.y;
      shard.rotation = angle;
      this._overlayContainer.addChild(shard);

      const duration = 0.26 + Math.random() * 0.12;
      TweenManager.to({
        target: shard,
        props: {
          x: center.x + Math.cos(angle) * dist,
          y: center.y + Math.sin(angle) * dist,
          rotation: angle + (Math.random() - 0.5) * 1.2,
        },
        duration,
        ease: Ease.easeOutQuad,
      });
      TweenManager.to({
        target: shard,
        props: { alpha: 0 },
        duration: duration + 0.04,
        onComplete: () => {
          this._overlayContainer.removeChild(shard);
          shard.destroy();
        },
      });
    }

    this._spawnOrbDissolve(center, mainColor, hiColor, false);
  }

  private _animateLayerRemoved(ball: BallSprite, onComplete: () => void): void {
    TweenManager.to({
      target: ball.scale,
      props: { x: 1.08, y: 1.08 },
      duration: 0.08,
      ease: Ease.easeOutQuad,
      onComplete: () => {
        TweenManager.to({
          target: ball.scale,
          props: { x: 1, y: 1 },
          duration: 0.14,
          ease: Ease.easeOutBack,
          onComplete,
        });
      },
    });
  }

  private _spawnOrbDissolve(
    center: { x: number; y: number },
    mainColor: number,
    hiColor: number,
    intense = false,
  ): void {
    const core = new PIXI.Graphics();
    core.blendMode = PIXI.BLEND_MODES.ADD;
    core.beginFill(hiColor, intense ? 0.55 : 0.36);
    core.drawCircle(0, 0, this._cellSize * (intense ? 0.28 : 0.2));
    core.endFill();
    core.beginFill(0xFFFFFF, intense ? 0.65 : 0.42);
    core.drawCircle(0, 0, this._cellSize * 0.08);
    core.endFill();
    core.x = center.x;
    core.y = center.y;
    this._overlayContainer.addChild(core);

    TweenManager.to({
      target: core.scale,
      props: { x: intense ? 1.9 : 1.35, y: intense ? 1.9 : 1.35 },
      duration: intense ? 0.24 : 0.18,
      ease: Ease.easeOutQuad,
    });
    TweenManager.to({
      target: core,
      props: { alpha: 0 },
      duration: intense ? 0.3 : 0.22,
      ease: Ease.easeOutQuad,
      onComplete: () => {
        this._overlayContainer.removeChild(core);
        core.destroy();
      },
    });

    this._spawnEliminateParticles(center, mainColor, hiColor, intense);
    if (intense) this._spawnSparkle(center);
  }

  /** Controlled burst of small colored sparks flying outward */
  private _spawnEliminateParticles(
    center: { x: number; y: number },
    mainColor: number,
    hiColor: number,
    intense = false,
  ): void {
    const count = intense ? 11 : 6;
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 / count) * i + (Math.random() - 0.5) * 0.75;
      const dist = this._cellSize * (intense ? 0.9 : 0.48) + Math.random() * this._cellSize * (intense ? 0.85 : 0.42);
      const size = this._cellSize * (0.035 + Math.random() * (intense ? 0.04 : 0.025));
      const color = Math.random() > 0.35 ? mainColor : hiColor;

      const p = new PIXI.Graphics();
      p.blendMode = PIXI.BLEND_MODES.ADD;
      p.beginFill(color);
      p.drawCircle(0, 0, size * 1.25);
      p.endFill();
      p.beginFill(0xFFFFFF, 0.55);
      p.drawCircle(0, 0, size * 0.42);
      p.endFill();

      p.x = center.x;
      p.y = center.y;
      this._overlayContainer.addChild(p);

      const dur = (intense ? 0.42 : 0.28) + Math.random() * 0.16;
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

    const sparkleCount = intense ? 3 : 1;
    for (let i = 0; i < sparkleCount; i++) {
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

  syncWithBoard(animateAppear = false): void {
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
          if (animateAppear) {
            sprite.animateAppear();
          }
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
