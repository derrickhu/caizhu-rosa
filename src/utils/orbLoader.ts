import * as PIXI from 'pixi.js';

const ORB_FILES: string[] = [
  'images/orb_fire.png',    // 0 = red
  'images/orb_metal.png',   // 1 = yellow
  'images/orb_water.png',   // 2 = blue
  'images/orb_grass.png',   // 3 = green
  'images/orb_shadow.png',  // 4 = purple
  'images/orb_heart.png',   // 5 = orange/pink
  'images/orb_wind.png',    // 6 = cyan
];

let _textures: (PIXI.Texture | null)[] = [];
let _loaded = false;

export function loadOrbTextures(): Promise<void> {
  if (_loaded) return Promise.resolve();

  const platform: any =
    typeof wx !== 'undefined' ? wx :
    typeof tt !== 'undefined' ? tt : null;

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

  return Promise.all(promises).then(() => {
    _loaded = true;
    console.log(`[orbLoader] loaded ${_textures.filter(Boolean).length}/${ORB_FILES.length} orb textures`);
  });
}

export function getOrbTexture(colorIndex: number): PIXI.Texture | null {
  return _textures[colorIndex] ?? null;
}

export function isOrbTexturesLoaded(): boolean {
  return _loaded;
}
