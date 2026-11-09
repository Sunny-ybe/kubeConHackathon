# Backrow: rules for every agent

Read `SPEC.md` first; it is the source of truth. Your task is in `tasks/`.

- **Edit only the files your task owns** (SPEC.md §11). These are frozen: `SPEC.md`, `lib/types.ts`, `lib/config.ts`, `lib/device.ts`, `lib/fixtures.ts`, `lib/server/*`, `scripts/setup-es.mjs`, `package.json`. If you need a change there, stop and ask the human.
- **Don't add npm dependencies.** Everything needed is installed.
- **Next.js 15+:** `params` is a Promise in pages and route handlers (`const { room } = await params`). Every GET API route needs `export const dynamic = "force-dynamic"`.
- **Never return `image`/`thumb` from searches** (use `HEAVY_FIELDS`). **Never return `device_id` to clients.** Map docs with `toSlide()`.
- Server code uses `es()` from `lib/server/es.ts` and `claudeJSON()` / `claudeText()` from `lib/server/anthropic.ts` (Claude via the Anthropic SDK; there is no OpenAI). Never import `lib/server/*` into client components.
- **Demo quality beats features:** loading states, empty states, no blank screens, big readable type.
- Commit small working steps to your branch. When you finish, list exactly what the human should test.
