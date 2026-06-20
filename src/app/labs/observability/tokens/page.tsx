import { Coins } from "lucide-react";

import { PlannedSubPage } from "@/components/planned-sub-page";

export default function TokensPage() {
  return (
    <PlannedSubPage
      labId="observability"
      subNumber="4.1.1"
      week="W11"
      title="Token 成本面板"
      protocol="tokens · cost"
      description="实时按模型统计 prompt / completion / 首 token 延迟。recharts 折线图 + 成本估算。"
      status="wip"
      icon={Coins}
      upcomingFeatures={[
        "每模型 token 计数（prompt / completion 拆分）",
        "首 token 延迟（TTFT）时间线",
        "recharts 折线图按模型分色",
        "成本估算：每个模型的 USD/$0.001/$0.003 之类表",
        "按 Lab / session / 模型 三维度聚合",
      ]}
      dependsOn={["streaming-store 持久化", "model registry 扩展 cost 字段"]}
    />
  );
}
