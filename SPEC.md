# Backrow: build spec

**Snap a slide. Keep the talk.**

Submission closes at 5:30 PM MT today. In order of priority:
1. The live demo works, every time.
2. It looks great on a phone and on the projector.
3. Elasticsearch visibly does the heavy lifting.

Security only goes as far as protecting the demo (§9). Everything else waits.

---

## 0. Scope

**Must have, working by 4:15 PM**
- Room page `/r/[room]`: current talk, Snap button, live feed of the room's slides.
- Snap flow: photo goes through vision, then gets tagged to its talk, grouped with duplicates, indexed, and shown as a card.
- Slide sheet: large text, Read aloud, Translate, diagram alt text, "Snapped by N people".
- Easy read `/r/[room]/easy`: big-text carousel that advances as the room snaps.
- Search `/search` with highlights.
- Ask, answered from slides with citations, or "No slide covers that yet."
- My slides plus Trip report `/me`.
- Projector `/live`: total counter, most-photographed slides, room heat, latest snap.
- QR page `/qr`: printable QR codes per room plus a large demo QR.

**Stretch, only if every must-have works by 4:15**
- Speaker stats `/talk/[id]`: the talk's most-photographed slide.
- Deck upload with snap-to-slide matching.
- Camera-roll import (multi-select).
- Findable profiles.

**Not doing:** accounts or login, websockets, native apps, Bluetooth, moderation beyond the `is_slide` filter.

---

## 1. Demo script (2:30)

1. **0:00** "Hands up if your phone has a photo of a slide you never looked at again." Then: "Speakers, do you know which of your slides people photographed?"
2. **0:15** "Backrow: snap a slide, keep the talk."
3. **0:20** Point at the QR on your slide: "Scan it and snap this slide." Switch to `/live`. The counter climbs and your slide shows up under Most photographed with ×N.
4. **0:50** On `/r/demo`, open that slide. Show the big text, tap **Read aloud** (audio plays), then translate it to Hindi.
5. **1:15** On `/search`, query "diagram with three clusters" (seeded). Show the highlighted hit, then Ask "what did they say about failover?" and get a cited answer.
6. **1:45** On `/me`, tap **Write my trip report**. The report cites slides, including slides you never snapped yourself.
7. **2:05** Elasticsearch in 20 seconds:
   - One index of talks and slides.
   - A range query on room and time tags each snap to its talk.
   - Hybrid RRF search with highlights.
   - `collapse` plus `terms` plus `top_hits` drive the feed and the leaderboard.
   - Ask and the report cite only real slides.
8. **2:25** "Snap a slide. Keep the talk."

**Demo prep**
- **Deck:** 4 slides.
  1. Title.
  2. The QR slide: "Snap this slide" in huge, high-contrast text, plus a QR code to `/r/demo`. Big clean text makes every phone's photo read the same, so all the snaps cluster into one slide.
  3. Elasticsearch architecture.
  4. Close.
- **Seed data:** 30–60 slides photographed off a second screen playing 2–3 KubeCon recordings, loaded with `scripts/seed.mjs` into rooms `kc-a` and `kc-b`. Add the 2 PM panel's slides if it has any.
- **Your own device:** snap slides yourself in 2–3 talks so `/me` produces a real trip report.
- **Projector:** keep `/live` in its own tab. Check that HDMI carries audio for Read aloud; if not, hold the phone to the mic.
- **Backup:** at about 5:00, screen-record one full 90-second run. Have a phone hotspot ready.
- Rehearse 3 times.

---

## 2. Screens

