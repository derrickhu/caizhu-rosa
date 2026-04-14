import * as PIXI from 'pixi.js';
import { Game } from '@/core/Game';
import { SceneManager, type Scene } from '@/core/SceneManager';
import { EventBus } from '@/core/EventBus';
import { BoardManager } from '@/managers/BoardManager';
import { LevelManager } from '@/managers/LevelManager';
import { PropManager } from '@/managers/PropManager';
import { BoardView } from '@/gameobjects/BoardView';
import { PreviewPanel } from '@/ui/PreviewPanel';
import { LevelHud } from '@/ui/LevelHud';
import { LevelCompleteOverlay } from '@/ui/LevelCompleteOverlay';
import { LevelFailOverlay } from '@/ui/LevelFailOverlay';
import { PropBar } from '@/ui/PropBar';
import { getLevelDef, getLevelStars, TOTAL_LEVELS, type LevelDef } from '@/config/LevelConfig';
import { PropType, EXTRA_STEPS, EXTRA_TIME } from '@/config/PropConfig';
import { computeBoardLayout, PLAYFIELD_VERTICAL_OFFSET } from '@/config/GameConfig';
import { createBgSprite } from '@/utils/bgHelper';
import { BallSprite } from '@/gameobjects/BallSprite';

export class LevelScene implements Scene {
  readonly name = 'level';
  readonly container = new PIXI.Container();

  private _boardView!: BoardView;
  private _hud!: LevelHud;
  private _previewPanel!: PreviewPanel;
  private _propBar!: PropBar;
  private _completeOverlay!: LevelCompleteOverlay;
  private _failOverlay!: LevelFailOverlay;
  private _levelDef!: LevelDef;

  private _timerActive = false;
  private _timeRemaining = 0;
  private _tickerCallback: (() => void) | null = null;
  private _finished = false;
  private _extraLimitUsed = false;

  onEnter(): void {
    this.container.removeChildren();
    BallSprite.useTextures = true;
    this._finished = false;
    this._extraLimitUsed = false;

    const levelId = LevelManager.currentLevelId;
    const def = getLevelDef(levelId);
    if (!def) {
      SceneManager.switchTo('levelSelect');
      return;
    }
    this._levelDef = def;

    PropManager.resetSession();

    // Background — bright playful
    const bg = createBgSprite('images/bg_level.jpg', Game.logicWidth, Game.logicHeight, 0xE8F4F8);
    this.container.addChild(bg);

    const metrics = computeBoardLayout(Game.logicWidth, Game.logicHeight, Game.safeTop);

    // Back button
    const backBtn = this._createBackButton();
    backBtn.x = 20;
    backBtn.y = Game.safeTop + 8 + PLAYFIELD_VERTICAL_OFFSET;
    this.container.addChild(backBtn);

    // HUD — wide glass panel for readability on busy level backgrounds
    const hudInnerW = Math.min(400, Game.logicWidth - 48);
    const hudPanelPad = 28; // must match LevelHud horizontal padding (14×2)
    this._hud = new LevelHud(def, hudInnerW);
    this._hud.x = (Game.logicWidth - hudInnerW - hudPanelPad) / 2;
    this._hud.y = Game.safeTop + 6 + PLAYFIELD_VERTICAL_OFFSET;
    this.container.addChild(this._hud);

    // Preview
    this._previewPanel = new PreviewPanel({ variant: 'level' });
    this._previewPanel.x = Game.logicWidth / 2 - 130;
    this._previewPanel.y = metrics.previewY + 20;
    this.container.addChild(this._previewPanel);

    // Board — level playful theme
    this._boardView = new BoardView('level');
    this._boardView.layout(Game.logicWidth, Game.logicHeight, Game.safeTop);
    this.container.addChild(this._boardView);

    // Prop bar at bottom
    this._propBar = new PropBar();
    this._propBar.x = Game.logicWidth / 2;
    this._propBar.y = metrics.boardY + this._boardView.boardPixelSize + 24;
    this.container.addChild(this._propBar);

    // Overlays
    this._completeOverlay = new LevelCompleteOverlay();
    this.container.addChild(this._completeOverlay);

    this._failOverlay = new LevelFailOverlay();
    this.container.addChild(this._failOverlay);

    // Init board with level config
    BoardManager.initLevel({
      colorCount: def.colorCount,
      initialBalls: def.initialBalls,
      ballsPerTurn: def.ballsPerTurn,
      noSpawnThreshold: def.noSpawnThreshold,
      wildBallChance: def.wildBallChance,
      bombBallChance: def.bombBallChance,
    });
    this._boardView.syncWithBoard();
    this._hud.updateScore(0);

    if (def.type === 'steps') {
      this._hud.updateSteps(0);
    }

    // Timer for timed levels
    if (def.type === 'timed' && def.timeLimit) {
      this._timeRemaining = def.timeLimit;
      this._timerActive = true;
      this._hud.updateTime(this._timeRemaining);

      this._tickerCallback = () => {
        if (!this._timerActive || this._finished) return;
        const dt = Game.ticker.deltaMS / 1000;
        this._timeRemaining -= dt;
        this._hud.updateTime(this._timeRemaining);

        if (this._timeRemaining <= 0) {
          this._timerActive = false;
          this._onLevelFail();
        }
      };
      Game.ticker.add(this._tickerCallback);
    }

    this._propBar.refresh();
    this._bindEvents();
  }

