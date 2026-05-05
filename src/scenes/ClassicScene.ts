import * as PIXI from 'pixi.js';
import { Game } from '@/core/Game';
import { SceneManager, type Scene } from '@/core/SceneManager';
import { EventBus } from '@/core/EventBus';
import { BoardManager } from '@/managers/BoardManager';
import { PropManager } from '@/managers/PropManager';
import { BoardView } from '@/gameobjects/BoardView';
import { ScorePanel } from '@/ui/ScorePanel';
import { PreviewPanel } from '@/ui/PreviewPanel';
import { GameOverOverlay } from '@/ui/GameOverOverlay';
import { BEST_SCORE_KEY } from '@/config/CloudConfig';
import { computeBoardLayout, PLAYFIELD_VERTICAL_OFFSET } from '@/config/GameConfig';
import { PersistService } from '@/core/PersistService';
import { RankManager } from '@/managers/RankManager';
import { SkinManager } from '@/managers/SkinManager';
import { createBgSprite } from '@/utils/bgHelper';
import { BallSprite } from '@/gameobjects/BallSprite';
import { addImageSprite } from '@/utils/imageTexture';

export class ClassicScene implements Scene {
  readonly name = 'classic';
  readonly container = new PIXI.Container();

  private _boardView!: BoardView;
  private _scorePanel!: ScorePanel;
  private _previewPanel!: PreviewPanel;
  private _gameOverOverlay!: GameOverOverlay;
  private _backBtn!: PIXI.Container;

  onEnter(): void {
    this.container.removeChildren();
    BallSprite.useTextures = true;

    PropManager.resetSession();

    const bg = createBgSprite(SkinManager.getGameplayBackground('classic'), Game.logicWidth, Game.logicHeight, 0x2F6CEB);
    this.container.addChild(bg);

    const metrics = computeBoardLayout(Game.logicWidth, Game.logicHeight, Game.safeTop, {
      sidePadding: 42,
      maxCellSize: 90,
      bottomPadding: 130,
    });

    const backY = Math.max(Game.safeTop + 28, 34);
    const hudX = 82;
    const hudY = Math.max(metrics.topBarY + 38, Game.safeTop + 106);
    const hudW = Game.logicWidth - hudX * 2;
    const hudH = 154;
    this._createHudPanel(hudX, hudY, hudW, hudH);

    // Back button
    this._backBtn = this._createBackButton();
    this._backBtn.x = 42;
    this._backBtn.y = backY;
    this.container.addChild(this._backBtn);

    // Score panel
    this._scorePanel = new ScorePanel();
    this._scorePanel.x = hudX + hudW * 0.34;
    this._scorePanel.y = hudY + 26;
    this.container.addChild(this._scorePanel);

    // Preview panel
    this._previewPanel = new PreviewPanel();
    this._previewPanel.x = hudX + hudW * 0.79;
    this._previewPanel.y = hudY + 26;
    this.container.addChild(this._previewPanel);

    // Board view — classic stone theme（无道具栏）
    this._boardView = new BoardView('classic');
    this._boardView.layout(Game.logicWidth, Game.logicHeight, Game.safeTop);
    this._boardView.y += 84;
    this.container.addChild(this._boardView);

    // Game over overlay
    this._gameOverOverlay = new GameOverOverlay();
    this.container.addChild(this._gameOverOverlay);

    // Init game
    BoardManager.init();
    this._boardView.syncWithBoard();
    this._scorePanel.setScore(0);
    this._scorePanel.setBestScore(BoardManager.bestScore);

    this._loadBestScore();
    this._bindEvents();
  }

  onExit(): void {
    this._unbindEvents();
    this._saveBestScore();
  }

  private _onScoreChanged = (total: number, _delta: number) => {
    this._scorePanel.setScore(total);
    if (total > BoardManager.bestScore) {
      this._scorePanel.setBestScore(total);
    }
  };

  private _onGameOver = (score: number) => {
    this._saveBestScore();
    RankManager.addClassicScore(score);
    this._gameOverOverlay.show(score, BoardManager.bestScore);
  };

  private _onRestart = () => {
    PropManager.resetSession();
    BoardManager.reset();
    this._boardView.syncWithBoard();
    this._scorePanel.setScore(0);
    this._scorePanel.setBestScore(BoardManager.bestScore);
  };

  private _bindEvents(): void {
    EventBus.on('ui:scoreChanged', this._onScoreChanged);
    EventBus.on('ui:gameOver', this._onGameOver);
    EventBus.on('game:restart', this._onRestart);
  }

  private _unbindEvents(): void {
    EventBus.off('ui:scoreChanged', this._onScoreChanged);
    EventBus.off('ui:gameOver', this._onGameOver);
    EventBus.off('game:restart', this._onRestart);
  }

  private _createBackButton(): PIXI.Container {
    const btn = new PIXI.Container();
    btn.eventMode = 'static';
    btn.cursor = 'pointer';

    addImageSprite(btn, 'subpkg_assets/images/classic_back_button.png', (sprite) => {
      sprite.width = 88;
      sprite.height = 88;
    });
    btn.hitArea = new PIXI.Circle(44, 44, 44);

    btn.on('pointerdown', () => {
      this._saveBestScore();
      SceneManager.switchTo('home');
    });

    return btn;
  }

  private _createHudPanel(x: number, y: number, w: number, h: number): void {
    const holder = new PIXI.Container();
    holder.x = x;
    holder.y = y;
    this.container.addChild(holder);
    addImageSprite(holder, 'subpkg_assets/images/classic_score_hud.png', (sprite) => {
      sprite.width = w;
      sprite.height = h;
    });
  }

  private _loadBestScore(): void {
    const raw = PersistService.readRaw(BEST_SCORE_KEY);
    if (raw) {
      const best = parseInt(raw, 10);
      if (!isNaN(best)) {
        BoardManager.setBestScore(best);
        this._scorePanel.setBestScore(best);
      }
    }
  }

  private _saveBestScore(): void {
    PersistService.writeRaw(BEST_SCORE_KEY, String(BoardManager.bestScore));
  }
}
