import * as PIXI from 'pixi.js';
import { Platform } from '@/core/PlatformService';
import {
  getDefaultOrbAvatarPath,
  isRemoteAvatarUrl,
  resolveDisplayAvatarUrl,
} from '@/utils/defaultProfileDisplay';
import { loadImageTexture } from './imageTexture';

declare const wx: any;
declare const tt: any;

const _avatarTextureCache = new Map<string, PIXI.Texture>();
const _pendingAvatar = new Map<string, Promise<PIXI.Texture | null>>();

function loadRemoteAvatar(url: string): Promise<PIXI.Texture | null> {
  const cached = _avatarTextureCache.get(url);
  if (cached) {
    return Promise.resolve(cached);
  }
  const pending = _pendingAvatar.get(url);
  if (pending) return pending;

  const promise = new Promise<PIXI.Texture | null>((resolve) => {
    const platform: any = typeof wx !== 'undefined' ? wx
      : typeof tt !== 'undefined' ? tt : null;

    const finish = (tex: PIXI.Texture | null) => {
      if (tex) {
        _avatarTextureCache.set(url, tex);
      }
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
 *  - 默认：按 userId 映射到一颗珠子图
 *  - 微信头像（http(s)://）走 loadRemoteAvatar
 */
export function createAvatarSprite(avatarUrl: string, radius: number, userId = ''): PIXI.Container {
  const container = new PIXI.Container();
  const diameter = radius * 2;
  const resolvedUrl = resolveDisplayAvatarUrl(avatarUrl, userId);
  const fallbackUrl = getDefaultOrbAvatarPath(userId);

  const placeholder = new PIXI.Graphics();
  placeholder.beginFill(0x2A3A52, 1);
  placeholder.drawCircle(radius, radius, radius);
  placeholder.endFill();
  placeholder.lineStyle(2, 0xFFFFFF, 0.35);
  placeholder.drawCircle(radius, radius, radius);
  container.addChild(placeholder);

  const useRemote = isRemoteAvatarUrl(resolvedUrl);
  const primaryLoader = useRemote ? loadRemoteAvatar(resolvedUrl) : loadImageTexture(resolvedUrl);

  const mountTexture = (texture: PIXI.Texture | null): boolean => {
    if (!texture || container.destroyed) return false;
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
    return true;
  };

  const tryFallbackOrb = (): void => {
    if (fallbackUrl === resolvedUrl) return;
    void loadImageTexture(fallbackUrl).then((tex) => mountTexture(tex));
  };

  void primaryLoader.then((texture) => {
    if (mountTexture(texture)) return;
    if (useRemote) {
      void Platform.downloadAvatar(resolvedUrl).then((localPath) => {
        if (!localPath || localPath === resolvedUrl) return null;
        return loadRemoteAvatar(localPath);
      }).then((localTexture) => {
        if (mountTexture(localTexture)) return;
        tryFallbackOrb();
      });
      return;
    }
    tryFallbackOrb();
  });

  return container;
}
