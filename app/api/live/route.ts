import { NextResponse } from "next/server";
import { es } from "@/lib/server/es";
import { HEAVY_FIELDS, toSlide } from "@/lib/server/slides";
import { span } from "@/lib/server/trace";
import { HEAT_WINDOW_MIN, SLIDES_INDEX } from "@/lib/config";
import type { LiveResponse, LiveRoom } from "@/lib/types";
import schedule from "@/data/schedule.json";

export const dynamic = "force-dynamic";

/* eslint-disable @typescript-eslint/no-explicit-any */
type Bucket = { key: string; doc_count: number; rep: { hits: { hits: any[] } } };

const repHit = { top_hits: { size: 1, sort: [{ taken_at: "desc" }], _source: { excludes: HEAVY_FIELDS } } };

/** The talk running in a room right now, per data/schedule.json. */
function currentTalkTitle(room: string, now: number): string {
  const talk = schedule.talks.find(
    (t) => t.room === room && Date.parse(t.start) <= now && Date.parse(t.end) >= now,
  );
  return talk?.title ?? "";
}

export async function GET(req: Request) {
  const raw = Number(new URL(req.url).searchParams.get("window"));
  const window = Number.isFinite(raw) && raw >= 1 ? Math.min(Math.floor(raw), 240) : HEAT_WINDOW_MIN;

  try {
    // One query (SPEC §6.8): total, leaderboard, room heat and latest snaps.
    const res: any = await span(
      "live.query",
      () =>
        es().search({
          index: SLIDES_INDEX,
          size: 0,
          track_total_hits: true,
          query: { bool: { filter: [{ term: { shared: true } }, { term: { is_slide: true } }] } },
          aggs: {
            top_slides: { terms: { field: "cluster_id", size: 6 }, aggs: { rep: repHit } },
            recent: {
              filter: { range: { taken_at: { gte: `now-${window}m` } } },
              aggs: { rooms: { terms: { field: "room", size: 10 }, aggs: { rep: repHit } } },
            },
            latest: { top_hits: { size: 8, sort: [{ taken_at: "desc" }], _source: { excludes: HEAVY_FIELDS } } },
          } as any,
        }),
      { window },
    );

    const aggs = res.aggregations ?? {};
    const total = res.hits?.total;
    const total_snaps = typeof total === "number" ? total : (total?.value ?? 0);

    const top_slides: LiveResponse["top_slides"] = (aggs.top_slides?.buckets ?? []).flatMap((b: Bucket) => {
      const hit = b.rep.hits.hits[0];
      return hit ? [{ cluster_id: b.key, count: b.doc_count, slide: toSlide(hit._id, hit._source, { snaps: b.doc_count }) }] : [];
    });

    // Snaps per cluster we already know, so room cards can show ×N too.
    const clusterCount = new Map(top_slides.map((t) => [t.cluster_id, t.count]));

    const now = Date.now();
    const heat = new Map<string, Bucket>((aggs.recent?.rooms?.buckets ?? []).map((b: Bucket) => [b.key, b]));
    const names = new Map(schedule.rooms.map((r) => [r.room, r.name]));
    const roomIds = [...new Set([...schedule.rooms.map((r) => r.room), ...heat.keys()])];

    const rooms: LiveRoom[] = roomIds
      .map((room) => {
        const b = heat.get(room);
        const hit = b?.rep.hits.hits[0];
        const top_slide = hit ? toSlide(hit._id, hit._source, { snaps: clusterCount.get(hit._source?.cluster_id) }) : null;
        return {
          room,
          room_name: names.get(room) ?? room,
          talk_title: currentTalkTitle(room, now) || top_slide?.talk_title || "",
          snaps: b?.doc_count ?? 0,
          top_slide,
        };
      })
      .sort((a, b) => b.snaps - a.snaps);

    const latest = (aggs.latest?.hits?.hits ?? []).map((h: any) =>
      toSlide(h._id, h._source, { snaps: clusterCount.get(h._source?.cluster_id) }),
    );

    const body: LiveResponse = { total_snaps, top_slides, rooms, latest };
    return NextResponse.json(body, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    console.error("GET /api/live failed", err);
    return NextResponse.json({ error: "live_unavailable" }, { status: 502 });
  }
}
