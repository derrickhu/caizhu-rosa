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
import { SpecialPieceIntroOverlay } from '@/ui/SpecialPieceIntroOverlay';
import { LevelTutorialOverlay } from '@/ui/LevelTutorialOverlay';
import { PropBar } from '@/ui/PropBar';
import { PropInfoOverlay } from '@/ui/PropInfoOverlay';
import { getLevelDef, getLevelStars, getMaxStarScore, getPassScore, TOTAL_LEVELS, type LevelDef } from '@/config/LevelConfig';
import { LEVEL1_TUTORIAL_LAYOUT } from '@/config/Level1TutorialLayout';
import { getLevelLayout } from '@/config/LevelLayouts';
import { getSpecialPieceIntros, hasSeenSpecialPieceIntro, markSpecialPieceIntroSeen, type SpecialPieceIntroDef } from '@/config/SpecialPieceIntroConfig';
import { PropType } from '@/config/PropConfig';
import { LEVEL1_TUTORIAL_KEY } from '@/config/CloudConfig';
import { createBgSprite } from '@/utils/bgHelper';
import { BallSprite } from '@/gameobjects/BallSprite';
import { addImageSprite } from '@/utils/imageTexture';
import { SkinManager } from '@/managers/SkinManager';
import { PersistService } from '@/core/PersistService';
import { AudioManager } from '@/core/AudioManager';
import { AUDIO_ASSETS, AUDIO_VOLUME } from '@/config/AudioConfig';
import type { Point } from '@/systems/PathFinder';
import { analytics } from '@/analytics';

export class LevelScene implements Scene {
  readonly name = 'level';
  readonly container = new PIXI.Container();

  private _boardView!: BoardView;
  private _hud!: LevelHud;
  private _previewPanel!: PreviewPanel;
  private _propBar!: PropBar;
  private _completeOverlay!: LevelCompleteOverlay;
  private _failOverlay!: LevelFailOverlay;
  private _introOverlay!: SpecialPieceIntroOverlay;
  private _propInfoOverlay!: PropInfoOverlay;
  private _tutorialOverlay!: LevelTutorialOverlay;
  private _levelDef!: LevelDef;

  private _timerActive = false;
  private _timeRemaining = 0;
  private _tickerCallback: (() => void) | null = null;
  private _finished = false;
  private _tutorialActive = false;
  private _roundStartTs = 0;

  onEnter(): void {
    this.container.removeChildren();
    AudioManager.playBGM(AUDIO_ASSETS.bgmLevel, AUDIO_VOLUME.bgmLevel);
    BallSprite.useTextures = true;
    this._finished = false;
    this._tutorialActive = false;

    const levelId = LevelManager.currentLevelId;
    const def = getLevelDef(levelId);
    if (!def) {
      SceneManager.switchTo('levelSelect');
      return;
    }
    this._levelDef = def;
    this._tutorialActive = this._shouldRunLevel1Tutorial(def.id);

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

    this._introOverlay = new SpecialPieceIntroOverlay();
    this.container.addChild(this._introOverlay);

    this._propInfoOverlay = new PropInfoOverlay();
    this.container.addChild(this._propInfoOverlay);

    this._tutorialOverlay = new LevelTutorialOverlay();
    this.container.addChild(this._tutorialOverlay);

    // Init board with level config
    const levelConfig = {
      colorCount: def.colorCount,
      initialBalls: def.initialBalls,
      ballsPerTurn: def.ballsPerTurn,
      noSpawnThreshold: def.noSpawnThreshold,
      wildBallChance: def.wildBallChance,
      bombBallChance: def.bombBallChance,
      frozenBallChance: def.frozenBallChance,
      chainBallChance: def.chainBallChance,
      blockChance: def.blockChance,
      guaranteedInitialPieces: def.guaranteedInitialPieces,
      guaranteedNextPieces: def.guaranteedNextPieces,
    };
    if (this._tutorialActive) {
      BoardManager.initLevelWithLayout(levelConfig, LEVEL1_TUTORIAL_LAYOUT);
    } else if (def.layoutId) {
      const layout = getLevelLayout(def.layoutId);
      if (layout) {
        BoardManager.initLevelWithLayout(levelConfig, layout);
      } else {
        console.warn(`[LevelScene] Missing layout for ${def.layoutId}`);
        BoardManager.initLevel(levelConfig);
      }
    } else {
      BoardManager.initLevel(levelConfig);
    }
    this._roundStartTs = Date.now();
    analytics.trackLevelStart({
      levelId: def.id,
      levelName: `第${def.id}关`,
      mode: 'level',
      extra: {
        level_type: def.type,
        pass_score: getPassScore(def.starScores),
        max_star_score: getMaxStarScore(def.starScores),
        color_count: def.colorCount,
        step_limit: def.stepLimit || 0,
        time_limit: def.timeLimit || 0,
        is_tutorial: this._tutorialActive,
      },
    });
    this._boardView.syncWithBoard(true);
    requestAnimationFrame(() => {
      if (!this.container.destroyed && this._boardView) {
        this._boardView.syncWithBoard(true);
      }
    });
    this._hud.updateScore(0);

    if (def.type === 'steps') {
      this._hud.updateSteps(0);
    }

    this._propBar.refresh();
    this._bindEvents();
    this._showIntroOrStartTimer();
  }

