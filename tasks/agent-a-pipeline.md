# Agent A: snap pipeline (backend core)

**You own:**
- `app/api/snap/route.ts`
- `app/api/room/[room]/route.ts`
- `app/api/feed/route.ts`
- `app/api/slides/[id]/image/route.ts`
- `lib/vision.ts`
- `scripts/vision-test.mjs`
- `scripts/seed.mjs`

Run the dev server on **port 3001**. Read CLAUDE.md and SPEC.md first.

## Do these in order

1. **`lib/vision.ts`**: `readSlide(jpeg: Buffer): Promise<{ is_slide: boolean; title: string; text: string; alt_text: string; topics: string[] }>`.
   - Uses `claudeJSON()` from `lib/server/anthropic.ts`, passing `image: { base64 }`, the prompt in SPEC §7.1 and a JSON Schema for the five keys (`additionalProperties: false`, all keys `required`). It already uses structured outputs, so the response is valid JSON.
   - Parse defensively: missing keys get defaults. Time out after 20 seconds.

2. **`scripts/vision-test.mjs`**: do this within 20 minutes, because the human is waiting on it.
   - Usage: `node --env-file=.env.local scripts/vision-test.mjs <folder>`.
   - Runs the same prompt on every .jpg, .jpeg and .png in the folder. Inline the prompt; use plain Node with no TypeScript imports.
   - Prints each file name, the latency and the JSON.
   - **Tell the human when it's ready.**

3. **`POST /api/snap`**: follow SPEC §6.1–6.3 exactly.
   - Use `jaccard` and `fingerprint` from `lib/server/slides.ts`, and constants from `lib/config.ts`.
   - Returns `SnapResponse`.
   - Add `export const runtime = "nodejs"` and `export const maxDuration = 60`.
   - Store `image` and `thumb` as base64.

4. **`GET /api/room/[room]`**: returns `RoomResponse`, using the attribution query (§6.2) with the current time. `room_name` comes from `data/schedule.json`.

5. **`GET /api/feed?room=&device_id=`**: follow SPEC §6.4, using `collapse` plus a `terms` agg for counts. Pass `deviceId` to `toSlide` so `mine` is set.

6. **`GET /api/slides/[id]/image?size=thumb`**:
   - Fetch with `es().get({ index: SLIDES_INDEX, id, _source_includes: [size === "thumb" ? "thumb" : "image"] })`.
   - Decode the base64 and return `new Response(buf, { headers: { "Content-Type": "image/jpeg", "Cache-Control": "public, max-age=31536000, immutable" } })`.
   - Return 404 if the doc is missing.

7. **`scripts/seed.mjs`**:
   - Usage: `node --env-file=.env.local scripts/seed.mjs <folder> <talk_id> <room>`.
   - Posts every image in the folder to `${process.env.SEED_URL ?? "http://localhost:3000"}/api/snap`.
   - Fields: `device_id=seed`, `shared=true`, the `talk_id`, and `taken_at` spaced one minute apart. Send the same file as both `image` and `thumb`.
   - Skip files over 2 MB with a warning. Print progress.

## Done when
- `curl -F image=@slide.jpg -F thumb=@slide.jpg -F room=demo -F device_id=t1 -F shared=true localhost:3001/api/snap` returns `ok: true` with `text`, `alt_text`, `talk` and `cluster_id`.
- Posting the same photo twice gives the same `cluster_id` and `cluster_size: 2`.
- `/api/feed?room=demo&device_id=t1` returns one card with `snaps: 2`.
- `/api/slides/<id>/image?size=thumb` shows the image in a browser.
- A photo of your desk returns `not_a_slide`, and nothing is stored.
- A snap takes under 7 seconds end to end.
