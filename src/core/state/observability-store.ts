import { create } from "zustand";

/** Token 消耗记录（按阶段/模型/工具切分） */
export interface TokenUsage {
  prompt: number;
  completion: number;
  total: number;
  /** 首 token 延迟（ms） */
  firstTokenLatencyMs?: number;
}

/** 工具调用记录 */
export interface ToolCall {
  id: string;
  name: string;
  args: unknown;
  result?: unknown;
  startedAt: number;
  durationMs?: number;
  retried?: boolean;
  error?: string;
}

/** Agent 推理步骤（思维链） */
export interface ReasoningStep {
  id: string;
  /** step 类型：think / act / observe / reflect */
  type: "think" | "act" | "observe" | "reflect";
  content: string;
  timestamp: number;
}

interface ObservabilityState {
  // === 状态 ===
  /** 当前 session 的 token 累计（按模型切分） */
  tokenUsageByModel: Record<string, TokenUsage>;
  /** 当前 session 的工具调用日志（append-only） */
  toolCalls: ToolCall[];
  /** 当前 session 的推理步骤（append-only） */
  reasoning: ReasoningStep[];
  /** 当前选中的 Agent pattern（ReAct / Plan-Execute / Reflection） */
  agentPattern: "react" | "plan-execute" | "reflection";
  /** 是否正在记录 */
  isRecording: boolean;

  // === 动作 ===
  setPattern: (pattern: ObservabilityState["agentPattern"]) => void;
  startRecording: () => void;
  stopRecording: () => void;
  addTokenUsage: (model: string, usage: TokenUsage) => void;
  addToolCall: (call: ToolCall) => void;
  updateToolCall: (id: string, patch: Partial<ToolCall>) => void;
  addReasoning: (step: ReasoningStep) => void;
  reset: () => void;
}

const MAX_TOOL_CALLS = 5_000;
const MAX_REASONING = 5_000;

/**
 * Lab 4 Agent 可观测性状态。
 *
 * Token / 工具调用 / 推理步骤全是 append-only、高频、跨仪表盘订阅——
 * Zustand 承担。不持久化。
 */
export const useObservabilityStore = create<ObservabilityState>()((set) => ({
  tokenUsageByModel: {},
  toolCalls: [],
  reasoning: [],
  agentPattern: "react",
  isRecording: false,

  setPattern: (agentPattern) => set({ agentPattern }),

  startRecording: () =>
    set({
      isRecording: true,
      tokenUsageByModel: {},
      toolCalls: [],
      reasoning: [],
    }),

  stopRecording: () => set({ isRecording: false }),

  addTokenUsage: (model, usage) =>
    set((state) => {
      const prev = state.tokenUsageByModel[model] ?? {
        prompt: 0,
        completion: 0,
        total: 0,
      };
      return {
        tokenUsageByModel: {
          ...state.tokenUsageByModel,
          [model]: {
            prompt: prev.prompt + usage.prompt,
            completion: prev.completion + usage.completion,
            total: prev.total + usage.total,
            firstTokenLatencyMs: prev.firstTokenLatencyMs ?? usage.firstTokenLatencyMs,
          },
        },
      };
    }),

  addToolCall: (call) =>
    set((state) => {
      const next =
        state.toolCalls.length >= MAX_TOOL_CALLS
          ? state.toolCalls.slice(state.toolCalls.length - MAX_TOOL_CALLS + 1)
          : state.toolCalls;
      return { toolCalls: [...next, call] };
    }),

  updateToolCall: (id, patch) =>
    set((state) => ({
      toolCalls: state.toolCalls.map((c) => (c.id === id ? { ...c, ...patch } : c)),
    })),

  addReasoning: (step) =>
    set((state) => {
      const next =
        state.reasoning.length >= MAX_REASONING
          ? state.reasoning.slice(state.reasoning.length - MAX_REASONING + 1)
          : state.reasoning;
      return { reasoning: [...next, step] };
    }),

  reset: () =>
    set({
      tokenUsageByModel: {},
      toolCalls: [],
      reasoning: [],
      isRecording: false,
    }),
}));
