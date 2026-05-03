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
import { getLevelDef, getLevelStars, getMaxStarScore, getPassScore, TOTAL_LEVELS, type LevelDef } from '@/config/LevelConfig';
import { PropType, EXTRA_STEPS, EXTRA_TIME } from '@/config/PropConfig';
import { createBgSprite } from '@/utils/bgHelper';
import { BallSprite } from '@/gameobjects/BallSprite';
import { addImageSprite } from '@/utils/imageTexture';
import { SkinManager } from '@/managers/SkinManager';

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
    const bg = createBgSprite(SkinManager.getGameplayBackground('level'), Game.logicWidth, Game.logicHeight, 0xE8F4F8);
    this.container.addChild(bg);

    const hudW = Math.min(660, Game.logicWidth - 64);
    const hudH = Math.round(hudW * 0.385);
    const hudY = Game.safeTop + 58;
    const previewY = hudY + hudH + 62;

    // Back button
    const backBtn = this._createBackButton();
    backBtn.x = 34;
    backBtn.y = Game.safeTop - 11;
    this.container.addChild(backBtn);

    // HUD — image-backed panel matching the level prototype.
    this._hud = new LevelHud(def, hudW);
    this._hud.x = (Game.logicWidth - hudW) / 2;
    this._hud.y = hudY;
    this.container.addChild(this._hud);

    // Preview
    this._previewPanel = new PreviewPanel({ variant: 'level' });
    this._previewPanel.x = Game.logicWidth / 2;
    this._previewPanel.y = previewY;
    this.container.addChild(this._previewPanel);

    // Board — level playful theme
    this._boardView = new BoardView('level');
    this._boardView.layout(Game.logicWidth, Game.logicHeight, Game.safeTop);
    this._boardView.y = previewY + 144;
    this.container.addChild(this._boardView);

    // Prop bar at bottom
    this._propBar = new PropBar();
    this._propBar.x = Game.logicWidth / 2;
    this._propBar.y = this._boardView.y + this._boardView.boardPixelSize + 92;
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
          this._settleByFinalScore();
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

    if (score >= getMaxStarScore(this._levelDef.starScores)) {
      this._onLevelComplete();
      return;
    }

    if (this._levelDef.type === 'steps' && this._levelDef.stepLimit) {
      if (BoardManager.stepsUsed >= this._levelDef.stepLimit) {
        this._settleByFinalScore();
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

  private _onMoveComplete = () => {
    if (this._finished || this._levelDef.type !== 'steps') return;
    this._hud.updateSteps(BoardManager.stepsUsed);

    if (this._levelDef.stepLimit && BoardManager.stepsUsed >= this._levelDef.stepLimit) {
      this._settleByFinalScore();
    }
  };

  private _onGameOver = () => {
    if (this._finished) return;
    this._settleByFinalScore();
  };

  private _settleByFinalScore(): void {
    if (BoardManager.score >= getPassScore(this._levelDef.starScores)) {
      this._onLevelComplete();
    } else {
      this._onLevelFail();
    }
  }

  private _onLevelComplete(): void {
    if (this._finished) return;
    this._finished = true;
    this._timerActive = false;

    const score = BoardManager.score;
    const stars = getLevelStars(score, this._levelDef.starScores);
    LevelManager.recordCompletion(this._levelDef.id, score, this._levelDef.starScores);

    const isLast = this._levelDef.id >= TOTAL_LEVELS;
    this._completeOverlay.show(score, stars, isLast);
  }

  private _onLevelFail(): void {
    if (this._finished) return;
    this._finished = true;
    this._timerActive = false;

    this._failOverlay.show(BoardManager.score, getPassScore(this._levelDef.starScores));
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
    EventBus.on('ui:moveComplete', this._onMoveComplete);
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
    EventBus.off('ui:moveComplete', this._onMoveComplete);
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

    addImageSprite(btn, 'images/classic_back_button.png', (sprite) => {
      sprite.width = 72;
      sprite.height = 72;
    });
    btn.hitArea = new PIXI.Circle(36, 36, 36);

    btn.on('pointerdown', () => SceneManager.switchTo('levelSelect'));
    return btn;
  }
}
