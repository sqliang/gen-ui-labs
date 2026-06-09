import { LabOverview } from "@/views/lab-overview";

const FEATURES = [
  {
    label: "3.1.1 三栏 Workbench",
    desc: "左：DSL / TSX 源码；中：过程事件；右：实时渲染（基于 react-resizable-panels）",
    badge: "W9",
  },
  {
    label: "3.1.2 节点 Inspector",
    desc: "选中渲染区域，定位到 DSL/TSX 节点，反向高亮源码",
    badge: "W10",
  },
  { label: "3.1.3 错误热力图", desc: "把渲染异常叠加在源码上", badge: "W10" },
  {
    label: "3.1.4 协议解码器",
    desc: "把事件流解码成'加了什么节点 / 改了什么属性'的 diff",
    badge: "W10",
  },
  {
    label: "3.1.5 重渲染追踪",
    desc: "React Profiler + 自研事件环，展示每个组件的渲染耗时",
    badge: "W10",
  },
  { label: "3.1.6 离线 Replay", desc: "导入一次会话的 dump，完全离线重放", badge: "W10" },
];

export default function WorkbenchLabOverview() {
  return (
    <LabOverview
      labId="workbench"
      title="Lab 3 · Engine Debug Workbench"
      tagline="Artifact 风格的左源码/右渲染 + 过程面板。"
      features={FEATURES}
    />
  );
}
