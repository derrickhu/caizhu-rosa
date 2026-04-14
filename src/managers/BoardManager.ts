import {
  BOARD_SIZE, CLASSIC_COLOR_COUNT, BALLS_PER_TURN, INITIAL_BALLS, scoreForLine,
} from '@/config/GameConfig';
import { WILD_BALL, BOMB_BALL, isBombBall } from '@/config/PropConfig';
import { findPath, type Point } from '@/systems/PathFinder';
import { detectLines } from '@/systems/LineDetector';
import { EventBus } from '@/core/EventBus';

export type CellValue = number | null;

export interface LevelModeConfig {
  colorCount: number;
  initialBalls: number;
  ballsPerTurn: number;
  noSpawnThreshold: number;
  wildBallChance?: number;
  bombBallChance?: number;
}

interface BoardSnapshot {
  grid: CellValue[][];
  nextColors: number[];
  score: number;
  stepsUsed: number;
}

class BoardManagerClass {
  private _grid: CellValue[][] = [];
  private _nextColors: number[] = [];
  private _score = 0;
  private _bestScore = 0;
  private _gameOver = false;
  private _stepsUsed = 0;

  private _colorCount = CLASSIC_COLOR_COUNT;
  private _initialBalls = INITIAL_BALLS;
  private _ballsPerTurn = BALLS_PER_TURN;

  private _isLevelMode = false;
  private _noSpawnThreshold = 8;
  private _wildBallChance = 0;
  private _bombBallChance = 0;

  /** Undo support: stores the state before the last move */
  private _undoSnapshot: BoardSnapshot | null = null;

  /** Pre-computed next ball positions for position preview prop */
  private _nextPositions: Point[] | null = null;

  get grid(): CellValue[][] { return this._grid; }
  get nextColors(): number[] { return this._nextColors; }
  get score(): number { return this._score; }
  get bestScore(): number { return this._bestScore; }
  get gameOver(): boolean { return this._gameOver; }
  get stepsUsed(): number { return this._stepsUsed; }
  get isLevelMode(): boolean { return this._isLevelMode; }

  /** Classic mode init */
  init(): void {
    this._isLevelMode = false;
    this._colorCount = CLASSIC_COLOR_COUNT;
    this._initialBalls = INITIAL_BALLS;
    this._ballsPerTurn = BALLS_PER_TURN;
    this._noSpawnThreshold = 99;
    this._wildBallChance = 0;
    this._bombBallChance = 0;
    this._commonInit();
  }

  /** Level mode init with custom parameters */
  initLevel(config: LevelModeConfig): void {
    this._isLevelMode = true;
    this._colorCount = config.colorCount;
    this._initialBalls = config.initialBalls;
    this._ballsPerTurn = config.ballsPerTurn;
    this._noSpawnThreshold = config.noSpawnThreshold;
    this._wildBallChance = config.wildBallChance ?? 0;
    this._bombBallChance = config.bombBallChance ?? 0;
    this._commonInit();
  }

  private _commonInit(): void {
    this._grid = Array.from({ length: BOARD_SIZE }, () =>
      Array(BOARD_SIZE).fill(null)
    );
    this._score = 0;
    this._stepsUsed = 0;
    this._gameOver = false;
    this._undoSnapshot = null;
    this._nextPositions = null;
    this._generateNextColors();
    this._spawnInitialBalls();
  }

  reset(): void {
    if (this._score > this._bestScore) {
      this._bestScore = this._score;
    }
    if (this._isLevelMode) {
      this._commonInit();
    } else {
      this.init();
    }
  }

  setBestScore(score: number): void {
    this._bestScore = score;
  }

  getEmptyCells(): Point[] {
    const empty: Point[] = [];
    for (let r = 0; r < BOARD_SIZE; r++) {
      for (let c = 0; c < BOARD_SIZE; c++) {
        if (this._grid[r][c] === null) empty.push({ row: r, col: c });
      }
    }
    return empty;
  }

  findPath(from: Point, to: Point): Point[] | null {
    return findPath(this._grid, from, to);
  }

  // ─── Core Move ───────────────────────────────────────────

