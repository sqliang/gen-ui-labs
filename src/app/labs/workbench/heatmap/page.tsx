import { Flame } from "lucide-react";

import { PlannedSubPage } from "@/components/planned-sub-page";

export default function WorkbenchHeatmapPage() {
  return (
    <PlannedSubPage
      labId="workbench"
      subNumber="3.1.3"
      week="W10"
      title="错误热力图"
      protocol="error heatmap"
      description="把渲染异常叠加在源码上：运行时报错、布局错位、慢渲染节点都用不同颜色标记。"
      status="planned"
      icon={Flame}
      upcomingFeatures={[
        "运行时错误 → 源码行号高亮（红）",
        "布局错位（overflow / empty / overlap）→ 黄",
        "慢渲染节点（>16ms）→ 蓝",
        "鼠标 hover 显示具体错误堆栈 + 截图",
        "导出诊断报告（HTML / JSON）",
      ]}
      dependsOn={["3.1.1 三栏 Workbench", "Playwright headless 截图"]}
    />
  );
}
