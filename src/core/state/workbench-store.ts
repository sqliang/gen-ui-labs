import { create } from "zustand";

/** Workbench 三栏宽度（px） */
export interface WorkbenchLayout {
  /** 左侧源码/DSL 栏 */
  leftWidth: number;
  /** 中间过程事件栏 */
  centerWidth: number;
  /** 右侧渲染栏 */
  rightWidth: number;
}

/** Inspector 选中节点 */
export interface InspectorSelection {
  /** 节点 id */
  nodeId: string;
  /** 在源码中的大致行号（用于反查） */
  sourceLine?: number;
}

interface WorkbenchState {
  // === 状态 ===
  /** 三栏宽度 */
  layout: WorkbenchLayout;
  /** 当前选中的节点（用于节点 Inspector） */
  selectedNode: InspectorSelection | null;
  /** scrubber 时间轴位置（0–1） */
  scrubberPosition: number;
  /** 是否暂停回放 */
  paused: boolean;

  // === 动作 ===
  setLayout: (layout: Partial<WorkbenchLayout>) => void;
  selectNode: (node: InspectorSelection | null) => void;
  setScrubberPosition: (position: number) => void;
  togglePause: () => void;
  setPaused: (paused: boolean) => void;
  reset: () => void;
}

const DEFAULT_LAYOUT: WorkbenchLayout = {
  leftWidth: 360,
  centerWidth: 320,
  rightWidth: 9999, // 用一个特殊值表示"剩余"
};

/**
 * Lab 3 Workbench 的客户端状态。
 *
 * 三栏宽度 / 选中节点 / scrubber 位置 —— 高频、跨面板、不入 URL（高频拖动
 * scrubber 会刷路由，体验差）。
 */
export const useWorkbenchStore = create<WorkbenchState>()((set) => ({
  layout: DEFAULT_LAYOUT,
  selectedNode: null,
  scrubberPosition: 0,
  paused: false,

  setLayout: (partial) =>
    set((state) => ({
      layout: { ...state.layout, ...partial },
    })),

  selectNode: (selectedNode) => set({ selectedNode }),

  setScrubberPosition: (scrubberPosition) => set({ scrubberPosition }),

  togglePause: () => set((s) => ({ paused: !s.paused })),

  setPaused: (paused) => set({ paused }),

  reset: () =>
    set({
      layout: DEFAULT_LAYOUT,
      selectedNode: null,
      scrubberPosition: 0,
      paused: false,
    }),
}));