  moveBall(from: Point, to: Point): MoveResult {
    const color = this._grid[from.row][from.col];
    if (color === null) return { moved: false, eliminated: [], score: 0, newBalls: [], gameOver: false, stepsUsed: 0 };

    // Save undo snapshot BEFORE any grid modifications
    this._saveSnapshot();

    this._grid[from.row][from.col] = null;
    const path = findPath(this._grid, from, to);

    if (!path) {
      this._grid[from.row][from.col] = color;
      this._undoSnapshot = null;
      return { moved: false, eliminated: [], score: 0, newBalls: [], gameOver: false, stepsUsed: 0 };
    }

    this._grid[to.row][to.col] = color;
    this._stepsUsed++;

    const eliminated = detectLines(this._grid, [to]);

    // Expand elimination with bomb ball chain
    const bombExpanded = this._expandBombElimination(eliminated);
    const allEliminated = bombExpanded.length > eliminated.length ? bombExpanded : eliminated;

    if (allEliminated.length > 0) {
      const turnScore = this._processElimination(allEliminated);

      if (this._isLevelMode && allEliminated.length < this._noSpawnThreshold) {
        const newBalls = this._spawnNextBalls();
        this._generateNextColors();

        const newBallPositions = newBalls.map(b => b.position);
        const autoElim = detectLines(this._grid, newBallPositions);
        const autoExpanded = this._expandBombElimination(autoElim);
        let autoScore = 0;
        if (autoExpanded.length > 0) {
          autoScore = this._processElimination(autoExpanded);
        }

        const gameOver = this._checkGameOver();
        return {
          moved: true, path, eliminated: allEliminated, score: turnScore + autoScore,
          newBalls, gameOver, stepsUsed: this._stepsUsed,
          autoEliminated: autoExpanded.length > 0 ? autoExpanded : undefined,
          bombCells: bombExpanded.length > eliminated.length
            ? bombExpanded.filter(p => !eliminated.some(e => e.row === p.row && e.col === p.col))
            : undefined,
        };
      }

      return {
        moved: true, path, eliminated: allEliminated, score: turnScore,
        newBalls: [], gameOver: false, stepsUsed: this._stepsUsed,
        bombCells: bombExpanded.length > eliminated.length
          ? bombExpanded.filter(p => !eliminated.some(e => e.row === p.row && e.col === p.col))
          : undefined,
      };
    }

    // No elimination - spawn new balls
    const newBalls = this._spawnNextBalls();

    const newBallPositions = newBalls.map(b => b.position);
    const autoEliminated = detectLines(this._grid, newBallPositions);
    const autoExpanded = this._expandBombElimination(autoEliminated);
    let autoScore = 0;
    if (autoExpanded.length > 0) {
      autoScore = this._processElimination(autoExpanded);
    }

    this._generateNextColors();

    const gameOver = this._checkGameOver();

    return {
      moved: true, path,
      eliminated: [],
      score: autoScore, newBalls, gameOver, stepsUsed: this._stepsUsed,
      autoEliminated: autoExpanded.length > 0 ? autoExpanded : undefined,
    };
  }

  // ─── Bomb Expansion ──────────────────────────────────────

