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
  /** 工具名（spec 字段名） */
  toolCallName: string;
  /** 兼容别名 */
  name?: string;
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
  /** 错误信息（如 tool call 失败） */
  error?: string;
}

export interface AguiStateSnapshot {
  type: "STATE_SNAPSHOT";
  snapshot: Record<string, unknown>;
}

export interface AguiStateDelta {
  type: "STATE_DELTA";
  /** JSON Patch 风格 op 数组 */
  delta: Array<{ op: string; path: string; value?: unknown }>;
  /** 简易单 op 形式（部分 server 推这种） */
  op?: string;
  path?: string;
  value?: unknown;
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

// ===== 有状态 adapter（合并 tool call lifecycle） =====

/**
 * 跟 stateless aguiAdapter 的区别：
 * - TOOL_CALL_START 单独 output（带 id）
 * - TOOL_CALL_ARGS 累积 args delta，**到 TOOL_CALL_END 才一次性 emit 一个合并的 tool chunk**
 * - 中间不丢 name（ARGS 没有 name）
 * - STATE_DELTA 累积所有 patch 到一个 state chunk
 *
 * 用法：streamed 流式消费时，对每个新事件调 `stateful.adapt(event)`，
 * 返回所有"应该发到下游"的 RenderableEvent（可能 0/1/2 个）。
 */
export interface StatefulProtocolAdapter<TExternalEvent = unknown> {
  readonly protocol: "ag-ui";
  adapt(event: TExternalEvent): RenderableEvent[];
  /** 重置（开始新一次 run） */
  reset(): void;
}

/** 可选 sink：每次 adapt 完调用，让上游订阅"完整 tool chunk" / "state chunk" */
export interface StatefulAdapterSink {
  onTool?(tool: Extract<RenderableEvent, { kind: "tool" }>): void;
  onState?(state: Extract<RenderableEvent, { kind: "state" }>): void;
  onMeta?(meta: Extract<RenderableEvent, { kind: "control" }>): void;
}

export function createAguiStatefulAdapter(
  sink?: StatefulAdapterSink,
): StatefulProtocolAdapter<AguiEvent> {
  // toolCallId → { name, argsBuffer }
  const toolCalls = new Map<string, { name: string; argsBuffer: string }>();
  // 全局 state 累积
  const stateBuffer: Array<{ op: string; path: string; value?: unknown }> = [];

  return {
    protocol: "ag-ui",

    adapt(event: AguiEvent): RenderableEvent[] {
      const out: RenderableEvent[] = [];
      switch (event.type) {
        case "TEXT_MESSAGE_CONTENT":
          out.push({ kind: "text", delta: event.delta });
          break;

        case "TOOL_CALL_START":
          toolCalls.set(event.toolCallId, {
            name: event.toolCallName,
            argsBuffer: "",
          });
          // 先 emit 一个"开始"meta，下游可订阅 tool_started 事件
          out.push({
            kind: "control",
            type: "meta",
            meta: { toolStarted: event.toolCallId, name: event.toolCallName },
          });
          break;

        case "TOOL_CALL_ARGS": {
          const tc = toolCalls.get(event.toolCallId);
          if (tc) tc.argsBuffer += event.delta;
          break;
        }

        case "TOOL_CALL_END": {
          const tc = toolCalls.get(event.toolCallId);
          if (!tc) break;
          let parsedArgs: unknown = {};
          try {
            parsedArgs = JSON.parse(tc.argsBuffer);
          } catch {
            // args 不完整时塞原始 buffer 让调用方处理
            parsedArgs = { _raw: tc.argsBuffer };
          }
          // event.result 存在（成功）或 event.error 存在（失败）——
          // 由于当前 spec 没明文 result 字段，先按 AguiToolCallEnd.error 走
          const result = (event as { result?: unknown }).result;
          const error = event.error;
          const toolEv: RenderableEvent = {
            kind: "tool",
            name: tc.name,
            args: parsedArgs,
            ...(result !== undefined ? { result } : {}),
            ...(error !== undefined ? { error } : {}),
            id: event.toolCallId,
          };
          out.push(toolEv);
          sink?.onTool?.(toolEv as Extract<RenderableEvent, { kind: "tool" }>);
          toolCalls.delete(event.toolCallId);
          break;
        }

        case "STATE_SNAPSHOT":
          // SNAPSHOT 是"全量"，覆盖 buffer
          stateBuffer.length = 0;
          for (const [path, value] of Object.entries(event.snapshot)) {
            stateBuffer.push({ op: "replace", path, value });
          }
          {
            const ev: RenderableEvent = { kind: "state", path: "/", value: event.snapshot };
            out.push(ev);
            sink?.onState?.(ev as Extract<RenderableEvent, { kind: "state" }>);
          }
          break;

        case "STATE_DELTA":
          // 累积 patch，emit 一个累计 state chunk
          for (const patch of event.delta) {
            stateBuffer.push(patch);
          }
          {
            const ev: RenderableEvent = {
              kind: "state",
              path: "/__delta__",
              value: stateBuffer.slice(),
            };
            out.push(ev);
            sink?.onState?.(ev as Extract<RenderableEvent, { kind: "state" }>);
          }
          break;

        case "RUN_STARTED":
          out.push({ kind: "control", type: "start" });
          break;

        case "RUN_FINISHED":
          out.push({ kind: "control", type: "end" });
          break;

        case "RUN_ERROR":
          out.push({
            kind: "control",
            type: "error",
            meta: { message: event.message, code: event.code },
          });
          break;
      }
      return out;
    },

    reset(): void {
      toolCalls.clear();
      stateBuffer.length = 0;
    },
  };
}
