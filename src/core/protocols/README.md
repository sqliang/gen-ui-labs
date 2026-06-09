# `core/protocols`

协议层。每个协议一个子目录，对外暴露：

- `parse(raw: string | Uint8Array): RenderableEvent[]`
- `reducer(state, event): state`
- `ComponentMap: Record<string, Component>`

## 子协议

- `ag-ui/` — AG-UI 协议
- `a2ui/` — A2UI v0.2 协议
- `markdown/` — 流式 Markdown
- `json-ui/` — 内部 JSON-UI DSL（Lab 2 主用）
- `common/` — `RenderableEvent`、`StreamChunk`、`ComponentPatch` 等公共类型

所有协议统一抽象成 `RenderableEvent`（见 `core/state/streaming-store.ts`）。