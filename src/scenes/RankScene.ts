import * as PIXI from 'pixi.js';
import { Game } from '@/core/Game';
import { SceneManager, type Scene } from '@/core/SceneManager';
import { TweenManager, Ease } from '@/core/TweenManager';
import { RankManager } from '@/managers/RankManager';
import { createBgSprite } from '@/utils/bgHelper';

type Tab = 'classic' | 'level';

export class RankScene implements Scene {
  readonly name = 'rank';
  readonly container = new PIXI.Container();

  private _activeTab: Tab = 'classic';
  private _contentContainer!: PIXI.Container;
  private _classicTabBg!: PIXI.Graphics;
  private _levelTabBg!: PIXI.Graphics;
  private _classicTabText!: PIXI.Text;
  private _levelTabText!: PIXI.Text;

  onEnter(): void {
    this.container.removeChildren();
    this._activeTab = 'classic';

    const W = Game.logicWidth;
    const H = Game.logicHeight;

    const bg = createBgSprite('images/bg_home.jpg', W, H, 0x1C2833);
    this.container.addChild(bg);

    // Back button
    const backBtn = this._createBackButton();
    backBtn.x = 20;
    backBtn.y = Game.safeTop + 15;
    this.container.addChild(backBtn);

    // Title
    const title = new PIXI.Text('排行榜', new PIXI.TextStyle({
      fontSize: 40,
      fill: 0xFFFFFF,
      fontWeight: 'bold',
      fontFamily: 'Arial',
      letterSpacing: 4,
    }));
    title.anchor.set(0.5, 0);
    title.x = W / 2;
    title.y = Game.safeTop + 18;
    this.container.addChild(title);

    // Tabs
    const tabY = Game.safeTop + 85;
    this._createTabs(W, tabY);

    // Content area
    this._contentContainer = new PIXI.Container();
    this._contentContainer.y = tabY + 65;
    this.container.addChild(this._contentContainer);

    this._renderActiveTab();

    // Entrance animation
    title.alpha = 0;
    TweenManager.to({ target: title, props: { alpha: 1 }, duration: 0.4 });
  }

  onExit(): void {}

  private _createTabs(W: number, y: number): void {
    const tabW = 160;
    const tabH = 48;
    const gap = 16;
    const leftX = W / 2 - tabW - gap / 2;
    const rightX = W / 2 + gap / 2;

    // Classic tab
    const classicTab = new PIXI.Container();
    classicTab.x = leftX;
    classicTab.y = y;
    classicTab.eventMode = 'static';
    classicTab.cursor = 'pointer';
    classicTab.on('pointerdown', () => this._switchTab('classic'));

    this._classicTabBg = new PIXI.Graphics();
    classicTab.addChild(this._classicTabBg);

    this._classicTabText = new PIXI.Text('经典版', new PIXI.TextStyle({
      fontSize: 22,
      fill: 0xFFFFFF,
      fontWeight: 'bold',
      fontFamily: 'Arial',
    }));
    this._classicTabText.anchor.set(0.5, 0.5);
    this._classicTabText.x = tabW / 2;
    this._classicTabText.y = tabH / 2;
    classicTab.addChild(this._classicTabText);
    this.container.addChild(classicTab);

    // Level tab
    const levelTab = new PIXI.Container();
    levelTab.x = rightX;
    levelTab.y = y;
    levelTab.eventMode = 'static';
    levelTab.cursor = 'pointer';
    levelTab.on('pointerdown', () => this._switchTab('level'));

    this._levelTabBg = new PIXI.Graphics();
    levelTab.addChild(this._levelTabBg);

    this._levelTabText = new PIXI.Text('关卡版', new PIXI.TextStyle({
      fontSize: 22,
      fill: 0xFFFFFF,
      fontWeight: 'bold',
      fontFamily: 'Arial',
    }));
    this._levelTabText.anchor.set(0.5, 0.5);
    this._levelTabText.x = tabW / 2;
    this._levelTabText.y = tabH / 2;
    levelTab.addChild(this._levelTabText);
    this.container.addChild(levelTab);

    this._updateTabStyles();
  }

