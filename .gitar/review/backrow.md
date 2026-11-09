# Backrow review rules

Review every PR against `SPEC.md` (the source of truth) and `CLAUDE.md`. Flag violations as blocking unless marked "warn".

## Ownership and scope
- A PR from `agent-x` must only change files that agent owns (SPEC §11). Flag any change to a frozen file: `SPEC.md`, `lib/types.ts`, `lib/config.ts`, `lib/device.ts`, `lib/fixtures.ts`, `lib/server/*`, `scripts/setup-es.mjs`, `package.json`, `package-lock.json`, `.github/**`, `.gitar/**`.
- Flag new npm dependencies.
- Commits must be atomic: one logical change per commit, with a message that says what and why. Warn on commits that mix unrelated changes (e.g. a route plus unrelated UI), or vague messages like "wip", "fix", "updates".

## Data safety (demo guardrails, SPEC §9)
- Any Elasticsearch search over `backrow-slides` must exclude `HEAVY_FIELDS` (`image`, `thumb`). Only `/api/slides/[id]/image` may read them.
- `device_id` must never reach a client. Responses must map docs through `toSlide()`.
- Shared surfaces (another person's snaps in the feed, `/live`, search, Ask, report crowd slides) must filter `is_slide: true` and `shared: true` (or the caller's own `device_id`).
- No secrets in code. No `NEXT_PUBLIC_` env var may hold a key.
- Client components (`"use client"`) must not import `lib/server/*`.

## Next.js 16
- `params` is a Promise: `const { x } = await params`.
- Every GET route handler exports `dynamic = "force-dynamic"`.
- `/api/snap`, `/api/ask` and `/api/report` export `runtime = "nodejs"` and `maxDuration = 60`.

## Times and tracing
- Every time shown to a user goes through `formatTime()` from `lib/config.ts` (Denver time). Flag bare `toLocaleTimeString()` / `toLocaleString()` on dates.
- Snap pipeline steps (vision, attribution, clustering, indexing) are wrapped in `span()` from `lib/server/trace.ts`. Warn if missing.

## Accessibility (warn)
- Buttons and inputs have accessible names (visible text or `aria-label`); icon-only buttons need `aria-label`.
- Every `<img>` has `alt` (the slide title, or `""` if decorative).
- Loading and status text (snap progress, Ask answers, new-slide updates) sits in an `aria-live="polite"` region.
- Tap targets are at least 48px. Focus is visible (no `outline: none` without a replacement).
- Animations respect `prefers-reduced-motion`.
- Text contrast is at least 4.5:1 against its background.

## Demo quality (warn)
- Every data view has a loading state and an empty state; nothing renders blank.
- Images fall back to a text tile with the slide title.
