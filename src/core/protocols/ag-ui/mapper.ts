/**
 * core/protocols/ag-ui/mapper.ts
 *
 * AG-UI 协议事件 → RenderableEvent 映射器。
 *
 * AG-UI 事件规范（v0.2）：
 * - TEXT_MESSAGE_CONTENT：文本增量
 * - TOOL_CALL_START / TOOL_CALL_ARGS / TOOL_CALL_END：工具调用生命周期
 * - STATE_SNAPSHOT / STATE_DELTA：状态更新
 *
 * 本 mapper 只做单向转换：AG-UI → RenderableEvent。
 * 反方向（RenderableEvent → AG-UI）不需要，因为 provider 直接产出 AG-UI 格式。
 */

import type { ProtocolAdapter, RenderableEvent } from "@/core/protocols/common/types";

// ===== AG-UI 事件类型（规范子集） =====

export interface AguiTextMessageContent {
  type: "TEXT_MESSAGE_CONTENT";
  messageId: string;
  delta: string;
}

export interface AguiToolCallStart {
  type: "TOOL_CALL_START";
  toolCallId: string;
  toolCallName: string;
  parentMessageId?: string;
}

export interface AguiToolCallArgs {
  type: "TOOL_CALL_ARGS";
  toolCallId: string;
  delta: string;
}

export interface AguiToolCallEnd {
  type: "TOOL_CALL_END";
  toolCallId: string;
}

export interface AguiStateSnapshot {
  type: "STATE_SNAPSHOT";
  snapshot: Record<string, unknown>;
}

export interface AguiStateDelta {
  type: "STATE_DELTA";
  delta: Array<{ op: string; path: string; value?: unknown }>;
}

export interface AguiRunStarted {
  type: "RUN_STARTED";
  threadId: string;
  runId: string;
}

export interface AguiRunFinished {
  type: "RUN_FINISHED";
  threadId: string;
  runId: string;
}

export interface AguiRunError {
  type: "RUN_ERROR";
  message: string;
  code?: string;
}

/** AG-UI 事件联合类型 */
export type AguiEvent =
  | AguiTextMessageContent
  | AguiToolCallStart
  | AguiToolCallArgs
  | AguiToolCallEnd
  | AguiStateSnapshot
  | AguiStateDelta
  | AguiRunStarted
  | AguiRunFinished
  | AguiRunError;

// ===== 映射器 =====

export const aguiAdapter: ProtocolAdapter<AguiEvent> = {
  protocol: "ag-ui",

  adapt(event: AguiEvent): RenderableEvent {
    switch (event.type) {
      case "TEXT_MESSAGE_CONTENT":
        return { kind: "text", delta: event.delta };

      case "TOOL_CALL_START":
        return {
          kind: "tool",
          name: event.toolCallName,
          args: {}, // start 时 args 未知
        };

      case "TOOL_CALL_ARGS": {
        // delta 是 JSON 片段，拼起来后 parse
        let parsed: unknown = {};
        try {
          parsed = JSON.parse(event.delta);
        } catch {
          // 不完整 JSON 就算了
        }
        return {
          kind: "tool",
          name: "", // ARGS 不带 tool 名，靠 toolCallId 关联
          args: parsed as Record<string, unknown>,
        };
      }

      case "TOOL_CALL_END":
        // END 本身不产生 RenderableEvent（由 ARGS 和后续 text 覆盖）
        return { kind: "control", type: "meta", meta: { toolCallEnd: event.toolCallId } };

      case "STATE_SNAPSHOT":
        return {
          kind: "state",
          path: "/",
          value: event.snapshot,
        };

      case "STATE_DELTA":
        return {
          kind: "state",
          path: event.delta[0]?.path ?? "/",
          value: event.delta,
        };

      case "RUN_STARTED":
        return { kind: "control", type: "start" };

      case "RUN_FINISHED":
        return { kind: "control", type: "end" };

      case "RUN_ERROR":
        return {
          kind: "control",
          type: "error",
          meta: { message: event.message, code: event.code },
        };
    }
  },

  adaptAll(events: AguiEvent[]): RenderableEvent[] {
    return events.map((e) => this.adapt(e));
  },
};
