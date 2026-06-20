import { Wrench } from "lucide-react";

import { PlannedSubPage } from "@/components/planned-sub-page";

export default function ToolsPage() {
  return (
    <PlannedSubPage
      labId="observability"
      subNumber="4.1.2"
      week="W11"
      title="工具调用回放"
      protocol="tool calls · timeline"
      description="AG-UI 触发的工具调用全链路可视化：start / args / end 三个阶段 + 时延。"
      status="wip"
      icon={Wrench}
      upcomingFeatures={[
        "工具调用瀑布图（gantt style）",
        "每阶段时间戳：start_ts / args_done_ts / end_ts",
        "args delta 拼接（多个 TOOL_CALL_ARGS 事件）",
        "错误工具调用红标",
        "点击查看原始 AG-UI 事件",
      ]}
      dependsOn={["core/protocols/ag-ui/mapper (W4 done)", "TOOL_CALL_START/ARGS/END 事件完整支持"]}
    />
  );
}
