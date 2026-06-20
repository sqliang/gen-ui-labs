/**
 * JSON-UI 表达式求值器。
 *
 * JSON-UI 字符串里写 `{state.user.name}` 会被自动替换为状态值。
 * 表达式用大括号 + 路径语法：`{path.segments}` 或 `{path['with space']}`。
 *
 * 设计：
 * - 简单沙箱：只允许路径访问（不做任意 JS 求值）
 * - 安全：路径里不能用括号 / 箭头函数 / 闭包
 * - 缺值用原样 `{path}` 占位，渲染时一目了然"路径写错了"
 *
 * 用法：
 *   evaluate("Hello {user.name}", { user: { name: "Alice" } })
 *   // => "Hello Alice"
 */

import type { JsonUiNode } from "./types";

/** 匹配 {path.segments} 或 {path['segment']} */
const EXPR_RE = /\{([^{}]+)\}/g;

/**
 * 拿一个嵌套对象 + 路径字符串 → 值或 undefined。
 *
 * 支持：
 * - "a.b.c" 走 dot path
 * - "a[0].b" 数字下标
 * - "a['x y']" 字符串下标（少见，留着兜底）
 */
export function resolvePath(
  root: unknown,
  path: string,
): { ok: true; value: unknown } | { ok: false; reason: string } {
  const tokens: Array<string | number> = [];
  let i = 0;
  while (i < path.length) {
    const ch = path[i];
    if (ch === ".") {
      i++;
      continue;
    }
    if (ch === "[") {
      const end = path.indexOf("]", i);
      if (end === -1) {
        return { ok: false, reason: "missing ]" };
      }
      const inner = path.slice(i + 1, end).trim();
      // 去掉单/双引号
      if (
        (inner.startsWith('"') && inner.endsWith('"')) ||
        (inner.startsWith("'") && inner.endsWith("'"))
      ) {
        tokens.push(inner.slice(1, -1));
      } else if (/^\d+$/.test(inner)) {
        tokens.push(Number(inner));
      } else {
        return { ok: false, reason: `bad bracket index: ${inner}` };
      }
      i = end + 1;
    } else if (ch === " " || ch === "\t") {
      i++;
    } else {
      // 普通 token 一直读到下一个 "." 或 "[" 或结束
      let j = i;
      while (j < path.length && path[j] !== "." && path[j] !== "[") {
        j++;
      }
      tokens.push(path.slice(i, j));
      i = j;
    }
  }

  let cur: unknown = root;
  for (const t of tokens) {
    if (cur == null) return { ok: false, reason: "null parent" };
    if (typeof cur !== "object") {
      return { ok: false, reason: "scalar parent" };
    }
    cur = (cur as Record<string | number, unknown>)[t];
  }
  return { ok: true, value: cur };
}

/** 把字符串里的 {expr} 全部替换；无法 resolve 的保留原样。 */
export function evaluateString(template: string, state: unknown): string {
  return template.replace(EXPR_RE, (full, expr: string) => {
    const trimmed = expr.trim();
    if (trimmed === "") return full;
    const r = resolvePath(state, trimmed);
    if (!r.ok) return full; // 缺值保留原样
    if (r.value == null) return full;
    if (typeof r.value === "object") return full; // 不渲染 object
    return String(r.value);
  });
}

/**
 * 递归遍历 JsonUiNode 树，把所有字符串字段里的表达式求值。
 *
 * 影响哪些字段：
 * - 顶层 string 字段
 * - children 数组
 * - props 里所有 string 字段
 *
 * 不做 copy-on-write 优化（小文档不是热路径）
 */
export function evaluateJsonUiNode(node: JsonUiNode, state: unknown): JsonUiNode {
  const evalProps = (props: Record<string, unknown> | undefined) => {
    if (!props) return props;
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(props)) {
      if (typeof v === "string") {
        out[k] = evaluateString(v, state);
      } else if (Array.isArray(v)) {
        out[k] = v.map((item) => {
          if (typeof item === "string") return evaluateString(item, state);
          if (item && typeof item === "object" && "type" in item) {
            return evaluateJsonUiNode(item as JsonUiNode, state);
          }
          return item;
        });
      } else if (v && typeof v === "object" && "type" in v) {
        out[k] = evaluateJsonUiNode(v as JsonUiNode, state);
      } else {
        out[k] = v;
      }
    }
    return out;
  };

  return {
    ...node,
    props: evalProps(node.props),
    children: node.children?.map((c) => evaluateJsonUiNode(c, state)),
  };
}