  onExit(): void {
    this._unbindEvents();
    this._timerActive = false;
    if (this._tickerCallback) {
      Game.ticker.remove(this._tickerCallback);
      this._tickerCallback = null;
    }
  }

  // ─── Game State Handlers ─────────────────────────────────

  private _onScoreChanged = (_total: number, _delta: number) => {
    if (this._finished) return;
    const score = BoardManager.score;
    this._hud.updateScore(score);

    if (this._levelDef.type === 'steps') {
      this._hud.updateSteps(BoardManager.stepsUsed);
    }

    if (score >= this._levelDef.targetScore) {
      this._onLevelComplete();
      return;
    }

    if (this._levelDef.type === 'steps' && this._levelDef.stepLimit) {
      if (BoardManager.stepsUsed >= this._levelDef.stepLimit) {
        this._onLevelFail();
      }
    }
  };

  private _onBoardEliminated = () => {
    if (this._finished) return;
    const score = BoardManager.score;
    this._hud.updateScore(score);

    if (this._levelDef.type === 'steps') {
      this._hud.updateSteps(BoardManager.stepsUsed);
    }
  };

  private _onGameOver = () => {
    if (this._finished) return;
    if (BoardManager.score >= this._levelDef.targetScore) {
      this._onLevelComplete();
    } else {
      this._onLevelFail();
    }
  };

  private _onLevelComplete(): void {
    if (this._finished) return;
    this._finished = true;
    this._timerActive = false;

    const score = BoardManager.score;
    const stars = getLevelStars(score, this._levelDef.targetScore);
    LevelManager.recordCompletion(this._levelDef.id, score, this._levelDef.targetScore);

    const isLast = this._levelDef.id >= TOTAL_LEVELS;
    this._completeOverlay.show(score, stars, isLast);
  }

  private _onLevelFail(): void {
    if (this._finished) return;
    this._finished = true;
    this._timerActive = false;

    this._failOverlay.show(BoardManager.score, this._levelDef.targetScore);
  }

  // ─── Prop Handlers ───────────────────────────────────────

  private _onPropRequest = (type: PropType) => {
    if (this._finished) return;

    // Sync path: use from stock directly
    if (PropManager.canUse(type)) {
      PropManager.use(type);
      this._executeProp(type);
      return;
    }

    // Async path: need ad to get the prop
    PropManager.requestUse(type).then((granted) => {
      if (granted && !this._finished) {
        this._executeProp(type);
      }
    });
  };

  private _executeProp(type: PropType): void {
    switch (type) {
      case PropType.PositionPreview:
        this._usePropPositionPreview();
        break;
      case PropType.Undo:
        this._usePropUndo();
        break;
      case PropType.RemoveBall:
        this._usePropRemoveBall();
        break;
      case PropType.RerollColors:
        this._usePropReroll();
        break;
      case PropType.ExtraLimit:
        this._usePropExtraLimit();
        break;
    }
  }

