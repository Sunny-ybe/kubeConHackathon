"use server";
// Opt-in people cards (backrow-people). Public endpoints: every input is validated here.
import { es } from "@/lib/server/es";
import type { Card, CardStats } from "./types";

const PEOPLE = "backrow-people";
const SEMANTIC_FLOOR = 0.6;
const LIMITS = { name: 80, company: 80, role: 80, about: 500, link: 300, links: 5, q: 200 };

function str(v: unknown, max: number): string {
  return typeof v === "string" ? v.trim().slice(0, max) : "";
}

function cleanLinks(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  const out: string[] = [];
  for (const raw of v) {
    const s = str(raw, LIMITS.link);
    if (!s.startsWith("https://")) continue;
    try {
      const u = new URL(s);
      if (u.protocol === "https:" && u.hostname.includes(".") && !out.includes(u.href)) out.push(u.href);
    } catch {
      // not a URL; drop it
    }
    if (out.length === LIMITS.links) break;
  }
  return out;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- ES _source
function toCard(id: string, src: any, highlight?: Record<string, string[]>): Card {
  return {
    id,
    name: src.name ?? "",
    company: src.company ?? "",
    role: src.role ?? "",
    about: src.about ?? "",
    links: Array.isArray(src.links) ? src.links : [],
    created_at: src.created_at ?? "",
    ...(highlight && { highlights: [...(highlight.about ?? []), ...(highlight.semantic ?? [])].slice(0, 2) }),
  };
}

export async function createCard(input: {
  name: string;
  company: string;
  role: string;
  about: string;
  links: string[];
}): Promise<{ id: string } | { error: string }> {
  const name = str(input?.name, LIMITS.name);
  if (!name) return { error: "Add your name." };
  if (typeof input?.about === "string" && input.about.trim().length > LIMITS.about) {
    return { error: `Keep About under ${LIMITS.about} characters.` };
  }
  const id = crypto.randomUUID();
  const card = {
    card_id: id,
    name,
    company: str(input?.company, LIMITS.company),
    role: str(input?.role, LIMITS.role),
    about: str(input?.about, LIMITS.about),
    links: cleanLinks(input?.links),
    created_at: new Date().toISOString(),
  };
  await es().index({ index: PEOPLE, id, document: card, refresh: "wait_for" });
  return { id };
}

export async function getCard(id: string): Promise<Card | null> {
  if (typeof id !== "string" || !/^[0-9a-f-]{36}$/i.test(id)) return null;
  try {
    const res = await es().get({ index: PEOPLE, id, _source_excludes: ["semantic"] });
    return res.found ? toCard(res._id, res._source) : null;
  } catch {
    return null;
  }
}

// Question filler ("Who here works at…", "Who can help with…") that would make BM25 match everyone.
const FILLER = new Set(
  "a an and any anyone are at can could do does for from has have help here i in is it knows me my of on or people person someone somebody that the there to who whom wants with work works working".split(" "),
);

function keywords(q: string): string {
  return q
    .split(/[^\p{L}\p{N}_.+#-]+/u)
    .filter((w) => w && !FILLER.has(w.toLowerCase()))
    .join(" ");
}

export async function searchCards(q: string, company?: string): Promise<Card[]> {
  const query = str(q, LIMITS.q);
  const co = str(company, LIMITS.company).toLowerCase();
  const filter = co ? [{ term: { "company.keyword": co } }] : [];
  const source = { excludes: ["semantic"] };

  if (!query) {
    const res = await es().search({
      index: PEOPLE,
      size: 50,
      _source: source,
      query: { bool: { filter } },
      sort: [{ created_at: "desc" }],
    });
    return res.hits.hits.map((h) => toCard(h._id!, h._source));
  }

  const words = keywords(query);
  // Semantic always scores every card; the floor keeps unrelated people out of the results.
  const semantic = {
    standard: { query: { bool: { must: { semantic: { field: "semantic", query } }, filter } }, min_score: SEMANTIC_FLOOR },
  };
  const lexical = {
    standard: {
      query: { bool: { must: { multi_match: { query: words, fields: ["name", "company^2", "role", "about"] } }, filter } },
    },
  };
  const run = () =>
    es().search({
      index: PEOPLE,
      size: 30,
      _source: source,
      retriever: words ? { rrf: { rank_window_size: 50, retrievers: [lexical, semantic] } } : semantic,
      highlight: { fields: { about: {}, semantic: { number_of_fragments: 1 } } },
    });
  // First semantic query can time out while inference warms up; retry once.
  const res = await run().catch(run);
  return res.hits.hits.map((h) => toCard(h._id!, h._source, h.highlight));
}

export async function cardStats(): Promise<CardStats> {
  const res = await es().search({
    index: PEOPLE,
    size: 0,
    track_total_hits: true,
    aggs: {
      companies: {
        terms: { field: "company.keyword", size: 15 },
        // Display label: the spelling the first person typed.
        aggs: { label: { top_hits: { size: 1, _source: ["company"], sort: [{ created_at: "asc" }] } } },
      },
      themes: { significant_text: { field: "about", size: 10, filter_duplicate_text: true } },
    },
  });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- ES aggs
  const aggs = res.aggregations as any;
  const total = typeof res.hits.total === "number" ? res.hits.total : (res.hits.total?.value ?? 0);
  return {
    total,
    companies: (aggs?.companies?.buckets ?? []).map(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- ES bucket
      (b: any) => ({ key: b.key, label: b.label?.hits?.hits?.[0]?._source?.company || b.key, count: b.doc_count }),
    ),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- ES bucket
    themes: (aggs?.themes?.buckets ?? []).map((b: any) => b.key as string),
  };
}
