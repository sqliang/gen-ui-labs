import { Star } from "lucide-react";

import { PlannedSubPage } from "@/components/planned-sub-page";

export default function ScorePage() {
  return (
    <PlannedSubPage
      labId="observability"
      subNumber="4.1.4"
      week="W12"
      title="UI 评分卡"
      protocol="multi-model score"
      description="同 prompt 多模型生成，统一评分卡横向对比：aesthetic / a11y / structure / stability 四维。"
      status="planned"
      icon={Star}
      upcomingFeatures={[
        "同 prompt × N 模型并行跑",
        "4 维评分：aesthetic / a11y / structure / stability",
        "评分 = 启发式规则（节点深度 / 颜色对比 / 文本长度 / 错误率）",
        "横向对比表 + 雷达图",
        "保存 prompt 模板（Prompt Lab 雏形）",
      ]}
      dependsOn={["4.1.1 Token 面板", "Prompt Lab（W12）", "多模型并行 runner"]}
    />
  );
}
