# Backrow

**Snap a slide. Keep the talk.**

Backrow turns the slide photos people take at conferences into something useful: every snap is read, tagged to the talk it came from, grouped with everyone else's snaps of the same slide, and made searchable. Speakers see which slides the room photographed, and attendees leave with notes and a trip report grounded in real slides.

Built by **Sashikant Kumar** for the Cloud Native Hackathon (KubeCon, Denver).

| Room feed on a phone | Projector view (`/live`) |
|---|---|
| _screenshot placeholder_ | _screenshot placeholder_ |

## What you can do

- **Snap** a slide from your phone in any room (`/r/<room>`); it appears in the room's live feed with an "×N" badge when others snapped it too.
- **Easy read** (`/r/<room>/easy`): a big-text view that follows the talk as the room snaps.
- **Search** every shared slide (`/search`), and **Ask** questions answered only from slides, with citations.
- **My slides** and a **Trip report** (`/me`), including the slides you missed in talks you attended.
- **Live** (`/live`): a projector board with a "slides snapped today" counter, the most-photographed slides, room heat and the latest snap.
- **QR codes** (`/qr`) for every room.

## Architecture

```
Phone (Next.js page) ──POST /api/snap──▶ Claude vision ──▶ Elasticsearch
Every read ──▶ Next.js API routes ──▶ Elasticsearch (+ Claude for Ask, report, translate)
Live updates: polling (feed 4s, /live 2s). No websockets.
Identity: anonymous device_id in localStorage. No login.
Images: base64 binary fields in Elasticsearch (1280px image + 400px thumb),
        served by /api/slides/[id]/image and always excluded from search results.
```

- **Next.js 16** (App Router) on Vercel for the pages and API routes.
- **Claude Sonnet 5.5** via the Anthropic SDK reads each photo (title, text, diagram description, topics) and writes Ask answers, trip reports and translations.
- **Elasticsearch** is the only datastore: one index of talks, one of slides.
- The full design is in [`SPEC.md`](SPEC.md).

## How Elasticsearch is used

- **Room-and-time attribution.** Each snap carries its room and the time it was taken. A `range` query on the talks index (`start <= taken_at <= end`, filtered by room) finds the talk that was on stage, so nobody has to pick a talk by hand.
- **Duplicate grouping.** When ten people photograph the same slide, we fetch slides from the same talk taken within ten minutes and compare their words. A close match reuses that slide's `cluster_id`; otherwise a fingerprint of the slide's distinctive words becomes a new one. That is what powers "Snapped by N people".
- **Hybrid search with RRF and highlights.** Search runs a keyword query (good for exact names like `etcd` or an error string) and a `semantic_text` query (good for the same idea in other words) side by side, and fuses them with Reciprocal Rank Fusion. Highlights show where each slide matched.
- **`collapse` + `terms` + `top_hits` for the feed and the leaderboard.** The room feed collapses on `cluster_id` so each slide shows once, and a `terms` aggregation counts snaps per cluster. The `/live` board is a single query: `terms` on `cluster_id` with `top_hits` for the most-photographed slides, a time-filtered `terms` on `room` for room heat, and `top_hits` for the latest snaps.
- **Grounded Ask and trip report.** Ask and the trip report retrieve real slides with the same hybrid search, label them `[S1]`, `[S2]`…, and Claude may only answer from those. If nothing matches, the answer is "No slide covers that yet."

## Setup

You need Node.js 22, an Elasticsearch project (an Elastic Cloud trial works) and an Anthropic API key.

```bash
git clone https://github.com/Sunny-ybe/kubeConHackathon.git backrow
cd backrow
npm install
cp .env.example .env.local      # fill in the values below
node --env-file=.env.local scripts/setup-es.mjs
npm run dev
```

`.env.local`:

```
ES_URL=…                        # Elasticsearch endpoint URL
ES_API_KEY=…
ANTHROPIC_API_KEY=…
CLAUDE_VISION_MODEL=claude-sonnet-5-5   # optional, this is the default
CLAUDE_TEXT_MODEL=claude-sonnet-5-5     # optional
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_USE_FIXTURES=0
```

- `scripts/setup-es.mjs` creates the `backrow-talks` and `backrow-slides` indices and loads the schedule from `data/schedule.json`. Add `--reset` to wipe and recreate both indices. If index creation fails on `semantic_text` (for example on a local cluster without a default model), set `ES_INFERENCE_ID` to an inference endpoint id and rerun.
- `scripts/seed.mjs <folder> <talk_id> <room>` loads a folder of slide photos through the real snap pipeline.
- `scripts/dev-insert-live.mjs [count] [--trickle] [--clean]` inserts fake shared slides so `/live` has data during development; `--clean` removes them.
- For Vercel, add the same variables and set `NEXT_PUBLIC_APP_URL` to the deployed URL.

## Accessibility

Backrow is built so that a slide photo becomes something everyone can use, not just people with perfect eyesight in the front row.

- **Easy read:** a full-screen, high-contrast, 28–36px text view of the latest slide that advances on its own.
- **Read aloud:** any slide can be read out with the browser's speech synthesis, started by a tap.
- **Translation:** slide text can be translated (Spanish, Hindi, Chinese, French, Portuguese, Japanese) and read aloud in that language.
- **Diagram alt text:** Claude describes diagrams, charts and code on each slide, shown in a "Diagram" box and used as the image's alt text.

Checklist applied to every screen (and checked on every PR):

- Every button and input has an accessible name; icon-only buttons get `aria-label`.
- Every `<img>` has `alt` (the slide title, or `""` if decorative).
- Loading lines, snap results, Ask answers and new-slide updates sit in an `aria-live="polite"` region.
- Tap targets are at least 48px; focus rings stay visible.
- Text contrast is at least 4.5:1.
- Animations, including the `/live` count-up, respect `prefers-reduced-motion`.
- `<html lang="en">`, and translated text gets a matching `lang` attribute.

## How we built it

- **Contract first.** `SPEC.md`, shared types (`lib/types.ts`), config, server clients and fixtures were written and frozen before any feature work, so parts could be built in parallel without stepping on each other.
- **Parallel agents on branches.** Each part (snap pipeline, phone UI, search/Ask/report, live board and demo data) was built by a separate coding agent in its own git worktree and branch, owning a fixed set of files.
- **Atomic commits.** One logical change per commit, each one passing lint and build, staged file by file.
- **Pull requests with checks.** Every milestone went up as a PR into `main`, checked by CI (lint + build, `.github/workflows/ci.yml`) and reviewed by Gitar against our own rules in [`.gitar/review/backrow.md`](.gitar/review/backrow.md): file ownership, no image fields in search results, no `device_id` sent to clients, Next.js 16 conventions and the accessibility checklist. Only a human merged.

## AI assistance

This project was built with AI coding assistants: **Claude Code** running **Claude** models wrote much of the code from the spec, working as parallel agents, with a human (Sashikant Kumar) writing the spec, reviewing and merging every PR, and testing on real devices.

Separately, the app itself calls **Claude Sonnet 5.5** through the Anthropic SDK at runtime, to read slide photos and to write Ask answers, trip reports and translations. It does not use OpenAI.
