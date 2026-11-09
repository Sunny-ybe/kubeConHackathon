# Backrow: rules for every agent

Read `SPEC.md` first; it is the source of truth. Your task is in `tasks/`.

- **Edit only the files your task owns** (SPEC.md §11). These are frozen: `SPEC.md`, `lib/types.ts`, `lib/config.ts`, `lib/device.ts`, `lib/fixtures.ts`, `lib/server/*`, `scripts/setup-es.mjs`, `package.json`, `package-lock.json`, `.github/**`, `.gitar/**`. If you need a change there, stop and ask the human.
- **Don't add npm dependencies.** Everything needed is installed.
- **Next.js 16:** `params` is a Promise in pages and route handlers (`const { room } = await params`). Every GET API route needs `export const dynamic = "force-dynamic"`.
- **Never return `image`/`thumb` from searches** (use `HEAVY_FIELDS`). **Never return `device_id` to clients.** Map docs with `toSlide()`.
- Server code uses `es()` from `lib/server/es.ts` and `claudeJSON()` / `claudeText()` from `lib/server/anthropic.ts` (Claude via the Anthropic SDK; there is no OpenAI). Never import `lib/server/*` into client components.
- **Times:** show every time with `formatTime()` from `lib/config.ts` (Denver time). Servers run on UTC, so a bare `toLocaleTimeString()` is wrong by 7 hours.
- **Tracing:** wrap slow server steps in `span("name", () => …)` from `lib/server/trace.ts`. It does nothing until Dash0 is switched on, so it is always safe.
- **Accessibility:** every button and input has an accessible name, every `<img>` has `alt`, status and loading text sits in an `aria-live="polite"` region, tap targets are at least 48px, focus stays visible, and motion respects `prefers-reduced-motion`.
- **Demo quality beats features:** loading states, empty states, no blank screens, big readable type.

## Commits: atomic, always
- **One logical change per commit.** A route, a component, a script: each gets its own commit. Never mix unrelated changes, and never save everything for one big commit at the end.
- Each commit leaves the app building (`npm run lint && npm run build`).
- The message says what changed and why, in the imperative ("Add /api/feed with collapse and cluster counts"). No "wip", "fix", "updates".
- Stage files by name (`git add path/to/file`), not `git add -A`, so stray files don't sneak in.

## Pull requests
- Work on your own branch (`agent-a` … `agent-e`). Never commit to or push `main`.
- At each milestone in your task file, push and open or update a PR into `main`: `git push -u origin HEAD`, then `gh pr create --base main --fill` (the first time) or just push (after that).
- CI (lint + build) and Gitar's review run on every PR. Fix every CI failure and every blocking Gitar comment before calling a milestone done.
- Only the human merges. After a merge, run `git merge origin/main` (after `git fetch`) on your branch before continuing.
- When you finish, list exactly what the human should test.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
