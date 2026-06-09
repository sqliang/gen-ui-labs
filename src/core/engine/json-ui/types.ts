/**
 * core/engine/json-ui/types.ts
 *
 * JSON-UI DSL 类型定义。
 *
 * JSON-UI 是一种声明式 UI DSL。每个节点描述一个 UI 元素：
 * - type: 元素类型（card / button / input / table / chart / text）
 * - props: 元素属性
 * - children: 子节点（递归）
 *
 * W6 范围：基础渲染（card / button / text / table）。
 * W7+ 扩展到 chart / form / 表达式绑定。
 */

/** JSON-UI 元素类型 */
export type JsonUiType = "card" | "button" | "input" | "table" | "chart" | "text" | "flex" | "grid";

/** JSON-UI 树节点 */
export interface JsonUiNode {
  type: JsonUiType;
  id?: string;
  props?: Record<string, unknown>;
  children?: JsonUiNode[];
}

/** JSON-UI DSL 顶层结构 */
export interface JsonUiDocument {
  root: JsonUiNode;
}

/** JSON-UI 增量补丁 */
export interface JsonUiPatch {
  op: "mount" | "patch" | "unmount";
  path: string; // /root/children/0/props/title
  value?: unknown;
}
