"use client";

import { useEffect } from "react";

import { useSessionStore } from "@/core/state/session-store";

/**
 * 把 URL 的 ?model=xxx / ?session=xxx / ?lab=xxx 同步进 session-store。
 *
 * 单一来源是 URL；store 只是缓存，方便 Client Component 快速读取。
 * 切换模型时下推 URL（由调用方用 router.replace）。
 */
export function useSyncSearchParamsToSession(
  model: string | null,
  session: string | null,
  lab: string | null,
): void {
  const setModel = useSessionStore((s) => s.setCurrentModel);
  const setSession = useSessionStore((s) => s.setCurrentSession);
  const setLab = useSessionStore((s) => s.setCurrentLab);

  useEffect(() => {
    if (model) setModel(model);
    if (session) setSession(session);
    if (lab) setLab(lab);
  }, [model, session, lab, setModel, setSession, setLab]);
}
