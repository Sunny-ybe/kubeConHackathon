import { NextResponse, type NextRequest } from "next/server";
import type { AskResponse, Citation } from "@/lib/types";
import { hybridSlides } from "@/lib/retrieval";
import { askLLM, extractCitations, NO_EVIDENCE_ANSWER } from "@/lib/llm";

export const runtime = "nodejs";
export const maxDuration = 60;

const NONE: AskResponse = { answer: NO_EVIDENCE_ANSWER, citations: [] };

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const q = typeof body.q === "string" ? body.q.trim().slice(0, 500) : "";
  if (!q) return NextResponse.json<AskResponse>(NONE);
  try {
    // Fetch extra and keep one slide per cluster, so duplicates don't crowd out the top 8.
    const hits = await hybridSlides({
      q,
      deviceId: typeof body.device_id === "string" ? body.device_id : "",
      room: body.talk_id ? undefined : body.room || undefined,
      talkId: body.talk_id || undefined,
      size: 16,
    });
    const seen = new Set<string>();
    const labeled: Citation[] = [];
    for (const { slide } of hits) {
      if (seen.has(slide.cluster_id) || labeled.length >= 8) continue;
      seen.add(slide.cluster_id);
      labeled.push({ label: `S${labeled.length + 1}`, slide });
    }
    if (!labeled.length) return NextResponse.json<AskResponse>(NONE);

    const raw = await askLLM(q, labeled);
    if (!raw || raw.includes("NO_EVIDENCE")) return NextResponse.json<AskResponse>(NONE);
    const { text, citations } = extractCitations(raw, labeled);
    return NextResponse.json<AskResponse>({ answer: text, citations });
  } catch (err) {
    console.error("ask failed", err);
    return NextResponse.json({ error: "Couldn't answer right now. Try again." }, { status: 500 });
  }
}
