/**
 * core/engine/json-ui/apply.ts
 *
 * 把 JsonUiPatch 应用到 JsonUiDocument 上，得到新 document。
 *
 * 三种 op：
 * - mount: 在 path 指定的位置插入 value 节点（path 形如 "/root/children/2"）
 * - patch: 修改 path 指定节点的 props/children（path 必须指向已有节点）
 * - unmount: 删除 path 指定节点（path 必须指向已有节点）
 *
 * 路径解析：
 * - 第一段必须是 "root"
 * - 后续段：`children/{i}` 表示第 i 个子节点
 * - 路径不存在时：mount 行为级联创建中间节点
 *
 * 与 /api/json-ui、Lab 3.1.1 workbench、Lab 2.1.2 json-ui 页面共用。
 */

import type { JsonUiDocument, JsonUiNode, JsonUiPatch } from "./types";

/** 拆 path → 段数组（"root" + children/idx 交替） */
function parsePath(path: string): string[] {
  if (path === "/") return ["root"];
  return path.split("/").filter(Boolean);
}

/** 走 path 找到父节点 + 在父节点的 children 里的目标 idx。返回 null 表示不存在。 */
type LocateResult = {
  parent: JsonUiNode | null;
  /** parent.children[idx] = target；顶层是 doc.root */
  idx: number;
  /** 是否是根节点本身 */
  isRoot: boolean;
  /** 节点属性段：patchNode 用此改 parent.props.X */
  field?: "props" | "data" | "id" | "type";
};

function locate(doc: JsonUiDocument, segments: string[]): LocateResult | null {
  if (segments.length === 0) return null;
  if (segments[0] !== "root") return null;
  if (segments.length === 1) {
    return { parent: null, idx: -1, isRoot: true };
  }
  // 期望 segments 形如 [root, children, idx, children, idx, ...]
  // 可选尾段：props / data / id（节点属性）
  let cur: JsonUiNode = doc.root;
  let i = 1;
  while (i < segments.length) {
    const kind = segments[i];
    if (kind === "props" || kind === "data" || kind === "id" || kind === "type") {
      // 节点属性段：返回当前节点的 parent 引用（让 patchNode 改其属性）
      if (i === segments.length - 1) {
        return { parent: cur, idx: -1, isRoot: false, field: kind };
      }
      return null;
    }
    if (kind !== "children") return null;
    const idxStr = segments[i + 1];
    if (idxStr === undefined) return null;
    const idx = Number.parseInt(idxStr, 10);
    if (Number.isNaN(idx) || idx < 0) return null;
    // 节点 path 终点：i + 2 === segments.length
    if (i + 2 === segments.length) {
      if (!cur.children) return null;
      if (idx >= cur.children.length) return null;
      return { parent: cur, idx, isRoot: false };
    }
    // 中间段
    if (!cur.children || idx >= cur.children.length) return null;
    const next = cur.children[idx];
    if (!next) return null;
    cur = next;
    i += 2;
  }
  return null;
}

/** 应用 patch → 新 document（不可变） */
export function applyJsonUiPatch(doc: JsonUiDocument, patch: JsonUiPatch): JsonUiDocument {
  const segments = parsePath(patch.path);

  if (patch.op === "mount") {
    if (!patch.value) return doc;
    const value = patch.value as JsonUiNode;
    return mount(doc, segments, value);
  }
  if (patch.op === "patch") {
    if (!patch.value) return doc;
    const value = patch.value as Partial<JsonUiNode>;
    return patchNode(doc, segments, value);
  }
  if (patch.op === "unmount") {
    return unmount(doc, segments);
  }
  return doc;
}

function clone<T>(v: T): T {
  return JSON.parse(JSON.stringify(v)) as T;
}

function mount(
  doc: JsonUiDocument,
  segments: string[],
  value: JsonUiNode | undefined,
): JsonUiDocument {
  if (!value) return doc;
  if (segments[0] === "root" && segments.length === 1) {
    return { root: clone(value) };
  }
  if (segments[0] !== "root") return doc;
  // 期望 path 是 "root/children/idx" 或 "root/children/idx/children/idx/..."
  // mount 在 path 指定的 idx 处插入；如果 path 的中间节点不存在，**自动创建占位 text 节点**
  const root = clone(doc.root);
  let cur: JsonUiNode = root;
  for (let i = 1; i < segments.length; i += 2) {
    const kind = segments[i];
    const idxStr = segments[i + 1];
    if (kind !== "children" || idxStr === undefined) return doc;
    const idx = Number.parseInt(idxStr, 10);
    if (Number.isNaN(idx) || idx < 0) return doc;
    const isTerminal = i + 2 >= segments.length;
    if (!cur.children) cur.children = [];
    if (isTerminal) {
      // 终点：splice 插入到 idx 位置（先 push 占位到 idx-1）
      while (cur.children.length < idx) {
        cur.children.push({ type: "text", props: { content: "" } });
      }
      cur.children.splice(idx, 0, clone(value));
      return { root };
    }
    // 中间段：必须走到 idx 处 —— 补齐到 idx（含）保证 children[idx] 存在
    while (cur.children.length <= idx) {
      cur.children.push({ type: "text", props: { content: "" } });
    }
    cur = cur.children[idx] as JsonUiNode;
  }
  return doc;
}

function patchNode(
  doc: JsonUiDocument,
  segments: string[],
  value: Partial<JsonUiNode> | undefined,
): JsonUiDocument {
  if (!value) return doc;
  // 在 clone 上做：mutate 副本，保留原 doc 不可变
  const root = clone(doc.root);
  const loc = locate({ root }, segments);
  if (!loc) return doc;
  if (loc.isRoot) {
    // root: value 是 Partial<JsonUiNode>，只覆盖指定字段（深 merge props）
    return { root: mergeNodes(root, value) as JsonUiNode };
  }
  if (!loc.parent) return doc;
  if (loc.field === "props") {
    // path /root/children/0/props → value 整个当新 props 内容（替换）
    loc.parent.props = { ...(loc.parent.props ?? {}), ...(value as Record<string, unknown>) };
    return { root };
  }
  if (loc.field === "type" && typeof (value as { type?: unknown }).type === "string") {
    loc.parent.type = (value as { type: string }).type as typeof loc.parent.type;
    return { root };
  }
  if (loc.field) {
    return doc; // 暂不实现 data/id 字段 patch
  }
  if (!loc.parent?.children) return doc;
  const target = loc.parent.children[loc.idx];
  if (!target) return doc;
  loc.parent.children[loc.idx] = mergeNodes(target, value) as JsonUiNode;
  return { root };
}

/** Partial 合并：partial.props 与 target.props 深 merge（partial 的键覆盖 target） */
function mergeNodes(target: JsonUiNode, partial: Partial<JsonUiNode>): JsonUiNode {
  const result: JsonUiNode = { ...target };
  if (partial.type !== undefined) result.type = partial.type;
  if (partial.id !== undefined) result.id = partial.id;
  if (partial.props !== undefined) {
    result.props = { ...(target.props ?? {}), ...partial.props };
  }
  if (partial.children !== undefined) {
    result.children = partial.children.map((c) => clone(c));
  }
  return result;
}

function unmount(doc: JsonUiDocument, segments: string[]): JsonUiDocument {
  const root = clone(doc.root);
  const loc = locate({ root }, segments);
  if (!loc || loc.isRoot) return doc;
  if (!loc.parent?.children) return doc;
  loc.parent.children.splice(loc.idx, 1);
  return { root };
}