  private _updateTabStyles(): void {
    const tabW = 160;
    const tabH = 48;
    const activeColor = 0x2563EB;
    const inactiveColor = 0xFFFFFF;

    // Classic tab
    this._classicTabBg.clear();
    if (this._activeTab === 'classic') {
      this._classicTabBg.beginFill(activeColor, 0.95);
      this._classicTabBg.drawRoundedRect(0, 0, tabW, tabH, 14);
      this._classicTabBg.endFill();
      this._classicTabText.style.fill = 0xFFFFFF;
    } else {
      this._classicTabBg.beginFill(inactiveColor, 0.1);
      this._classicTabBg.drawRoundedRect(0, 0, tabW, tabH, 14);
      this._classicTabBg.endFill();
      this._classicTabBg.lineStyle(1.5, inactiveColor, 0.25);
      this._classicTabBg.drawRoundedRect(0, 0, tabW, tabH, 14);
      this._classicTabText.style.fill = 0x8899AA;
    }

    // Level tab
    this._levelTabBg.clear();
    if (this._activeTab === 'level') {
      this._levelTabBg.beginFill(0x059669, 0.95);
      this._levelTabBg.drawRoundedRect(0, 0, tabW, tabH, 14);
      this._levelTabBg.endFill();
      this._levelTabText.style.fill = 0xFFFFFF;
    } else {
      this._levelTabBg.beginFill(inactiveColor, 0.1);
      this._levelTabBg.drawRoundedRect(0, 0, tabW, tabH, 14);
      this._levelTabBg.endFill();
      this._levelTabBg.lineStyle(1.5, inactiveColor, 0.25);
      this._levelTabBg.drawRoundedRect(0, 0, tabW, tabH, 14);
      this._levelTabText.style.fill = 0x8899AA;
    }
  }

  private _switchTab(tab: Tab): void {
    if (this._activeTab === tab) return;
    this._activeTab = tab;
    this._updateTabStyles();
    this._renderActiveTab();
  }

  private _renderActiveTab(): void {
    this._contentContainer.removeChildren();
    if (this._activeTab === 'classic') {
      this._renderClassicTab();
    } else {
      this._renderLevelTab();
    }
  }

  // ─── Classic Tab ──────────────────────────────────────────

  private _renderClassicTab(): void {
    const W = Game.logicWidth;
    const records = RankManager.getClassicRecords();

    if (records.length === 0) {
      this._renderEmpty('还没有游戏记录\n快去经典模式挑战吧！');
      return;
    }

    const cardW = W - 60;
    const rowH = 64;
    const startX = 30;
    const medals = ['🥇', '🥈', '🥉'];

    for (let i = 0; i < records.length; i++) {
      const rec = records[i];
      const row = this._createClassicRow(
        i, rec.score, rec.date, cardW, rowH, medals[i] || null
      );
      row.x = startX;
      row.y = i * (rowH + 8);

      row.alpha = 0;
      TweenManager.to({ target: row, props: { alpha: 1 }, duration: 0.3, delay: i * 0.04 });

      this._contentContainer.addChild(row);
    }
  }

