"use client";

import { useEffect, useState } from "react";
import type { LiveResponse, LiveRoom, Slide } from "@/lib/types";
import { HEAT_WINDOW_MIN, LIVE_POLL_MS, formatTime } from "@/lib/config";
import { liveFixture } from "@/lib/fixtures";
import { CountUp } from "./CountUp";
import { SlideThumb } from "./SlideThumb";
import { STAGE_H, STAGE_W, useFadeIn, useFlashOnChange, useStageScale } from "./motion";

const USE_FIXTURES = process.env.NEXT_PUBLIC_USE_FIXTURES === "1";

const LABEL = "text-[28px] font-medium uppercase tracking-[0.14em] text-[#A1A1AA]";
const PULSE: Keyframe[] = [
  { transform: "scale(1)", backgroundColor: "#FFB020" },
  { transform: "scale(1.22)", backgroundColor: "#FFD27A" },
  { transform: "scale(1)", backgroundColor: "#FFB020" },
];

type Status = "loading" | "live" | "offline";

function usePolledLive() {
  const [data, setData] = useState<LiveResponse | null>(null);
  const [status, setStatus] = useState<Status>("loading");
  const [updatedAt, setUpdatedAt] = useState<string>("");

  useEffect(() => {
    let alive = true;
    let timer: ReturnType<typeof setTimeout>;
    const poll = async () => {
      try {
        let next: LiveResponse;
        if (USE_FIXTURES) next = liveFixture;
        else {
          const res = await fetch(`/api/live?window=${HEAT_WINDOW_MIN}`, { cache: "no-store" });
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          next = (await res.json()) as LiveResponse;
        }
        if (!alive) return;
        setData(next);
        setStatus("live");
        setUpdatedAt(new Date().toISOString());
      } catch {
        if (alive) setStatus("offline");
      }
      if (alive) timer = setTimeout(poll, LIVE_POLL_MS);
    };
    poll();
    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, []);

  return { data, status, updatedAt };
}

export function LiveBoard({ qrDataUrl, joinUrl }: { qrDataUrl: string; joinUrl: string }) {
  const scale = useStageScale();
  const { data, status, updatedAt } = usePolledLive();

  return (
    <main className="fixed inset-0 flex items-center justify-center overflow-hidden bg-[#0A0A0C] text-[#F4F4F5]">
      <div
        className="grid shrink-0 grid-rows-[auto_minmax(0,1fr)] gap-y-8 px-16 pb-12 pt-10"
        style={{ width: STAGE_W, height: STAGE_H, transform: `scale(${scale})`, transformOrigin: "center" }}
      >
        <Header status={status} updatedAt={updatedAt} />
        <div className="grid min-h-0 grid-cols-[480px_minmax(0,1fr)_560px] gap-x-12">
          <section aria-label="Totals and room heat" className="flex min-h-0 flex-col">
            <Counter data={data} />
            <RoomHeat rooms={data?.rooms} />
          </section>
          <section aria-label="Snapping now" className="flex min-h-0 flex-col border-x border-white/8 px-12">
            <SnappingNow latest={data?.latest} />
          </section>
          <section aria-label="Most photographed" className="flex min-h-0 flex-col">
            <MostPhotographed top={data?.top_slides} />
            <QrTile qrDataUrl={qrDataUrl} joinUrl={joinUrl} />
          </section>
        </div>
      </div>
    </main>
  );
}

function Header({ status, updatedAt }: { status: Status; updatedAt: string }) {
  const offline = status === "offline";
  return (
    <header className="flex items-center justify-between border-b border-white/8 pb-8">
      <div className="flex items-baseline gap-6">
        <h1 className="text-[44px] font-bold tracking-[-0.02em]">Backrow</h1>
        <p className="text-[30px] text-[#A1A1AA]">Snap a slide. Keep the talk.</p>
      </div>
      <div className="flex items-center gap-8 text-[30px] tabular-nums">
        <span className="text-[#A1A1AA]">{updatedAt ? formatTime(updatedAt) : ""}</span>
        <span
          className={`flex items-center gap-3 rounded-full border px-5 py-1.5 font-semibold uppercase tracking-[0.12em] ${
            offline ? "border-[#FFB020]/40 text-[#FFB020]" : "border-[#34D399]/35 text-[#34D399]"
          }`}
        >
          <span aria-hidden className="relative flex h-3.5 w-3.5">
            {!offline && (
              <span className="absolute inline-flex h-full w-full rounded-full bg-[#34D399] opacity-60 motion-safe:animate-ping" />
            )}
            <span className={`relative inline-flex h-3.5 w-3.5 rounded-full ${offline ? "bg-[#FFB020]" : "bg-[#34D399]"}`} />
          </span>
          {offline ? "Reconnecting" : "Live"}
        </span>
      </div>
    </header>
  );
}

function Counter({ data }: { data: LiveResponse | null }) {
  const total = data?.total_snaps ?? 0;
  const recent = data?.rooms.reduce((n, r) => n + r.snaps, 0) ?? 0;
  const digits = String(total).length;
  const size = digits <= 3 ? "text-[188px]" : digits === 4 ? "text-[160px]" : "text-[128px]";
  return (
    <div className="pb-8">
      <h2 className={LABEL}>Slides snapped today</h2>
      {data ? (
        <CountUp
          value={total}
          className={`mt-2 block font-bold leading-[0.95] tracking-[-0.04em] tabular-nums ${size}`}
        />
      ) : (
        <div className="mt-4 h-[190px] w-[300px] animate-pulse rounded-2xl bg-[#16161A]" />
      )}
      <p className="mt-4 text-[30px] tabular-nums text-[#A1A1AA]">
        {data ? (
          <>
            <span className="font-semibold text-[#34D399]">+{recent.toLocaleString("en-US")}</span> in the last{" "}
            {HEAT_WINDOW_MIN} minutes
          </>
        ) : (
          "Counting snaps…"
        )}
      </p>
    </div>
  );
}

function RoomHeat({ rooms }: { rooms?: LiveRoom[] }) {
  const shown = (rooms ?? []).slice(0, 4);
  const max = Math.max(1, ...shown.map((r) => r.snaps));
  return (
    <div className="flex min-h-0 flex-1 flex-col border-t border-white/8 pt-7">
      <h2 className={LABEL}>Room heat · {HEAT_WINDOW_MIN} min</h2>
      <ul className="mt-5 flex flex-col gap-4">
        {rooms
          ? shown.map((r, i) => (
              <li key={r.room}>
                <div className="flex items-baseline justify-between gap-4">
                  <span className="truncate text-[30px] font-semibold">{r.room_name}</span>
                  <span className="text-[30px] font-semibold tabular-nums">{r.snaps}</span>
                </div>
                <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-white/8">
                  <div
                    className={`h-full rounded-full transition-[width] duration-700 ease-out motion-reduce:transition-none ${
                      i === 0 && r.snaps > 0 ? "bg-[#FFB020]" : "bg-[#F4F4F5]/75"
                    }`}
                    style={{ width: `${(r.snaps / max) * 100}%` }}
                  />
                </div>
                <p className="mt-1.5 truncate text-[24px] leading-tight text-[#A1A1AA]">
                  {r.top_slide ? r.top_slide.title || r.top_slide.talk_title : r.talk_title || "Quiet right now"}
                </p>
              </li>
            ))
          : Array.from({ length: 4 }, (_, i) => (
              <li key={i} className="h-[96px] animate-pulse rounded-xl bg-[#16161A]" />
            ))}
      </ul>
    </div>
  );
}

function SnappingNow({ latest }: { latest?: Slide[] }) {
  const newest = latest?.[0];
  // Earlier snaps of other slides, one per cluster.
  const seen = new Set(newest ? [newest.cluster_id] : []);
  const earlier = (latest ?? [])
    .filter((s) => !seen.has(s.cluster_id) && seen.add(s.cluster_id))
    .slice(0, 3);
  return (
    <>
      <h2 className={LABEL}>Snapping now</h2>
      <div aria-live="polite" className="mt-6">
        {!latest ? (
          <div className="aspect-video w-full animate-pulse rounded-[10px] bg-[#16161A]" />
        ) : newest ? (
          <NewestSnap key={newest.slide_id} slide={newest} />
        ) : (
          <div className="flex aspect-video w-full flex-col items-center justify-center rounded-[10px] border border-dashed border-white/15 text-center">
            <p className="text-[40px] font-semibold">Waiting for the first snap</p>
            <p className="mt-3 text-[28px] text-[#A1A1AA]">Scan the code and snap the slide on screen.</p>
          </div>
        )}
      </div>
      {earlier.length > 0 && (
        <div className="mt-auto border-t border-white/8 pt-7">
          <h2 className={LABEL}>Just before</h2>
          <ul className="mt-5 flex flex-col gap-4">
            {earlier.map((s) => (
              <li key={s.slide_id} className="flex items-center gap-5">
                <SlideThumb slide={s} size="sm" className="w-[128px] shrink-0" />
                <div className="min-w-0">
                  <p className="truncate text-[28px] font-semibold leading-tight">{s.title || "Untitled slide"}</p>
                  <p className="truncate text-[24px] leading-tight text-[#A1A1AA] tabular-nums">
                    {formatTime(s.taken_at)} · {s.talk_title}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </>
  );
}

function NewestSnap({ slide }: { slide: Slide }) {
  const ref = useFadeIn<HTMLDivElement>();
  return (
    <div ref={ref}>
      <SlideThumb slide={slide} size="lg" className="w-full" />
      <p className="mt-6 line-clamp-1 text-[40px] font-semibold leading-tight tracking-[-0.01em]">
        {slide.title || "Untitled slide"}
      </p>
      <p className="mt-2 truncate text-[28px] text-[#A1A1AA] tabular-nums">
        <span className="text-[#F4F4F5]">{formatTime(slide.taken_at)}</span> · {slide.talk_title}
      </p>
    </div>
  );
}

function MostPhotographed({ top }: { top?: LiveResponse["top_slides"] }) {
  const three = top?.slice(0, 3) ?? [];
  return (
    <div className="flex-1">
      <h2 className={LABEL}>Most photographed</h2>
      <ol className="mt-6 flex flex-col gap-6">
        {!top ? (
          Array.from({ length: 3 }, (_, i) => <li key={i} className="h-[124px] animate-pulse rounded-xl bg-[#16161A]" />)
        ) : three.length === 0 ? (
          <li className="text-[30px] text-[#A1A1AA]">No slides yet. Be the first to snap one.</li>
        ) : (
          three.map((t, i) => <LeaderRow key={t.cluster_id} rank={i + 1} count={t.count} slide={t.slide} />)
        )}
      </ol>
    </div>
  );
}

function LeaderRow({ rank, count, slide }: { rank: number; count: number; slide: Slide }) {
  const badge = useFlashOnChange<HTMLSpanElement>(count, PULSE);
  return (
    <li className="flex items-center gap-5">
      <span className="w-[30px] shrink-0 text-[34px] font-semibold tabular-nums text-[#A1A1AA]">{rank}</span>
      <SlideThumb slide={slide} size="sm" className="w-[188px] shrink-0" />
      <div className="min-w-0 flex-1">
        <p className="line-clamp-2 text-[28px] font-semibold leading-[1.15]">{slide.title || "Untitled slide"}</p>
        <p className="mt-1.5 truncate text-[24px] leading-tight text-[#A1A1AA]">{slide.talk_title}</p>
      </div>
      <span
        ref={badge}
        aria-label={`Snapped ${count} times`}
        className="shrink-0 rounded-[10px] bg-[#FFB020] px-4 py-1.5 text-[36px] font-bold tabular-nums text-[#0A0A0C]"
      >
        ×{count}
      </span>
    </li>
  );
}

function QrTile({ qrDataUrl, joinUrl }: { qrDataUrl: string; joinUrl: string }) {
  return (
    <div className="flex items-center gap-8 border-t border-white/8 pt-9">
      <div className="shrink-0 rounded-[14px] bg-white p-3.5">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={qrDataUrl} alt={`QR code for ${joinUrl}`} width={196} height={196} className="block h-[196px] w-[196px]" />
      </div>
      <div className="min-w-0">
        <p className="text-[52px] font-bold leading-none tracking-[-0.02em]">Scan to snap</p>
        <p className="mt-4 break-all text-[26px] text-[#A1A1AA]">{joinUrl.replace(/^https?:\/\//, "")}</p>
      </div>
    </div>
  );
}
