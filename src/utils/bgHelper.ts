import * as PIXI from 'pixi.js';
import { loadImageTexture } from './imageTexture';

/**
 * Creates a background container with a fallback color, then async-loads
 * the image using wx.createImage() (WeChat mini-game compatible).
 */
export function createBgSprite(
  imagePath: string,
  width: number,
  height: number,
  fallbackColor: number,
): PIXI.Container {
  const container = new PIXI.Container();

  const fallback = new PIXI.Graphics();
  fallback.beginFill(fallbackColor);
  fallback.drawRect(0, 0, width, height);
  fallback.endFill();
  container.addChild(fallback);

  loadImageTexture(imagePath).then((texture) => {
    if (!texture) return;
    const sprite = new PIXI.Sprite(texture);
    sprite.width = width;
    sprite.height = height;
    container.addChild(sprite);
  });

  return container;
}
