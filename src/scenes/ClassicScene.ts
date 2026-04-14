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
import { computeBoardLayout, PLAYFIELD_VERTICAL_OFFSET } from '@/config/GameConfig';
import { Platform } from '@/core/PlatformService';
import { RankManager } from '@/managers/RankManager';
import { createBgSprite } from '@/utils/bgHelper';
import { BallSprite } from '@/gameobjects/BallSprite';

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
    BallSprite.useTextures = false;

    PropManager.resetSession();

    // Background — dark stone atmosphere
    const bg = createBgSprite('images/bg_classic.jpg', Game.logicWidth, Game.logicHeight, 0x1C2833);
    this.container.addChild(bg);

    const metrics = computeBoardLayout(Game.logicWidth, Game.logicHeight, Game.safeTop, {
      sidePadding: 10,
      maxCellSize: 100,
      bottomPadding: 130,
    });

    // Back button
    this._backBtn = this._createBackButton();
    this._backBtn.x = 20;
    this._backBtn.y = Game.safeTop + 15 + PLAYFIELD_VERTICAL_OFFSET;
    this.container.addChild(this._backBtn);

    // Score panel
    this._scorePanel = new ScorePanel();
    this._scorePanel.x = Game.logicWidth / 2;
    this._scorePanel.y = metrics.topBarY + 10;
    this.container.addChild(this._scorePanel);

    // Preview panel
    this._previewPanel = new PreviewPanel();
    this._previewPanel.x = Game.logicWidth / 2 - 130;
    this._previewPanel.y = metrics.previewY + 20;
    this.container.addChild(this._previewPanel);

    // Board view — classic stone theme（无道具栏）
    this._boardView = new BoardView('classic');
    this._boardView.layout(Game.logicWidth, Game.logicHeight, Game.safeTop);
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

    const bg = new PIXI.Graphics();
    bg.beginFill(0xFFFFFF, 0.12);
    bg.drawRoundedRect(0, 0, 80, 38, 10);
    bg.endFill();
    bg.lineStyle(1, 0xFFFFFF, 0.15);
    bg.drawRoundedRect(0, 0, 80, 38, 10);
    btn.addChild(bg);

    const text = new PIXI.Text('← 返回', new PIXI.TextStyle({
      fontSize: 18, fill: 0x8899AA, fontWeight: 'bold', fontFamily: 'Arial',
    }));
    text.anchor.set(0.5, 0.5);
    text.x = 40;
    text.y = 20;
    btn.addChild(text);

    btn.on('pointerdown', () => {
      this._saveBestScore();
      SceneManager.switchTo('home');
    });

    return btn;
  }

  private _loadBestScore(): void {
    const raw = Platform.getStorageSync('caizhu_best_score');
    if (raw) {
      const best = parseInt(raw, 10);
      if (!isNaN(best)) {
        BoardManager.setBestScore(best);
        this._scorePanel.setBestScore(best);
      }
    }
  }

  private _saveBestScore(): void {
    Platform.setStorageSync('caizhu_best_score', String(BoardManager.bestScore));
  }
}
