#!/usr/bin/env bash
# scripts/check-deps.sh
#
# 重校对 PROPOSAL.md 第 8 节里列出的所有依赖最新版本。
# 用法： bash scripts/check-deps.sh
#
# 输出是 `包名 : 版本号` 表格，可与 PROPOSAL.md § 8 对比，
# 不一致就更新文档（或锁版本）—— 不要默默装旧版。

set -euo pipefail

pkgs=(
  next
  react
  react-dom
  typescript
  tailwindcss
  "@tailwindcss/postcss"
  "@biomejs/biome"
  zustand
  "@tanstack/react-query"
  react-markdown
  remark-gfm
  rehype-raw
  rehype-sanitize
  shiki
  expr-eval
  "@babel/standalone"
  react-resizable-panels
  "@xyflow/react"
  recharts
  jsondiffpatch
  react-hook-form
  zod
  vitest
  "@testing-library/react"
  "@playwright/test"
  idb-keyval
  "@axe-core/react"
  "@radix-ui/react-dialog"
  "@radix-ui/react-tabs"
  "@radix-ui/react-slot"
  lucide-react
  class-variance-authority
  clsx
  tailwind-merge
)

printf "%-32s : %s\n" "package" "version"
printf -- "-%.0s" {1..50}; echo
for p in "${pkgs[@]}"; do
  v=$(npm view "$p" version 2>/dev/null || echo "NOT_FOUND")
  printf "%-32s : %s\n" "$p" "$v"
done