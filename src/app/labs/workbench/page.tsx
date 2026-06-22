import type { Metadata } from "next";

import { LabHub } from "@/components/lab-hub";
import { getLab } from "@/core/labs";

export const metadata: Metadata = {
  title: "Engine Debug Workbench",
  description:
    "Artifact 风格三栏调试台：左源码/DSL、中过程事件、右实时渲染。节点 Inspector + 错误热力 + 离线 Replay。",
};

export default function WorkbenchLabOverview() {
  return <LabHub lab={getLab("workbench")} />;
}
