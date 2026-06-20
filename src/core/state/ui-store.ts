import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

export type ThemeMode = "light" | "dark" | "system";

interface UiState {
  // === 状态 ===
  /** 主题模式：light / dark / system */
  themeMode: ThemeMode;
  /** 命令面板开合 */
  commandOpen: boolean;
  /** 左侧 session 列表栏宽（px），用于 Lab layout */
  sidebarWidth: number;

  // === 动作 ===
  setTheme: (mode: ThemeMode) => void;
  toggleCommand: () => void;
  setCommandOpen: (open: boolean) => void;
  setSidebarWidth: (width: number) => void;
  reset: () => void;
}

/**
 * 全局 UI 状态（跨 Lab）。
 * 持久化到 LocalStorage（仅 theme + sidebarWidth，避免污染会话临时态）。
 */
export const useUiStore = create<UiState>()(
  persist(
    (set) => ({
      // 站点是 devtool 风格：默认 dark（不跟随系统）。
      // 用户点 sun icon 切换到 light，会持久化。
      themeMode: "dark",
      commandOpen: false,
      sidebarWidth: 280,

      setTheme: (themeMode) => set({ themeMode }),
      toggleCommand: () => set((s) => ({ commandOpen: !s.commandOpen })),
      setCommandOpen: (commandOpen) => set({ commandOpen }),
      setSidebarWidth: (sidebarWidth) => set({ sidebarWidth }),
      reset: () => set({ themeMode: "dark", commandOpen: false, sidebarWidth: 280 }),
    }),
    {
      name: "gen-ui-labs.ui",
      storage: createJSONStorage(() => localStorage),
      // 只持久化偏好，不持久化命令面板开合这种临时态
      partialize: (state) => ({
        themeMode: state.themeMode,
        sidebarWidth: state.sidebarWidth,
      }),
    },
  ),
);
