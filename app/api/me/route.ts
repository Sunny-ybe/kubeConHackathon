import { NextResponse, type NextRequest } from "next/server";
import type { MeResponse } from "@/lib/types";
import { SLIDES_INDEX } from "@/lib/config";
import { es } from "@/lib/server/es";
import { HEAVY_FIELDS, toSlide } from "@/lib/server/slides";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const deviceId = req.nextUrl.searchParams.get("device_id") ?? "";
  if (!deviceId) return NextResponse.json<MeResponse>({ slides: [] });
  try {
    const res = await es().search({
      index: SLIDES_INDEX,
      size: 200,
      _source_excludes: HEAVY_FIELDS,
      query: { bool: { filter: [{ term: { device_id: deviceId } }, { term: { is_slide: true } }] } },
      sort: [{ taken_at: "desc" }],
    });
    const slides = res.hits.hits.map((h) => toSlide(h._id!, h._source, { deviceId }));
    return NextResponse.json<MeResponse>({ slides });
  } catch (err) {
    console.error("me failed", err);
    return NextResponse.json({ error: "Couldn't load your slides." }, { status: 500 });
  }
}
