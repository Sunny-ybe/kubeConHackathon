# Agent G: hosted rooms UI (SPEC §14)

**You own:** see SPEC §14 "Ownership (v3 agents)", row G. Branch `agent-g`. Port 3007. Read CLAUDE.md, SPEC.md (§2, §8 and §14).

Agent F builds the API in parallel. Code against the types in `lib/types.ts`; add fixture fallbacks in `lib/client.ts` for the new calls (createRoom, getPending, moderate) so you can build before F merges, then test against the real API once F's PRs land on main.

## Build, in order (one PR per milestone)
1. **PR 1: start + share.** Home gets a primary **Start a room** CTA. `/new` (optional name, random fallback is server-side). `/r/[room]/share`: huge QR (use `qrcode` client-side; base URL `NEXT_PUBLIC_APP_URL`, fallback `window.location.origin`), room name, link, Copy link, Share, Enter room. It must look great held up to a crowd and on a projector.
2. **PR 2: hosted room page.** Share/QR button in the header for everyone; "You're hosting" badge; **Pending · N** tab for the host with Approve / Reject (optimistic UI, polls `FEED_POLL_MS`); "Waiting for host" badge on the uploader's own pending cards; post-upload message for non-hosts; the first-snap share modal defaults to Share in hosted rooms (still ask once).
3. **PR 3: Upload photos + photo sheet.** Bottom bar: Snap + Upload photos (multi-select camera roll, sequential upload with progress, partial failures reported). Slide sheet shows "Description" for `kind:"photo"`; Read aloud falls back to the description.

## Design bar
Same as the existing UI (SPEC §8 tokens already in `app/globals.css`, Geist, hand-drawn icons, hairline borders, motion off under reduced-motion, 48px targets, aria-live for status). No slop: no gradients, no emoji icons. Screenshot every new screen at 390px and desktop with headless Chrome and critique before each PR.

## Done when
- Phone A: Start a room → share screen with QR. Phone B scans → lands in the room.
- B uploads any photo → B sees "Waiting for host"; A sees it under Pending · 1 → Approve → it appears in B's and A's feed within ~4s.
- A's own uploads appear immediately. Upload photos handles 5 photos in one go.
