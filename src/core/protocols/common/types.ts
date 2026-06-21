/**
 * core/protocols/common/types.ts
 *
 * 协议无关的流式事件中间表示。
 * streaming-store / debug-scenarios / mock-base / /api/chat 全部共用。
 *
 * 四种 UI 协议：
 * - Markdown：纯 text chunk
 * - AG-UI：[TEXT_MESSAGE_CONTENT → text]，[TOOL_CALL_START → tool]
 * - A2UI：[surfaceUpdate → state]，[dataModelUpdate → state]
 * - JSON-UI：[component → component]（op: mount/patch/unmount）
 */

// ===== Protocol 枚举 =====

/** 支持的 UI 协议 */
export type ProtocolKind = "markdown" | "ag-ui" | "a2ui" | "json-ui";

// ===== RenderableEvent =====

/** 文本增量（Markdown / AG-UI 共用） */
export interface TextChunk {
  kind: "text";
  delta: string;
  /** AG-UI 虚拟 DOM path（可选，Markdown 不用） */
  path?: string;
}

/** UI 组件声明（JSON-UI 专属） */
export interface ComponentChunk {
  kind: "component";
  /** 操作：挂载 / 补丁 / 卸载 */
  op: "mount" | "patch" | "unmount";
  /** 组件 id */
  id: string;
  /** JSON-UI DSL 节点 */
  node?: unknown;
}

/** 状态更新（A2UI 专属） */
export interface StateChunk {
  kind: "state";
  /** 状态 path */
  path: string;
  /** 状态值 */
  value: unknown;
}

/** 工具调用（AG-UI 专属） */
export interface ToolChunk {
  kind: "tool";
  /** 工具名 */
  name: string;
  /** 工具参数 */
  args: unknown;
  /** 工具结果（仅在 result 阶段出现） */
  result?: unknown;
  /** 同一 toolCall 的关联 id（AG-UI 协议层面需要） */
  id?: string;
}

/** 控制事件（所有协议共用：start / end / error / meta） */
export interface ControlChunk {
  kind: "control";
  /** 控制类型 */
  type: "start" | "end" | "error" | "meta";
  /** 附加上下文 */
  meta?: unknown;
}

/** 协议无关的渲染事件 —— 所有 provider.stream() 的产出 */
export type RenderableEvent = TextChunk | ComponentChunk | StateChunk | ToolChunk | ControlChunk;

// ===== Lifecycle 增强（可选） =====

/**
 * 加了 lifecycle 元数据的 RenderableEvent。
 *
 * seq/ts/sessionId 是 Lab 4 可观测性（observability）的硬需求：
 * - seq：同一 run 内的严格单调递增序号；用于 replay 按序回放
 * - ts：事件发出的服务端时间戳（ms since epoch）；用于 latency 分析
 * - sessionId：唯一标识一次 run，用于"为什么这一段比那段慢"对比
 * - source：事件来源（mock/api/streamed）；用于过滤和归因
 *
 * mapper 输出的是 plain RenderableEvent；enrichEvent() 工具函数负责包装。
 */
export interface EventMeta {
  /** run 内序号（从 0 起） */
  seq: number;
  /** 事件发出时间戳（ms since epoch） */
  ts: number;
  /** run 唯一标识（hash of model + prompt + startTime） */
  sessionId: string;
  /** 事件来源 */
  source: "mock" | "api" | "streamed";
}

export type EnrichedRenderableEvent = RenderableEvent & {
  _meta: EventMeta;
};

// ===== 协议适配器接口 =====

/** 协议适配器：把外部协议事件转为 RenderableEvent */
export interface ProtocolAdapter<TExternalEvent = unknown> {
  /** 协议标识 */
  readonly protocol: ProtocolKind;
  /** 单次转换 */
  adapt(event: TExternalEvent): RenderableEvent;
  /** 批量转换 */
  adaptAll(events: TExternalEvent[]): RenderableEvent[];
}
