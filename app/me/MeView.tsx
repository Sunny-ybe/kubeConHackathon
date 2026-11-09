"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import type { MeResponse, ReportResponse, Slide } from "@/lib/types";
import { formatTime } from "@/lib/config";
import { deviceId } from "@/lib/device";
import SlideModal from "@/components/ask/SlideModal";
import { PageHeader, Shimmer, SlideThumb, roomName } from "@/components/ask/ui";
import TripReport from "@/components/report/TripReport";

const REPORT_LINES = ["Gathering your slides…", "Adding what the room snapped…", "Writing your report…"];

type Group = { talkId: string; title: string; room: string; slides: Slide[] };

/** Slides arrive newest first; keep that order for groups (latest talk on top) and within each. */
function groupByTalk(slides: Slide[]): Group[] {
  const groups = new Map<string, Group>();
  for (const s of slides) {
    const g = groups.get(s.talk_id) ?? { talkId: s.talk_id, title: s.talk_title || "Open session", room: s.room, slides: [] };
    g.slides.push(s);
    groups.set(s.talk_id, g);
  }
  return [...groups.values()];
}

type Load = { kind: "loading" } | { kind: "done"; slides: Slide[] } | { kind: "error" };
type Report = { kind: "idle" } | { kind: "loading" } | { kind: "done"; report: ReportResponse } | { kind: "error"; message: string };

export default function MeView() {
  const [load, setLoad] = useState<Load>({ kind: "loading" });
  const [report, setReport] = useState<Report>({ kind: "idle" });
  const [line, setLine] = useState(0);
  const [open, setOpen] = useState<Slide | null>(null);

  useEffect(() => {
    fetch(`/api/me?device_id=${encodeURIComponent(deviceId())}`)
      .then((r) => (r.ok ? (r.json() as Promise<MeResponse>) : Promise.reject(new Error(String(r.status)))))
      .then((data) => setLoad({ kind: "done", slides: data.slides }))
      .catch(() => setLoad({ kind: "error" }));
  }, []);

  useEffect(() => {
    if (report.kind !== "loading") return;
    const t = setInterval(() => setLine((n) => Math.min(n + 1, REPORT_LINES.length - 1)), 2500);
    return () => clearInterval(t);
  }, [report.kind]);

  async function writeReport() {
    setLine(0);
    setReport({ kind: "loading" });
    try {
      const r = await fetch("/api/report", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ device_id: deviceId() }),
      });
      const data = await r.json().catch(() => null);
      if (!r.ok || !data || typeof data.markdown !== "string") throw new Error(data?.error);
      setReport({ kind: "done", report: data });
    } catch (err) {
      setReport({ kind: "error", message: (err as Error).message || "Couldn't write the report right now. Try again." });
    }
  }

  const slides = load.kind === "done" ? load.slides : [];
  const groups = groupByTalk(slides);

  return (
    <main className="mx-auto min-h-dvh w-full max-w-3xl px-4 pb-16 text-[#F4F4F5] sm:px-6">
      <PageHeader current="me" />

      <div className="mt-4 mb-6">
        <h1 className="text-3xl font-semibold tracking-tight">My slides</h1>
        {load.kind === "done" && slides.length > 0 && (
          <p className="mt-1 text-base text-[#A1A1AA]">
            {slides.length} {slides.length === 1 ? "slide" : "slides"} from {groups.length}{" "}
            {groups.length === 1 ? "talk" : "talks"}
          </p>
        )}
      </div>

      {load.kind === "loading" && (
        <div aria-hidden="true">
          <Shimmer className="mb-8 h-14 w-full rounded-xl" />
          <Shimmer className="mb-2 h-6 w-2/3" />
          <Shimmer className="mb-4 h-4 w-1/3" />
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {[0, 1, 2, 3].map((i) => (
              <Shimmer key={i} className="aspect-video rounded-lg" />
            ))}
          </div>
        </div>
      )}

      {load.kind === "error" && (
        <p className="rounded-2xl border border-white/[0.08] bg-[#16161A] p-5 text-base text-[#A1A1AA]">
          Couldn&apos;t load your slides. Refresh to try again.
        </p>
      )}

      {load.kind === "done" && slides.length === 0 && (
        <p className="text-base text-[#A1A1AA]">
          No slides yet.{" "}
          <Link href="/" className="font-medium text-[#FFB020] underline-offset-2 hover:underline">
            Pick a room and snap one.
          </Link>
        </p>
      )}

      {slides.length > 0 && (
        <>
          <section aria-label="Trip report" className="mb-10">
            {report.kind !== "done" && (
              <button
                type="button"
                onClick={writeReport}
                disabled={report.kind === "loading"}
                className="h-14 w-full rounded-xl bg-[#FFB020] text-lg font-semibold text-[#0A0A0C] transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FFB020] disabled:opacity-60"
              >
                {report.kind === "loading" ? "Writing…" : "Write my trip report"}
              </button>
            )}
            <div aria-live="polite" aria-busy={report.kind === "loading"}>
              {report.kind === "loading" && (
                <div className="mt-4 rounded-2xl border border-white/[0.08] bg-[#16161A] p-5 sm:p-7">
                  <p className="mb-5 text-base text-[#A1A1AA]">{REPORT_LINES[line]}</p>
                  <Shimmer className="mb-3 h-6 w-1/2" />
                  <div className="mb-7 space-y-2.5">
                    <Shimmer className="h-4 w-full" />
                    <Shimmer className="h-4 w-11/12" />
                    <Shimmer className="h-4 w-3/4" />
                  </div>
                  <Shimmer className="mb-3 h-6 w-2/5" />
                  <div className="space-y-2.5">
                    <Shimmer className="h-4 w-full" />
                    <Shimmer className="h-4 w-5/6" />
                  </div>
                </div>
              )}
              {report.kind === "error" && (
                <p className="mt-3 text-base text-[#A1A1AA]">{report.message}</p>
              )}
              {report.kind === "done" && (
                <>
                  <div className="mb-3 flex items-center justify-between">
                    <h2 className="text-xl font-semibold">Trip report</h2>
                    <button
                      type="button"
                      onClick={writeReport}
                      className="-mr-3 h-12 rounded-lg px-3 text-base font-medium text-[#A1A1AA] hover:text-[#F4F4F5] focus-visible:outline-2 focus-visible:outline-[#FFB020]"
                    >
                      Rewrite
                    </button>
                  </div>
                  <TripReport report={report.report} />
                </>
              )}
            </div>
          </section>

          <div className="space-y-9">
            {groups.map((g) => (
              <section key={g.talkId} aria-labelledby={`talk-${g.talkId}`}>
                <h2 id={`talk-${g.talkId}`} className="text-xl font-semibold leading-snug">
                  {g.title}
                </h2>
                <p className="mt-0.5 mb-3 text-sm text-[#A1A1AA]">
                  {roomName(g.room)} · {g.slides.length} {g.slides.length === 1 ? "slide" : "slides"}
                </p>
                <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {g.slides.map((s) => (
                    <li key={s.slide_id}>
                      <button
                        type="button"
                        onClick={() => setOpen(s)}
                        className="block w-full rounded-lg text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FFB020]"
                      >
                        <SlideThumb slide={s} />
                        <span className="mt-1.5 block truncate text-base font-medium">{s.title || "Untitled slide"}</span>
                        <span className="block text-sm text-[#A1A1AA]">{formatTime(s.taken_at)}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        </>
      )}

      <SlideModal slide={open} onClose={() => setOpen(null)} />
    </main>
  );
}
