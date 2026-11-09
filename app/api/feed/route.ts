import type { FeedResponse } from "@/lib/types";
import { SLIDES_INDEX } from "@/lib/config";
import { es } from "@/lib/server/es";
import { HEAVY_FIELDS, PUBLIC_SLIDE, toSlide } from "@/lib/server/slides";
import { talkAt } from "../room/attribution";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const room = url.searchParams.get("room")?.trim() ?? "";
  const deviceId = url.searchParams.get("device_id")?.trim() ?? "";
  if (!room) return Response.json({ error: "Missing room" }, { status: 400 });

  try {
    // Current talk only; with no talk running, show the room's latest slides.
    const talk = await talkAt(room, new Date().toISOString());
    const res = await es().search({
      index: SLIDES_INDEX,
      size: 30,
      _source_excludes: HEAVY_FIELDS,
      query: {
        bool: {
          filter: [
            { term: { room } },
            { term: { is_slide: true } },
            ...(talk ? [{ term: { talk_id: talk.talk_id } }] : []),
          ],
          // Other people's snaps only if public (shared, not waiting for the host); your own always.
          should: [PUBLIC_SLIDE, ...(deviceId ? [{ term: { device_id: deviceId } }] : [])],
          minimum_should_match: 1,
        },
      },
      collapse: { field: "cluster_id" },
      sort: [{ taken_at: "desc" }],
      aggs: { clusters: { terms: { field: "cluster_id", size: 200 } } },
    });

    const buckets =
      (res.aggregations?.clusters as { buckets?: { key: string; doc_count: number }[] } | undefined)?.buckets ?? [];
    const counts = new Map(buckets.map((b) => [b.key, b.doc_count]));
    const slides = res.hits.hits.map((hit) => {
      const src = hit._source as { cluster_id?: string };
      return toSlide(hit._id!, src, { snaps: counts.get(src.cluster_id ?? "") ?? 1, deviceId: deviceId || undefined });
    });

    const body: FeedResponse = { room, talk, slides };
    return Response.json(body);
  } catch (err) {
    console.error("feed failed", err);
    return Response.json({ error: "Could not load the feed" }, { status: 500 });
  }
}
