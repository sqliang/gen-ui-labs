import { GitBranch } from "lucide-react";

import { PlannedSubPage } from "@/components/planned-sub-page";

export default function ReasoningPage() {
  return (
    <PlannedSubPage
      labId="observability"
      subNumber="4.1.3"
      week="W12"
      title="Agent 推理链"
      protocol="CoT · ReAct · Plan"
      description="把 AI 的思维过程打开来看：思维链（CoT）/ ReAct（思考-行动循环）/ Plan 分解 三种模式的时间轴。"
      status="wip"
      icon={GitBranch}
      upcomingFeatures={[
        "三种 agent pattern 切换",
        "思维链节点树：DAG 形式可视化",
        "每节点点击看完整 prompt/response",
        "replay：拖时间轴可逐步重放",
        "导出思维链为 .md（用于 prompt engineering 调优）",
      ]}
      dependsOn={["AG-UI STATE_DELTA 解析（已 done）", "Agent runner 抽象（W10+）"]}
    />
  );
}
