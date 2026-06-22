import type { Metadata } from "next";

import { LabHub } from "@/components/lab-hub";
import { getLab } from "@/core/labs";

export const metadata: Metadata = {
  title: "Generate UI Code & DSL",
  description:
    "LLM 直接生成可执行 TSX（iframe 沙箱）vs 生成 JSON-UI DSL（声明式树）。包含 TSX ↔ DSL 反向、低代码模式。",
};

export default function CodegenLabOverview() {
  return <LabHub lab={getLab("codegen")} />;
}
