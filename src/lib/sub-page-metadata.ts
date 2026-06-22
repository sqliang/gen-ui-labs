/**
 * Per-sub-page metadata 字典（client components 不能直接 export metadata，
 * 所以集中放这里，page.tsx 用 spread 复用）。
 *
 * title 会套 root layout 的 template "%s · GenUI Labs"。
 */

export interface SubPageMetadata {
  title: string;
  description: string;
}

export const SUB_PAGE_METADATA: Record<string, SubPageMetadata> = {
  // Streaming
  "/labs/streaming/markdown": {
    title: "Markdown 流式渲染",
    description:
      "mock / api / react demo / ag-ui / a2ui / json-ui 6 种 mode 切换，支持自定义 prompt。",
  },
  "/labs/streaming/ag-ui": {
    title: "AG-UI 协议流式",
    description:
      "AG-UI v0.2 用 TEXT_MESSAGE_* + TOOL_CALL_* + STATE_DELTA → W5 stateful adapter 合并 → RenderableEvent 走统一渲染管道。",
  },
  "/labs/streaming/a2ui": {
    title: "A2UI 协议流式",
    description:
      "A2UI v0.2 多 surface 模型：beginRendering + surfaceUpdate + dataModelUpdate 增量更新 → stateful adapter 维护 surface map。",
  },
  "/labs/streaming/compare": {
    title: "协议对照表",
    description: "Markdown vs AG-UI vs A2UI 三种协议的字段、状态机、依赖、易用性横向对比。",
  },
  // Codegen
  "/labs/codegen/tsx": {
    title: "TSX 沙箱执行",
    description: "LLM 生成 React TSX 在 iframe sandbox 内 new Function 执行，捕获 runtime 错误。",
  },
  "/labs/codegen/json-ui": {
    title: "JSON-UI DSL 渲染",
    description:
      "JSON-UI 声明式 DSL：mount / patch / unmount patch 流 → applyJsonUiPatch → 递归渲染组件树。",
  },
  "/labs/codegen/mixed": {
    title: "TSX vs JSON-UI 量化对比",
    description:
      "8 个维度 ProsCons + 4 个量化指标：render nodes / sandbox state / type safety / a11y。",
  },
  "/labs/codegen/compare": {
    title: "Codegen 全景对照",
    description: "TSX 沙箱、JSON-UI DSL、Mixed 混合模式三选一。",
  },
  // Workbench
  "/labs/workbench/three-pane": {
    title: "三栏 Workbench",
    description:
      "Source / Events / Render 三栏调试台：default / chart / form 3 个 scenario，13 个真实 mock patch。",
  },
  "/labs/workbench/inspector": {
    title: "节点 Inspector",
    description:
      "reverse lookup 节点：hover/click JSON-UI tree 节点 → Inspector 显示 path/type/children/props。",
  },
  "/labs/workbench/heatmap": {
    title: "错误热力图",
    description:
      "ERROR / WARN / INFO 三种 heat kind 叠加在节点上，severity 决定 alpha，800ms 模拟事件流。",
  },
  "/labs/workbench/replay": {
    title: "离线 Replay",
    description: "scrubber + 6 按钮 + speed 0.5x-4x，从 mock patch 流回放 + 导出 JSON dump。",
  },
  // Observability
  "/labs/observability/tokens": {
    title: "Token 成本面板",
    description:
      "13 模型 6 provider 的 prompt/completion token 累加 + USD 成本计算 + TTFT sparkline + 累积成本曲线。",
  },
  "/labs/observability/tools": {
    title: "工具调用回放",
    description:
      "AG-UI TOOL_CALL_START / ARGS / END 完整 lifecycle：args 流式拼接 + 瀑布时延 + 错误高亮 + 导出 trace.json。",
  },
  "/labs/observability/reasoning": {
    title: "Agent 推理链",
    description: "CoT / ReAct / Plan 三种 agent 推理模式 DAG 可视化，scrubber 逐步回放，导出 .md。",
  },
  "/labs/observability/score": {
    title: "UI 评分卡",
    description:
      "多模型 + 多 prompt 组合评分（aesthetic / a11y / structure / stability 启发式）+ SVG 雷达图 + 导出 .csv。",
  },
};

export function getSubPageMetadata(pathname: string): SubPageMetadata | undefined {
  return SUB_PAGE_METADATA[pathname];
}