  private _usePropPositionPreview(): void {
    const positions = BoardManager.getNextPositions();
    const colors = BoardManager.nextColors;
    this._boardView.showPositionPreview(positions, colors);
  }

  private _usePropUndo(): void {
    const success = BoardManager.undo();
    if (success) {
      this._boardView.syncWithBoard();
      this._hud.updateScore(BoardManager.score);
      if (this._levelDef.type === 'steps') {
        this._hud.updateSteps(BoardManager.stepsUsed);
      }
    }
  }

  private _usePropRemoveBall(): void {
    this._boardView.setInteractionMode('removeBall');
  }

  private _onRemoveBallDone = () => {
    this._boardView.setInteractionMode('normal');
  };

  private _usePropReroll(): void {
    BoardManager.rerollNextColors();
  }

  private _usePropExtraLimit(): void {
    if (this._extraLimitUsed) return;
    this._extraLimitUsed = true;

    if (this._levelDef.type === 'steps') {
      BoardManager.addExtraSteps(EXTRA_STEPS);
      this._hud.updateSteps(BoardManager.stepsUsed);
    } else if (this._levelDef.type === 'timed') {
      this._timeRemaining += EXTRA_TIME;
      this._hud.updateTime(this._timeRemaining);
    }
  }

  // ─── Navigation Handlers ─────────────────────────────────

  private _onRetry = () => {
    SceneManager.switchTo('level');
  };

  private _onNext = () => {
    const nextId = this._levelDef.id + 1;
    if (nextId <= TOTAL_LEVELS) {
      LevelManager.currentLevelId = nextId;
      SceneManager.switchTo('level');
    } else {
      SceneManager.switchTo('levelSelect');
    }
  };

  private _onBack = () => {
    SceneManager.switchTo('levelSelect');
  };

  // ─── Event Binding ───────────────────────────────────────

  private _bindEvents(): void {
    EventBus.on('ui:scoreChanged', this._onScoreChanged);
    EventBus.on('board:eliminated', this._onBoardEliminated);
    EventBus.on('game:over', this._onGameOver);
    EventBus.on('level:retry', this._onRetry);
    EventBus.on('level:next', this._onNext);
    EventBus.on('level:back', this._onBack);
    EventBus.on('prop:request', this._onPropRequest);
    EventBus.on('prop:removeBallDone', this._onRemoveBallDone);
  }

  private _unbindEvents(): void {
    EventBus.off('ui:scoreChanged', this._onScoreChanged);
    EventBus.off('board:eliminated', this._onBoardEliminated);
    EventBus.off('game:over', this._onGameOver);
    EventBus.off('level:retry', this._onRetry);
    EventBus.off('level:next', this._onNext);
    EventBus.off('level:back', this._onBack);
    EventBus.off('prop:request', this._onPropRequest);
    EventBus.off('prop:removeBallDone', this._onRemoveBallDone);
  }

  private _createBackButton(): PIXI.Container {
    const btn = new PIXI.Container();
    btn.eventMode = 'static';
    btn.cursor = 'pointer';

    const w = 88;
    const h = 42;
    const bg = new PIXI.Graphics();
    bg.beginFill(0x0F172A, 0.88);
    bg.drawRoundedRect(0, 0, w, h, 14);
    bg.endFill();
    bg.lineStyle(1.5, 0xFFFFFF, 0.22);
    bg.drawRoundedRect(0, 0, w, h, 14);
    btn.addChild(bg);

    const text = new PIXI.Text('返回', new PIXI.TextStyle({
      fontSize: 18,
      fill: 0xF1F5F9,
      fontFamily: 'Arial',
      fontWeight: 'bold',
      letterSpacing: 1,
    }));
    text.anchor.set(0.5, 0.5);
    text.x = w / 2;
    text.y = h / 2;
    btn.addChild(text);

    btn.on('pointerdown', () => SceneManager.switchTo('levelSelect'));
    return btn;
  }
}
