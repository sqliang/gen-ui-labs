import { create } from "zustand";

import type { ProtocolKind, RenderableEvent } from "@/core/protocols/common/types";

interface StreamingState {
  // === 状态 ===
  /** append-only 事件流（Lab 1 / Lab 2 共用） */
  chunks: RenderableEvent[];
  /** 是否正在流式生成 */
  isStreaming: boolean;
  /** 当前协议类型（决定如何 reduce） */
  protocol: ProtocolKind;
  /** 当前累积的文本（Markdown / AG-UI 协议专用，方便 UI 整段渲染） */
  accumulatedText: string;

  // === 动作 ===
  start: (protocol: ProtocolKind) => void;
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
 *
 * RenderableEvent 类型定义在 core/protocols/common/，
 * 确保 streaming-store / mock-base / debug-scenarios / /api/chat 共用同一套类型。
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
