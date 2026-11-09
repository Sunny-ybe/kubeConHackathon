import type { Metadata } from "next";
import Link from "next/link";
import { es } from "@/lib/server/es";
import { HEAVY_FIELDS, toSlide } from "@/lib/server/slides";
import { span } from "@/lib/server/trace";
import { SLIDES_INDEX, TALKS_INDEX, formatTime } from "@/lib/config";
import type { Slide, Talk } from "@/lib/types";
import { SlideThumb } from "@/components/live/SlideThumb";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Speaker stats · Backrow" };

type ClusterStat = { cluster_id: string; count: number; slide: Slide };

/* eslint-disable @typescript-eslint/no-explicit-any */
async function load(id: string): Promise<{ talk: Talk | null; total: number; clusters: ClusterStat[] }> {
  const [talkRes, slidesRes]: any[] = await Promise.all([
    es().get({ index: TALKS_INDEX, id }, { ignore: [404] }),
    span(
      "talk.stats",
      () =>
        es().search({
          index: SLIDES_INDEX,
          size: 0,
          track_total_hits: true,
          query: {
            bool: { filter: [{ term: { talk_id: id } }, { term: { shared: true } }, { term: { is_slide: true } }] },
          },
          aggs: {
            clusters: {
              terms: { field: "cluster_id", size: 24 },
              aggs: {
                rep: { top_hits: { size: 1, sort: [{ taken_at: "desc" }], _source: { excludes: HEAVY_FIELDS } } },
              },
            },
          } as any,
        }),
      { talk_id: id },
    ),
  ]);

  const talk: Talk | null = talkRes?.found ? (talkRes._source as Talk) : null;
  const total = slidesRes.hits?.total?.value ?? 0;
  const clusters: ClusterStat[] = (slidesRes.aggregations?.clusters?.buckets ?? []).flatMap((b: any) => {
    const hit = b.rep.hits.hits[0];
    return hit ? [{ cluster_id: b.key, count: b.doc_count, slide: toSlide(hit._id, hit._source, { snaps: b.doc_count }) }] : [];
  });
  return { talk, total, clusters };
}

export default async function TalkStatsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let data: Awaited<ReturnType<typeof load>> | null = null;
  try {
    data = await load(id);
  } catch (err) {
    console.error(`/talk/${id} failed`, err);
  }

  if (!data) {
    return (
      <Shell>
        <p className="text-2xl font-semibold">Stats are unavailable right now.</p>
        <p className="mt-2 text-lg text-muted">Refresh in a moment.</p>
      </Shell>
    );
  }

  const { talk, total, clusters } = data;
  const top = clusters[0];
  const rest = clusters.slice(1);

  if (!talk && clusters.length === 0) {
    return (
      <Shell>
        <p className="text-2xl font-semibold">No talk with that id.</p>
        <p className="mt-2 text-lg text-muted">Check the link, or pick a room from the home page.</p>
      </Shell>
    );
  }

  return (
    <Shell>
      <header className="border-b border-line pb-8">
        <p className="text-sm font-semibold uppercase tracking-[0.14em] text-muted">Speaker stats</p>
        <h1 className="mt-3 text-3xl font-bold leading-tight tracking-[-0.02em] sm:text-5xl">
          {talk?.title ?? top?.slide.talk_title ?? id}
        </h1>
        {talk && (
          <p className="mt-3 text-lg text-muted">
            {talk.speakers} · {talk.room_name} · {formatTime(talk.start)} to {formatTime(talk.end)}
          </p>
        )}
        <dl className="mt-8 flex flex-wrap gap-x-12 gap-y-4">
          <Stat label="Snaps of your slides" value={total} />
          <Stat label="Different slides snapped" value={clusters.length} />
        </dl>
      </header>

      {!top ? (
        <p className="py-16 text-center text-xl text-muted">No slides snapped in this talk yet.</p>
      ) : (
        <>
          <section aria-labelledby="top-heading" className="border-b border-line py-10">
            <h2 id="top-heading" className="text-sm font-semibold uppercase tracking-[0.14em] text-muted">
              Most photographed slide
            </h2>
            <div className="mt-5 grid gap-8 md:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
              <SlideThumb slide={top.slide} size="lg" className="w-full" />
              <div className="flex flex-col">
                <p className="w-fit rounded-[10px] bg-accent px-4 py-1 text-4xl font-bold tabular-nums text-on-accent">
                  ×{top.count}
                </p>
                <p className="mt-3 text-lg text-muted">
                  {top.count === 1 ? "1 person snapped it" : `${top.count} people snapped it`}
                </p>
                <h3 className="mt-6 text-2xl font-semibold leading-snug">{top.slide.title || "Untitled slide"}</h3>
                {top.slide.text && (
                  <p className="mt-3 line-clamp-6 whitespace-pre-line text-lg leading-relaxed text-muted">
                    {top.slide.text}
                  </p>
                )}
              </div>
            </div>
          </section>

          {rest.length > 0 && (
            <section aria-labelledby="all-heading" className="py-10">
              <h2 id="all-heading" className="text-sm font-semibold uppercase tracking-[0.14em] text-muted">
                Every slide the room snapped
              </h2>
              <ol className="mt-5 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {rest.map((c) => (
                  <li key={c.cluster_id} className="rounded-xl border border-line bg-surface p-3">
                    <SlideThumb slide={c.slide} size="md" className="w-full" />
                    <div className="mt-3 flex items-start justify-between gap-3 px-1 pb-1">
                      <p className="line-clamp-2 text-lg font-semibold leading-snug">
                        {c.slide.title || "Untitled slide"}
                      </p>
                      <span
                        aria-label={`Snapped ${c.count} times`}
                        className="shrink-0 rounded-md bg-raised px-2 py-0.5 text-lg font-bold tabular-nums"
                      >
                        ×{c.count}
                      </span>
                    </div>
                  </li>
                ))}
              </ol>
            </section>
          )}
        </>
      )}
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="mx-auto min-h-dvh max-w-6xl px-4 py-8 sm:px-8 sm:py-12">
      <nav className="mb-8 flex gap-6 text-base text-muted">
        <Link href="/" className="inline-flex min-h-12 items-center underline-offset-4 hover:text-fg hover:underline">
          Backrow
        </Link>
        <Link href="/live" className="inline-flex min-h-12 items-center underline-offset-4 hover:text-fg hover:underline">
          Live
        </Link>
      </nav>
      {children}
    </main>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <dt className="text-base text-muted">{label}</dt>
      <dd className="text-5xl font-bold tabular-nums tracking-[-0.02em]">{value.toLocaleString("en-US")}</dd>
    </div>
  );
}
