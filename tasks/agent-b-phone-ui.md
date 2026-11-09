# Agent B: phone UI

**You own:**
- `app/page.tsx`, `app/layout.tsx`, `app/globals.css`
- `app/r/[room]/page.tsx`, `app/r/[room]/easy/page.tsx`
- `app/qr/page.tsx`
- `components/**`, except `components/ask/**`, `components/report/**` and `components/live/**`
- `lib/client.ts`

Run the dev server on **port 3002**. Read CLAUDE.md and SPEC.md (§2 and §8 especially) first.

Until Agent A's routes are merged, set `NEXT_PUBLIC_USE_FIXTURES=1` in your `.env.local`, and have `lib/client.ts` return data from `lib/fixtures.ts`.

## Build

1. **`lib/client.ts`**:
   - `resizeImage(file, maxPx): Promise<Blob>`: `createImageBitmap`, draw to canvas, `toBlob("image/jpeg", 0.8)`.
   - `snap(file, room)`: builds the 1280px image and the 400px thumb, then posts FormData with `deviceId()` and the share preference from `lib/device.ts`.
   - `getRoom(room)`, `getFeed(room)`, `translate(text, lang)`.
   - Every function returns fixtures when `NEXT_PUBLIC_USE_FIXTURES=1`.

2. **`app/layout.tsx` and `globals.css`**: the dark theme from SPEC §8, a phone viewport, title "Backrow".

3. **`/`**: landing page per SPEC §2. Rooms come from `data/schedule.json`.

4. **`/r/[room]`**:
   - Header with the current talk.
   - Fixed bottom **Snap a slide** button using `<input type="file" accept="image/*" capture="environment">`.
   - A loading card that rotates "Reading the slide…", "Finding the talk…", "Checking who else snapped it…".
   - On the first snap only, the share modal (`getSharePref` / `setSharePref`).
   - Feed polling every `FEED_POLL_MS`.
   - Tabs **Feed · Easy read · Ask**. The Ask tab renders `<AskPanel room={room} talkId={talk?.talk_id} />` from `components/ask/AskPanel`. Don't edit that file.

5. **Slide sheet** (bottom sheet):
   - Photo, title, text at 20–22px, and a "Diagram" box for the alt text.
   - **Read aloud** via `speechSynthesis`, triggered only by a tap, toggling to Stop.
   - **Translate** using `LANGS`, with "Show original". Set `utterance.lang` to the language's `speech` value.
   - Talk tag, and "Snapped by N people".

6. **`/r/[room]/easy`**:
   - Black background, white 28–36px text, max 38ch wide.
   - Shows the newest cluster and advances when a new `cluster_id` appears at the top of the feed.
   - Big **Read aloud** button plus an **Auto-read** toggle.

7. **`/qr`**:
   - A grid of QR codes made with `qrcode`'s `QRCode.toDataURL(url, { width: 512, margin: 1 })`, pointing to `NEXT_PUBLIC_APP_URL/r/<room>`.
   - One huge demo QR.
   - White background on this page so it prints well.

## Done when
On a real phone (run `npm run dev -- -H 0.0.0.0 -p 3002`, then open `http://<laptop-LAN-IP>:3002/r/demo`):
- Snap opens the camera, the loading card shows, and the slide sheet opens with big text.
- Read aloud speaks, and Translate swaps the text and back.
- Easy read shows big text and advances when the feed changes.
- Everything looks good at 390px wide. There are no blank screens, and broken images fall back to text tiles.
