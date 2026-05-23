import * as PIXI from 'pixi.js';
import { Game } from '@/core/Game';
import {
  getDefaultOrbColorIndex,
  isRemoteAvatarUrl,
  resolveDisplayAvatarUrl,
} from '@/utils/defaultProfileDisplay';
import { getOrbTexture } from '@/utils/orbLoader';

declare const wx: any;
declare const tt: any;

const _circleCache = new Map<string, PIXI.RenderTexture>();
const _srcCache = new Map<string, PIXI.Texture>();
const _srcPending = new Map<string, Promise<PIXI.Texture | null>>();

/**
 * 一次性把"源贴图 + 圆形剪裁 + 白色细外环"烘焙成静态 RenderTexture。
 * 长列表里用这种静态贴图，**每行直接换 sprite.texture 即可**，
 * 不再为每行挂 PIXI.Graphics mask —— mask 会强制走 stencil buffer，
 * 破坏 batch（一次拖动里 50 行各一个 mask，真机帧时间会蹦到 50ms+）。
 */
export function bakeCircleAvatarTexture(
  srcTex: PIXI.Texture | null,
  radius: number,
  cacheKey: string,
): PIXI.RenderTexture | null {
  if (!srcTex || !srcTex.baseTexture || !srcTex.baseTexture.valid) return null;
  const key = `${cacheKey}@${radius}`;
  const cached = _circleCache.get(key);
  if (cached) return cached;

  const renderer = Game.app?.renderer;
  if (!renderer) return null;

  const size = radius * 2;
  const root = new PIXI.Container();

  const sprite = new PIXI.Sprite(srcTex);
  sprite.width = size;
  sprite.height = size;

  const mask = new PIXI.Graphics();
  mask.beginFill(0xFFFFFF, 1);
  mask.drawCircle(radius, radius, radius);
  mask.endFill();
  sprite.mask = mask;
  root.addChild(sprite, mask);

  const ring = new PIXI.Graphics();
  ring.lineStyle(2, 0xFFFFFF, 0.4);
  ring.drawCircle(radius, radius, radius - 1);
  root.addChild(ring);

  const rt = PIXI.RenderTexture.create({ width: size, height: size, resolution: 1 });
  try {
    (renderer as any).render(root, { renderTexture: rt });
    _circleCache.set(key, rt);
  } catch {
    // 真机偶发 renderTexture 创建失败：把临时容器销毁后回退 null，
    // 调用方会继续显示占位的默认 orb 贴图。
    rt.destroy(true);
    root.destroy({ children: true });
    return null;
  }
  root.destroy({ children: true });
  return rt;
}

/** 读取远程头像源贴图（微信头像走 wx.createImage），命中缓存即同步返回 */
export function loadRemoteAvatarSource(url: string): Promise<PIXI.Texture | null> {
  const cached = _srcCache.get(url);
  if (cached) return Promise.resolve(cached);
  const pending = _srcPending.get(url);
  if (pending) return pending;

  const promise = new Promise<PIXI.Texture | null>((resolve) => {
    const platform: any = typeof wx !== 'undefined' ? wx
      : typeof tt !== 'undefined' ? tt : null;
    const finish = (tex: PIXI.Texture | null) => {
      if (tex) _srcCache.set(url, tex);
      _srcPending.delete(url);
      resolve(tex);
    };
    try {
      if (platform?.createImage) {
        const img = platform.createImage();
        img.onload = () => {
          try { finish(new PIXI.Texture(PIXI.BaseTexture.from(img as any))); }
          catch { finish(null); }
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
  _srcPending.set(url, promise);
  return promise;
}

/**
 * 同步给出一个"圆形头像 RenderTexture"，如果当前可用就立即返回；
 * 如果是微信头像但源贴图还没下载，先返回 orb 占位贴图，
 * 等异步完成后由 `onReady` 收回最终贴图，调用方再决定要不要赋给 sprite.texture。
 */
export function resolveCircleAvatarTexture(
  avatarUrl: string,
  userId: string,
  radius: number,
  onReady?: (tex: PIXI.RenderTexture) => void,
): PIXI.RenderTexture | null {
  const resolvedUrl = resolveDisplayAvatarUrl(avatarUrl, userId);
  const useRemote = isRemoteAvatarUrl(resolvedUrl);
  const orbIndex = getDefaultOrbColorIndex(userId);
  const orbTex = getOrbTexture(orbIndex);
  const orbBaked = orbTex ? bakeCircleAvatarTexture(orbTex, radius, `orb-${orbIndex}`) : null;

  if (!useRemote) return orbBaked;

  // 远程头像：尝试同步命中
  const remoteCacheKey = `wx-${resolvedUrl}`;
  const cached = _circleCache.get(`${remoteCacheKey}@${radius}`);
  if (cached) return cached;

  // 远程未就绪：异步拉源 → bake → 通知调用方
  if (onReady) {
    void loadRemoteAvatarSource(resolvedUrl).then((srcTex) => {
      const baked = srcTex ? bakeCircleAvatarTexture(srcTex, radius, remoteCacheKey) : null;
      if (baked) onReady(baked);
    });
  }
  return orbBaked;
}
