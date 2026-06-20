import type { LucideIcon } from "lucide-react";
import { Construction, ListChecks, Milestone } from "lucide-react";

import { LabContentPage } from "@/components/lab-content-page";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getLab } from "@/core/labs";

interface PlannedSubPageProps {
  labId: "streaming" | "codegen" | "workbench" | "observability";
  subNumber: string;
  week: string;
  title: string;
  protocol: string;
  description: string;
  upcomingFeatures: string[];
  icon: LucideIcon;
  status: "wip" | "planned";
  dependsOn?: string[];
}

/**
 * W9-W12 计划子页的占位组件。
 *
 * 跟 P0 时代的"W1 脚手架占位"不同：现在用 **真数据** 展示：
 * - week 节奏
 * - 即将交付的 features（按子页定制）
 * - icon 强调
 * - dependsOn 依赖关系
 * - 跳回 hub 的 CTA
 *
 * 等 W9 真正开工时，把这个组件替换成真功能。
 */
export function PlannedSubPage({
  labId,
  subNumber,
  week,
  title,
  protocol,
  description,
  upcomingFeatures,
  icon: Icon,
  status,
  dependsOn = [],
}: PlannedSubPageProps) {
  const lab = getLab(labId);

  return (
    <LabContentPage
      labId={labId}
      subNumber={subNumber}
      title={title}
      protocolLabel={`${week} · ${protocol}`}
      description={description}
      status={status}
      isStreaming={false}
      onStart={undefined}
      startLabel="coming soon"
      outputTitle={`${subNumber} · preview`}
      outputExtra={
        <Badge
          variant="outline"
          className="border-amber-500/40 font-mono text-[10px] tracking-wider uppercase text-amber-300/90"
        >
          {status === "wip" ? "◐ wip" : "○ planned"}
        </Badge>
      }
      output={
        <div className="space-y-4">
          {/* status card */}
          <Card className="border-foreground/10 bg-card/40">
            <CardHeader className="p-3.5">
              <CardTitle className="text-foreground/95 flex items-center gap-2 text-[12.5px] font-medium">
                <Construction className="text-amber-400 size-4" />
                计划中 · 真实数据预览
              </CardTitle>
            </CardHeader>
            <CardContent className="px-3.5 pt-0 pb-3.5">
              <div className="border-foreground/5 grid grid-cols-2 gap-2 sm:grid-cols-4">
                <Stat label="week" value={week} />
                <Stat label="status" value={status === "wip" ? "wip" : "planned"} />
                <Stat label="lab" value={lab.shortTitle.toLowerCase()} />
                <Stat label="protocol" value={protocol} />
              </div>
              <p className="text-muted-foreground/85 mt-3 text-[12.5px] leading-relaxed">
                本子页在 <strong className="text-foreground/90">12 周路线图</strong>
                中排在{" "}
                <code className="bg-foreground/[0.06] rounded px-1 font-mono text-[11px]">
                  {week}
                </code>
                。 在它交付之前，页面用真数据预览目标功能， 而不是用"W1 脚手架占位"那种空话。
              </p>
            </CardContent>
          </Card>

          {/* upcoming features */}
          <Card className="border-foreground/10 bg-card/40">
            <CardHeader className="p-3.5">
              <CardTitle className="text-foreground/95 flex items-center gap-2 text-[12.5px] font-medium">
                <ListChecks className="text-foreground/80 size-4" />
                即将交付的功能
              </CardTitle>
            </CardHeader>
            <CardContent className="px-3.5 pt-0 pb-3.5">
              <ul className="space-y-1.5">
                {upcomingFeatures.map((f, i) => (
                  // biome-ignore lint/suspicious/noArrayIndexKey: list is static
                  <li key={i} className="flex items-start gap-2 text-[12.5px]">
                    <span className="text-foreground/50 mt-0.5 font-mono text-[10px]">
                      0{i + 1}
                    </span>
                    <span className="text-foreground/90">{f}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          {/* depends on */}
          {dependsOn.length > 0 ? (
            <Card className="border-foreground/10 bg-card/40">
              <CardHeader className="p-3.5">
                <CardTitle className="text-foreground/95 flex items-center gap-2 text-[12.5px] font-medium">
                  <Milestone className="text-foreground/80 size-4" />
                  依赖
                </CardTitle>
              </CardHeader>
              <CardContent className="px-3.5 pt-0 pb-3.5">
                <ul className="space-y-1.5">
                  {dependsOn.map((d) => (
                    <li key={d} className="text-foreground/85 font-mono text-[11.5px]">
                      ↳ {d}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ) : null}

          {/* icon preview + 提示 */}
          <Card className="border-foreground/10 bg-card/40">
            <CardContent className="p-6 text-center">
              <div
                className="mx-auto mb-3 flex size-12 items-center justify-center rounded-full"
                style={{ backgroundColor: lab.accent.soft }}
              >
                <Icon className="size-5" style={{ color: lab.accent.solid }} />
              </div>
              <p className="text-muted-foreground/80 text-[12.5px] leading-relaxed">
                现在可以
                <a
                  href="/about"
                  className="text-foreground/90 mx-1 underline-offset-2 hover:underline"
                >
                  看 12 周路线图
                </a>
                或者
                <a
                  href={`/labs/${labId}`}
                  className="text-foreground/90 mx-1 underline-offset-2 hover:underline"
                >
                  回 Lab {lab.number} hub
                </a>
                看其它已交付的子页。
              </p>
            </CardContent>
          </Card>
        </div>
      }
    />
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-foreground/10 bg-background/40 rounded-md border px-2.5 py-1.5">
      <div className="text-muted-foreground/60 font-mono text-[9.5px] tracking-wider uppercase">
        {label}
      </div>
      <div className="text-foreground/90 font-mono text-[12px]">{value}</div>
    </div>
  );
}
