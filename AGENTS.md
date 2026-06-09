<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.

Key Next.js 16 breaking changes to remember:
- `params` / `searchParams` / `cookies()` / `headers()` are ALL async — must `await props.params`
- Turbopack is default (no `--turbopack` flag needed)
- React Compiler is stable (opt-in via `next.config.ts`)
- `revalidateTag` now requires a second `cacheLife` profile argument
<!-- END:nextjs-agent-rules -->

# Project-specific rules

This is **GenUI Labs** — an experimental workspace for Generative UI (streaming protocols, LLM-driven UI code/DSL, engine debugging, agent observability).

## Read these first

1. **[`PROPOSAL.md`](./PROPOSAL.md)** — the project's source of truth. Has functional design, module layering, tech stack, 12-week roadmap, dependency baseline (§8), state-management principle (§9), and the latest "what's done" record (§10).
2. **[`README.md`](./README.md)** — quickstart + scripts + directory map.
3. **`node_modules/next/dist/docs/`** — Next.js 16 official docs (when in doubt).

## Dependency baseline

All dependencies MUST be installed at **npm `latest` tag**. Before installing:

```bash
npm run check-deps   # re-audits and prints current versions
```

If `PROPOSAL.md §8` disagrees with what `npm view <pkg> version` returns:
- **Update the doc**, OR
- **Pin the version** in `package.json` and explain why

Never silently install an older version.

## State management discipline

`src/core/state/` has exactly **5 Zustand stores** (`ui` / `session` / `streaming` / `workbench` / `observability`). They cover ONE slice only: **cross-component + high-frequency + URL-not-needed** client state. See PROPOSAL.md §9 for the full layer model.

Do NOT add new Zustand stores casually. Before reaching for Zustand, ask:
- Can this go into URL `searchParams`? → use `useSearchParams` + `<Link>`
- Can this be RSC `fetch` + cache? → Server Component
- Is it form state? → `react-hook-form`
- Is it single-component? → `useState` / `useReducer`
- Only if "cross-component + high-frequency + not URL" → Zustand

## Architectural rules

- `core/` knows nothing about Labs. Features never import each other; they communicate via `core/`.
- LLM-generated UI code MUST run in iframe sandbox (`core/engine/sandbox/`, W7). Never `eval` arbitrary code.
- All protocol event streams funnel through `RenderableEvent` (`core/protocols/common/`, defined in `streaming-store.ts` for now).

## Commands

```bash
npm run dev         # Next dev server
npm run verify      # lint + typecheck + test + build (run before committing)
npm run lint        # Biome check
npm run lint:fix    # auto-fix
npm run test        # Vitest
```