import { Columns3 } from "lucide-react";

import { PlannedSubPage } from "@/components/planned-sub-page";

export default function WorkbenchThreePanePage() {
  return (
    <PlannedSubPage
      labId="workbench"
      subNumber="3.1.1"
      week="W9"
      title="三栏 Workbench"
      protocol="3-pane layout"
      description="左源码/DSL · 中过程事件 · 右实时渲染。3 个可拖拽分栏，与 Lab 1/2 的 streaming 联动。"
      status="wip"
      icon={Columns3}
      upcomingFeatures={[
        "三栏拖拽布局（react-resizable-panels，min 240px / max 720px）",
        "左侧 DSL/TSX 编辑器（monaco editor）",
        "中间事件流：Raw → RenderableEvent → Component 的 3 步处理管道",
        "右侧：实时渲染当前协议流（接 Lab 1/2）",
        "时间轴 scrubber：拖动回放历史事件",
        "节点 hover 反向高亮：渲染区域 ↔ DSL/TSX 源码",
      ]}
      dependsOn={[
        "core/engine/json-ui/renderer · W6 done",
        "core/protocols/ag-ui/mapper · W4 done",
        "core/protocols/a2ui/mapper · W5 done",
      ]}
    />
  );
}
