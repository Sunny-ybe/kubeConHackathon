# Agent F: hosted rooms backend (SPEC §14)

**You own:** see SPEC §14 "Ownership (v3 agents)", row F. Branch `agent-f`. Port 3006. Read CLAUDE.md, SPEC.md (§6 and §14).

## Build, in order (one PR per milestone)
1. **PR 1: create + room info.**
   - `POST /api/rooms`: validate `device_id`; name optional (trim, max 40 chars); blank → random two-word name (small built-in adjective + noun lists, title case). Slug per §14; retry on collision (`es.exists`). Index the room doc and the talk doc (`refresh: "wait_for"` on both, so the creator lands in a working room). Return `CreateRoomResponse`.
   - `GET /api/room/[room]?device_id=`: add `hosted` (room doc exists), `host` (owner matches), `pending_count` (host only: `es.count` of pending in that room). `room_name` from the room doc for hosted rooms.
2. **PR 2: snap + moderation.**
   - `/api/snap`: look up the room doc once. Hosted → photo prompt (§14), never `not_a_slide`; set `kind`, `status` (`approved` if host else `pending`), `is_slide: true`; photos skip clustering. Return `pending`. Scheduled rooms unchanged.
   - `GET /api/rooms/[room]/pending` and `POST /api/rooms/[room]/moderate` per §14 (403 JSON unless host; approve → `es.update` status `approved` with `refresh: "wait_for"`; reject → `es.delete`).
3. **PR 3: visibility rule everywhere.** Apply `PUBLIC_SLIDE` (or the equivalent `must_not status:pending`) in feed (others' docs; the uploader still sees their own pending ones), search/Ask (`lib/retrieval.ts`), report crowd slides, `/api/live`, and `/talk/[id]`. Verify with curl: a pending upload is invisible to another device and on `/api/live` until approved.

## Done when
- curl: create a room as device H → `host:true`; as device U, `host:false`.
- U uploads a non-slide photo → `ok:true, pending:true`; it is in U's feed (status pending) but not in H's feed, not in `/api/live`, not in search for a third device.
- H approves → it appears in everyone's feed and `/api/live`. H's own uploads appear immediately.
- Reject deletes it. Non-host gets 403 on pending/moderate.
- Scheduled room `demo` still rejects non-slides.
- `owner_device_id` and `device_id` never appear in any response.
- Clean up every test doc/room you create.
