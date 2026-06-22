import type { Metadata } from "next";

import { LabHub } from "@/components/lab-hub";
import { getLab } from "@/core/labs";

export const metadata: Metadata = {
  title: "Streaming UI Protocols",
  description:
    "把 LLM / Agent 的输出边生成边渲染：Markdown / AG-UI / A2UI 三种协议对照，支持时间轴回放与多 surface 切换。",
};

export default function StreamingLabOverview() {
  return <LabHub lab={getLab("streaming")} />;
}
