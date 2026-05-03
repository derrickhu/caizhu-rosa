import * as PIXI from 'pixi.js';

export function loadImageTexture(path: string): Promise<PIXI.Texture | null> {
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
            console.warn('[imageTexture] texture creation failed:', path, e);
            resolve(null);
          }
        };
        img.onerror = (err: any) => {
          console.warn('[imageTexture] image load failed:', path, err);
          resolve(null);
        };
        img.src = path;
        return;
      }

      try {
        resolve(PIXI.Texture.from(path));
      } catch (e) {
        console.warn('[imageTexture] fallback load failed:', path, e);
        resolve(null);
      }
    } catch (e) {
      console.warn('[imageTexture] load error:', path, e);
      resolve(null);
    }
  });
}

export function addImageSprite(
  parent: PIXI.Container,
  path: string,
  setup: (sprite: PIXI.Sprite) => void,
): void {
  loadImageTexture(path).then((texture) => {
    if (!texture || parent.destroyed) return;
    const sprite = new PIXI.Sprite(texture);
    setup(sprite);
    parent.addChild(sprite);
  });
}
