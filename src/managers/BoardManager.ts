import {
  BOARD_SIZE, CLASSIC_COLOR_COUNT, BALLS_PER_TURN, INITIAL_BALLS, scoreForLine,
} from '@/config/GameConfig';
import {
  cloneCell,
  clonePiece,
  createSpecialPiece,
  damagePieceByExplosion,
  damagePieceByLine,
  getPieceColor,
  isBombPiece,
  isMovablePiece,
  rollSpawnPiece,
  type CellValue,
  type Piece,
  type PieceSpawnKind,
  type SpecialPieceChances,
} from '@/config/PieceConfig';
import { findPath, type Point } from '@/systems/PathFinder';
import { detectLines } from '@/systems/LineDetector';
import { EventBus } from '@/core/EventBus';

export type { CellValue, Piece } from '@/config/PieceConfig';

export interface LevelModeConfig extends SpecialPieceChances {
  colorCount: number;
  initialBalls: number;
  ballsPerTurn: number;
  noSpawnThreshold: number;
  guaranteedInitialPieces?: readonly PieceSpawnKind[];
  guaranteedNextPieces?: readonly PieceSpawnKind[];
}

export interface FixedLevelLayout {
  initialCells: readonly { row: number; col: number; piece: Piece }[];
  nextPieces: readonly Piece[];
  nextLandingPositions?: readonly Point[];
}

class BoardManagerClass {
  private _grid: CellValue[][] = [];
  private _nextPieces: Piece[] = [];
  private _score = 0;
  private _bestScore = 0;
  private _gameOver = false;
  private _stepsUsed = 0;

  private _colorCount = CLASSIC_COLOR_COUNT;
  private _initialBalls = INITIAL_BALLS;
  private _ballsPerTurn = BALLS_PER_TURN;

  private _isLevelMode = false;
  private _noSpawnThreshold = 8;
  private _specialChances: SpecialPieceChances = {};
  private _guaranteedInitialPieces: readonly PieceSpawnKind[] = [];
  private _guaranteedNextPieces: readonly PieceSpawnKind[] = [];

  /** Pre-computed next ball positions for position preview prop */
  private _nextPositions: Point[] | null = null;

