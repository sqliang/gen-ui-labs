import { create } from "zustand";

/** 协议事件（按 §9 streamingStore 设计） */
export type RenderableEvent =
  | { kind: "text"; delta: string; path?: string }
  | { kind: "component"; op: "mount" | "patch" | "unmount"; id: string }
  | { kind: "state"; path: string; value: unknown }
  | { kind: "tool"; name: string; args: unknown }
  | { kind: "control"; type: "start" | "end" | "error"; meta?: unknown };

interface StreamingState {
  // === 状态 ===
  /** append-only 事件流（Lab 1 / Lab 2 共用） */
  chunks: RenderableEvent[];
  /** 是否正在流式生成 */
  isStreaming: boolean;
  /** 当前协议类型（决定如何 reduce） */
  protocol: "markdown" | "ag-ui" | "a2ui" | "json-ui";
  /** 当前累积的文本（Markdown 协议专用，方便 UI 整段渲染） */
  accumulatedText: string;

  // === 动作 ===
  start: (protocol: StreamingState["protocol"]) => void;
  append: (event: RenderableEvent) => void;
  finish: () => void;
  reset: () => void;
}

const MAX_CHUNKS = 10_000;

/**
 * 流式事件状态。
 *
 * 高频追加、跨组件订阅、不入 URL —— Zustand 承担。
 * 不持久化（刷新即丢，符合"流式"语义）。
 */
export const useStreamingStore = create<StreamingState>()((set) => ({
  chunks: [],
  isStreaming: false,
  protocol: "markdown",
  accumulatedText: "",

  start: (protocol) =>
    set({
      chunks: [],
      isStreaming: true,
      protocol,
      accumulatedText: "",
    }),

  append: (event) =>
    set((state) => {
      // 防止内存爆炸：超过 MAX_CHUNKS 后截断前半部分
      const nextChunks =
        state.chunks.length >= MAX_CHUNKS
          ? state.chunks.slice(state.chunks.length - MAX_CHUNKS + 1)
          : state.chunks;

      const nextAccumulated =
        event.kind === "text" ? state.accumulatedText + event.delta : state.accumulatedText;

      return {
        chunks: [...nextChunks, event],
        accumulatedText: nextAccumulated,
      };
    }),

  finish: () => set({ isStreaming: false }),

  reset: () =>
    set({
      chunks: [],
      isStreaming: false,
      protocol: "markdown",
      accumulatedText: "",
    }),
}));
