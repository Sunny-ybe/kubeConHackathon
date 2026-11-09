# Agent D: projector view, demo data, README

**You own:**
- `app/api/live/route.ts`, `app/live/page.tsx`, `components/live/**`
- `app/talk/[id]/page.tsx` (stretch)
- `scripts/dev-insert-live.mjs`
- `data/schedule.json` (data only)
- `README.md`

Run the dev server on **port 3004**. Read CLAUDE.md and SPEC.md (§2, §6.8 and §8) first.

## Build

1. **`GET /api/live?window=10`**:
   - One query per SPEC §6.8, returning `LiveResponse`.
   - Room names come from `data/schedule.json`.
   - Set `snaps` on each top slide from its bucket count.

2. **`/live`**: a projector view at 1920×1080, dark. It has to read clearly from the back of the room: huge type, high contrast, nothing small.
   - A giant "slides snapped today" counter that counts up over about 600ms when it changes.
   - **Snapping now:** the newest thumbnail fades in, with its room and talk.
   - **Most photographed:** the top 3, each with a ×N badge that pulses when it changes.
   - **Room heat:** a bar for each room, with that room's top slide.
   - A corner QR, "Scan to snap", pointing to `NEXT_PUBLIC_APP_URL/r/demo` (use the `qrcode` package).
   - Polls every `LIVE_POLL_MS`.

3. **`scripts/dev-insert-live.mjs`**: inserts fake shared slides with repeated cluster ids, so the counts go above 1 and the room heat looks real. Use it until Agent A merges.

4. **`data/schedule.json`**: ask the human for the lunch panel's real title and time, and for the KubeCon talks they're seeding. Keep the `demo` room's talk spanning the whole day.

5. **`README.md`**, credited to **Sashikant Kumar**:
   - What it is, in 2 lines, plus screenshot placeholders.
   - Architecture (SPEC §3).
   - How Elasticsearch is used, in plain words:
     - room-and-time attribution
     - duplicate grouping
     - hybrid RRF search with highlights
     - `collapse` + `terms` + `top_hits` for the feed and the leaderboard
     - Ask and the report grounded only in real slides
   - Setup steps (SPEC §10 and `scripts/setup-es.mjs`).
   - An "AI assistance" section disclosing that AI coding assistants were used.

6. **Stretch:** `/talk/[id]`, a speaker stats page showing the talk's most-photographed slide, its count, and its clusters.

## Done when
- `/live` updates within about 3 seconds of a new snap or a dev insert.
- The counter and badges animate.
- It reads clearly from across the room.