  onExit(): void {
    this._unbindEvents();
    this._timerActive = false;
    this._tutorialActive = false;
    this._boardView?.setTutorialGate(null);
    this._tutorialOverlay?.hide();
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
    if (this._finished) return;

    if (this._levelDef.type === 'steps') {
      this._hud.updateSteps(BoardManager.stepsUsed);
    }

    if (this._tutorialActive) {
      if (this._tutorialOverlay.currentStep === 'move') {
        analytics.trackTutorialStep({
          stepId: 'move_first_piece',
          stepIndex: 2,
          status: 'done',
          isForce: true,
          extra: { level_id: this._levelDef.id },
        });
        this._tutorialOverlay.setStep('complete');
      }
      return;
    }

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

  private _showIntroOrStartTimer(): void {
    const intros = getSpecialPieceIntros(this._levelDef.id)
      .filter(intro => !hasSeenSpecialPieceIntro(intro.id));
    if (intros.length === 0) {
      this._startTutorialOrTimer();
      return;
    }

    this._showIntroQueue(intros);
  }

  private _showIntroQueue(intros: SpecialPieceIntroDef[]): void {
    const [intro, ...rest] = intros;
    this._introOverlay.show(intro, () => {
      markSpecialPieceIntroSeen(intro.id);
      if (rest.length > 0) {
        this._showIntroQueue(rest);
      } else {
        this._startTutorialOrTimer();
      }
    });
  }

  private _startTutorialOrTimer(): void {
    if (this._tutorialActive) {
      this._startLevel1Tutorial();
      return;
    }
    this._startTimerIfNeeded();
  }

  private _startLevel1Tutorial(): void {
    const previewAnchor = new PIXI.Point(
      this._previewPanel.x,
      this._previewPanel.y + 14,
    );
    const sourceLocal = this._boardView.getCellCenter(
      LEVEL1_TUTORIAL_LAYOUT.source.row,
      LEVEL1_TUTORIAL_LAYOUT.source.col,
    );
    const targetLocal = this._boardView.getCellCenter(
      LEVEL1_TUTORIAL_LAYOUT.target.row,
      LEVEL1_TUTORIAL_LAYOUT.target.col,
    );
    const sourceAnchor = new PIXI.Point(
      this._boardView.x + sourceLocal.x,
      this._boardView.y + sourceLocal.y,
    );
    const targetAnchor = new PIXI.Point(
      this._boardView.x + targetLocal.x,
      this._boardView.y + targetLocal.y,
    );

    this._boardView.setTutorialGate((cell) => (
      this._tutorialOverlay.allowsCell(cell, LEVEL1_TUTORIAL_LAYOUT.source, LEVEL1_TUTORIAL_LAYOUT.target)
    ));
    this._boardView.syncWithBoard(true);
    this._tutorialOverlay.show({
      preview: previewAnchor,
      source: sourceAnchor,
      target: targetAnchor,
      cellSize: this._boardView.cellSize,
      ballRadius: this._boardView.ballRadius,
      previewBanner: { width: 560, height: 101 },
    }, () => this._completeLevel1Tutorial());
    analytics.trackTutorialStep({
      stepId: 'show_first_move_hint',
      stepIndex: 0,
      status: 'done',
      isForce: true,
      extra: { level_id: this._levelDef.id },
    });
  }

  private _completeLevel1Tutorial(): void {
    PersistService.writeJSON(LEVEL1_TUTORIAL_KEY, { completed: true, version: 1, completedAt: Date.now() });
    analytics.trackTutorialStep({
      stepId: 'complete_first_move',
      stepIndex: 3,
      status: 'done',
      isForce: true,
      extra: { level_id: this._levelDef.id },
    });
    this._tutorialActive = false;
    this._boardView.setTutorialGate(null);
    this._boardView.syncWithBoard(true);
    this._startTimerIfNeeded();
  }

  private _startTimerIfNeeded(): void {
    if (this._levelDef.type !== 'timed' || !this._levelDef.timeLimit || this._tickerCallback) return;

    this._timeRemaining = this._levelDef.timeLimit;
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

  private _onLevelComplete(): void {
    if (this._finished) return;
    this._finished = true;
    this._timerActive = false;

    const score = BoardManager.score;
    const stars = getLevelStars(score, this._levelDef.starScores);
    LevelManager.recordCompletion(this._levelDef.id, score, this._levelDef.starScores);
    AudioManager.play('victory');
    analytics.trackLevelClear({
      levelId: this._levelDef.id,
      levelName: `第${this._levelDef.id}关`,
      mode: 'level',
      durationMs: Date.now() - this._roundStartTs,
      extra: {
        score,
        stars,
        steps_used: BoardManager.stepsUsed,
        pass_score: getPassScore(this._levelDef.starScores),
        max_star_score: getMaxStarScore(this._levelDef.starScores),
      },
    });

    const isLast = this._levelDef.id >= TOTAL_LEVELS;
    this._completeOverlay.show(score, stars, isLast);
  }

  private _onLevelFail(): void {
    if (this._finished) return;
    this._finished = true;
    this._timerActive = false;

    analytics.trackLevelFail({
      levelId: this._levelDef.id,
      levelName: `第${this._levelDef.id}关`,
      mode: 'level',
      durationMs: Date.now() - this._roundStartTs,
      reason: this._getFailReason(),
      extra: {
        score: BoardManager.score,
        steps_used: BoardManager.stepsUsed,
        pass_score: getPassScore(this._levelDef.starScores),
      },
    });
    this._failOverlay.show(BoardManager.score, getPassScore(this._levelDef.starScores));
  }

  // ─── Prop Handlers ───────────────────────────────────────

  private _onPropRequest = (type: PropType) => {
    if (this._finished || this._tutorialActive) return;

    const canRequestUse = PropManager.canRequestUse(type);
    analytics.track('prop_request', {
      mode: 'level',
      prop_type: type,
      level_id: this._levelDef.id,
      can_request: canRequestUse,
      score: BoardManager.score,
      steps_used: BoardManager.stepsUsed,
    });
    this._propInfoOverlay.show(type, canRequestUse, () => this._confirmPropUse(type));
  };

  private _confirmPropUse(type: PropType): void {
    if (this._finished || this._tutorialActive) return;

    // 道具每次使用都必须看激励视频，并且每局每种道具只能使用一次。
    PropManager.requestUse(type, { levelId: this._levelDef.id, mode: 'level' }).then((granted) => {
      if (granted && !this._finished) {
        analytics.track('prop_use', {
          mode: 'level',
          prop_type: type,
          level_id: this._levelDef.id,
          score: BoardManager.score,
          steps_used: BoardManager.stepsUsed,
        });
        this._executeProp(type);
      }
    });
  }

  private _executeProp(type: PropType): void {
    switch (type) {
      case PropType.ColorBlast:
        void this._usePropColorBlast();
        break;
      case PropType.CrossClear:
        this._usePropCrossClear();
        break;
      case PropType.WildNext:
        this._usePropWildNext();
        break;
    }
  }

  private async _usePropColorBlast(): Promise<void> {
    const result = BoardManager.clearRandomColor();
    await this._boardView.animatePropClear(result);
    this._afterPropScoreChanged(result.score);
  }

  private _usePropCrossClear(): void {
    this._boardView.setInteractionMode('crossClear');
  }

  private _onCrossClearDone = (result: { score: number }) => {
    this._afterPropScoreChanged(result.score);
  };

  private _usePropWildNext(): void {
    BoardManager.makeNextPiecesWild();
    AudioManager.play('propSuccess');
  }

  private _afterPropScoreChanged(scoreDelta: number): void {
    if (scoreDelta <= 0) return;
    this._onScoreChanged(BoardManager.score, scoreDelta);
    AudioManager.play('propSuccess');
  }

  // ─── Navigation Handlers ─────────────────────────────────

  private _onRetry = () => {
    if (this._tutorialActive) return;
    analytics.track('level_retry', {
      mode: 'level',
      level_id: this._levelDef.id,
      score: BoardManager.score,
      steps_used: BoardManager.stepsUsed,
    });
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
    if (this._tutorialActive) return;
    analytics.track('level_quit', {
      mode: 'level',
      level_id: this._levelDef.id,
      score: BoardManager.score,
      steps_used: BoardManager.stepsUsed,
      duration_ms: Date.now() - this._roundStartTs,
    });
    SceneManager.switchTo('levelSelect');
  };

  // ─── Event Binding ───────────────────────────────────────

  private _onBoardSelected = (_pos: Point) => {
    if (!this._tutorialActive || this._tutorialOverlay.currentStep !== 'select') return;
    analytics.trackTutorialStep({
      stepId: 'select_first_piece',
      stepIndex: 1,
      status: 'done',
      isForce: true,
      extra: { level_id: this._levelDef.id },
    });
    this._tutorialOverlay.setStep('move');
  };

  private _onTutorialRejected = () => {
    if (!this._tutorialActive) return;
    this._tutorialOverlay.flashRejected();
  };

  private _bindEvents(): void {
    EventBus.on('ui:scoreChanged', this._onScoreChanged);
    EventBus.on('ui:moveComplete', this._onMoveComplete);
    EventBus.on('board:eliminated', this._onBoardEliminated);
    EventBus.on('board:selected', this._onBoardSelected);
    EventBus.on('game:over', this._onGameOver);
    EventBus.on('level:retry', this._onRetry);
    EventBus.on('level:next', this._onNext);
    EventBus.on('level:back', this._onBack);
    EventBus.on('prop:request', this._onPropRequest);
    EventBus.on('prop:crossClearDone', this._onCrossClearDone);
    EventBus.on('tutorial:rejected', this._onTutorialRejected);
  }

  private _unbindEvents(): void {
    EventBus.off('ui:scoreChanged', this._onScoreChanged);
    EventBus.off('ui:moveComplete', this._onMoveComplete);
    EventBus.off('board:eliminated', this._onBoardEliminated);
    EventBus.off('board:selected', this._onBoardSelected);
    EventBus.off('game:over', this._onGameOver);
    EventBus.off('level:retry', this._onRetry);
    EventBus.off('level:next', this._onNext);
    EventBus.off('level:back', this._onBack);
    EventBus.off('prop:request', this._onPropRequest);
    EventBus.off('prop:crossClearDone', this._onCrossClearDone);
    EventBus.off('tutorial:rejected', this._onTutorialRejected);
  }

  private _createBackButton(): PIXI.Container {
    const btn = new PIXI.Container();
    btn.eventMode = 'static';
    btn.cursor = 'pointer';

    addImageSprite(btn, 'subpkg_assets/images/classic_back_button.png', (sprite) => {
      sprite.width = 72;
      sprite.height = 72;
    });
    btn.hitArea = new PIXI.Circle(36, 36, 36);

    btn.on('pointerdown', () => {
      if (this._tutorialActive) return;
      analytics.track('level_quit', {
        mode: 'level',
        level_id: this._levelDef.id,
        score: BoardManager.score,
        steps_used: BoardManager.stepsUsed,
        duration_ms: Date.now() - this._roundStartTs,
        source: 'top_back',
      });
      SceneManager.switchTo('levelSelect');
    });
    return btn;
  }

  private _shouldRunLevel1Tutorial(levelId: number): boolean {
    if (levelId !== 1) return false;
    const state = PersistService.readJSON<{ completed?: boolean }>(LEVEL1_TUTORIAL_KEY);
    return state?.completed !== true;
  }

  private _getFailReason(): string {
    if (this._levelDef.type === 'timed' && this._timeRemaining <= 0) return 'time_out';
    if (this._levelDef.type === 'steps' && this._levelDef.stepLimit && BoardManager.stepsUsed >= this._levelDef.stepLimit) {
      return 'step_limit';
    }
    if (BoardManager.gameOver) return 'board_full';
    return 'score_below_pass';
  }
}
