// 微信小游戏入口（数据驱动 UI demo · 全控件）。
// 同一套 LayoutNode 数据 + CanvasUI 解释器，跑通微信无 DOM 环境下的全部控件与交互：
// Tabs 切页、Button/Toast、Checkbox/Toggle/RadioGroup/Slider/Dropdown、Input(wx 原生键盘)、Modal。
// 状态在闭包里，改了就 setRoot 重绘——事件只走"信号名字符串"，回调写在 handlers。

import { createWechatUI } from './ui.js';
import type { LayoutNode } from '@ui/components/types.js';

const g = globalThis as unknown as { performance?: { now(): number } };
if (typeof g.performance === 'undefined' || typeof g.performance.now !== 'function') {
  g.performance = { now: () => Date.now() };
}

const state = {
  count: 0,
  agree: false,
  sound: true,
  diff: 'normal',
  volume: 60,
  name: '',
  modal: false,
};

function buildUI(): LayoutNode {
  return {
    type: 'Screen',
    id: 'root',
    props: {},
    layout: { padding: 14, gap: 12 },
    children: [
      { type: 'Label', id: 'h', props: { text: 'ApolloWX · 数据驱动 UI', size: 'lg', color: 'text', bold: true } },
      {
        type: 'Tabs',
        id: 'tabs',
        props: { tabs: [{ id: 'basic', label: '基础' }, { id: 'form', label: '表单' }, { id: 'data', label: '数据' }] },
        layout: { flex: 1 },
        children: [
          // 页1：基础
          {
            type: 'Panel', id: 'p1', props: {}, layout: { gap: 12 },
            children: [
              { type: 'Label', id: 'cv', props: { text: `计数：${state.count}`, size: 'xl', color: 'jade', bold: true } },
              {
                type: 'Panel', id: 'row', props: {}, layout: { direction: 'row', gap: 10, padding: 0, height: 42 },
                children: [
                  { type: 'Button', id: 'dec', props: { label: '−1', kind: 'ghost', action: 'dec' }, layout: { flex: 1 } },
                  { type: 'Button', id: 'inc', props: { label: '+1', kind: 'primary', action: 'inc' }, layout: { flex: 1 } },
                ],
              },
              { type: 'Divider', id: 'd1', props: {} },
              { type: 'Button', id: 'toast', props: { label: '弹一条 Toast', kind: 'ghost', action: 'toast' }, layout: { height: 42 } },
              { type: 'Button', id: 'openm', props: { label: '打开 Modal', kind: 'primary', action: 'openModal' }, layout: { height: 42 } },
            ],
          },
          // 页2：表单
          {
            type: 'Panel', id: 'p2', props: {}, layout: { gap: 14 },
            children: [
              { type: 'Checkbox', id: 'agree', props: { label: '我同意条款', checked: state.agree, action: 'agree' } },
              { type: 'Toggle', id: 'sound', props: { label: '音效', checked: state.sound, action: 'sound' } },
              { type: 'Label', id: 'dl', props: { text: '难度', size: 'sm', color: 'sub' } },
              { type: 'RadioGroup', id: 'diff', props: { name: 'diff', value: state.diff, action: 'diff', options: [{ value: 'easy', label: '简单' }, { value: 'normal', label: '普通' }, { value: 'hard', label: '困难' }] } },
              { type: 'Slider', id: 'vol', props: { label: '音量', min: 0, max: 100, step: 5, value: state.volume, action: 'vol' }, layout: { height: 46 } },
              { type: 'Dropdown', id: 'lang', props: { value: '', placeholder: '选择语言', action: 'lang', options: [{ value: 'zh', label: '中文' }, { value: 'en', label: 'English' }, { value: 'jp', label: '日本語' }] }, layout: { height: 40 } },
              { type: 'Input', id: 'name', props: { value: state.name, placeholder: '点此输入昵称', action: 'name' }, layout: { height: 40 } },
            ],
          },
          // 页3：数据
          {
            type: 'Panel', id: 'p3', props: {}, layout: { gap: 10 },
            children: [
              { type: 'ProgressBar', id: 'pb', props: { value: state.volume, max: 100, tone: 'ok', showValue: true }, layout: { height: 20 } },
              {
                type: 'Table', id: 'tb', props: {
                  columns: [{ key: 'k', label: '项', align: 'left' }, { key: 'v', label: '值', align: 'right' }],
                  rows: [
                    { id: 'r1', cells: { k: '计数', v: String(state.count) } },
                    { id: 'r2', cells: { k: '难度', v: state.diff }, tone: 'accent' },
                    { id: 'r3', cells: { k: '昵称', v: state.name || '—' }, tone: 'dim' },
                  ],
                }, layout: { height: 120 },
              },
            ],
          },
        ],
      },
      // 模态（按需出现）
      ...(state.modal ? [{
        type: 'Modal' as const, id: 'm', props: { title: '提示', size: 'md' as const, closeAction: 'closeModal' },
        layout: { gap: 12 },
        children: [
          { type: 'Label' as const, id: 'mt', props: { text: '这是一个数据驱动的模态浮层。', size: 'md' as const, color: 'text' as const } },
          { type: 'Button' as const, id: 'mok', props: { label: '知道了', kind: 'primary' as const, action: 'closeModal' }, layout: { height: 42 } },
        ],
      }] : []),
    ],
  };
}

const app = createWechatUI({
  root: buildUI(),
  handlers: {
    inc: () => { state.count++; app.setRoot(buildUI()); },
    dec: () => { state.count--; app.setRoot(buildUI()); },
    toast: () => app.toast('已触发 Toast', 'ok'),
    openModal: () => { state.modal = true; app.setRoot(buildUI()); },
    closeModal: () => { state.modal = false; app.setRoot(buildUI()); },
    agree: (v) => { state.agree = v === 'true'; app.setRoot(buildUI()); },
    sound: (v) => { state.sound = v === 'true'; app.setRoot(buildUI()); },
    diff: (v) => { state.diff = v ?? 'normal'; app.setRoot(buildUI()); },
    vol: (v) => { state.volume = Number(v); app.setRoot(buildUI()); },
    lang: (v) => { app.toast(`语言：${v}`, 'accent'); },
    name: (v) => { state.name = v ?? ''; app.setRoot(buildUI()); },
  },
});
