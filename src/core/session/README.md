# `core/session`

会话与回放。

- `store/` — 基于 IndexedDB（idb-keyval）的会话存储
- `replay/` — 把事件流 + 源码 + 中间态打包成 `.genui-dump`，可重放
- `fork/` — 会话分叉

W9 落地。