# Agent I: media UI (SPEC §15)

**You own:** SPEC §15 "Ownership (v4 agents)", row I. Branch `agent-i`. Port 3009. Read CLAUDE.md, SPEC.md (§8, §14, §15).

## Build, in order (one PR per milestone)
1. **PR 1: downloads (A).** `lib/zip.ts` (stored zip + CRC32, streaming-friendly, no deps). Download sheet in the room (My photos / All photos with counts from `/api/rooms/[room]/media`), **Download all my photos** on `/me`, Save-to-Photos via `navigator.share({ files })` when supported (≤10 items), progress + error states.
2. **PR 2: search to download (C).** `/search?room=` scope chip, room header search icon links to it, Select mode + Select all + **Download (N)** reusing the download flow; video results show a play badge.
3. **PR 3: video upload.** In hosted rooms, the Snap/Upload pickers accept `video/*` too (keep images working). Client checks `MAX_VIDEO_BYTES` / `MAX_VIDEO_SECONDS` before uploading; `upload()` from `@vercel/blob/client` with `onUploadProgress` → progress bar ("Uploading video… 42%"); poster frame capture (seek ~1s, canvas → 1280 JPEG + 400 thumb; handle iOS needing `muted playsInline` and `loadeddata`); then `snap()` with `video_url` + `duration_s`. Cards: poster + play badge + duration. Sheet: inline `<video controls playsInline>`. Batch Upload photos may mix photos and videos.

## Design bar
Same as the existing UI (tokens in globals.css, Geist, hand-drawn icons, hairline borders, motion off under reduced-motion, 48px targets, aria-live for progress). No slop. Use the true phone screenshot tool (headless Chrome can't go below 500px wide):
`node /private/tmp/claude-501/-Users-sashikantkumar-Downloads-backrow-kit/d687df4f-4466-410e-890e-4a81a5b6351b/scratchpad/phone-shot.mjs <url> <out.png> 390 844 '{"backrow_device_id":"dev-host"}'`
Screenshot every new state and critique before each PR.

## Done when
- Download sheet zips 10+ photos with progress; Save to Photos path works where supported; `/me` download works.
- Search "green field" in a room → select → Download (N).
- A ≤60s phone video uploads with a progress bar, shows as a playable card for the host immediately and for guests after approval; an over-limit video gets a friendly message and never uploads.
