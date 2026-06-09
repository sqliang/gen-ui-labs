import { Bot, Code2, Eye, Radio } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export interface LabOverviewProps {
  labId: "streaming" | "codegen" | "workbench" | "observability";
  title: string;
  tagline: string;
  intro?: ReactNode;
  features: { label: string; desc: string; badge?: string; href?: string }[];
}

const ICON_MAP = {
  streaming: Radio,
  codegen: Code2,
  workbench: Eye,
  observability: Bot,
} as const;

export function LabOverview({ labId, title, tagline, intro, features }: LabOverviewProps) {
  const Icon = ICON_MAP[labId];

  return (
    <div className="mx-auto w-full max-w-4xl px-6 py-8 sm:py-10">
      <header className="mb-8">
        <div className="mb-2 flex items-center gap-2">
          <Icon className="text-primary size-5" />
          <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
        </div>
        <p className="text-muted-foreground">{tagline}</p>
        {intro ? (
          <div className="text-muted-foreground mt-4 text-sm leading-relaxed">{intro}</div>
        ) : null}
      </header>

      <section>
        <h2 className="mb-3 text-lg font-semibold tracking-tight">子功能</h2>
        <div className="space-y-2">
          {features.map((f) => {
            const body = (
              <Card key={f.label} className="hover:border-primary/50 transition-colors">
                <CardHeader className="p-4">
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-sm">{f.label}</CardTitle>
                    {f.badge ? (
                      <Badge variant="outline" className="font-mono text-[10px]">
                        {f.badge}
                      </Badge>
                    ) : null}
                  </div>
                  <CardDescription className="mt-1 text-xs">{f.desc}</CardDescription>
                </CardHeader>
              </Card>
            );
            return f.href ? (
              <Link key={f.href} href={f.href} className="block">
                {body}
              </Link>
            ) : (
              <div key={f.label}>{body}</div>
            );
          })}
        </div>
      </section>

      <Card className="mt-8 border-dashed">
        <CardContent className="text-muted-foreground p-4 text-xs leading-relaxed">
          当前为 W1 脚手架占位。具体子页签将按 PROPOSAL.md §4 的节奏逐步落地。
        </CardContent>
      </Card>
    </div>
  );
}
