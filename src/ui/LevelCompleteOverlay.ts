import * as PIXI from 'pixi.js';
import { Game } from '@/core/Game';
import { TweenManager, Ease } from '@/core/TweenManager';
import { EventBus } from '@/core/EventBus';
import { addImageSprite } from '@/utils/imageTexture';

const PANEL_W = 430;
const PANEL_H = 560;

export class LevelCompleteOverlay extends PIXI.Container {
  private _panel: PIXI.Container;
  private _scoreText: PIXI.Text;
  private _nextText: PIXI.Text;
  private _starNodes: PIXI.Container[] = [];
  private _starSprites: Array<PIXI.Sprite | null> = [];
  private _shownStars = 0;

  constructor() {
    super();
    this.visible = false;

    const backdrop = new PIXI.Graphics();
    backdrop.beginFill(0x000000, 0.5);
    backdrop.drawRect(0, 0, Game.logicWidth, Game.logicHeight);
    backdrop.endFill();
    backdrop.eventMode = 'static';
    this.addChild(backdrop);

    this._panel = new PIXI.Container();
    this.addChild(this._panel);

    const imageLayer = new PIXI.Container();
    this._panel.addChild(imageLayer);
    addImageSprite(imageLayer, 'images/level_complete_panel.png', (sprite) => {
      sprite.anchor.set(0.5, 0.5);
      sprite.width = PANEL_W;
      sprite.height = PANEL_H;
    });

    const title = new PIXI.Text('通关成功', new PIXI.TextStyle({
      fontSize: 40,
      fill: 0xFFFFFF,
      stroke: 0x0B3A88,
      strokeThickness: 5,
      fontWeight: 'bold',
      fontFamily: 'Arial',
      dropShadow: true,
      dropShadowColor: 0x000000,
      dropShadowBlur: 3,
      dropShadowDistance: 2,
      dropShadowAlpha: 0.35,
    }));
    title.anchor.set(0.5, 0.5);
    title.y = -224;
    this._panel.addChild(title);

    for (let i = 0; i < 3; i++) {
      const starNode = new PIXI.Container();
      starNode.x = (i - 1) * 76;
      starNode.y = -95;
      this._panel.addChild(starNode);
      this._starNodes.push(starNode);
      this._starSprites.push(null);

      addImageSprite(starNode, 'images/level_select_star.png', (sprite) => {
        sprite.anchor.set(0.5, 0.5);
        sprite.width = 72;
        sprite.height = 72;
        sprite.tint = i < this._shownStars ? 0xFFFFFF : 0x7B8AAE;
        this._starSprites[i] = sprite;
      });
    }

    this._scoreText = new PIXI.Text('0分', new PIXI.TextStyle({
      fontSize: 50,
      fill: 0xFFE082,
      stroke: 0x8A3A00,
      strokeThickness: 5,
      fontWeight: 'bold',
      fontFamily: 'Arial',
      dropShadow: true,
      dropShadowColor: 0x000000,
      dropShadowBlur: 3,
      dropShadowDistance: 2,
      dropShadowAlpha: 0.3,
    }));
    this._scoreText.anchor.set(0.5, 0.5);
    this._scoreText.y = -18;
    this._panel.addChild(this._scoreText);

    this._nextText = this._createButtonHitArea('下一关', 92, () => { this.hide(); EventBus.emit('level:next'); });
    this._createButtonHitArea('重玩', 158, () => { this.hide(); EventBus.emit('level:retry'); });
    this._createButtonHitArea('返回', 224, () => { this.hide(); EventBus.emit('level:back'); });
  }

  private _createButtonHitArea(label: string, yOff: number, onClick: () => void): PIXI.Text {
    const btn = new PIXI.Container();
    btn.y = yOff;
    btn.eventMode = 'static';
    btn.cursor = 'pointer';

    const hit = new PIXI.Graphics();
    hit.beginFill(0xFFFFFF, 0.001);
    hit.drawRoundedRect(-132, -24, 264, 48, 24);
    hit.endFill();
    btn.addChild(hit);

    const text = new PIXI.Text(label, new PIXI.TextStyle({
      fontSize: 25,
      fill: 0xFFFFFF,
      stroke: 0x174078,
      strokeThickness: 4,
      fontWeight: 'bold',
      fontFamily: 'Arial',
    }));
    text.anchor.set(0.5, 0.5);
    btn.addChild(text);

    btn.on('pointerdown', onClick);
    this._panel.addChild(btn);
    return text;
  }

  show(score: number, stars: number, isLastLevel: boolean): void {
    this._scoreText.text = `${score}分`;
    this._nextText.text = isLastLevel ? '完成' : '下一关';
    this._shownStars = stars;

    for (let i = 0; i < 3; i++) {
      const earned = i < stars;
      this._starNodes[i].alpha = earned ? 1 : 0.45;
      this._starNodes[i].scale.set(earned ? 0.35 : 0.9);
      if (this._starSprites[i]) {
        this._starSprites[i]!.tint = earned ? 0xFFFFFF : 0x7B8AAE;
      }
    }

    this._panel.x = Game.logicWidth / 2;
    this._panel.y = Game.logicHeight / 2;
    this._panel.scale.set(0.5);
    this._panel.alpha = 0;
    this.visible = true;

    TweenManager.to({ target: this._panel.scale, props: { x: 1, y: 1 }, duration: 0.35, ease: Ease.easeOutBack });
    TweenManager.to({ target: this._panel, props: { alpha: 1 }, duration: 0.25 });

    for (let i = 0; i < 3; i++) {
      if (i < stars) {
        TweenManager.to({
          target: this._starNodes[i].scale,
          props: { x: 1, y: 1 },
          duration: 0.3,
          delay: 0.4 + i * 0.2,
          ease: Ease.easeOutBack,
        });
      }
    }
  }

  hide(): void { this.visible = false; }
}
