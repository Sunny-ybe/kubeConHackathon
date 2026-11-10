"use client";
import Link from "next/link";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { cardStats, searchCards } from "./actions";
import { BackHeader, Highlight, Initials, roleLine } from "./ui";
import type { Card, CardStats } from "./types";
import { ArrowRightIcon, CloseIcon, PlusIcon, SearchIcon } from "@/components/icons";
import { Shimmer } from "@/components/ask/ui";

type Results = { kind: "loading" } | { kind: "done"; cards: Card[] } | { kind: "error" };

const chip =
  "inline-flex min-h-11 items-center gap-2 rounded-full border px-4 text-[15px] font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent";

export default function PeopleView({ initialStats, initialCards }: { initialStats: CardStats | null; initialCards: Card[] | null }) {
  const [stats, setStats] = useState(initialStats);
  const [draft, setDraft] = useState("");
  const [query, setQuery] = useState({ q: "", company: "" });
  const [results, setResults] = useState<Results>(initialCards ? { kind: "done", cards: initialCards } : { kind: "error" });
  const first = useRef(true);
  const seq = useRef(0);

  // Live headcount, companies and themes.
  useEffect(() => {
    const t = setInterval(() => cardStats().then(setStats).catch(() => {}), 5000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    const n = ++seq.current;
    setResults({ kind: "loading" });
    searchCards(query.q, query.company)
      .then((cards) => n === seq.current && setResults({ kind: "done", cards }))
      .catch(() => n === seq.current && setResults({ kind: "error" }));
  }, [query]);

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    setQuery((q) => ({ ...q, q: draft.trim() }));
  }

  function searchTheme(theme: string) {
    setDraft(theme);
    setQuery((q) => ({ ...q, q: theme }));
  }

  function clearAll() {
    setDraft("");
    setQuery({ q: "", company: "" });
  }

  const total = stats?.total ?? 0;
  const empty = stats !== null && total === 0;
  const filtering = query.q || query.company;
  const companyLabel = stats?.companies.find((c) => c.key === query.company)?.label ?? query.company;

  return (
    <div className="mx-auto flex min-h-dvh max-w-3xl flex-col px-5 sm:px-8">
      <BackHeader>
        <Link
          href="/card"
          className="flex min-h-12 items-center gap-2 rounded-xl bg-accent px-4 text-[15px] font-semibold text-on-accent transition-transform active:scale-[0.98]"
        >
          <PlusIcon size={18} />
          Make your card
        </Link>
      </BackHeader>

      <main className="flex-1 pt-6 pb-16 sm:pt-10">
        <h1 className="animate-rise text-[40px] leading-[1.05] font-semibold tracking-[-0.03em] sm:text-5xl" aria-live="polite">
          {stats ? (
            <>
              <span className="tabular-nums">{total}</span> {total === 1 ? "person" : "people"} here
            </>
          ) : (
            "People here"
          )}
        </h1>

        {empty ? (
          <div className="animate-rise mt-8 rounded-3xl border border-line bg-surface p-7 sm:p-9">
            <p className="text-2xl font-semibold tracking-tight">No cards yet. Be the first.</p>
            <p className="mt-2 text-lg text-muted">Make a card and let people scan your QR.</p>
            <Link
              href="/card"
              className="mt-6 inline-flex h-14 items-center gap-3 rounded-2xl bg-accent pr-5 pl-4 text-[17px] font-semibold text-on-accent transition-transform active:scale-[0.98]"
            >
              <PlusIcon size={22} />
              Make your card
            </Link>
          </div>
        ) : (
          <>
            <form onSubmit={onSubmit} role="search" className="animate-rise relative mt-7">
              <label htmlFor="people-q" className="sr-only">
                Search people
              </label>
              <SearchIcon size={22} className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-muted" />
              <input
                id="people-q"
                type="search"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                enterKeyHint="search"
                maxLength={200}
                placeholder="Who here works at Whop? Who can help with Elasticsearch?"
                className="h-16 w-full rounded-2xl border border-line-strong bg-surface pr-4 pl-12 text-[18px] placeholder:text-muted/60 focus-visible:border-accent/60"
              />
            </form>

            {stats && stats.companies.length > 0 && (
              <section aria-labelledby="companies-h" className="mt-7">
                <h2 id="companies-h" className="text-sm font-medium tracking-wide text-muted uppercase">
                  Companies
                </h2>
                <ul className="mt-3 flex flex-wrap gap-2">
                  {stats.companies.map((c) => {
                    const on = query.company === c.key;
                    return (
                      <li key={c.key}>
                        <button
                          type="button"
                          aria-pressed={on}
                          onClick={() => setQuery((q) => ({ ...q, company: on ? "" : c.key }))}
                          className={`${chip} ${on ? "border-accent bg-accent text-on-accent" : "border-line-strong hover:bg-surface"}`}
                        >
                          {c.label}
                          <span className={`tabular-nums ${on ? "text-on-accent/70" : "text-muted"}`}>{c.count}</span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </section>
            )}

            {stats && stats.themes.length > 0 && (
              <section aria-labelledby="themes-h" className="mt-6">
                <h2 id="themes-h" className="text-sm font-medium tracking-wide text-muted uppercase">
                  People are talking about
                </h2>
                <ul className="mt-3 flex flex-wrap gap-2">
                  {stats.themes.map((t) => (
                    <li key={t}>
                      <button
                        type="button"
                        onClick={() => searchTheme(t)}
                        className={`${chip} border-line bg-surface text-muted hover:border-line-strong hover:text-fg`}
                      >
                        #{t}
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            <section aria-labelledby="results-h" className="mt-9" aria-busy={results.kind === "loading"}>
              <div className="flex min-h-12 items-center justify-between gap-3 border-b border-line pb-2">
                {filtering ? (
                  <h2 id="results-h" className="min-w-0 truncate text-[15px] text-muted">
                    {query.q ? "Results for " : "People "}
                    <span className="font-medium text-fg">
                      {[query.q && `“${query.q}”`, query.company && `at ${companyLabel}`].filter(Boolean).join(" ")}
                    </span>
                  </h2>
                ) : (
                  <h2 id="results-h" className="text-sm font-medium tracking-wide text-muted uppercase">
                    Newest
                  </h2>
                )}
                {filtering && (
                  <button
                    type="button"
                    onClick={clearAll}
                    className="-mr-2 flex min-h-12 shrink-0 items-center gap-1.5 rounded-lg px-2 text-[15px] font-medium text-muted hover:text-fg"
                  >
                    <CloseIcon size={18} />
                    Clear
                  </button>
                )}
              </div>

              {results.kind === "loading" && (
                <div aria-hidden="true">
                  {[0, 1, 2].map((i) => (
                    <div key={i} className="flex gap-4 border-b border-line py-5">
                      <Shimmer className="size-11 shrink-0 rounded-full" />
                      <div className="flex-1">
                        <Shimmer className="h-5 w-1/3" />
                        <Shimmer className="mt-2 h-4 w-1/2" />
                        <Shimmer className="mt-3 h-4 w-11/12" />
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {results.kind === "error" && (
                <p className="mt-5 rounded-2xl border border-line bg-surface p-5 text-lg text-muted">
                  Couldn&apos;t load people right now. Try again in a moment.
                </p>
              )}

              {results.kind === "done" && results.cards.length === 0 && (
                <p className="mt-5 text-lg text-muted">
                  {filtering ? "Nobody matches that yet. Try other words." : "No cards yet. Be the first."}
                </p>
              )}

              {results.kind === "done" && results.cards.length > 0 && (
                <ul>
                  {results.cards.map((c) => (
                    <PersonRow key={c.id} card={c} />
                  ))}
                </ul>
              )}
            </section>
          </>
        )}
      </main>
    </div>
  );
}

function PersonRow({ card }: { card: Card }) {
  const line = roleLine(card.role, card.company);
  const snippet = card.highlights?.[0];
  return (
    <li className="border-b border-line">
      <Link
        href={`/c/${card.id}`}
        className="group -mx-3 flex gap-4 rounded-xl px-3 py-5 transition-colors hover:bg-surface"
      >
        <Initials name={card.name} size="md" />
        <div className="min-w-0 flex-1">
          <p className="text-lg font-semibold tracking-tight break-words">{card.name}</p>
          {line && <p className="text-[15px] text-muted break-words">{line}</p>}
          {(snippet || card.about) && (
            <p className="mt-2 line-clamp-3 text-[16px] leading-relaxed text-fg/80 break-words">
              {snippet ? <Highlight text={snippet} /> : card.about}
            </p>
          )}
        </div>
        <ArrowRightIcon className="mt-3 shrink-0 text-muted transition-transform group-hover:translate-x-0.5 group-hover:text-fg" />
      </Link>
    </li>
  );
}
