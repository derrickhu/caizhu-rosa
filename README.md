# 彩珠五连 - 微信小游戏

经典益智消除游戏，基于 PixiJS v7 + TypeScript + Vite 开发。

## 技术栈

- **渲染引擎**: PixiJS v7 (WebGL)
- **语言**: TypeScript
- **构建工具**: Vite (IIFE 模式)
- **平台**: 微信小游戏

## 项目结构

```
src/                     # 游戏源码
  core/                  # 核心框架（Game, SceneManager, EventBus, TweenManager）
  config/                # 游戏配置
  managers/              # 业务管理器（BoardManager）
  systems/               # 算法系统（PathFinder, LineDetector）
  gameobjects/           # 游戏对象（BoardView, BallSprite）
  scenes/                # 场景（HomeScene, ClassicScene）
  ui/                    # UI 组件（ScorePanel, PreviewPanel, GameOverOverlay）
minigame/                # 微信小游戏运行目录
  pixi-adapter/          # PixiJS 微信适配层
  game.js                # 微信入口
  game.json              # 微信配置
  game-bundle.js         # 构建产物
```

## 开发

```bash
npm install              # 安装依赖
npm run build            # 构建
npm run dev              # 监听模式构建
```

构建后用微信开发者工具打开项目根目录即可预览。
