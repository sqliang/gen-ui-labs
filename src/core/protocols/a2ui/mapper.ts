/**
 * core/protocols/a2ui/mapper.ts
 *
 * A2UI v0.2 协议事件 → RenderableEvent 映射器。
 *
 * A2UI 核心事件：
 * - surfaceUpdate：声明/更新 UI 表面组件
 * - dataModelUpdate：数据绑定更新
 * - beginRendering / dismissSurface：生命周期
 *
 * surfaceUpdate.contents 是一个组件树数组，每个节点携带：
 * - id：组件 id
 * - component：组件类型（'card' | 'button' | 'form' | 'table' | 'chart' | 'text'）
 * - children：子组件 id 列表
 * - props：组件属性
 */

import type { ProtocolAdapter, RenderableEvent } from "@/core/protocols/common/types";

// ===== A2UI 事件类型 =====

export interface A2uiSurfaceUpdate {
  type: "surfaceUpdate";
  surfaceId: string;
  contents: A2uiComponentNode[];
}

export interface A2uiDataModelUpdate {
  type: "dataModelUpdate";
  surfaceId: string;
  path: string;
  value: unknown;
}

export interface A2uiBeginRendering {
  type: "beginRendering";
  surfaceId: string;
  root: string; // root 组件 id
}

export interface A2uiDismissSurface {
  type: "dismissSurface";
  surfaceId: string;
}

/** A2UI 组件树节点 */
export interface A2uiComponentNode {
  id: string;
  component: "card" | "button" | "form" | "table" | "chart" | "text" | "container";
  children?: string[];
  props?: Record<string, unknown>;
}

/** A2UI 事件联合类型 */
export type A2uiEvent =
  | A2uiSurfaceUpdate
  | A2uiDataModelUpdate
  | A2uiBeginRendering
  | A2uiDismissSurface;

// ===== 映射器 =====

export const a2uiAdapter: ProtocolAdapter<A2uiEvent> = {
  protocol: "a2ui",

  adapt(event: A2uiEvent): RenderableEvent {
    switch (event.type) {
      case "surfaceUpdate":
        // 每个组件节点转为一个 component chunk
        return {
          kind: "component",
          op: "mount",
          id: event.surfaceId,
          node: event.contents,
        };

      case "dataModelUpdate":
        return {
          kind: "state",
          path: event.path,
          value: event.value,
        };

      case "beginRendering":
        return { kind: "control", type: "start" };

      case "dismissSurface":
        return {
          kind: "component",
          op: "unmount",
          id: event.surfaceId,
        };
    }
  },

  adaptAll(events: A2uiEvent[]): RenderableEvent[] {
    return events.map((e) => this.adapt(e));
  },
};
