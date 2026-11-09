# Agent H: media backend (SPEC §15)

**You own:** SPEC §15 "Ownership (v4 agents)", row H. Branch `agent-h`. Port 3008. Read CLAUDE.md, SPEC.md (§14 and §15).

## Build, in order (one PR per milestone)
1. **PR 1: downloads API.** `GET /api/rooms/[room]/media?device_id=&scope=mine|all` → `MediaResponse` per §15 (works for hosted and scheduled rooms; `HEAVY_FIELDS` excluded; `toSlide` with `deviceId`). Also accept `?room=` in `/api/search` if it isn't already honoured end to end, and check that search hits carry the media fields.
2. **PR 2: video.** `POST /api/upload` with `handleUpload` (§15). `/api/snap` accepts `video_url` + `duration_s` (validate the Blob host and that the room is hosted; clamp duration), runs vision on the poster frame with the video prefix, stores `media/video_url/duration_s`. Moderate→reject deletes the blob with `del()` (ignore errors). Use `@vercel/blob` (installed) and `@vercel/blob/client` — check their bundled README/types in node_modules rather than guessing APIs.

## Done when
- curl: media scope=mine returns a device's uploads incl. pending; scope=all returns only approved/public + mine; no device_id in responses.
- `/api/upload` returns a client token for a hosted room and 400/403 for a scheduled room or a bad payload (test by POSTing the `blob.generate-client-token` event body the client sends; read the package source for its shape).
- With `BLOB_READ_WRITE_TOKEN` present: a real end-to-end upload of a small mp4 (make one with `ffmpeg` if installed, or `avconvert`/`sips` alternatives on macOS, or a tiny file found on disk) → snap with `video_url` → feed item with `media:"video"`; reject deletes the blob. If the token isn't available yet, say so clearly in your report and test everything else.
- Clean up every test doc, room and blob.
