import * as PIXI from 'pixi.js';
import { PropType } from '@/config/PropConfig';

const ICON_SIZE = 80;

const PROP_ICON_INDEX: Record<PropType, number> = {
  [PropType.ColorBlast]: 0,
  [PropType.CrossClear]: 1,
  [PropType.WildNext]: 2,
};

let _sheetTexture: PIXI.BaseTexture | null = null;
let _iconTextures: Map<PropType, PIXI.Texture> = new Map();
let _loaded = false;

export function loadPropIcons(): Promise<void> {
  if (_loaded) return Promise.resolve();

  return new Promise((resolve) => {
    try {
      const platform: any =
        typeof wx !== 'undefined' ? wx :
        typeof tt !== 'undefined' ? tt : null;

      if (platform?.createImage) {
        const img = platform.createImage();
        img.onload = () => {
          try {
            _sheetTexture = PIXI.BaseTexture.from(img as any);
            _createFrames();
            _loaded = true;
          } catch (e) {
            console.warn('[iconLoader] texture creation failed', e);
          }
          resolve();
        };
        img.onerror = () => {
          console.warn('[iconLoader] image load failed');
          resolve();
        };
        img.src = 'subpkg_assets/images/prop_icons.png';
      } else {
        try {
          _sheetTexture = PIXI.BaseTexture.from('subpkg_assets/images/prop_icons.png');
          _createFrames();
          _loaded = true;
        } catch (e) {
          console.warn('[iconLoader] fallback load failed', e);
        }
        resolve();
      }
    } catch (e) {
      console.warn('[iconLoader] load error', e);
      resolve();
    }
  });
}

function _createFrames(): void {
  if (!_sheetTexture) return;
  for (const [propType, index] of Object.entries(PROP_ICON_INDEX)) {
    const rect = new PIXI.Rectangle(
      (index as number) * ICON_SIZE, 0,
      ICON_SIZE, ICON_SIZE,
    );
    const texture = new PIXI.Texture(_sheetTexture, rect);
    _iconTextures.set(propType as PropType, texture);
  }
}

export function getPropIconTexture(type: PropType): PIXI.Texture | null {
  return _iconTextures.get(type) ?? null;
}

export function isPropIconsLoaded(): boolean {
  return _loaded;
}
