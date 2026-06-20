import { Crosshair } from "lucide-react";

import { PlannedSubPage } from "@/components/planned-sub-page";

export default function WorkbenchInspectorPage() {
  return (
    <PlannedSubPage
      labId="workbench"
      subNumber="3.1.2"
      week="W10"
      title="节点 Inspector"
      protocol="inspector · reverse highlight"
      description="选中渲染区域的节点，自动反向高亮 DSL/TSX 源码对应行 + data attribute。"
      status="planned"
      icon={Crosshair}
      upcomingFeatures={[
        "渲染节点 onMouseEnter 触发反向查找",
        "DSL path 反查 → 源码行号（用 sourcemap 或显式 path 注入）",
        "data-* attribute 显式标注每个 DSL 节点路径",
        "Side panel 显示节点 props/state/context",
        "支持 Lab 1 markdown / Lab 2 DSL / Lab 2 TSX 三类树",
      ]}
      dependsOn={["3.1.1 三栏 Workbench", "data-attribute 全节点注入"]}
    />
  );
}
