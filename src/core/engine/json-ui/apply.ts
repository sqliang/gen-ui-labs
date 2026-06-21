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
};

function locate(doc: JsonUiDocument, segments: string[]): LocateResult | null {
  if (segments.length === 0) return null;
  if (segments[0] !== "root") return null;
  if (segments.length === 1) {
    return { parent: null, idx: -1, isRoot: true };
  }
  // 期望 segments 形如 ["root", "children", "0", "children", "1", ...]
  // parent = doc.root 走 "children/{i}" 交替
  let cur: JsonUiNode = doc.root;
  // segments 从 index 1 开始，期望是 "children"
  for (let i = 1; i < segments.length; i += 2) {
    const kind = segments[i];
    const idxStr = segments[i + 1];
    if (kind !== "children" || idxStr === undefined) return null;
    const idx = Number.parseInt(idxStr, 10);
    if (Number.isNaN(idx) || idx < 0) return null;
    if (i === segments.length - 1) {
      // 最后一段：cur 是 parent，idx 是 child index
      if (!cur.children) return null;
      if (idx >= cur.children.length) return null;
      return { parent: cur, idx, isRoot: false };
    }
    // 中间段：cur = cur.children[idx]
    if (!cur.children || idx >= cur.children.length) return null;
    const next = cur.children[idx];
    if (!next) return null;
    cur = next;
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
    if (!cur.children) cur.children = [];
    // 补齐到 idx（中间创建 text 占位）
    while (cur.children.length < idx) {
      cur.children.push({ type: "text", props: { content: "" } });
    }
    if (i === segments.length - 1) {
      // 终点：插入
      cur.children[idx] = clone(value);
      return { root };
    }
    // 中间段：cur 走 idx
    const next = cur.children[idx];
    if (!next) return doc;
    cur = next;
  }
  return doc;
}

function patchNode(
  doc: JsonUiDocument,
  segments: string[],
  value: Partial<JsonUiNode> | undefined,
): JsonUiDocument {
  if (!value) return doc;
  const loc = locate(doc, segments);
  if (!loc) return doc;
  if (loc.isRoot) {
    return { root: { ...doc.root, ...clone(value) } as JsonUiNode };
  }
  if (!loc.parent?.children) return doc;
  const target = loc.parent.children[loc.idx];
  if (!target) return doc;
  loc.parent.children[loc.idx] = { ...target, ...clone(value) } as JsonUiNode;
  return { root: clone(doc.root) };
}

function unmount(doc: JsonUiDocument, segments: string[]): JsonUiDocument {
  const loc = locate(doc, segments);
  if (!loc || loc.isRoot) return doc;
  if (!loc.parent?.children) return doc;
  loc.parent.children.splice(loc.idx, 1);
  return { root: clone(doc.root) };
}
