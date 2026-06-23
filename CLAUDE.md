# ApolloWX — 项目规则（Claude 每次会话必读）

## 这是什么
Apollo 数据驱动 ECS 引擎的**微信小游戏版**。由 [eaglefly628/ApolloGame](https://github.com/eaglefly628/ApolloGame)
的 `claude/mainbranch` 移植而来：**移除全部内置游戏与 React 网页 UI，只保留纯引擎**，新增 `src/platform/wechat/` 微信适配层。

## ⭐ 核心规则
1. **数据驱动宣言是最高纲领**：`docs/design/data-driven-manifesto.md`。
   尺子：「最弱的 LLM 能不能也产出一模一样的数据？」能→数据接口；不能→拒绝，做成 DSL 或下沉成 capability。
2. **整个游戏是数据；代码只属于引擎这台固定的确定性解释器。** 游戏专属代码/手写 UI 倾向消解为数据 + 通用解释器。
3. **平台无关铁律**：`engine/skills/assembly/net/services/renderer/assets/runtime/debug` 的 sim 逻辑**绝不**直接调
   `wx.*` / `document` / `window`。所有平台 IO 走端口（`services/*/`-port + `platform/wechat/*` 实现）。
   渲染器若需平台 canvas，通过构造选项注入（见 `CanvasRenderer({ canvas })`），不在引擎里 `import wx`。

## 工作规范
- 开发分支 `claude/game-engine-wechat-port-8cr3zs`，**直推不开 PR**（除非用户明确要求）。
- **三道门全绿才推**：`npm run typecheck`（tsc 0 错） + `npm run test`（vitest 全过） + `npm run build:weapp`（产出 game.js）。
- 提交署名 `Claude <noreply@anthropic.com>`；不在产物/提交里写模型标识。
- 新增微信 API 适配 → 放 `src/platform/wechat/`，并在 `wx.d.ts` 补类型；不要把 `wx` 类型散落进引擎核心。
- 开发新 capability 前先查 `wiki/skills/index.md` 找分类，再读该分类 `.md`，了解最佳实践与陷阱。

## 关键文件
- 宪法：`docs/design/data-driven-manifesto.md`
- 引擎总览：`docs/apollo-engine-overview-for-planner.md`
- 能力库：`src/skills/{atoms,tier1,tier2,tier3}`；组件契约 `src/engine/protocol/components.ts`
- 微信适配层：`src/platform/wechat/`（`index.ts` 为对外 barrel；`bootstrap.ts`=2D/lite-3D 引导；`three-game.ts`=three.js 3D；`ui.ts`=数据驱动 UI）
- 数据驱动 UI：`src/ui/`（`components/types.ts` 平台无关数据模型；`layout.ts` 纯布局；`canvas-ui.ts` canvas 解释器）。UI 是数据、事件走信号名、主题是令牌——红线同宣言。
- 构建：`scripts/build-weapp.mjs`（esbuild → `weapp/game.js`）；小游戏配置 `weapp/game.json`、`weapp/project.config.json`
