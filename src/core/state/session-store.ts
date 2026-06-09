import { create } from "zustand";

export type ModelProvider = "openai" | "anthropic" | "google" | "deepseek" | "qwen" | "ollama";

export interface ModelInfo {
  id: string;
  provider: ModelProvider;
  label: string;
}

interface SessionState {
  // === 状态 ===
  /** 当前 session id（来自 URL ?session=<id>，这里只是缓存） */
  currentSessionId: string | null;
  /** 当前选中的模型 id */
  currentModelId: string;
  /** 当前 Lab id（streaming / codegen / workbench / observability） */
  currentLab: string | null;

  // === 动作 ===
  setCurrentSession: (id: string | null) => void;
  setCurrentModel: (id: string) => void;
  setCurrentLab: (lab: string | null) => void;
}

const DEFAULT_MODEL = "gpt-4o-mini";

/**
 * 当前会话/模型/Lab 选择。
 *
 * 注意：按照 §9 分层原则，sessionId/lab/model 主要来源是 URL searchParams，
 * 本 store 仅作为客户端缓存，方便在 Client Component 里快速读取而不必
 * 每次都 await props.searchParams。
 */
export const useSessionStore = create<SessionState>()((set) => ({
  currentSessionId: null,
  currentModelId: DEFAULT_MODEL,
  currentLab: null,

  setCurrentSession: (currentSessionId) => set({ currentSessionId }),
  setCurrentModel: (currentModelId) => set({ currentModelId }),
  setCurrentLab: (currentLab) => set({ currentLab }),
}));

/** 内置模型清单（占位，后续 W2 接入真实 listModels） */
export const BUILTIN_MODELS: ModelInfo[] = [
  { id: "gpt-4o-mini", provider: "openai", label: "OpenAI · GPT-4o mini" },
  { id: "gpt-4o", provider: "openai", label: "OpenAI · GPT-4o" },
  { id: "claude-sonnet-4-5", provider: "anthropic", label: "Anthropic · Claude Sonnet 4.5" },
  { id: "claude-haiku-4-5", provider: "anthropic", label: "Anthropic · Claude Haiku 4.5" },
  { id: "gemini-2.5-pro", provider: "google", label: "Google · Gemini 2.5 Pro" },
  { id: "deepseek-chat", provider: "deepseek", label: "DeepSeek · Chat" },
  { id: "qwen-max", provider: "qwen", label: "Qwen · Max" },
  { id: "ollama:llama3.1", provider: "ollama", label: "Ollama · Llama 3.1 (local)" },
];
