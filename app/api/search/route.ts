import { NextResponse, type NextRequest } from "next/server";
import type { SearchResponse } from "@/lib/types";
import { hybridSlides } from "@/lib/retrieval";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const p = req.nextUrl.searchParams;
  const q = (p.get("q") ?? "").trim();
  if (!q) return NextResponse.json<SearchResponse>({ query: "", hits: [] });
  try {
    const hits = await hybridSlides({
      q,
      deviceId: p.get("device_id") ?? "",
      room: p.get("room") || undefined,
      mine: p.get("mine") === "1",
      size: 40,
    });
    // One result per cluster (like the feed): ten snaps of one slide are one slide.
    const seen = new Set<string>();
    const unique = hits.filter((h) => !seen.has(h.slide.cluster_id) && seen.add(h.slide.cluster_id)).slice(0, 20);
    return NextResponse.json<SearchResponse>({ query: q, hits: unique });
  } catch (err) {
    console.error("search failed", err);
    return NextResponse.json({ error: "Search is unavailable right now." }, { status: 500 });
  }
}
