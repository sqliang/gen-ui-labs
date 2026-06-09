# `core/engine`

渲染引擎。GenUI Labs 的核心。

- `json-ui/` — JSON-UI → React 树（核心）
- `sandbox/` — iframe 沙箱 + postMessage 协议（跑生成的 TSX）
- `expression/` — 表达式求值（数据绑定）
- `layout/` — flex/grid 布局原语
- `reconciler/` — patch-based 增量更新