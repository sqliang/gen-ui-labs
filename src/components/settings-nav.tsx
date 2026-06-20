"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const ITEMS = [
  { href: "/settings/models", label: "Models", desc: "providers + keys" },
  { href: "/settings/protocols", label: "Protocols", desc: "W6+" },
  { href: "/settings/themes", label: "Themes", desc: "W8+" },
  { href: "/settings/prompts", label: "Prompts", desc: "W9+" },
] as const;

export function SettingsNav() {
  const pathname = usePathname();
  return (
    <nav className="border-foreground/5 bg-card/30 rounded-md border p-1.5">
      {ITEMS.map((item) => {
        const active = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex items-center justify-between rounded-[5px] px-2.5 py-1.5 font-mono text-[12px] transition-colors ${
              active
                ? "bg-foreground/[0.07] text-foreground"
                : "text-muted-foreground/85 hover:bg-foreground/[0.04] hover:text-foreground"
            }`}
          >
            <span>{item.label}</span>
            <span className="text-muted-foreground/50 text-[10px]">{item.desc}</span>
          </Link>
        );
      })}
    </nav>
  );
}
