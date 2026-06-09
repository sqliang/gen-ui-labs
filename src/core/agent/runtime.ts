/**
 * core/agent/runtime.ts
 *
 * 基础 Agent 运行时（W8）。
 *
 * 支持两种模式：
 * - ReAct：Thought → Action → Observation → loop
 * - Plan-Execute：Plan → Execute → Reflect
 *
 * Agent 产出 RenderableEvent 流，直接进 streaming-store。
 */

import type { RenderableEvent } from "@/core/protocols/common/types";

export type AgentMode = "react" | "plan-execute";

export interface AgentConfig {
  mode: AgentMode;
  model: string;
  maxSteps?: number;
}

interface AgentStep {
  thought: string;
  action?: string;
  observation?: string;
}

export async function* runAgent(
  config: AgentConfig,
  prompt: string,
  signal: AbortSignal,
): AsyncIterable<RenderableEvent> {
  yield { kind: "control", type: "start" };
  const max = config.maxSteps ?? 5;
  const steps: AgentStep[] = [];

  for (let i = 0; i < max; i++) {
    if (signal.aborted) break;

    if (config.mode === "react") {
      yield {
        kind: "text",
        delta: `\n🤔 **Reasoning step ${i + 1}**\n`,
      };

      const thought = `分析 prompt「${prompt.slice(0, 30)}...」并规划第 ${i + 1} 步`;
      yield {
        kind: "text",
        delta: `- Thought: ${thought}\n`,
      };

      if (i < max - 1) {
        const action = "调用 web_search 工具获取信息";
        yield {
          kind: "tool",
          name: "web_search",
          args: { query: `step-${i + 1}` },
        };

        yield {
          kind: "text",
          delta: `- Action: ${action}\n`,
        };

        steps.push({ thought, action });
      } else {
        yield {
          kind: "text",
          delta: `- **最终答案**: 基于 ${max} 步推理，这是 Agent runtime 的 mock 演示。\n`,
        };
        steps.push({ thought });
      }
    } else {
      // plan-execute
      yield {
        kind: "text",
        delta: `\n📋 **Plan-Execute mode** — step ${i + 1}/${max}\n`,
      };
    }
  }

  yield { kind: "control", type: "end" };
}
