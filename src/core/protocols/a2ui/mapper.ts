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

/** 暴露的 surface 状态类型（snapshot() 返回值的元素） */
export interface A2uiSurfaceState {
  components: Map<string, A2uiComponentNode>;
  root: string | null;
  dataModel: Record<string, unknown>;
}

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

// ===== 有状态 adapter（维护多 surface 树 + 累积 data model） =====

/**
 * 多 surface 树 + 累积 data model。
 *
 * 跟 stateless a2uiAdapter 的区别：
 * - 维护 surfaceId → { components: Map<id, node>, root: string, dataModel: object } 的全状态
 * - surfaceUpdate 增量：保留已有组件，只 mount/patch 新加的（id 不在 map 里 → mount，在 → patch）
 * - dataModelUpdate 累积到一个 dataModel object（用浅 merge），emit 一个 state chunk
 * - beginRendering 后才把 root 标记为可渲染
 * - dismissSurface 清理 map
 */
export function createA2uiStatefulAdapter(): {
  protocol: "a2ui";
  adapt(event: A2uiEvent): RenderableEvent[];
  reset(): void;
  /** 调试用：当前所有 surface 的快照 */
  snapshot(): Map<string, A2uiSurfaceState>;
} {
  const surfaces = new Map<string, A2uiSurfaceState>();

  function getOrCreate(id: string): A2uiSurfaceState {
    let s = surfaces.get(id);
    if (!s) {
      s = { components: new Map(), root: null, dataModel: {} };
      surfaces.set(id, s);
    }
    return s;
  }

  return {
    protocol: "a2ui",

    adapt(event: A2uiEvent): RenderableEvent[] {
      const out: RenderableEvent[] = [];
      switch (event.type) {
        case "surfaceUpdate": {
          const s = getOrCreate(event.surfaceId);
          // 增量：每个 node 看是否在 map 里
          const newOnes: A2uiComponentNode[] = [];
          const patched: A2uiComponentNode[] = [];
          for (const node of event.contents) {
            if (s.components.has(node.id)) {
              patched.push(node);
            } else {
              newOnes.push(node);
            }
            s.components.set(node.id, node);
          }
          // emit 每个新组件 mount + 每个 patch
          for (const n of newOnes) {
            out.push({ kind: "component", op: "mount", id: n.id, node: n });
          }
          for (const p of patched) {
            out.push({ kind: "component", op: "patch", id: p.id, node: p });
          }
          break;
        }

        case "dataModelUpdate": {
          const s = getOrCreate(event.surfaceId);
          // 浅 merge：path like "/user/name" → 拆 path 段
          setByPath(s.dataModel, event.path, event.value);
          out.push({
            kind: "state",
            path: event.surfaceId + event.path,
            value: s.dataModel,
          });
          break;
        }

        case "beginRendering": {
          const s = getOrCreate(event.surfaceId);
          s.root = event.root;
          out.push({ kind: "control", type: "start" });
          // 同时 emit 一次完整组件树 mount（root + 所有已注册的 children）
          out.push({
            kind: "component",
            op: "mount",
            id: event.surfaceId,
            node: Array.from(s.components.values()),
          });
          break;
        }

        case "dismissSurface": {
          const s = surfaces.get(event.surfaceId);
          if (s) {
            // emit 每个组件的 unmount
            s.components.forEach((_v, id) => {
              out.push({ kind: "component", op: "unmount", id });
            });
          }
          surfaces.delete(event.surfaceId);
          break;
        }
      }
      return out;
    },

    reset(): void {
      surfaces.clear();
    },

    snapshot(): Map<string, A2uiSurfaceState> {
      // 深拷贝避免外部修改
      const out = new Map<string, A2uiSurfaceState>();
      surfaces.forEach((s, id) => {
        out.set(id, {
          components: new Map(s.components),
          root: s.root,
          dataModel: { ...s.dataModel },
        });
      });
      return out;
    },
  };
}

/**
 * 浅 merge 到 nested object（path 形如 "/user/name"）。
 * 中间段如果是 primitive，覆盖成 object（best-effort）。
 */
function setByPath(target: Record<string, unknown>, path: string, value: unknown): void {
  const parts = path.split("/").filter(Boolean);
  if (parts.length === 0) {
    Object.assign(target, value as object);
    return;
  }
  let cursor: Record<string, unknown> = target;
  for (let i = 0; i < parts.length - 1; i++) {
    const k = parts[i];
    if (k === undefined) continue;
    const next = cursor[k];
    if (typeof next !== "object" || next === null) {
      cursor[k] = {};
    }
    const nextCursor = cursor[k];
    if (nextCursor && typeof nextCursor === "object") {
      cursor = nextCursor as Record<string, unknown>;
    }
  }
  const lastKey = parts[parts.length - 1];
  if (lastKey !== undefined) {
    cursor[lastKey] = value;
  }
}