  private _expandBombElimination(eliminated: Point[]): Point[] {
    if (eliminated.length === 0) return eliminated;

    const resultSet = new Set<string>();
    for (const p of eliminated) resultSet.add(`${p.row},${p.col}`);

    // Find bomb balls in eliminated set and expand 3x3
    const toCheck = [...eliminated];
    while (toCheck.length > 0) {
      const p = toCheck.pop()!;
      if (!isBombBall(this._grid[p.row][p.col])) continue;

      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          const nr = p.row + dr;
          const nc = p.col + dc;
          if (nr < 0 || nr >= BOARD_SIZE || nc < 0 || nc >= BOARD_SIZE) continue;
          if (this._grid[nr][nc] === null) continue;
          const key = `${nr},${nc}`;
          if (!resultSet.has(key)) {
            resultSet.add(key);
            toCheck.push({ row: nr, col: nc });
          }
        }
      }
    }

    return Array.from(resultSet).map(key => {
      const [r, c] = key.split(',').map(Number);
      return { row: r, col: c };
    });
  }

  // ─── Prop Actions ────────────────────────────────────────

  /** Undo: restore state to before last move */
  undo(): boolean {
    if (!this._undoSnapshot) return false;
    const snap = this._undoSnapshot;
    this._grid = snap.grid.map(row => [...row]);
    this._nextColors = [...snap.nextColors];
    this._score = snap.score;
    this._stepsUsed = snap.stepsUsed;
    this._gameOver = false;
    this._undoSnapshot = null;
    this._nextPositions = null;
    EventBus.emit('board:undone');
    return true;
  }

  get canUndo(): boolean { return this._undoSnapshot !== null; }

  /** Remove a single ball from the board (prop) */
  removeBallAt(pos: Point): boolean {
    if (this._grid[pos.row][pos.col] === null) return false;
    this._grid[pos.row][pos.col] = null;
    EventBus.emit('board:ballRemoved', pos);
    return true;
  }

  /** Reroll the next colors */
  rerollNextColors(): void {
    this._generateNextColors();
    this._nextPositions = null;
  }

  /** Add extra steps (for step-limit levels) */
  addExtraSteps(count: number): void {
    this._stepsUsed = Math.max(0, this._stepsUsed - count);
    EventBus.emit('board:extraSteps', count);
  }

  /** Get or compute positions where next balls will land (for preview prop) */
  getNextPositions(): Point[] {
    if (this._nextPositions) return this._nextPositions;

    const empty = this.getEmptyCells();
    const positions: Point[] = [];
    const tempEmpty = [...empty];

    for (let i = 0; i < this._nextColors.length && tempEmpty.length > 0; i++) {
      const idx = Math.floor(Math.random() * tempEmpty.length);
      positions.push(tempEmpty.splice(idx, 1)[0]);
    }

    this._nextPositions = positions;
    return positions;
  }

  // ─── Internal ────────────────────────────────────────────

  private _saveSnapshot(): void {
    this._undoSnapshot = {
      grid: this._grid.map(row => [...row]),
      nextColors: [...this._nextColors],
      score: this._score,
      stepsUsed: this._stepsUsed,
    };
  }

  private _checkGameOver(): boolean {
    const gameOver = this.getEmptyCells().length === 0;
    if (gameOver) {
      this._gameOver = true;
      if (this._score > this._bestScore) {
        this._bestScore = this._score;
      }
      EventBus.emit('game:over', this._score);
    }
    return gameOver;
  }

  private _processElimination(eliminated: Point[]): number {
    const totalScore = scoreForLine(eliminated.length);
    for (const p of eliminated) {
      this._grid[p.row][p.col] = null;
    }
    this._score += totalScore;
    EventBus.emit('board:eliminated', eliminated, totalScore);
    return totalScore;
  }

  private _spawnNextBalls(): NewBall[] {
    const empty = this.getEmptyCells();
    const spawned: NewBall[] = [];
    const count = Math.min(this._nextColors.length, empty.length);

    // Use pre-computed positions if available (from preview)
    const previewPositions = this._nextPositions;
    this._nextPositions = null;

    for (let i = 0; i < count; i++) {
      let pos: Point;
      if (previewPositions && i < previewPositions.length) {
        // Verify the pre-computed position is still empty
        const pp = previewPositions[i];
        if (this._grid[pp.row][pp.col] === null) {
          pos = pp;
          const emptyIdx = empty.findIndex(e => e.row === pp.row && e.col === pp.col);
          if (emptyIdx !== -1) empty.splice(emptyIdx, 1);
        } else {
          const idx = Math.floor(Math.random() * empty.length);
          pos = empty.splice(idx, 1)[0];
        }
      } else {
        const idx = Math.floor(Math.random() * empty.length);
        pos = empty.splice(idx, 1)[0];
      }

      const color = this._nextColors[i];
      this._grid[pos.row][pos.col] = color;
      spawned.push({ position: pos, color });
    }

    EventBus.emit('board:spawned', spawned);
    return spawned;
  }

  private _spawnInitialBalls(): void {
    const empty = this.getEmptyCells();
    const spawned: NewBall[] = [];

    for (let i = 0; i < this._initialBalls && empty.length > 0; i++) {
      const idx = Math.floor(Math.random() * empty.length);
      const pos = empty.splice(idx, 1)[0];
      const color = this._rollBallColor();
      this._grid[pos.row][pos.col] = color;
      spawned.push({ position: pos, color });
    }

    EventBus.emit('board:spawned', spawned);
  }

  private _generateNextColors(): void {
    this._nextColors = [];
    for (let i = 0; i < this._ballsPerTurn; i++) {
      this._nextColors.push(this._rollBallColor());
    }
    this._nextPositions = null;
    EventBus.emit('board:nextColors', this._nextColors);
  }

  /** Roll a ball color, with chance for special balls in level mode */
  private _rollBallColor(): number {
    const rand = Math.random();
    if (this._wildBallChance > 0 && rand < this._wildBallChance) {
      return WILD_BALL;
    }
    if (this._bombBallChance > 0 && rand < this._wildBallChance + this._bombBallChance) {
      return BOMB_BALL;
    }
    return Math.floor(Math.random() * this._colorCount);
  }

  revive(): void {
    const filled: Point[] = [];
    for (let r = 0; r < BOARD_SIZE; r++) {
      for (let c = 0; c < BOARD_SIZE; c++) {
        if (this._grid[r][c] !== null) filled.push({ row: r, col: c });
      }
    }
    const clearCount = Math.ceil(filled.length / 3);
    for (let i = 0; i < clearCount && filled.length > 0; i++) {
      const idx = Math.floor(Math.random() * filled.length);
      const pos = filled.splice(idx, 1)[0];
      this._grid[pos.row][pos.col] = null;
    }
    this._gameOver = false;
    this._generateNextColors();
    EventBus.emit('board:revived');
  }

  exportState() {
    return {
      grid: this._grid.map(row => [...row]),
      nextColors: [...this._nextColors],
      score: this._score,
      bestScore: this._bestScore,
    };
  }

  loadState(state: ReturnType<typeof this.exportState>): void {
    this._grid = state.grid.map(row => [...row]);
    this._nextColors = [...state.nextColors];
    this._score = state.score;
    this._bestScore = state.bestScore;
    this._gameOver = false;
  }
}

export interface NewBall {
  position: Point;
  color: number;
}

export interface MoveResult {
  moved: boolean;
  path?: Point[];
  eliminated: Point[];
  autoEliminated?: Point[];
  /** Extra cells cleared by bomb explosions (subset of eliminated not in the line) */
  bombCells?: Point[];
  score: number;
  newBalls: NewBall[];
  gameOver: boolean;
  stepsUsed: number;
}

export const BoardManager = new BoardManagerClass();
