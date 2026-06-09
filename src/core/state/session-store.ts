import { create } from "zustand";

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

const DEFAULT_MODEL = "deepseek-chat";

/**
 * 当前会话/模型/Lab 选择。
 *
 * 注意：按照 §9 分层原则，sessionId/lab/model 主要来源是 URL searchParams，
 * 本 store 仅作为客户端缓存，方便在 Client Component 里快速读取而不必
 * 每次都 await props.searchParams。
 *
 * 模型注册表（BUILTIN_MODELS）已统一在 `core/models/registry` 维护；
 * 这里只管"当前选中的 id"——和 §9 客户端态职责一致。
 */
export const useSessionStore = create<SessionState>()((set) => ({
  currentSessionId: null,
  currentModelId: DEFAULT_MODEL,
  currentLab: null,

  setCurrentSession: (currentSessionId) => set({ currentSessionId }),
  setCurrentModel: (currentModelId) => set({ currentModelId }),
  setCurrentLab: (currentLab) => set({ currentLab }),
}));
