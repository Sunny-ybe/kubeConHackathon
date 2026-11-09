import type { MediaResponse } from "@/lib/types";
import { MAX_DOWNLOAD_ITEMS, SLIDES_INDEX } from "@/lib/config";
import { es } from "@/lib/server/es";
import { HEAVY_FIELDS, PUBLIC_SLIDE, toSlide } from "@/lib/server/slides";

export const dynamic = "force-dynamic";

/**
 * Everything downloadable in a room, newest first (SPEC §15). Hosted or scheduled rooms.
 * scope=mine: this device's uploads, pending included. scope=all: visible to others plus mine.
 */
export async function GET(req: Request, { params }: { params: Promise<{ room: string }> }) {
  const { room } = await params;
  const p = new URL(req.url).searchParams;
  const deviceId = p.get("device_id")?.trim() ?? "";
  const scope: MediaResponse["scope"] = p.get("scope") === "mine" ? "mine" : "all";
  if (scope === "mine" && !deviceId) return Response.json({ room, scope, items: [] } satisfies MediaResponse);

  const mine = { term: { device_id: deviceId } };
  const visible =
    scope === "mine"
      ? mine
      : { bool: { should: deviceId ? [PUBLIC_SLIDE, mine] : [PUBLIC_SLIDE], minimum_should_match: 1 } };
  try {
    const res = await es().search({
      index: SLIDES_INDEX,
      size: MAX_DOWNLOAD_ITEMS,
      _source_excludes: HEAVY_FIELDS,
      query: { bool: { filter: [{ term: { room } }, { term: { is_slide: true } }, visible] } },
      sort: [{ taken_at: "desc" }],
    });
    const body: MediaResponse = {
      room,
      scope,
      items: res.hits.hits.map((h) => toSlide(h._id!, h._source, { deviceId: deviceId || undefined })),
    };
    return Response.json(body);
  } catch (err) {
    console.error("media failed", err);
    return Response.json({ error: "Could not load photos for download" }, { status: 500 });
  }
}
