// 微信小游戏构建：把引擎入口打成单文件 weapp/game.js（小游戏的入口约定）。
// 用 esbuild 打包；处理两件事：
//   1) 路径别名 @engine/@skills/... → src/*（与 tsconfig.paths 对齐）。
//   2) NodeNext 风格的 ".js" import 指向 ".ts" 源 —— 插件改写扩展名后重新解析。
import { build } from 'esbuild';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const r = (p) => resolve(root, p);

// 与 tsconfig.json 的 paths 保持一致。
const alias = {
  '@engine': r('src/engine'),
  '@skills': r('src/skills'),
  '@atom-skills': r('src/skills/atoms'),
  '@assets': r('src/assets'),
  '@services': r('src/services'),
  '@renderer': r('src/renderer'),
  '@net': r('src/net'),
  '@runtime': r('src/runtime'),
  '@platform': r('src/platform'),
  '@ui': r('src/ui'),
};

// 把 import 里的 ".js" 重解析到对应 ".ts/.tsx" 源（esbuild 默认不做该映射）。
const jsToTs = {
  name: 'js-to-ts',
  setup(b) {
    b.onResolve({ filter: /\.js$/ }, async (args) => {
      // 只处理本仓库源码的 .js→.ts 映射；node_modules（如 three 内部的 ./three.core.js）原样交默认解析。
      if (
        args.kind === 'entry-point' ||
        args.path.includes('node_modules') ||
        (args.resolveDir && args.resolveDir.includes('node_modules')) ||
        (args.importer && args.importer.includes('node_modules'))
      ) {
        return;
      }
      for (const ext of ['.ts', '.tsx']) {
        const candidate = args.path.replace(/\.js$/, ext);
        const res = await b.resolve(candidate, {
          resolveDir: args.resolveDir,
          kind: args.kind,
          importer: args.importer,
        });
        if (res.errors.length === 0) return { path: res.path, external: res.external };
      }
      return; // 交回默认解析（真 .js / 第三方）
    });
  },
};

// 入口选择：--ui 数据驱动 UI demo；--3d three.js 3D；--3d-lite 零依赖 WebGL 3D；缺省 2D。
// 都产出 weapp/game.js。
const entry = process.argv.includes('--ui')
  ? 'src/platform/wechat/main-ui.ts'
  : process.argv.includes('--3d-lite')
    ? 'src/platform/wechat/main3d-lite.ts'
    : process.argv.includes('--3d')
      ? 'src/platform/wechat/main3d.ts'
      : 'src/platform/wechat/main.ts';

await build({
  entryPoints: [r(entry)],
  outfile: r('weapp/game.js'),
  bundle: true,
  format: 'iife', // 微信小游戏 game.js 作为脚本自执行
  target: 'es2019',
  platform: 'browser',
  charset: 'utf8',
  legalComments: 'none',
  minify: process.argv.includes('--minify'),
  sourcemap: false,
  alias,
  plugins: [jsToTs],
  // wx / GameGlobal 是运行时全局，留作未声明引用即可（esbuild 默认保留）。
  logLevel: 'info',
});

console.log(`✓ 微信小游戏已构建 → weapp/game.js（入口 ${entry}；用微信开发者工具打开 weapp/ 目录）`);