  private _createClassicRow(
    index: number, score: number, date: string,
    w: number, h: number, medal: string | null,
  ): PIXI.Container {
    const row = new PIXI.Container();

    const bg = new PIXI.Graphics();
    const isTop3 = index < 3;
    bg.beginFill(isTop3 ? 0xFFFFFF : 0xFFFFFF, isTop3 ? 0.12 : 0.06);
    bg.drawRoundedRect(0, 0, w, h, 12);
    bg.endFill();
    if (isTop3) {
      bg.lineStyle(1, [0xF59E0B, 0xA0AEC0, 0xCD7F32][index], 0.4);
      bg.drawRoundedRect(0, 0, w, h, 12);
    }
    row.addChild(bg);

    // Rank number
    const rankText = medal
      ? new PIXI.Text(medal, new PIXI.TextStyle({ fontSize: 28, fontFamily: 'Arial' }))
      : new PIXI.Text(String(index + 1), new PIXI.TextStyle({
          fontSize: 24, fill: 0x6B7280, fontWeight: 'bold', fontFamily: 'Arial',
        }));
    rankText.anchor.set(0.5, 0.5);
    rankText.x = 36;
    rankText.y = h / 2;
    row.addChild(rankText);

    // Score
    const scoreStyle = new PIXI.TextStyle({
      fontSize: isTop3 ? 30 : 26,
      fill: isTop3 ? 0xFFFFFF : 0xCBD5E1,
      fontWeight: 'bold',
      fontFamily: 'Arial',
    });
    const scoreText = new PIXI.Text(String(score), scoreStyle);
    scoreText.anchor.set(0, 0.5);
    scoreText.x = 72;
    scoreText.y = h / 2;
    row.addChild(scoreText);

    // "分" label
    const unitText = new PIXI.Text('分', new PIXI.TextStyle({
      fontSize: 16, fill: 0x6B7280, fontFamily: 'Arial',
    }));
    unitText.anchor.set(0, 0.5);
    unitText.x = scoreText.x + scoreText.width + 4;
    unitText.y = h / 2 + 4;
    row.addChild(unitText);

    // Date
    const dateText = new PIXI.Text(date, new PIXI.TextStyle({
      fontSize: 16, fill: 0x6B7280, fontFamily: 'Arial',
    }));
    dateText.anchor.set(1, 0.5);
    dateText.x = w - 20;
    dateText.y = h / 2;
    row.addChild(dateText);

    return row;
  }

  // ─── Level Tab ────────────────────────────────────────────

  private _renderLevelTab(): void {
    const W = Game.logicWidth;
    const stats = RankManager.getLevelStats();
    const records = RankManager.getLevelRecords();

    // Summary card
    const summaryCard = this._createLevelSummary(stats, W - 60);
    summaryCard.x = 30;
    summaryCard.y = 0;
    this._contentContainer.addChild(summaryCard);

    if (records.length === 0) {
      const empty = this._renderEmptyContainer('还没有通关记录\n快去关卡模式闯关吧！');
      empty.y = 120;
      this._contentContainer.addChild(empty);
      return;
    }

    const cardW = W - 60;
    const rowH = 56;
    const startY = 110;

    for (let i = 0; i < records.length; i++) {
      const rec = records[i];
      const row = this._createLevelRow(rec.id, rec.stars, rec.bestScore, cardW, rowH);
      row.x = 30;
      row.y = startY + i * (rowH + 6);

      row.alpha = 0;
      TweenManager.to({ target: row, props: { alpha: 1 }, duration: 0.3, delay: i * 0.03 });

      this._contentContainer.addChild(row);
    }
  }

