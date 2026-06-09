import type { ReactNode } from "react";

import { LabSidebar } from "@/views/lab-sidebar";
import { LabTopbar } from "@/views/lab-topbar";

export default function LabsLayout({ children }: { children: ReactNode }) {
  return (
    <div className="bg-background flex min-h-screen w-full">
      <LabSidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <LabTopbar />
        <main className="flex-1 overflow-auto scrollbar-thin">{children}</main>
      </div>
    </div>
  );
}
