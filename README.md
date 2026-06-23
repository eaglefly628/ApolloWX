# ApolloWX — Apollo 引擎 · 微信小游戏版

> 数据驱动的原子化 **ECS 游戏引擎**，面向 **微信小游戏（WeChat Mini Game）** 发布。
> 由网页/桌面版 Apollo 引擎（[eaglefly628/ApolloGame](https://github.com/eaglefly628/ApolloGame)）移植而来：
> **移除全部内置游戏与 React 网页 UI，只保留纯引擎**，并新增微信运行时适配层。

> ⛔ **第一性原则：整个游戏是数据，不是代码**（`docs/design/data-driven-manifesto.md`）。
> 代码只属于引擎这台固定的确定性解释器；游戏内容全部用数据（`WorldBlueprint`）描述。

26 个核心原子 skill + Tier 1-4 涌现层，确定性固定步长 tick 循环，可替换渲染后端，
内置 debug / record-replay + 美术资产系统。**sim 完全平台无关**；微信、浏览器只是不同的 IO 后端。

---

## 与网页版的差异（本次移植）

| 维度 | 网页/桌面版 (ApolloGame) | 微信小游戏版 (ApolloWX) |
|------|------|------|
| 目标平台 | 浏览器 + Electron 桌面 | 微信小游戏（wx 运行时，无 DOM） |
| 内置游戏 | game-a … game-i（9 个） | **全部移除**（只留引擎） |
| UI 层 | React DOM（launcher / studio / ui） | **移除**（小游戏无 DOM；UI 走 canvas 或自建数据层） |
| 渲染上屏 | `document.createElement('canvas')` | `wx.createCanvas()`（平台 canvas 注入渲染器） |
| 存储 | `localStorage` | `wx.setStorageSync`（`WechatStoragePort`） |
| 音频 | Web Audio / `<audio>` | `wx.createInnerAudioContext`（`WechatAudioPort`） |
| 输入 | DOM pointer 事件 | `wx.onTouchStart/Move/End`（`WechatTouchInputSource`） |
| 联网 | `WebSocket` | `wx.connectSocket`（`WechatSyncChannel`） |
| 图片加载 | `new Image()` | `wx.createImage()`（`WechatImageAssetLoader`） |
| 构建产物 | Vite → `dist/` / Electron | **esbuild → `weapp/game.js`** |

引擎核心（`engine` / `skills` / `assets` / `services` / `runtime` / `debug` / `net` / `renderer` / `assembly`）
**零改动逻辑**，仅放开了渲染器对 DOM 容器的依赖（`init(container?)` + 可注入平台 canvas）。

---

## 快速开始（构建微信小游戏）

需要 **Node ≥ 18**。

```bash
npm install            # 装依赖
npm run build:weapp    # esbuild 打包引擎 → weapp/game.js
```

然后用 **微信开发者工具** → 「导入项目」→ 选 `weapp/` 目录（项目类型选「小游戏」），
即可看到引擎自检 demo：几个彩色形状按速度在画布上漂移（证明引擎在微信环境正确上屏 + 跑循环）。

> `weapp/game.js` 是构建产物（已 gitignore）；`weapp/game.json`、`weapp/project.config.json` 是小游戏配置。
> 正式发布前把 `project.config.json` 里的 `appid` 改成你自己的小游戏 AppID。

## 开发与验证（无需微信环境）

| 命令 | 作用 |
|------|------|
| `npm run typecheck` | TypeScript 类型检查（`tsc --noEmit`，exit 0） |
| `npm run test` | 全部单测（vitest，976 passed / 129 files） |
| `npm run demo` | 无头跑引擎：ASCII 可视化 + skill 协作日志 + record/replay 校验 |
| `npm run build:weapp` | 构建微信小游戏产物 → `weapp/game.js` |
| `npm run build:weapp:min` | 同上 + 压缩 |
| `npm run build` | 类型检查 + 构建微信产物（CI 全绿门槛） |

## 项目结构

```
src/
  engine/        ECS 内核（World / 类型 / 拓扑排序 / defineCapability）+ protocol 共享组件契约
  skills/        原子 skill（atoms）+ Tier 1-4 涌现系统
  renderer/      collectRenderables + Canvas/Ascii/Three 后端（已支持平台注入 canvas）
  assets/        美术资产系统（清单 / 图集 / 加载 / 检索）
  services/      基础设施端口：audio / storage（端口 + 多后端实现）
  net/           多人地基：固定步长 + tick 输入模型 + lockstep + 状态同步
  runtime/       Engine（装载蓝图 + 固定步长循环 + 渲染后端）
  debug/         Tracer（skill 协作日志）+ Recorder / Replayer（确定性录制回放）
  assembly/      蓝图组装：playground（引擎 demo）/ manifest / capability 目录
  platform/
    wechat/      ★ 微信小游戏适配层（本次新增）
      wx.d.ts          wx 运行时最小类型声明
      bootstrap.ts     createWechatGame()：上屏 + 装载 + 起循环
      storage.ts       WechatStoragePort（wx 存储）
      audio.ts         WechatAudioPort（InnerAudioContext）
      input.ts         WechatTouchInputSource（触摸 → 确定性输入）
      image-loader.ts  WechatImageAssetLoader（wx.createImage）
      net.ts           WechatSyncChannel（wx.connectSocket）
      main.ts          小游戏入口（引擎自检 demo）
weapp/           微信小游戏项目（game.json / project.config.json；game.js 为构建产物）
scripts/build-weapp.mjs   esbuild 打包脚本
wiki/, docs/     引擎设计文档与原子周期表
```

## 写你自己的游戏

引擎是确定性解释器，**玩法 = 数据**。一个最小入口：

```ts
import { createWechatGame } from '@platform/wechat/index.js';
import type { WorldBlueprint } from './assembly/demo.assembly.js';

const myGame: WorldBlueprint = {
  capabilities: [ /* 复用 src/skills 里的 capability */ ],
  entities: { /* 你的实体 + 组件数据 */ },
};

const game = createWechatGame({
  blueprint: myGame,
  background: '#16213e',
  touch: { move: true },   // 需要触摸输入时
});
game.start();
```

把 `src/platform/wechat/main.ts` 里的 `playgroundBlueprint` 换成你的蓝图，`npm run build:weapp` 即可。
更多能力见 `wiki/skills/index.md`（按分类查原子/Tier skill）。
