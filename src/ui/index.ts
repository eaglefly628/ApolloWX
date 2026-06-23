// ═══════════════════════════════════════════════════════════════
//  数据驱动 UI —— 一棵 LayoutNode 树（数据）+ 可替换解释器。
//  数据模型(types) 平台无关；layout 纯布局；CanvasUI 是无 DOM 环境（微信小游戏）的 canvas 解释器。
//  与网页版 renderNode(HTML)/mountUI(DOM) 平级：同一份数据，换解释器即换平台。
// ═══════════════════════════════════════════════════════════════
export type {
  ComponentType, LayoutConstraints, LayoutNode, ComponentProps, UITheme, Handler, HandlerMap,
  ButtonProps, LabelProps, BadgeProps, TagProps, PanelProps, ScreenProps, TableProps,
  TableColumn, TableRow, ProgressBarProps, DropdownProps, InputProps, ImageProps,
} from './components/types.js';
export { DEFAULT_THEME } from './theme.js';
export { layoutTree, hitTest, type Rect, type LaidOut } from './layout.js';
export { CanvasUI } from './canvas-ui.js';
