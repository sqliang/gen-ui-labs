import { History } from "lucide-react";

import { PlannedSubPage } from "@/components/planned-sub-page";

export default function WorkbenchReplayPage() {
  return (
    <PlannedSubPage
      labId="workbench"
      subNumber="3.1.4"
      week="W11"
      title="离线 Replay"
      protocol="offline replay"
      description="导入一次会话的 dump（事件 + 源码 + 中间态），完全离线重放。可分享 / 可重放 bug。"
      status="planned"
      icon={History}
      upcomingFeatures={[
        "导出：把当前 session 的所有事件 + 中间态打包成 .json.gz",
        "导入：拖入 .json.gz 即恢复完整会话",
        "时间轴 scrubber：拖动 / 跳转 / 慢放",
        "分享：导出 URL（base64 编码 dump，<2MB）",
        "可重现 bug：用户导出 → 开发者导入 → 看同样的渲染过程",
      ]}
      dependsOn={["3.1.1 三栏 Workbench", "session-store 持久化（W9）"]}
    />
  );
}
