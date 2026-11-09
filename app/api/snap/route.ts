import { randomUUID } from "node:crypto";
import type { SnapResponse, Talk } from "@/lib/types";
import { DEDUPE_JACCARD, DEDUPE_WINDOW_MIN, MAX_UPLOAD_BYTES, SLIDES_INDEX } from "@/lib/config";
import { es } from "@/lib/server/es";
import { fingerprint, jaccard, toSlide } from "@/lib/server/slides";
import { span } from "@/lib/server/trace";
import { readSlide } from "@/lib/vision";
import { talkAt, talkById } from "../room/attribution";
import { hostedRoom, isHost } from "../room/hosted";

export const runtime = "nodejs";
export const maxDuration = 60;

function fail(reason: "not_a_slide" | "too_large" | "error", message: string, status: number) {
  return Response.json({ ok: false, reason, message } satisfies SnapResponse, { status });
}

/** Reuse a nearby duplicate's cluster_id (SPEC §6.3), else a deterministic fingerprint. */
async function clusterFor(talkId: string, takenAt: string, content: string, slideId: string): Promise<string> {
  const t = new Date(takenAt).getTime();
  const win = DEDUPE_WINDOW_MIN * 60_000;
  const res = await es().search({
    index: SLIDES_INDEX,
    size: 50,
    _source_includes: ["title", "text", "cluster_id"],
    query: {
      bool: {
        filter: [
          { term: { talk_id: talkId } },
          { term: { is_slide: true } },
          { range: { taken_at: { gte: new Date(t - win).toISOString(), lte: new Date(t + win).toISOString() } } },
        ],
      },
    },
  });
  let best = { score: 0, cluster: "" };
  for (const hit of res.hits.hits) {
    const src = hit._source as { title?: string; text?: string; cluster_id?: string } | undefined;
    if (!src?.cluster_id) continue;
    const score = jaccard(content, `${src.title ?? ""} ${src.text ?? ""}`);
    if (score > best.score) best = { score, cluster: src.cluster_id };
  }
  if (best.score >= DEDUPE_JACCARD) return best.cluster;
  return fingerprint(talkId, content) ?? slideId;
}

export async function POST(req: Request) {
  try {
    const form = await req.formData();
    const image = form.get("image");
    const thumb = form.get("thumb");
    const deviceId = String(form.get("device_id") ?? "");
    let shared = form.get("shared") === "true";
    const talkOverride = String(form.get("talk_id") ?? "").trim();
    const takenOverride = String(form.get("taken_at") ?? "").trim();
    let room = String(form.get("room") ?? "").trim();

    if (!(image instanceof File) || image.size === 0) return fail("error", "Missing image", 400);
    if (image.size > MAX_UPLOAD_BYTES) return fail("too_large", "That photo is too large. Try again.", 413);
    if (!room && !talkOverride) return fail("error", "Missing room", 400);

    const buf = Buffer.from(await image.arrayBuffer());
    const thumbBuf = thumb instanceof File && thumb.size > 0 ? Buffer.from(await thumb.arrayBuffer()) : buf;

    const takenAt =
      takenOverride && !Number.isNaN(Date.parse(takenOverride))
        ? new Date(takenOverride).toISOString()
        : new Date().toISOString();

    // Hosted rooms (SPEC §14) take any photo; the host's approval replaces the slide filter.
    const hosted = await hostedRoom(room);
    const host = isHost(hosted, deviceId);
    // Uploading to a hosted room means sharing with it (the host moderates).
    if (hosted) shared = true;

    // Attribution doesn't depend on vision, so run both at once to keep snaps fast.
    const [reading, talk] = await Promise.all([
      span("snap.vision", () => readSlide(buf, { photo: !!hosted }), { room }),
      span<Talk | null>("snap.attribute", () => (talkOverride ? talkById(talkOverride) : talkAt(room, takenAt)), {
        room,
      }),
    ]);
    if (!hosted && !reading.is_slide) return fail("not_a_slide", "That doesn't look like a slide. Try again?", 200);
    const isPhoto = !!hosted && !reading.is_slide;
    const pending = !!hosted && !host;

    if (!room && talk) room = talk.room;
    const talkId = talk?.talk_id ?? (talkOverride || `${room}-open`);
    const talkTitle = talk?.title ?? "Open session";

    const slideId = randomUUID();
    const content = `${reading.title} ${reading.text}`;
    // Photos skip duplicate grouping: every photo is its own cluster.
    const clusterId = isPhoto
      ? slideId
      : await span("snap.cluster", () => clusterFor(talkId, takenAt, content, slideId), { room, talk_id: talkId });

    const document = {
      slide_id: slideId,
      device_id: deviceId,
      shared,
      is_slide: true,
      room,
      talk_id: talkId,
      talk_title: talkTitle,
      taken_at: takenAt,
      title: reading.title,
      text: reading.text,
      alt_text: reading.alt_text,
      topics: reading.topics,
      cluster_id: clusterId,
      ...(hosted ? { status: pending ? "pending" : "approved", kind: isPhoto ? "photo" : "slide" } : {}),
      image: buf.toString("base64"),
      thumb: thumbBuf.toString("base64"),
    };

    const clusterSize = await span(
      "snap.index",
      async () => {
        // No refresh: keeps snaps fast. Count the cluster's existing docs alongside the write
        // (the count returns long before semantic_text inference finishes), then add 1 for this one.
        if (isPhoto) {
          await es().index({ index: SLIDES_INDEX, id: slideId, document });
          return 1;
        }
        const [{ count }] = await Promise.all([
          es().count({ index: SLIDES_INDEX, query: { term: { cluster_id: clusterId } } }),
          es().index({ index: SLIDES_INDEX, id: slideId, document }),
        ]);
        return count + 1;
      },
      { room, talk_id: talkId },
    );

    const body: SnapResponse = {
      ok: true,
      slide: toSlide(slideId, document, { deviceId, snaps: clusterSize }),
      talk,
      cluster_size: clusterSize,
      ...(hosted ? { pending } : {}),
    };
    return Response.json(body);
  } catch (err) {
    console.error("snap failed", err);
    return fail("error", "Something went wrong reading that photo. Try again.", 500);
  }
}