  get grid(): CellValue[][] { return this._grid; }
  get nextColors(): Piece[] { return this._nextPieces; }
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
    this._specialChances = {};
    this._guaranteedInitialPieces = [];
    this._guaranteedNextPieces = [];
    this._commonInit();
  }

  /** Level mode init with custom parameters */
  initLevel(config: LevelModeConfig): void {
    this._isLevelMode = true;
    this._colorCount = config.colorCount;
    this._initialBalls = config.initialBalls;
    this._ballsPerTurn = config.ballsPerTurn;
    this._noSpawnThreshold = config.noSpawnThreshold;
    this._specialChances = {
      wildBallChance: config.wildBallChance ?? 0,
      bombBallChance: config.bombBallChance ?? 0,
      frozenBallChance: config.frozenBallChance ?? 0,
      chainBallChance: config.chainBallChance ?? 0,
      blockChance: config.blockChance ?? 0,
    };
    this._guaranteedInitialPieces = config.guaranteedInitialPieces ?? [];
    this._guaranteedNextPieces = config.guaranteedNextPieces ?? [];
    this._commonInit();
  }

  /** Level mode init with a deterministic board for forced tutorials. */
  initLevelWithLayout(config: LevelModeConfig, layout: FixedLevelLayout): void {
    this._isLevelMode = true;
    this._colorCount = config.colorCount;
    this._initialBalls = config.initialBalls;
    this._ballsPerTurn = config.ballsPerTurn;
    this._noSpawnThreshold = config.noSpawnThreshold;
    this._specialChances = {
      wildBallChance: config.wildBallChance ?? 0,
      bombBallChance: config.bombBallChance ?? 0,
      frozenBallChance: config.frozenBallChance ?? 0,
      chainBallChance: config.chainBallChance ?? 0,
      blockChance: config.blockChance ?? 0,
    };
    this._guaranteedInitialPieces = [];
    this._guaranteedNextPieces = [];
    this._commonInit(layout);
  }

  private _commonInit(layout?: FixedLevelLayout): void {
    this._grid = Array.from({ length: BOARD_SIZE }, () =>
      Array(BOARD_SIZE).fill(null)
    );
    this._score = 0;
    this._stepsUsed = 0;
    this._gameOver = false;
    this._nextPositions = null;
    if (layout) {
      this._applyFixedLayout(layout);
      return;
    }
    this._generateNextPieces(this._guaranteedNextPieces);
    this._spawnInitialBalls();
  }

  private _applyFixedLayout(layout: FixedLevelLayout): void {
    const spawned: NewBall[] = [];
    for (const cell of layout.initialCells) {
      if (cell.row < 0 || cell.row >= BOARD_SIZE || cell.col < 0 || cell.col >= BOARD_SIZE) {
        continue;
      }
      const piece = clonePiece(cell.piece);
      this._grid[cell.row][cell.col] = piece;
      spawned.push({ position: { row: cell.row, col: cell.col }, piece });
    }

    this._nextPieces = layout.nextPieces.slice(0, this._ballsPerTurn).map(clonePiece);
    this._nextPositions = layout.nextLandingPositions
      ? layout.nextLandingPositions.slice(0, this._ballsPerTurn).map(pos => ({ ...pos }))
      : null;

    EventBus.emit('board:nextColors', this._nextPieces);
    EventBus.emit('board:spawned', spawned);
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
    const piece = this._grid[from.row][from.col];
    if (!isMovablePiece(piece)) return { moved: false, eliminated: [], score: 0, newBalls: [], gameOver: false, stepsUsed: 0 };

    this._grid[from.row][from.col] = null;
    const path = findPath(this._grid, from, to);

    if (!path) {
      this._grid[from.row][from.col] = piece;
      return { moved: false, eliminated: [], score: 0, newBalls: [], gameOver: false, stepsUsed: 0 };
    }

    this._grid[to.row][to.col] = piece;
    this._stepsUsed++;

    const eliminated = detectLines(this._grid, [to]);

    // Expand elimination with bomb ball chain
    const bombExpanded = this._expandBombElimination(eliminated);
    const allEliminated = bombExpanded.length > eliminated.length ? bombExpanded : eliminated;

    if (allEliminated.length > 0) {
      const bombCells = bombExpanded.length > eliminated.length
        ? bombExpanded.filter(p => !eliminated.some(e => e.row === p.row && e.col === p.col))
        : [];
      const turnResult = this._processElimination(allEliminated, bombCells);

      return {
        moved: true, path, eliminated: allEliminated, score: turnResult.score,
        newBalls: [], gameOver: false, stepsUsed: this._stepsUsed, changedPieces: turnResult.changedPieces,
        bombCells: bombCells.length > 0 ? bombCells : undefined,
      };
    }

    // No elimination - spawn new balls
    const newBalls = this._spawnNextBalls();

    const newBallPositions = newBalls.map(b => b.position);
    const autoEliminated = detectLines(this._grid, newBallPositions);
    const autoExpanded = this._expandBombElimination(autoEliminated);
    const autoBombCells = autoExpanded.length > autoEliminated.length
      ? autoExpanded.filter(p => !autoEliminated.some(e => e.row === p.row && e.col === p.col))
      : [];
    let autoResult: EliminationResult = { score: 0, changedPieces: [] };
    if (autoExpanded.length > 0) {
      autoResult = this._processElimination(autoExpanded, autoBombCells);
    }

    this._generateNextPieces();

    const gameOver = this._checkGameOver();

    return {
      moved: true, path,
      eliminated: [],
      score: autoResult.score, newBalls, gameOver, stepsUsed: this._stepsUsed,
      autoEliminated: autoExpanded.length > 0 ? autoExpanded : undefined,
      autoBombCells: autoBombCells.length > 0 ? autoBombCells : undefined,
      autoChangedPieces: autoResult.changedPieces,
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
      if (!isBombPiece(this._grid[p.row][p.col])) continue;

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

  /** Randomly remove every ball of one existing color. */
  clearRandomColor(): PropClearResult {
    const colors = new Set<number>();
    for (let r = 0; r < BOARD_SIZE; r++) {
      for (let c = 0; c < BOARD_SIZE; c++) {
        const color = getPieceColor(this._grid[r][c]);
        if (color !== null) colors.add(color);
      }
    }

    const colorList = Array.from(colors);
    if (colorList.length === 0) return { positions: [], score: 0 };

    const targetColor = colorList[Math.floor(Math.random() * colorList.length)];
    const positions = this._collectCells((piece) => getPieceColor(piece) === targetColor);
    return { ...this._clearCellsForProp(positions), targetColor };
  }

  /** Remove all occupied cells in the selected row and column. */
  clearCrossAt(pos: Point): PropClearResult {
    const positions = this._collectCells((_piece, row, col) => row === pos.row || col === pos.col);
    return this._clearCellsForProp(positions);
  }

  /** Turn the whole next queue into wild balls. */
  makeNextPiecesWild(): void {
    this._nextPieces = this._nextPieces.map(() => ({ kind: 'wild' as const }));
    this._nextPositions = null;
    EventBus.emit('board:nextColors', this._nextPieces);
  }

  /** Get or compute positions where next balls will land (for preview prop) */
  getNextPositions(): Point[] {
    if (this._nextPositions) return this._nextPositions;

    const empty = this.getEmptyCells();
    const positions: Point[] = [];
    const tempEmpty = [...empty];

    for (let i = 0; i < this._nextPieces.length && tempEmpty.length > 0; i++) {
      const idx = Math.floor(Math.random() * tempEmpty.length);
      positions.push(tempEmpty.splice(idx, 1)[0]);
    }

    this._nextPositions = positions;
    return positions;
  }

  // ─── Internal ────────────────────────────────────────────

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

  private _processElimination(eliminated: Point[], explosionCells: Point[] = []): EliminationResult {
    const totalScore = scoreForLine(eliminated.length);
    const explosionSet = new Set(explosionCells.map(p => `${p.row},${p.col}`));
    const changedPieces: ChangedPiece[] = [];

    for (const p of eliminated) {
      const piece = this._grid[p.row][p.col];
      if (!piece) continue;
      const next = explosionSet.has(`${p.row},${p.col}`)
        ? damagePieceByExplosion(piece)
        : damagePieceByLine(piece);
      this._grid[p.row][p.col] = next;
      if (next) {
        changedPieces.push({ position: p, piece: clonePiece(next) });
      }
    }
    this._score += totalScore;
    EventBus.emit('board:eliminated', eliminated, totalScore);
    return { score: totalScore, changedPieces };
  }

  private _collectCells(predicate: (piece: Piece, row: number, col: number) => boolean): Point[] {
    const result: Point[] = [];
    for (let r = 0; r < BOARD_SIZE; r++) {
      for (let c = 0; c < BOARD_SIZE; c++) {
        const piece = this._grid[r][c];
        if (piece && predicate(piece, r, c)) {
          result.push({ row: r, col: c });
        }
      }
    }
    return result;
  }

  private _clearCellsForProp(positions: Point[]): PropClearResult {
    if (positions.length === 0) return { positions: [], score: 0 };

    for (const pos of positions) {
      this._grid[pos.row][pos.col] = null;
    }
    this._nextPositions = null;
    EventBus.emit('board:eliminated', positions, 0);
    return { positions, score: 0 };
  }

  private _spawnNextBalls(): NewBall[] {
    const empty = this.getEmptyCells();
    const spawned: NewBall[] = [];
    const count = Math.min(this._nextPieces.length, empty.length);

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

      const piece = clonePiece(this._nextPieces[i]);
      this._grid[pos.row][pos.col] = piece;
      spawned.push({ position: pos, piece });
    }

    EventBus.emit('board:spawned', spawned);
    return spawned;
  }

  private _spawnInitialBalls(): void {
    const empty = this.getEmptyCells();
    const spawned: NewBall[] = [];

    const guaranteed = this._guaranteedInitialPieces.map(kind => createSpecialPiece(kind, this._colorCount));
    for (let i = 0; i < this._initialBalls && empty.length > 0; i++) {
      const idx = Math.floor(Math.random() * empty.length);
      const pos = empty.splice(idx, 1)[0];
      const piece = guaranteed[i] ? clonePiece(guaranteed[i]) : this._rollPiece();
      this._grid[pos.row][pos.col] = piece;
      spawned.push({ position: pos, piece });
    }

    EventBus.emit('board:spawned', spawned);
  }

  private _generateNextPieces(guaranteedKinds: readonly PieceSpawnKind[] = []): void {
    this._nextPieces = [];
    for (let i = 0; i < this._ballsPerTurn; i++) {
      const kind = guaranteedKinds[i];
      this._nextPieces.push(kind && kind !== 'block'
        ? createSpecialPiece(kind, this._colorCount)
        : this._rollNextPiece()
      );
    }
    this._nextPositions = null;
    EventBus.emit('board:nextColors', this._nextPieces);
  }

  /** Roll a piece, with chance for special pieces in level mode. */
  private _rollPiece(): Piece {
    return rollSpawnPiece(this._colorCount, this._isLevelMode ? this._specialChances : {});
  }

  /** Blocks are board obstacles, so they should only enter through initial setup. */
  private _rollNextPiece(): Piece {
    if (!this._isLevelMode) return rollSpawnPiece(this._colorCount);
    return rollSpawnPiece(this._colorCount, { ...this._specialChances, blockChance: 0 });
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
    this._generateNextPieces();
    EventBus.emit('board:revived');
  }

  exportState() {
    return {
      grid: this._grid.map(row => row.map(cloneCell)),
      nextPieces: this._nextPieces.map(clonePiece),
      score: this._score,
      bestScore: this._bestScore,
    };
  }

  loadState(state: ReturnType<typeof this.exportState>): void {
    this._grid = state.grid.map(row => row.map(cloneCell));
    this._nextPieces = state.nextPieces.map(clonePiece);
    this._score = state.score;
    this._bestScore = state.bestScore;
    this._gameOver = false;
  }

  /** Restore classic mode from a saved in-progress game. */
  loadClassicState(state: ReturnType<typeof this.exportState>): void {
    this._isLevelMode = false;
    this._colorCount = CLASSIC_COLOR_COUNT;
    this._initialBalls = INITIAL_BALLS;
    this._ballsPerTurn = BALLS_PER_TURN;
    this._noSpawnThreshold = 99;
    this._specialChances = {};
    this._guaranteedInitialPieces = [];
    this._guaranteedNextPieces = [];
    this._stepsUsed = 0;
    this._nextPositions = null;
    this.loadState(state);
    EventBus.emit('board:nextColors', this._nextPieces);
    EventBus.emit('ui:scoreChanged', this._score, 0);
  }
}

export interface NewBall {
  position: Point;
  piece: Piece;
}

export interface ChangedPiece {
  position: Point;
  piece: Piece;
}

interface EliminationResult {
  score: number;
  changedPieces: ChangedPiece[];
}

export interface PropClearResult {
  positions: Point[];
  score: number;
  targetColor?: number;
}

export interface MoveResult {
  moved: boolean;
  path?: Point[];
  eliminated: Point[];
  autoEliminated?: Point[];
  /** Extra cells cleared by bomb explosions (subset of eliminated not in the line) */
  bombCells?: Point[];
  /** Extra cells cleared by bomb explosions during automatic next-ball elimination */
  autoBombCells?: Point[];
  changedPieces?: ChangedPiece[];
  autoChangedPieces?: ChangedPiece[];
  score: number;
  newBalls: NewBall[];
  gameOver: boolean;
  stepsUsed: number;
}

export const BoardManager = new BoardManagerClass();