  private _createLevelSummary(
    stats: { completed: number; total: number; totalStars: number },
    w: number,
  ): PIXI.Container {
    const card = new PIXI.Container();
    const h = 88;

    const bg = new PIXI.Graphics();
    bg.beginFill(0x059669, 0.18);
    bg.drawRoundedRect(0, 0, w, h, 16);
    bg.endFill();
    bg.lineStyle(1.5, 0x059669, 0.3);
    bg.drawRoundedRect(0, 0, w, h, 16);
    card.addChild(bg);

    // Left: completed count
    const countText = new PIXI.Text(String(stats.completed), new PIXI.TextStyle({
      fontSize: 42, fill: 0x10B981, fontWeight: 'bold', fontFamily: 'Arial',
    }));
    countText.anchor.set(0.5, 0.5);
    countText.x = w * 0.25;
    countText.y = h * 0.4;
    card.addChild(countText);

    const countLabel = new PIXI.Text(`/ ${stats.total} 关`, new PIXI.TextStyle({
      fontSize: 16, fill: 0x6B7280, fontFamily: 'Arial',
    }));
    countLabel.anchor.set(0.5, 0);
    countLabel.x = w * 0.25;
    countLabel.y = h * 0.65;
    card.addChild(countLabel);

    // Divider
    const divider = new PIXI.Graphics();
    divider.beginFill(0xFFFFFF, 0.1);
    divider.drawRect(w * 0.5 - 0.5, h * 0.15, 1, h * 0.7);
    divider.endFill();
    card.addChild(divider);

    // Right: total stars
    const starText = new PIXI.Text(`⭐ ${stats.totalStars}`, new PIXI.TextStyle({
      fontSize: 34, fill: 0xF59E0B, fontWeight: 'bold', fontFamily: 'Arial',
    }));
    starText.anchor.set(0.5, 0.5);
    starText.x = w * 0.75;
    starText.y = h * 0.4;
    card.addChild(starText);

    const starLabel = new PIXI.Text(`/ ${stats.total * 3} 星`, new PIXI.TextStyle({
      fontSize: 16, fill: 0x6B7280, fontFamily: 'Arial',
    }));
    starLabel.anchor.set(0.5, 0);
    starLabel.x = w * 0.75;
    starLabel.y = h * 0.65;
    card.addChild(starLabel);

    return card;
  }

  private _createLevelRow(
    id: number, stars: number, bestScore: number,
    w: number, h: number,
  ): PIXI.Container {
    const row = new PIXI.Container();

    const bg = new PIXI.Graphics();
    bg.beginFill(0xFFFFFF, 0.06);
    bg.drawRoundedRect(0, 0, w, h, 10);
    bg.endFill();
    row.addChild(bg);

    // Level number
    const levelText = new PIXI.Text(`第 ${id} 关`, new PIXI.TextStyle({
      fontSize: 20, fill: 0xCBD5E1, fontWeight: 'bold', fontFamily: 'Arial',
    }));
    levelText.anchor.set(0, 0.5);
    levelText.x = 20;
    levelText.y = h / 2;
    row.addChild(levelText);

    // Stars
    const starStr = '★'.repeat(stars) + '☆'.repeat(3 - stars);
    const starsText = new PIXI.Text(starStr, new PIXI.TextStyle({
      fontSize: 22, fill: stars === 3 ? 0xF59E0B : 0xD97706, fontFamily: 'Arial',
    }));
    starsText.anchor.set(0.5, 0.5);
    starsText.x = w * 0.55;
    starsText.y = h / 2;
    row.addChild(starsText);

    // Best score
    const scoreText = new PIXI.Text(`${bestScore} 分`, new PIXI.TextStyle({
      fontSize: 18, fill: 0x8899AA, fontFamily: 'Arial',
    }));
    scoreText.anchor.set(1, 0.5);
    scoreText.x = w - 20;
    scoreText.y = h / 2;
    row.addChild(scoreText);

    return row;
  }

  // ─── Helpers ──────────────────────────────────────────────

  private _renderEmpty(message: string): void {
    const c = this._renderEmptyContainer(message);
    this._contentContainer.addChild(c);
  }

  private _renderEmptyContainer(message: string): PIXI.Container {
    const W = Game.logicWidth;
    const c = new PIXI.Container();
    const text = new PIXI.Text(message, new PIXI.TextStyle({
      fontSize: 22,
      fill: 0x6B7280,
      fontFamily: 'Arial',
      align: 'center',
      lineHeight: 36,
    }));
    text.anchor.set(0.5, 0);
    text.x = W / 2 - 30;
    text.y = 80;
    c.addChild(text);
    return c;
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

    btn.on('pointerdown', () => SceneManager.switchTo('home'));
    return btn;
  }
}
