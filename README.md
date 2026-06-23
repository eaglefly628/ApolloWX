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
| `npm run build:weapp` | 构建微信小游戏产物（2D demo）→ `weapp/game.js` |
| `npm run build:weapp:3d` | 构建 **3D** demo（**three.js**，自转的 Mesh3D 物件）→ `weapp/game.js` |
| `npm run build:weapp:3d:min` | 3D（three.js）构建 + 压缩（three 较大，发布建议用此） |
| `npm run build:weapp:3d-lite` | 3D demo（零依赖原生 WebGL，包小、功能基础） |
| `npm run build:weapp:ui` | **数据驱动 UI** demo（canvas 解释 LayoutNode 树，点按钮改数据重绘） |
| `npm run build:weapp:min` | 2D 构建 + 压缩 |
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

## 3D

引擎把 **3D 也当数据**：给实体挂 `Mesh3D` 组件（`box` / `plane` + 尺寸 + `frontTint`/`backTint`/`edgeTint`
+ 翻面轴），位姿取自同实体的 `Transform`，与 2D 实体**同场混排**（per-object opt-in 3D，不是整场景 3D）。
一份 Mesh3D 数据，2D / WebGL / three.js 三种后端都能渲（同一份 `collectRenderables`）。

### 默认：three.js（成熟可靠，推荐）

微信小游戏的 3D 默认走 **three.js**（Web 3D 事实标准）。three.js 在微信需要补 DOM 全局，
本仓库自带精简 **weapp 适配垫片** `src/platform/wechat/adapter.ts`（按对 three 源码的静态分析，
只补它真正用到的 `document.createElementNS`/`navigator.userAgent`/`window.*`/`canvas.addEventListener` 等）。

> **版本说明**：three 固定在 **r0.162**（最后一条支持 **WebGL1** 回退的版本）。three r163+ 强制要求
> WebGL2，而微信小游戏在不少设备上只稳定提供 WebGL1 —— 用 r162 换取最广的设备兼容。若你只面向支持
> WebGL2 的设备，可自行升级 three。

```ts
import { createWechatThreeGame } from '@platform/wechat/index.js';

createWechatThreeGame({
  background: 0x0a0a14,
  blueprint: {
    capabilities: [/* transform / velocity / rotation-apply 等 */],
    entities: {
      cube: {
        Transform: { x: 0, y: 0, rotation: 0, scaleX: 1, scaleY: 1 },
        Velocity:  { vx: 0, vy: 0, angular: 0.03 },         // 自转
        Mesh3D:    { shape: 'box', width: 80, height: 80, depth: 80,
                     frontTint: 0xef4444, backTint: 0x991b1b, edgeTint: 0x7f1d1d, flipAxis: 'y' },
      },
    },
  },
}).start();
```

跑 3D demo：`npm run build:weapp:3d`（或 `:3d:min` 压缩，three 较大）→ 微信开发者工具打开 `weapp/`，
**用手指拖动屏幕即可转动立方体**（触摸交互 demo）。示例蓝图 `src/assembly/interactive3d.assembly.ts`。

> **触摸交互怎么走的**：`wx.onTouch*` → `WechatTouchInputSource` → 确定性命令流 → 单例 `InputQueue` →
> `drag-rotate` 系统读事件改 `Transform.rotation` → 渲染。即「输入也是数据、由引擎系统解释」。
> 另有自转版蓝图 `src/assembly/playground3d.assembly.ts`（无需触摸）。

### 备选：零依赖原生 WebGL（lite）

对包体极敏感、或目标设备 WebGL 能力受限时，用引擎自带的 `WebGLRenderer`（`src/renderer/webgl-renderer.ts`）：
裸 WebGL，无 three、无适配垫片，包小（~130KB vs three ~570KB）。功能基础（`frontTint` 单色 + 方向光）。

```ts
import { createWechatGame } from '@platform/wechat/index.js';
createWechatGame({ renderer: '3d', blueprint: /* … */ }).start();
```

跑：`npm run build:weapp:3d-lite`。

> ⚠️ three.js 路径的最终像素需在**微信开发者工具/真机**确认：本仓库已对 three r162 源码做静态分析、
> 让垫片精确覆盖其 DOM 触点，并验证打包/类型/适配单测全绿；但无 GPU/微信运行时的 CI 里无法渲染真实画面。

## 数据驱动 UI

UI **也是数据**：一棵 `LayoutNode` 树（控件类型取自闭集、事件只出现"信号名字符串"、主题是 `UITheme` 令牌），
弱模型只填数据，引擎把它解释成像素。这套数据模型直接复用自源引擎（`src/ui/components/types.ts`，平台无关）。
网页版用 `renderNode`→HTML / `mountUI`→DOM；**微信版换成 canvas 解释器**（无 DOM）：

- `src/ui/layout.ts` —— 纯布局引擎：`LayoutNode` 树 → 每个节点的绝对矩形（row/column/grid、flex、gap、
  padding、绝对定位）。无 canvas/DOM，**node 可单测**。
- `src/ui/canvas-ui.ts` —— `CanvasUI`：把布局结果画到 Canvas2D，并按"热区"做触摸命中。
  **已与网页解释器全对齐（20 控件）**：Screen / Panel / Label / Button / Badge / Tag / Divider /
  ProgressBar / Table / Tabs / Modal / Toast / Checkbox / Toggle / RadioGroup / Dropdown / Slider /
  Input / Image / Dropdown 弹层。
- `src/platform/wechat/ui.ts` —— `createWechatUI()`：上屏画布 + 触摸派发，并实现运行时交互：
  Tabs 引擎内切页（不重建）、Modal 遮罩/×关闭、Dropdown 浮层选择、Checkbox/Toggle/RadioGroup 信号、
  Slider 拖动改值、**Input 拉起 wx 原生键盘**、Image 异步加载缓存重绘、`toast()` 定时飘字。

```ts
import { createWechatUI } from '@platform/wechat/index.js';

let n = 0;
const app = createWechatUI({
  root: buildUI(n),                       // 一棵 LayoutNode 数据树（见 main-ui.ts）
  handlers: {                             // 信号名 → 回调（工程师写；布局数据里只有名字）
    inc: () => { n++; app.setRoot(buildUI(n)); },   // 改数据 → 重绘
  },
});
```

跑 UI demo：`npm run build:weapp:ui` → 微信开发者工具打开 `weapp/`，是一个三页 Tabs（基础/表单/数据），
覆盖按钮/Toast/Modal、开关/单选/滑块/下拉/输入(原生键盘)、进度条/表格。示例 `src/platform/wechat/main-ui.ts`。
换皮 = 传一份你自己的 `UITheme` 令牌（同一份 UI 数据，零改解释器）。

> 与网页解释器（`render.ts`→HTML / `server.ts`→DOM）现已**全控件对齐**：数据模型 `types.ts` 逐字共享，
> 微信只是第三个解释器（canvas）。后续若源库补新控件，这边按同一套"绘制 + 热区"接口跟进即可。
