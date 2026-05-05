import '@/core/pixiWechatPatch';
import { Game } from '@/core/Game';
import { SceneManager } from '@/core/SceneManager';
import { LoadingScene } from '@/scenes/LoadingScene';
import { HomeScene } from '@/scenes/HomeScene';
import { ClassicScene } from '@/scenes/ClassicScene';
import { LevelSelectScene } from '@/scenes/LevelSelectScene';
import { LevelScene } from '@/scenes/LevelScene';
import { RankScene } from '@/scenes/RankScene';
import { SkinScene } from '@/scenes/SkinScene';
import { LevelManager } from '@/managers/LevelManager';
import { RankManager } from '@/managers/RankManager';
import { SkinManager } from '@/managers/SkinManager';
import { PropManager } from '@/managers/PropManager';
import { CloudSyncManager } from '@/managers/CloudSyncManager';
import { Platform } from '@/core/PlatformService';
import { AudioManager } from '@/core/AudioManager';
import { loadPropIcons } from '@/utils/iconLoader';
import { loadOrbTextures } from '@/utils/orbLoader';
import { preloadImageAssets } from '@/utils/assetPreloader';
import { loadImageTexture } from '@/utils/imageTexture';
import { GAME_DISPLAY_NAME } from '@/config/GameConfig';

declare const wx: any;
declare const tt: any;
declare const GameGlobal: any;

if (typeof GameGlobal !== 'undefined') {
  GameGlobal.onError = (msg: string) => console.error('[GlobalError]', msg);
  GameGlobal.onUnhandledRejection = (ev: any) => console.error('[UnhandledRejection]', ev?.reason || ev);
}

function loadWechatSubpackage(name: string): Promise<void> {
  const platform: any =
    typeof wx !== 'undefined' ? wx :
    typeof tt !== 'undefined' ? tt : null;

  if (!platform?.loadSubpackage) return Promise.resolve();

  return new Promise((resolve, reject) => {
    platform.loadSubpackage({
      name,
      success: () => resolve(),
      fail: (err: any) => reject(err),
    });
  });
}

async function main(): Promise<void> {
  try {
    console.log(`[main] ${GAME_DISPLAY_NAME} 启动中...`);

    const canvas = (typeof GameGlobal !== 'undefined' && GameGlobal.canvas)
      || (typeof window !== 'undefined' && (window as any).canvas)
      || null;

    if (!canvas) {
      throw new Error('[main] 无法获取 canvas');
    }

    Game.init(canvas);

    const loadingScene = new LoadingScene();
    SceneManager.register(loadingScene);
    await loadImageTexture('images/loading_screen.png');
    SceneManager.switchTo('loading');

    await loadWechatSubpackage('assets');

    Platform.onShareAppMessage(() => ({
      title: GAME_DISPLAY_NAME,
    }));

    // Register audio (placeholder paths - will add actual audio files later)
    AudioManager.register('move', 'audio/move.mp3', 0.6);
    AudioManager.register('eliminate', 'audio/eliminate.mp3', 0.8);
    AudioManager.register('select', 'audio/select.mp3', 0.5);
    AudioManager.register('gameover', 'audio/gameover.mp3', 0.7);

    CloudSyncManager.prewarm();
    const cloudStartup = await CloudSyncManager.awaitStartupSync();
    console.log(`[main] 云同步启动状态: ${cloudStartup.status}, reason=${cloudStartup.reason}`);

    // Init managers after startup sync has had a chance to import cloud data.
    LevelManager.init();
    RankManager.init();
    SkinManager.init();
    PropManager.init();
    PropManager.grantStarterPack();

    // Preload assets after skin state is available, so orb textures use the selected row.
    await Promise.all([
      preloadImageAssets((loaded, total) => loadingScene.setProgress(loaded, total)),
      loadPropIcons(),
      loadOrbTextures(),
    ]);

    // Register scenes
    const homeScene = new HomeScene();
    const classicScene = new ClassicScene();
    const levelSelectScene = new LevelSelectScene();
    const levelScene = new LevelScene();
    const rankScene = new RankScene();
    const skinScene = new SkinScene();
    SceneManager.register(homeScene);
    SceneManager.register(classicScene);
    SceneManager.register(levelSelectScene);
    SceneManager.register(levelScene);
    SceneManager.register(rankScene);
    SceneManager.register(skinScene);

    // Enter home scene
    SceneManager.switchTo('home');

    // First touch to resume audio
    const view = Game.app?.view as HTMLCanvasElement | undefined;
    if (view) {
      let firstTouch = true;
      view.addEventListener('pointerdown', () => {
        if (firstTouch) {
          firstTouch = false;
          AudioManager.resumeOnInteraction();
        }
      });
    }

    // Save on hide
    Platform.onHide(() => {
      console.log('[main] 游戏退到后台');
      void CloudSyncManager.flushNow('hide');
    });
    Platform.onShow(() => {
      CloudSyncManager.prewarm();
    });

    console.log(`[main] ${GAME_DISPLAY_NAME} 启动完成`);
  } catch (e) {
    console.error('[main] 启动失败:', e);
  }
}

main();
