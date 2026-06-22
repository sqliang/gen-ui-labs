import type { Metadata } from "next";

import { LabHub } from "@/components/lab-hub";
import { getLab } from "@/core/labs";

export const metadata: Metadata = {
  title: "Agent Observability",
  description:
    "LLM 推理过程全链路可观测：token 成本 + tool lifecycle + reasoning DAG + 多模型评分。",
};

export default function ObservabilityLabOverview() {
  return <LabHub lab={getLab("observability")} />;
}
