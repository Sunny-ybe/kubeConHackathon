// Server-only hybrid retrieval shared by /api/search and /api/ask (SPEC §6.5).
import type { SearchHit } from "./types";
import { SLIDES_INDEX } from "./config";
import { es } from "./server/es";
import { HEAVY_FIELDS, toSlide } from "./server/slides";
import { span } from "./server/trace";

export type HybridOpts = {
  q: string;
  deviceId: string;
  room?: string;
  talkId?: string;
  mine?: boolean;
  size?: number;
};

/** Keyword (BM25) + semantic retrievers fused with RRF. Only slides this device may see. */
export async function hybridSlides({ q, deviceId, room, talkId, mine, size = 20 }: HybridOpts): Promise<SearchHit[]> {
  const filter = [
    { term: { is_slide: true } },
    { bool: { should: [{ term: { shared: true } }, { term: { device_id: deviceId } }], minimum_should_match: 1 } },
    ...(room ? [{ term: { room } }] : []),
    ...(talkId ? [{ term: { talk_id: talkId } }] : []),
    ...(mine ? [{ term: { device_id: deviceId } }] : []),
  ];

  // Highlight with stopwords dropped, so a paraphrase doesn't bold every "to" and "a".
  const hlQuery = { multi_match: { query: q, fields: ["text", "alt_text"], analyzer: "stop" } };

  const res = await span(
    "search.hybrid",
    () =>
      es().search({
        index: SLIDES_INDEX,
        size,
        _source_excludes: HEAVY_FIELDS,
        retriever: {
          rrf: {
            // RRF's window defaults to 10 and must be >= size.
            rank_window_size: Math.max(size, 50),
            retrievers: [
              {
                standard: {
                  query: {
                    bool: { must: [{ multi_match: { query: q, fields: ["title^2", "text", "alt_text"] } }], filter },
                  },
                },
              },
              { standard: { query: { bool: { must: [{ semantic: { field: "semantic", query: q } }], filter } } } },
            ],
          },
        },
        highlight: {
          fields: { text: { highlight_query: hlQuery }, alt_text: { highlight_query: hlQuery }, semantic: { number_of_fragments: 1 } },
        },
      }),
    { q, size },
  );

  return res.hits.hits.map((h) => {
    const hl = h.highlight ?? {};
    const slide = toSlide(h._id!, h._source, { deviceId });
    // A semantic chunk that is just the title adds nothing under the title; the UI falls back to text.
    const semantic = (hl.semantic ?? []).filter((f) => f.trim() !== slide.title.trim());
    return { slide, highlights: [...(hl.text ?? []), ...(hl.alt_text ?? []), ...semantic] };
  });
}
