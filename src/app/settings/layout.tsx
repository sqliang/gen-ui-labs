import { SettingsNav } from "@/components/settings-nav";

/**
 * /settings/* 路由的 layout —— 左侧 settings 导航 + 右侧内容。
 */

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto w-full max-w-5xl px-6 pt-10 pb-12">
      <header className="mb-6">
        <p className="text-muted-foreground/60 font-mono text-[11px] tracking-widest uppercase">
          settings
        </p>
        <h1 className="mt-2 font-mono text-2xl font-semibold tracking-tight">站点设置</h1>
        <p className="text-muted-foreground/85 mt-1.5 text-sm">
          管理模型 provider、key 状态、协议参数。配置不写到数据库（避免对其他 lab 用户产生影响）。
        </p>
      </header>
      <div className="grid gap-6 md:grid-cols-[200px_1fr]">
        <SettingsNav />
        <div className="min-w-0">{children}</div>
      </div>
    </div>
  );
}
