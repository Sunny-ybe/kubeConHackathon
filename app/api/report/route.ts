import { NextResponse, type NextRequest } from "next/server";
import type { Citation, ReportResponse, Slide } from "@/lib/types";
import { SLIDES_INDEX, formatTime } from "@/lib/config";
import { es } from "@/lib/server/es";
import { HEAVY_FIELDS, toSlide } from "@/lib/server/slides";
import { span } from "@/lib/server/trace";
import { extractCitations, reportLLM, slideBlock } from "@/lib/llm";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_SLIDES = 60;

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const deviceId = typeof body.device_id === "string" ? body.device_id : "";
  if (!deviceId) return NextResponse.json({ error: "Missing device_id." }, { status: 400 });

  try {
    // 1. Mine: everything this device snapped, in the order it happened.
    const mineRes = await span("report.mine", () =>
      es().search({
        index: SLIDES_INDEX,
        size: 200,
        _source_excludes: HEAVY_FIELDS,
        query: { bool: { filter: [{ term: { device_id: deviceId } }, { term: { is_slide: true } }] } },
        sort: [{ taken_at: "asc" }],
      }),
    );
    const mineAll = mineRes.hits.hits.map((h) => toSlide(h._id!, h._source, { deviceId }));
    if (!mineAll.length) {
      return NextResponse.json<ReportResponse>({
        markdown: "Snap a few slides first, then come back for your trip report.",
        citations: [],
      });
    }

    // One slide per cluster: two snaps of the same slide add nothing to the report.
    const clusters = new Set<string>();
    const mine = mineAll.filter((s) => !clusters.has(s.cluster_id) && clusters.add(s.cluster_id));
    const talkIds = [...new Set(mine.map((s) => s.talk_id))];

    // 2. Crowd: shared slides from the same talks that this device didn't snap.
    const crowdRes = await span("report.crowd", () =>
      es().search({
        index: SLIDES_INDEX,
        size: 100,
        _source_excludes: HEAVY_FIELDS,
        query: {
          bool: {
            filter: [{ terms: { talk_id: talkIds } }, { term: { is_slide: true } }, { term: { shared: true } }],
            must_not: [{ term: { device_id: deviceId } }],
          },
        },
        collapse: { field: "cluster_id" },
        sort: [{ taken_at: "asc" }],
      }),
    );
    const crowd = crowdRes.hits.hits
      .map((h) => toSlide(h._id!, h._source, { deviceId }))
      .filter((s) => !clusters.has(s.cluster_id));

    // 3. Cap at 60 keeping mine first, then group by talk (in the order I attended) and label.
    const picked = [...mine, ...crowd].slice(0, MAX_SLIDES);
    const byTalk = new Map<string, Slide[]>(talkIds.map((id) => [id, []]));
    for (const s of picked) byTalk.get(s.talk_id)?.push(s);

    const labeled: Citation[] = [];
    const sections: string[] = [];
    for (const slides of byTalk.values()) {
      if (!slides.length) continue;
      slides.sort((a, b) => a.taken_at.localeCompare(b.taken_at));
      const blocks = slides.map((slide) => {
        const label = `S${labeled.length + 1}`;
        labeled.push({ label, slide });
        return slideBlock(label, slide, false);
      });
      const first = slides[0];
      sections.push(
        `## Talk: ${first.talk_title || "Open session"} (room ${first.room}, from ${formatTime(first.taken_at)})\n\n${blocks.join("\n\n")}`,
      );
    }

    // 4. Write it.
    const raw = await reportLLM(sections.join("\n\n"), labeled.length);
    const { text, citations } = extractCitations(raw, labeled);
    return NextResponse.json<ReportResponse>({ markdown: text, citations });
  } catch (err) {
    console.error("report failed", err);
    return NextResponse.json({ error: "Couldn't write the report right now. Try again." }, { status: 500 });
  }
}
