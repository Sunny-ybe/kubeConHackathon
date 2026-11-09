import Link from "next/link";
import { DEMO_ROOM, formatTime } from "@/lib/config";
import { rooms, talkFor } from "@/components/schedule";
import {
  ArrowRightIcon,
  BackrowMark,
  BroadcastIcon,
  CameraIcon,
  PlusIcon,
  QrIcon,
  SearchIcon,
  StackIcon,
} from "@/components/icons";

// "Now" depends on the clock, so render per request.
export const dynamic = "force-dynamic";

const STEPS = [
  ["Snap", "Point your phone at the slide. That's it."],
  ["Read", "Big text, read aloud, translated into your language."],
  ["Ask", "Get answers from the room's slides, with citations."],
] as const;

const LINKS = [
  { href: "/search", label: "Search slides", Icon: SearchIcon },
  { href: "/me", label: "My slides", Icon: StackIcon },
  { href: "/live", label: "Live board", Icon: BroadcastIcon },
  { href: "/qr", label: "QR codes", Icon: QrIcon },
];

export default function Home() {
  return (
    <div className="mx-auto flex min-h-dvh max-w-6xl flex-col px-5 sm:px-8">
      <header className="flex h-16 items-center justify-between">
        <Link href="/" className="-ml-2 flex min-h-12 items-center gap-2.5 rounded-lg px-2 font-semibold tracking-tight">
          <BackrowMark />
          <span className="text-[17px]">Backrow</span>
        </Link>
        <nav aria-label="Main" className="hidden items-center gap-1 sm:flex">
          {LINKS.slice(0, 3).map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className="flex min-h-12 items-center rounded-lg px-3 text-sm text-muted transition-colors hover:text-fg"
            >
              {label}
            </Link>
          ))}
        </nav>
      </header>

      <main className="grid flex-1 grid-cols-[minmax(0,1fr)] content-start gap-14 pt-10 pb-16 sm:pt-16 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] lg:gap-x-20 lg:pt-24">
        <section aria-labelledby="hero" className="animate-rise">
          <h1 id="hero" className="text-[44px] leading-[1.02] font-semibold tracking-[-0.035em] sm:text-6xl lg:text-7xl">
            Snap a slide.
            <br />
            <span className="text-muted">Keep the talk.</span>
          </h1>
          <p className="mt-6 max-w-[34ch] text-lg leading-relaxed text-muted">
            Photograph any slide from your seat. Backrow reads it, files it under the talk, and groups it with
            everyone else&apos;s snaps.
          </p>
          <div className="mt-9 flex flex-col gap-2.5 min-[420px]:flex-row">
            <Link
              href="/new"
              className="inline-flex h-14 items-center justify-center gap-3 rounded-2xl bg-accent pr-5 pl-4 text-[17px] font-semibold text-on-accent transition-transform active:scale-[0.98]"
            >
              <PlusIcon size={22} />
              Start a room
            </Link>
            <Link
              href={`/r/${DEMO_ROOM}`}
              className="inline-flex h-14 items-center justify-center gap-3 rounded-2xl border border-line-strong pr-5 pl-4 text-[17px] font-semibold transition-[transform,background-color] hover:bg-surface active:scale-[0.98]"
            >
              <CameraIcon size={22} className="text-muted" />
              Open the demo room
            </Link>
          </div>
          <p className="mt-4 max-w-[38ch] text-[15px] leading-relaxed text-muted">
            Guests scan your QR and add photos. You approve what everyone sees.
          </p>

        </section>

        <section aria-labelledby="rooms-heading" className="animate-rise [animation-delay:60ms] lg:row-span-2">
          <div className="flex items-baseline justify-between border-b border-line pb-3">
            <h2 id="rooms-heading" className="text-sm font-medium tracking-wide text-muted uppercase">
              Rooms
            </h2>
            <span className="text-sm text-muted tabular-nums">{rooms.length}</span>
          </div>
          <ul>
            {rooms.map((r) => {
              const t = talkFor(r.room);
              return (
                <li key={r.room} className="border-b border-line">
                  <Link
                    href={`/r/${encodeURIComponent(r.room)}`}
                    className="group -mx-3 flex min-h-[76px] items-center gap-4 rounded-xl px-3 py-3 transition-colors hover:bg-surface"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="flex items-center gap-2 text-lg font-semibold tracking-tight">
                        {r.name}
                        {r.room === DEMO_ROOM && (
                          <span className="rounded-full border border-accent/40 px-2 py-px text-[11px] font-medium tracking-wide text-accent uppercase">
                            Demo
                          </span>
                        )}
                      </p>
                      <p className="mt-0.5 flex items-center gap-2 truncate text-sm text-muted">
                        {t ? (
                          <>
                            {t.live ? (
                              <span className="flex shrink-0 items-center gap-1.5 text-success">
                                <span className="size-1.5 animate-blink rounded-full bg-success" aria-hidden="true" />
                                Now
                              </span>
                            ) : (
                              <span className="shrink-0 tabular-nums">Next · {formatTime(t.talk.start)}</span>
                            )}
                            <span className="truncate">{t.talk.title}</span>
                          </>
                        ) : (
                          "No more talks today"
                        )}
                      </p>
                    </div>
                    <ArrowRightIcon className="shrink-0 text-muted transition-transform group-hover:translate-x-0.5 group-hover:text-fg" />
                  </Link>
                </li>
              );
            })}
          </ul>

          <nav aria-label="More" className="mt-10 grid grid-cols-2 gap-2">
            {LINKS.map(({ href, label, Icon }) => (
              <Link
                key={href}
                href={href}
                className="flex min-h-14 items-center gap-3 rounded-xl border border-line px-4 text-[15px] font-medium transition-colors hover:border-line-strong hover:bg-surface"
              >
                <Icon className="text-muted" />
                {label}
              </Link>
            ))}
          </nav>
        </section>

        <ol aria-label="How it works" className="grid max-w-xl self-start border-t border-line sm:grid-cols-3 lg:col-start-1 lg:row-start-2">
          {STEPS.map(([name, body], i) => (
            <li key={name} className="border-b border-line py-4 sm:border-b-0 sm:py-5 sm:pr-5">
              <span className="font-mono text-xs text-muted tabular-nums">0{i + 1}</span>
              <p className="mt-1 font-semibold tracking-tight">{name}</p>
              <p className="mt-1 text-sm leading-relaxed text-muted">{body}</p>
            </li>
          ))}
        </ol>
      </main>
    </div>
  );
}
