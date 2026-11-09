import type { PendingResponse } from "@/lib/types";
import { SLIDES_INDEX } from "@/lib/config";
import { es } from "@/lib/server/es";
import { HEAVY_FIELDS, toSlide } from "@/lib/server/slides";
import { hostedRoom, isHost } from "../../../room/hosted";

export const dynamic = "force-dynamic";

/** Uploads waiting for the host's approval, newest first (SPEC §14). Host only. */
export async function GET(req: Request, { params }: { params: Promise<{ room: string }> }) {
  const { room } = await params;
  const deviceId = new URL(req.url).searchParams.get("device_id")?.trim() ?? "";
  try {
    if (!isHost(await hostedRoom(room), deviceId)) {
      return Response.json({ error: "Only the host can see pending photos" }, { status: 403 });
    }
    const res = await es().search({
      index: SLIDES_INDEX,
      size: 100,
      _source_excludes: HEAVY_FIELDS,
      query: { bool: { filter: [{ term: { room } }, { term: { status: "pending" } }] } },
      sort: [{ taken_at: "desc" }],
    });
    const body: PendingResponse = {
      room,
      slides: res.hits.hits.map((h) => toSlide(h._id!, h._source, { deviceId })),
    };
    return Response.json(body);
  } catch (err) {
    console.error("pending failed", err);
    return Response.json({ error: "Could not load pending photos" }, { status: 500 });
  }
}