| Route | What it shows |
|---|---|
| `/` | "Snap a slide. Keep the talk." Room list (from `data/schedule.json`), plus links to Search, My slides and Live. |
| `/r/[room]` | Header: room name, current talk (title, speakers, time). Fixed bottom **Snap a slide** button. Live feed of slide cards, one per cluster, newest first, with an "×N" badge. Tabs: **Feed · Easy read · Ask**. Links to Search and My slides. |
| Snap flow | Camera opens through `<input type="file" accept="image/*" capture="environment">`. Client resizes to 1280px plus a 400px thumbnail and posts to `/api/snap`. A loading card cycles "Reading the slide…", "Finding the talk…", "Checking who else snapped it…". On success, the slide sheet opens. On `not_a_slide`: "That doesn't look like a slide. Try again?" |
| First snap only | Modal: "Share your snaps with the room?" **Share** or **Only me**. The choice is saved in localStorage. A small toggle in the header changes it later. |
| Slide sheet | Photo, title, full text at 20–22px, a "Diagram" box (alt text), **Read aloud** (toggles to Stop), **Translate** (language select replaces the text, with "Show original"), talk tag ("Talk X · Room · 2:41 PM"), "Snapped by N people". |
| `/r/[room]/easy` | Full screen, black background, white 28–36px text, max 38ch wide. Shows the newest cluster in the current talk and advances by itself when a new cluster appears. **Read aloud** button plus an **Auto-read** toggle that reads each new slide. |
| Ask (tab) | `components/ask/AskPanel.tsx`. Question box, answer with inline [S1] chips that open the cited slide. Says "No slide covers that yet." when nothing matches. |
| `/search` | Search box. Results show thumbnail, title, talk, room and time, with the highlight (`<em>` rendered bold). Falls back to the first 140 characters of text if there's no highlight. Filter chips: All · Mine. |
| `/me` | My slides grouped by talk. **Write my trip report** renders markdown with [S#] chips, a **Copy** button and an **Email** (mailto) button. |
| `/live` | Projector at 1920×1080, dark. Giant "slides snapped today" counter with a count-up animation. "Snapping now": the newest photo fades in. "Most photographed": top 3 with ×N badges that pulse on change. Room heat: bars for snaps per room in the last 10 minutes, each with the room's top slide. Corner QR: "Scan to snap". Polls every 2s. |
| `/qr` | A grid of printable QR codes, one per room, pointing to `NEXT_PUBLIC_APP_URL/r/<room>`, plus one huge demo QR. |

---

## 3. Architecture

```
Phone (Next.js page) ──POST /api/snap──▶ Claude vision ──▶ Elasticsearch
Every read ──▶ Next.js API routes ──▶ Elasticsearch (+ Claude for Ask, report, translate)
Live updates: polling (feed 4s, /live 2s). No websockets.
Identity: anonymous device_id in localStorage. No login.
Images: base64 `binary` fields in Elasticsearch (`image` 1280px, `thumb` 400px),
        served by /api/slides/[id]/image. ALWAYS exclude both from search results.
```

**Why images live in Elasticsearch:** it's one less service to set up, and Elasticsearch really is the only datastore. If documents get too heavy, swap in Vercel Blob later and keep only a URL.

**Next.js notes (16)**
- In route handlers and pages, `params` is a Promise. Use `const { room } = await params`.
- Add `export const dynamic = "force-dynamic"` to every GET API route.
- Add `export const runtime = "nodejs"` and `export const maxDuration = 60` to `/api/snap`, `/api/ask` and `/api/report`.
- `cacheComponents` stays off in `next.config.ts`, because it forbids `force-dynamic`.

**Times:** the event is in Denver (Mountain Time) and Vercel runs on UTC. Every time shown to a user goes through `formatTime(iso)` from `lib/config.ts`, which returns e.g. "2:41 PM".

**Tracing:** `span(name, fn, attrs?)` from `lib/server/trace.ts` wraps a server step in an OpenTelemetry span. It is a no-op until Dash0 is switched on (`tasks/agent-e-observability.md`), so routes can always use it.

---

## 4. Data model

Mappings live in `scripts/setup-es.mjs`. Run it once: `node --env-file=.env.local scripts/setup-es.mjs`. Add `--reset` to wipe and recreate.

**`backrow-talks`**
- `talk_id`, `room`, `room_name`: keyword
- `title`, `abstract`: text, both `copy_to` `semantic`
- `speakers`: text
- `start`, `end`: date
- `semantic`: semantic_text

**`backrow-slides`**

| Field | Type | Notes |
|---|---|---|
| `slide_id` | keyword | uuid, also the doc `_id` |
| `device_id` | keyword | never returned to clients; the API computes `mine` instead |
| `shared` | boolean | the user's share choice |
| `is_slide` | boolean | from vision; non-slides are never stored |
| `room`, `talk_id`, `talk_title` | keyword | from attribution |
| `taken_at` | date | server time, or the seed override |
| `title`, `text`, `alt_text` | text | `copy_to` `semantic` |
| `topics` | keyword | up to 5 |
| `cluster_id` | keyword | duplicate group |
| `semantic` | semantic_text | default inference endpoint |
| `image`, `thumb` | binary | base64 JPEG, never searched |

Shared types are in `lib/types.ts`. The ES-to-API mapper is `toSlide()` in `lib/server/slides.ts`.

---

## 5. API contracts (types in `lib/types.ts`)

| Method and route | Input | Output |
|---|---|---|
| `POST /api/snap` | multipart: `image` (jpeg ≤ 2MB), `thumb` (jpeg), `room`, `device_id`, `shared` ("true"/"false"); seed only: `talk_id`, `taken_at` | `SnapResponse` |
| `GET /api/room/[room]` | none | `RoomResponse` |
| `GET /api/feed?room=&device_id=` | none | `FeedResponse`: one card per cluster, newest first, max 30 |
| `GET /api/slides/[id]/image?size=thumb` | none | `image/jpeg`, cache 1 year |
| `GET /api/search?q=&device_id=&room=&mine=1` | none | `SearchResponse` |
| `POST /api/ask` | `{ q, device_id, room?, talk_id? }` | `AskResponse` |
| `GET /api/me?device_id=` | none | `MeResponse`: this device's slides, newest first |
| `POST /api/report` | `{ device_id }` | `ReportResponse` |
| `POST /api/translate` | `{ text, lang }` | `TranslateResponse` |
| `GET /api/live?window=10` | none | `LiveResponse` |

Until real routes are merged, the UI uses `lib/fixtures.ts` when `NEXT_PUBLIC_USE_FIXTURES=1`.

---

## 6. Core logic

Use these constants from `lib/config.ts`:
- `SLIDES_INDEX`, `TALKS_INDEX`
- `DEDUPE_WINDOW_MIN = 10`, `DEDUPE_JACCARD = 0.5`
- `HEAVY_FIELDS = ["image","thumb"]` (from `lib/server/slides.ts`)

### 6.1 Snap pipeline (`/api/snap`)
1. Parse the form data. Reject `image` larger than `MAX_UPLOAD_BYTES` with a 413.
2. **Vision:** call `readSlide(buffer)`, which returns `{ is_slide, title, text, alt_text, topics }` (prompt in §7.1). If `!is_slide`, return `{ ok:false, reason:"not_a_slide" }` and store nothing.
3. `taken_at` is the seed override if given, otherwise now (ISO).
4. **Talk:** if there's a `talk_id` override, use `es.get` on talks. Otherwise run the attribution query (§6.2). With no match, use `talk_id = "<room>-open"` and `talk_title = "Open session"`.
5. **Cluster:** see §6.3.
6. Index with `es.index({ index: SLIDES_INDEX, id: slide_id, document })`. **Don't pass `refresh`.** That keeps snaps fast, and the fingerprint handles snaps that arrive in the same second.
7. `cluster_size` is `es.count` on that `cluster_id` plus 1, because the new doc isn't searchable yet.
8. Return `{ ok:true, slide, talk, cluster_size }`.

Wrap steps 2, 4, 5 and 6 in `span()` (`snap.vision`, `snap.attribute`, `snap.cluster`, `snap.index`) so a slow snap shows which step was slow.

Target: under 7 seconds end to end.

### 6.2 Attribution (room + time)
```ts
es.search({ index: TALKS_INDEX, size: 1, sort: [{ start: "desc" }],
  query: { bool: { filter: [
    { term: { room } },
    { range: { start: { lte: takenAt } } },
    { range: { end: { gte: takenAt } } },
  ] } } })
```

### 6.3 Duplicate grouping
1. Fetch candidates, up to 50 slides in the same `talk_id`, with `is_slide:true`, where `taken_at` is within ±10 minutes. Use `_source_includes: ["title","text","cluster_id"]`.
2. Compare words with `jaccard(newTitle + " " + newText, cand.title + " " + cand.text)`. If the best score is at least `DEDUPE_JACCARD`, reuse that candidate's `cluster_id`.
3. Otherwise set `cluster_id = fingerprint(talk_id, title + " " + text)`. Two judges snapping the same clean slide at the same second get the same id. If the text is empty, use `slide_id`.

### 6.4 Feed (`/api/feed`)
```ts
es.search({ index: SLIDES_INDEX, size: 30, _source_excludes: HEAVY_FIELDS,
  query: { bool: {
    filter: [{ term: { room } }, { term: { is_slide: true } }, ...(talkId ? [{ term: { talk_id: talkId } }] : [])],
    should: [{ term: { shared: true } }, { term: { device_id } }], minimum_should_match: 1 } },
  collapse: { field: "cluster_id" }, sort: [{ taken_at: "desc" }],
  aggs: { clusters: { terms: { field: "cluster_id", size: 200 } } } })
```
Set `snaps` on each card from the `clusters` buckets. `talkId` is the room's current talk; if there isn't one, show the room's latest.

### 6.5 Search (`/api/search`): hybrid RRF
```ts
const filter = [
  { term: { is_slide: true } },
  { bool: { should: [{ term: { shared: true } }, { term: { device_id } }], minimum_should_match: 1 } },
  ...(room ? [{ term: { room } }] : []), ...(mine ? [{ term: { device_id } }] : []),
];
es.search({ index: SLIDES_INDEX, size: 20, _source_excludes: HEAVY_FIELDS,
  retriever: { rrf: { retrievers: [
    { standard: { query: { bool: { must: [{ multi_match: { query: q, fields: ["title^2", "text", "alt_text"] } }], filter } } } },
    { standard: { query: { bool: { must: [{ semantic: { field: "semantic", query: q } }], filter } } } },
  ] } },
  highlight: { fields: { text: {}, alt_text: {}, semantic: { number_of_fragments: 1 } } } })
```
Keyword matching catches exact names (etcd, Karpenter, error strings). Semantic matching catches the same meaning in other words. Return the highlights as an array, lexical first.

### 6.6 Ask (`/api/ask`)
1. Run the same hybrid retrieval as search, top 8, filtered by `talk_id` or `room` if given.
2. Label the slides `[S1]`…`[S8]` and send them with the prompt in §7.2.
3. If there are no hits or the model replies `NO_EVIDENCE`, return `answer: "No slide covers that yet."` with an empty `citations` list.
4. Otherwise, map each `[S#]` in the answer back to its slide for `citations`.

### 6.7 Trip report (`/api/report`)
1. **Mine:** slides where `device_id` = me, sorted by `taken_at` ascending, size 200.
2. **Crowd:** shared slides from the same `talk_id`s that aren't mine, collapsed by `cluster_id`, size 100. These are the slides you missed in talks you attended.
3. Group by talk and label `[S1]`…`[Sn]`. Cap at 60, keeping mine first.
4. Send to the prompt in §7.3 and return the markdown plus citations.

### 6.8 Live (`/api/live`): one query
```ts
es.search({ index: SLIDES_INDEX, size: 0, track_total_hits: true,
  query: { bool: { filter: [{ term: { shared: true } }, { term: { is_slide: true } }] } },
  aggs: {
    top_slides: { terms: { field: "cluster_id", size: 6 },
      aggs: { rep: { top_hits: { size: 1, sort: [{ taken_at: "desc" }], _source: { excludes: HEAVY_FIELDS } } } } },
    recent: { filter: { range: { taken_at: { gte: `now-${window}m` } } },
      aggs: { rooms: { terms: { field: "room", size: 10 },
        aggs: { rep: { top_hits: { size: 1, sort: [{ taken_at: "desc" }], _source: { excludes: HEAVY_FIELDS } } } } } } },
    latest: { top_hits: { size: 8, sort: [{ taken_at: "desc" }], _source: { excludes: HEAVY_FIELDS } } },
  } })
```
`total_snaps` comes from `hits.total.value`. Room names come from `data/schedule.json`.

### 6.9 Translate (`/api/translate`)
Calls the text model with the prompt in §7.4 and returns `{ text }`. The client reads the result aloud with the `speech` locale from `LANGS`.

### Read aloud (client)
`speechSynthesis.speak(new SpeechSynthesisUtterance(text))`, triggered only from a button tap (iOS requires a user gesture). Set `utterance.lang` when the text is translated.

---

## 7. Prompts

### 7.1 Vision (`claudeJSON()` with a JSON Schema for the keys below, image as a base64 JPEG block)
```
You read photos of presentation slides taken by audience members, often from far away,
at an angle, or blurry. Return ONLY a JSON object with these keys:
"is_slide": true if the photo mainly shows a presentation slide or screen content, else false.
"title": the slide's title, or "" if none.
"text": all readable text on the slide in reading order, verbatim, lines separated by \n.
        Never invent text you cannot read; skip unreadable parts.
"alt_text": 1-3 sentences describing any diagram, chart, code, or image on the slide for
            someone who cannot see it. "" if the slide is only text.
"topics": up to 5 short lowercase topic tags.
Describe only the slide. Never describe people, faces, clothing, or the room.
```

### 7.2 Ask
```
Answer the question using only the slides below. Cite slides inline like [S2].
If the slides do not contain the answer, reply exactly: NO_EVIDENCE
Keep it under 120 words.

Question: {q}

Slides:
[S1] (Talk: {talk_title}, {h:mm a}) Title: {title}
Text: {text}
Diagram: {alt_text}
...
```

### 7.3 Trip report
```
Write a conference trip report from these slides, in Markdown.
For each talk: a "### {talk title}" heading and 2-4 bullets of key points, each ending
with citations like [S3]. Then "### Top takeaways" (3 bullets) and "### Worth following up"
(up to 3 bullets: things to watch, read, or try). Use only the slides; never invent facts.
Under 350 words.
```

### 7.4 Translate
```
Translate the following slide text into {language}. Keep technical terms, product names,
commands, and code unchanged. Return only the translation.
```

---

## 8. UI rules (demo quality)

- **Theme:** dark by default. Background `#0A0A0C`, surface `#16161A`, text `#F4F4F5`, muted `#A1A1AA`, accent `#FFB020`, success `#34D399`. Use Tailwind only, no component library.
- **Phone:**
  - Tap targets at least 48px.
  - Snap button fixed to the bottom, 64px tall, full width, accent background, dark text.
  - Body text 16px; slide text in the sheet 20–22px.
- **Loading:** shimmer skeletons with the rotating status lines from §2. Never show a blank screen.
- **Motion:**
  - Cards slide in.
  - The ×N badge pulses when it changes.
  - The `/live` counter counts up over about 600ms.
  - The newest photo on `/live` fades in.
- **Fallbacks:**
  - Images that fail to load become a text tile showing the slide title.
  - Empty states have a single line of guidance ("No slides yet. Be the first to snap one.").
- **Copy:** short and plain. "Snap a slide", not "Upload image".
- **Times:** always `formatTime()` (Denver time).

**Accessibility checklist** (Gitar checks these on every PR):
- Every button and input has an accessible name; icon-only buttons get `aria-label`.
- Every `<img>` has `alt` (the slide title; `""` only if decorative). The slide sheet's Diagram box is the alt text for diagrams.
- Loading lines, snap results, Ask answers and new-slide updates sit in an `aria-live="polite"` region.
- Tap targets at least 48px; visible focus rings; never `outline: none` without a replacement.
- Text contrast at least 4.5:1 (the §8 palette passes on its own backgrounds).
- Animations and the `/live` count-up respect `prefers-reduced-motion`.
- `<html lang="en">`, and translated text gets a matching `lang` attribute.

---

## 9. Demo guardrails (the only security we do)

1. **Keys stay on the server.** No `NEXT_PUBLIC_` secrets, and `.env*` is gitignored. A leaked key in a public repo can drain your Anthropic credits mid-demo.
2. **Only slides reach shared surfaces.** The room feed (for other people's snaps) and `/live` show only `is_slide:true AND shared:true` docs, and non-slides are never stored. That stops a prank photo from showing up on the projector.
3. **Upload cap of 2 MB**, after the client resizes the image.

---

## 10. Env and setup

`.env.local`, the same values in each worktree and in Vercel:
```
ES_URL=…              # Elasticsearch endpoint URL
ES_API_KEY=…
ANTHROPIC_API_KEY=…
CLAUDE_VISION_MODEL=claude-sonnet-5-5  # optional, this is the default
CLAUDE_TEXT_MODEL=claude-sonnet-5-5    # optional
NEXT_PUBLIC_APP_URL=https://<app>.vercel.app
NEXT_PUBLIC_USE_FIXTURES=0
```
Dependencies, pre-installed. **Agents don't add new ones without asking.**
`@elastic/elasticsearch @anthropic-ai/sdk @opentelemetry/api react-markdown qrcode @types/qrcode`

Optional, only if Dash0 is switched on (Agent E): `OTEL_EXPORTER_OTLP_ENDPOINT`, `OTEL_EXPORTER_OTLP_HEADERS`, `OTEL_SERVICE_NAME`.

---

## 11. File ownership

| Owner | Files |
|---|---|
| **Frozen (change only through the human)** | `SPEC.md`, `lib/types.ts`, `lib/config.ts`, `lib/device.ts`, `lib/fixtures.ts`, `lib/server/*`, `scripts/setup-es.mjs`, `package.json`, `package-lock.json`, `next.config.ts`, `.github/**`, `.gitar/**` |
| **A: pipeline** | `app/api/snap`, `app/api/room`, `app/api/feed`, `app/api/slides`, `lib/vision.ts`, `scripts/seed.mjs`, `scripts/vision-test.mjs` |
| **B: phone UI** | `app/page.tsx`, `app/layout.tsx`, `app/globals.css`, `app/r/**`, `app/qr/**`, `components/**` except `components/ask/**`, `components/report/**`, `components/live/**`; `lib/client.ts` |
| **C: search, Ask, report** | `app/api/search`, `app/api/ask`, `app/api/me`, `app/api/report`, `app/api/translate`, `app/search/**`, `app/me/**`, `components/ask/**`, `components/report/**`, `lib/retrieval.ts`, `lib/llm.ts`, `scripts/dev-insert-slides.mjs` |
| **D: live and demo** | `app/api/live`, `app/live/**`, `app/talk/**` (stretch), `components/live/**`, `scripts/dev-insert-live.mjs`, `data/schedule.json` (data only), `README.md` |
| **E: observability (optional)** | `instrumentation.ts` |

---

## 12. Hackathon rules checklist

- The repo is public, and the README has setup steps.
- The README discloses that AI coding assistants were used.
- No secrets in the repo. No photos of people in the repo or the demo.
- You must be able to explain the architecture: read this spec.

---

## 13. Git workflow

- Each agent works on its own branch (`agent-a` … `agent-e`) in its own worktree. Nobody commits to `main` directly.
- **Atomic commits:** one logical change per commit, each one building, with a message that says what and why. Stage files by name.
- At each milestone in a task file, the agent pushes and opens (or updates) a PR into `main`.
- CI (`.github/workflows/ci.yml`: lint + build) and Gitar (`.gitar/review/backrow.md`) review every PR. Fix CI failures and blocking Gitar comments before asking for a merge.
- Only the human merges. Agents then `git fetch && git merge origin/main` before continuing.
