import * as PIXI from 'pixi.js';

const _textureCache = new Map<string, PIXI.Texture | null>();
const _pendingLoads = new Map<string, Promise<PIXI.Texture | null>>();

export function loadImageTexture(path: string): Promise<PIXI.Texture | null> {
  if (_textureCache.has(path)) {
    return Promise.resolve(_textureCache.get(path) ?? null);
  }

  const pending = _pendingLoads.get(path);
  if (pending) return pending;

  const loadPromise = new Promise<PIXI.Texture | null>((resolve) => {
    const finish = (texture: PIXI.Texture | null) => {
      _textureCache.set(path, texture);
      _pendingLoads.delete(path);
      resolve(texture);
    };

    try {
      const platform: any =
        typeof wx !== 'undefined' ? wx :
        typeof tt !== 'undefined' ? tt : null;

      if (platform?.createImage) {
        const img = platform.createImage();
        img.onload = () => {
          try {
            const baseTexture = PIXI.BaseTexture.from(img as any);
            finish(new PIXI.Texture(baseTexture));
          } catch (e) {
            console.warn('[imageTexture] texture creation failed:', path, e);
            finish(null);
          }
        };
        img.onerror = (err: any) => {
          console.warn('[imageTexture] image load failed:', path, err);
          finish(null);
        };
        img.src = path;
        return;
      }

      try {
        finish(PIXI.Texture.from(path));
      } catch (e) {
        console.warn('[imageTexture] fallback load failed:', path, e);
        finish(null);
      }
    } catch (e) {
      console.warn('[imageTexture] load error:', path, e);
      finish(null);
    }
  });

  _pendingLoads.set(path, loadPromise);
  return loadPromise;
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
