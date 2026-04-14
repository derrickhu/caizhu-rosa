import * as PIXI from 'pixi.js';

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

  _loadImage(imagePath).then((texture) => {
    if (!texture) return;
    const sprite = new PIXI.Sprite(texture);
    sprite.width = width;
    sprite.height = height;
    container.addChild(sprite);
  });

  return container;
}

function _loadImage(path: string): Promise<PIXI.Texture | null> {
  return new Promise((resolve) => {
    try {
      const platform: any =
        typeof wx !== 'undefined' ? wx :
        typeof tt !== 'undefined' ? tt : null;

      if (platform?.createImage) {
        const img = platform.createImage();
        img.onload = () => {
          try {
            const baseTexture = PIXI.BaseTexture.from(img as any);
            resolve(new PIXI.Texture(baseTexture));
          } catch (e) {
            console.warn('[bgHelper] texture creation failed:', path, e);
            resolve(null);
          }
        };
        img.onerror = (err: any) => {
          console.warn('[bgHelper] image load failed:', path, err);
          resolve(null);
        };
        img.src = path;
      } else {
        // Browser / dev environment fallback
        try {
          const texture = PIXI.Texture.from(path);
          resolve(texture);
        } catch (e) {
          console.warn('[bgHelper] fallback load failed:', path, e);
          resolve(null);
        }
      }
    } catch (e) {
      console.warn('[bgHelper] load error:', path, e);
      resolve(null);
    }
  });
}
