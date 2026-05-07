import * as PIXI from 'pixi.js';
import { DEFAULT_AVATAR_PATH } from '@/config/CloudConfig';
import { loadImageTexture } from './imageTexture';

declare const wx: any;
declare const tt: any;

const _avatarTextureCache = new Map<string, PIXI.Texture | null>();
const _pendingAvatar = new Map<string, Promise<PIXI.Texture | null>>();

function loadRemoteAvatar(url: string): Promise<PIXI.Texture | null> {
  if (_avatarTextureCache.has(url)) {
    return Promise.resolve(_avatarTextureCache.get(url) ?? null);
  }
  const pending = _pendingAvatar.get(url);
  if (pending) return pending;

  const promise = new Promise<PIXI.Texture | null>((resolve) => {
    const platform: any = typeof wx !== 'undefined' ? wx
      : typeof tt !== 'undefined' ? tt : null;

    const finish = (tex: PIXI.Texture | null) => {
      _avatarTextureCache.set(url, tex);
      _pendingAvatar.delete(url);
      resolve(tex);
    };

    try {
      if (platform?.createImage) {
        const img = platform.createImage();
        img.onload = () => {
          try {
            finish(new PIXI.Texture(PIXI.BaseTexture.from(img as any)));
          } catch {
            finish(null);
          }
        };
        img.onerror = () => finish(null);
        img.src = url;
        return;
      }
      finish(PIXI.Texture.from(url));
    } catch {
      finish(null);
    }
  });
  _pendingAvatar.set(url, promise);
  return promise;
}

/** 创建一个固定半径的圆形头像 sprite。
 *  - 默认头像（subpkg 路径）走 loadImageTexture 缓存
 *  - 微信头像（http(s):// 或 wxfile:// 临时路径）走 loadRemoteAvatar
 *  - 加载完成前先显示占位环
 */
export function createAvatarSprite(avatarUrl: string, radius: number): PIXI.Container {
  const container = new PIXI.Container();
  const diameter = radius * 2;

  const placeholder = new PIXI.Graphics();
  placeholder.beginFill(0x4F5B73, 1);
  placeholder.drawCircle(radius, radius, radius);
  placeholder.endFill();
  placeholder.lineStyle(2, 0xFFFFFF, 0.3);
  placeholder.drawCircle(radius, radius, radius);
  container.addChild(placeholder);

  const url = avatarUrl || DEFAULT_AVATAR_PATH;
  const useRemote = /^(https?:|wxfile:|http:|blob:)/i.test(url);
  const loader = useRemote ? loadRemoteAvatar(url) : loadImageTexture(url);

  void loader.then((texture) => {
    if (!texture || container.destroyed) return;
    const sprite = new PIXI.Sprite(texture);
    sprite.width = diameter;
    sprite.height = diameter;

    const mask = new PIXI.Graphics();
    mask.beginFill(0xFFFFFF, 1);
    mask.drawCircle(radius, radius, radius);
    mask.endFill();
    sprite.mask = mask;

    container.addChildAt(sprite, 0);
    container.addChild(mask);

    const ring = new PIXI.Graphics();
    ring.lineStyle(2, 0xFFFFFF, 0.4);
    ring.drawCircle(radius, radius, radius);
    container.addChild(ring);

    placeholder.visible = false;
  });

  return container;
}
