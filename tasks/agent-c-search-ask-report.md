# Agent C: search, Ask, trip report, translate

**You own:**
- `app/api/search/route.ts`, `app/api/ask/route.ts`, `app/api/me/route.ts`, `app/api/report/route.ts`, `app/api/translate/route.ts`
- `app/search/page.tsx`, `app/me/page.tsx`
- `components/ask/**` (replace the `AskPanel` stub but keep its default export and props), `components/report/**`
- `lib/retrieval.ts`, `lib/llm.ts`
- `scripts/dev-insert-slides.mjs`

Run the dev server on **port 3003**. Read CLAUDE.md and SPEC.md (§6.5–6.9 and §7) first.

## Build

1. **`scripts/dev-insert-slides.mjs`** (first, so you can test before Agent A merges):
   - Inserts about 15 realistic fake slide docs straight into `backrow-slides`, using plain Node and `@elastic/elasticsearch`.
   - Each doc gets text, alt_text, a talk id from `data/schedule.json`, `shared: true`, `is_slide: true`, `device_id: "dev"`, `cluster_id` equal to its id, and no images.
   - Make 2–3 slides about failover across clusters, so semantic search can be shown off.

2. **`lib/retrieval.ts`**: `hybridSlides({ q, deviceId, room?, talkId?, mine?, size })` per SPEC §6.5. Returns `{ slide, highlights }[]`.

3. **`GET /api/search`**: returns `SearchResponse`.

4. **`GET /api/me?device_id=`**: returns `MeResponse`, this device's slides newest first (a simple term filter plus sort, excluding `HEAVY_FIELDS`).

5. **`POST /api/ask`**: per SPEC §6.6 with the prompt in §7.2. Parse each `[S#]` into a citation.

6. **`POST /api/report`**: per SPEC §6.7 with the prompt in §7.3. Includes crowd slides from talks you were in.

7. **`POST /api/translate`**: per §6.9 with the prompt in §7.4.

8. **`lib/llm.ts`**: thin wrappers around `claudeText()` from `lib/server/anthropic.ts`, so each call is just prompt in, string out.

9. **`components/ask/AskPanel.tsx`**:
   - A question input and a loading shimmer.
   - Answers show `[S#]` chips; tapping one opens a simple modal with that slide's title and text.
   - A "No slide covers that yet." state.

10. **`/search`**:
    - Search input.
    - Each result shows a thumbnail (falling back to a text tile), title, "talk · room · time" (time via `formatTime()`), and the highlight with `<em>` rendered bold.
    - Filter chips: **All · Mine**.

11. **`/me`**:
    - My slides grouped by talk.
    - A **Write my trip report** button that renders the markdown with `react-markdown`, with `[S#]` chips plus **Copy** and **Email** (mailto) buttons.

Use `formatTime()` from `lib/config.ts` for the `{h:mm a}` times in the Ask and report prompts too, so Claude sees Denver times. Put the Ask answer and the report in an `aria-live="polite"` region, and give the `[S#]` chips an `aria-label` like "Slide 3: <title>".

## Git and PRs
Branch `agent-c`. **Commit atomically**: one logical change per commit, each one building, staged by name (CLAUDE.md "Commits"). Open a PR into `main` at each milestone below and keep pushing to it; fix CI and blocking Gitar comments before asking the human to merge.

## PR milestones
1. **PR 1:** `scripts/dev-insert-slides.mjs`, `lib/retrieval.ts`, `/api/search`, `/api/me`.
2. **PR 2:** `/api/ask`, `/api/translate`, `lib/llm.ts`, `AskPanel`.
3. **PR 3:** `/api/report`, `/search`, `/me` with the trip report.

## Done when
- After running dev-insert, `/search?q=failover` shows bold highlights. A paraphrase like "switching to a backup cluster" also finds it, through semantic search.
- Ask returns a cited answer, and a nonsense question returns "No slide covers that yet."
- `/me` shows slides grouped by talk, and a trip report whose `[S#]` chips work.
- Translate returns Spanish for a sample slide.
