import * as PIXI from 'pixi.js';
import { SkinManager } from '@/managers/SkinManager';

const ORB_SHEET_PATH = 'subpkg_assets/images/orb_skins_sheet.png';
const ORB_SHEET_COLS = 7;
const ORB_SHEET_FRAME = 96;

const ORB_FILES: string[] = [
  'subpkg_assets/images/orb_fire.png',    // 0 = red
  'subpkg_assets/images/orb_metal.png',   // 1 = yellow
  'subpkg_assets/images/orb_water.png',   // 2 = blue
  'subpkg_assets/images/orb_grass.png',   // 3 = green
  'subpkg_assets/images/orb_shadow.png',  // 4 = purple
  'subpkg_assets/images/orb_heart.png',   // 5 = orange/pink
  'subpkg_assets/images/orb_wind.png',    // 6 = cyan
];

let _textures: (PIXI.Texture | null)[] = [];
let _loaded = false;
let _loadedFromSheet = false;
let _sheetBaseTexture: PIXI.BaseTexture | null = null;

export function loadOrbTextures(): Promise<void> {
  if (_loaded) return Promise.resolve();

  const platform: any =
    typeof wx !== 'undefined' ? wx :
    typeof tt !== 'undefined' ? tt : null;

  return _loadOrbSheet(platform).then((loadedFromSheet) => {
    if (loadedFromSheet) {
      _loaded = true;
      console.log(`[orbLoader] loaded ${_textures.filter(Boolean).length}/${ORB_SHEET_COLS} orb textures from sprite sheet`);
      return;
    }

    return _loadLegacyOrbFiles(platform).then(() => {
      _loaded = true;
      console.log(`[orbLoader] loaded ${_textures.filter(Boolean).length}/${ORB_FILES.length} orb textures`);
    });
  });
}

function _loadOrbSheet(platform: any): Promise<boolean> {
  return new Promise<boolean>((resolve) => {
    try {
      const onTextureReady = (base: PIXI.BaseTexture) => {
        _sheetBaseTexture = base;
        _loadedFromSheet = true;
        _applyOrbSheetRow(SkinManager.getSelectedOrbSkin().sheetRow);
        resolve(true);
      };

      if (platform?.createImage) {
        const img = platform.createImage();
        img.onload = () => {
          try {
            onTextureReady(PIXI.BaseTexture.from(img as any));
          } catch (e) {
            console.warn(`[orbLoader] sprite sheet texture creation failed: ${ORB_SHEET_PATH}`, e);
            resolve(false);
          }
        };
        img.onerror = () => {
          console.warn(`[orbLoader] sprite sheet load failed: ${ORB_SHEET_PATH}`);
          resolve(false);
        };
        img.src = ORB_SHEET_PATH;
      } else {
        try {
          onTextureReady(PIXI.BaseTexture.from(ORB_SHEET_PATH));
        } catch (e) {
          console.warn(`[orbLoader] sprite sheet fallback load failed: ${ORB_SHEET_PATH}`, e);
          resolve(false);
        }
      }
    } catch (e) {
      console.warn(`[orbLoader] sprite sheet error: ${ORB_SHEET_PATH}`, e);
      resolve(false);
    }
  });
}

function _applyOrbSheetRow(row: number): void {
  if (!_sheetBaseTexture) return;
  _textures = [];
  for (let i = 0; i < ORB_SHEET_COLS; i++) {
    const frame = new PIXI.Rectangle(
      i * ORB_SHEET_FRAME,
      row * ORB_SHEET_FRAME,
      ORB_SHEET_FRAME,
      ORB_SHEET_FRAME,
    );
    _textures[i] = new PIXI.Texture(_sheetBaseTexture, frame);
  }
}

function _loadLegacyOrbFiles(platform: any): Promise<void> {
  const promises = ORB_FILES.map((path, index) =>
    new Promise<void>((resolve) => {
      try {
        if (platform?.createImage) {
          const img = platform.createImage();
          img.onload = () => {
            try {
              const base = PIXI.BaseTexture.from(img as any);
              _textures[index] = new PIXI.Texture(base);
            } catch (e) {
              console.warn(`[orbLoader] texture creation failed for ${path}`, e);
              _textures[index] = null;
            }
            resolve();
          };
          img.onerror = () => {
            console.warn(`[orbLoader] load failed: ${path}`);
            _textures[index] = null;
            resolve();
          };
          img.src = path;
        } else {
          try {
            _textures[index] = PIXI.Texture.from(path);
          } catch (e) {
            console.warn(`[orbLoader] fallback load failed: ${path}`, e);
            _textures[index] = null;
          }
          resolve();
        }
      } catch (e) {
        console.warn(`[orbLoader] error: ${path}`, e);
        _textures[index] = null;
        resolve();
      }
    })
  );

  return Promise.all(promises).then(() => undefined);
}

export function getOrbTexture(colorIndex: number): PIXI.Texture | null {
  return _textures[colorIndex] ?? null;
}

export function getOrbSkinTexture(row: number, colorIndex: number): PIXI.Texture | null {
  if (!_sheetBaseTexture) return null;
  return new PIXI.Texture(
    _sheetBaseTexture,
    new PIXI.Rectangle(
      colorIndex * ORB_SHEET_FRAME,
      row * ORB_SHEET_FRAME,
      ORB_SHEET_FRAME,
      ORB_SHEET_FRAME,
    ),
  );
}

export function refreshOrbTextures(): Promise<void> {
  if (_loadedFromSheet && _sheetBaseTexture) {
    _applyOrbSheetRow(SkinManager.getSelectedOrbSkin().sheetRow);
    return Promise.resolve();
  }
  _loaded = false;
  return loadOrbTextures();
}

export function isOrbTexturesLoaded(): boolean {
  return _loaded;
}
