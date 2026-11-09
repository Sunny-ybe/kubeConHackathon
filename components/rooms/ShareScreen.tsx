"use client";
import Link from "next/link";
import QRCode from "qrcode";
import { useEffect, useRef, useState } from "react";
import { ArrowRightIcon, BackrowMark, CheckIcon, ChevronLeftIcon, CopyIcon, ShareIcon } from "@/components/icons";

type Props = { room: string; roomName: string };

/** NEXT_PUBLIC_APP_URL, unless it points at localhost while the page is served elsewhere (e.g. LAN testing). */
function baseUrl(): string {
  const env = (process.env.NEXT_PUBLIC_APP_URL || "").replace(/\/$/, "");
  const origin = window.location.origin;
  if (!env) return origin;
  const envIsLocal = /\/\/(localhost|127\.0\.0\.1)/.test(env);
  const hereIsLocal = /\/\/(localhost|127\.0\.0\.1)/.test(origin);
  return envIsLocal && !hereIsLocal ? origin : env;
}

/** /r/[room]/share: a QR big enough to scan from the back of a room, plus link, copy, share. */
export default function ShareScreen({ room, roomName }: Props) {
  const [link, setLink] = useState<{ url: string; qr: string } | null>(null);
  const [canShare, setCanShare] = useState(false);
  const [copied, setCopied] = useState(false);
  const copyTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const roomHref = `/r/${encodeURIComponent(room)}`;

  useEffect(() => {
    const url = `${baseUrl()}${roomHref}`;
    QRCode.toString(url, { type: "svg", margin: 0, errorCorrectionLevel: "M", color: { dark: "#0a0a0c", light: "#ffffff" } })
      .then((svg) => {
        setCanShare(typeof navigator.share === "function");
        setLink({ url, qr: `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}` });
      })
      .catch(() => setLink({ url, qr: "" }));
    return () => clearTimeout(copyTimer.current);
  }, [roomHref]);

  async function copy() {
    if (!link) return;
    try {
      await navigator.clipboard.writeText(link.url);
      setCopied(true);
      clearTimeout(copyTimer.current);
      copyTimer.current = setTimeout(() => setCopied(false), 2200);
    } catch {
      /* clipboard blocked: the link is on screen to copy by hand */
    }
  }

  async function share() {
    if (!link) return;
    try {
      await navigator.share({ title: `${roomName} on Backrow`, text: `Join ${roomName} on Backrow`, url: link.url });
    } catch {
      /* dismissed */
    }
  }

  const display = link?.url.replace(/^https?:\/\//, "") ?? "";

  return (
    <div className="mx-auto flex min-h-dvh max-w-7xl flex-col px-5 sm:px-8">
      <header className="flex h-16 items-center justify-between">
        <Link
          href={roomHref}
          aria-label={`Back to ${roomName}`}
          className="-ml-3 flex min-h-12 items-center gap-1.5 rounded-lg pr-2 pl-1.5 font-semibold tracking-tight"
        >
          <ChevronLeftIcon size={22} className="text-muted" />
          <BackrowMark />
          <span className="ml-1 text-[17px]">Backrow</span>
        </Link>
      </header>

      <main className="grid flex-1 grid-cols-[minmax(0,1fr)] content-start gap-7 pt-2 pb-10 lg:grid-cols-[minmax(0,1fr)_auto] lg:content-center lg:items-center lg:gap-20 lg:pb-20">
        <div className="animate-rise lg:order-2">
          <div className="mx-auto aspect-square w-full max-w-[560px] rounded-[28px] bg-white p-5 sm:p-7 lg:w-[min(72dvh,44vw)] lg:max-w-none lg:p-9">
            {link?.qr ? (
              // eslint-disable-next-line @next/next/no-img-element -- generated SVG data URL
              <img src={link.qr} alt={`QR code to join ${roomName}`} className="animate-fade size-full" />
            ) : link ? (
              <p className="grid size-full place-items-center text-center text-lg font-medium text-black/60">
                Couldn&apos;t draw the code. Share the link below.
              </p>
            ) : (
              <div className="size-full animate-blink rounded-xl bg-black/[0.06]" aria-hidden="true" />
            )}
          </div>
        </div>

        <div className="animate-rise [animation-delay:60ms] lg:order-1">
          <p className="text-[13px] font-medium tracking-wider text-muted uppercase lg:text-base">Scan to join</p>
          <h1 className="mt-2 text-[44px] leading-[1.02] font-semibold tracking-[-0.035em] text-balance break-words sm:text-6xl lg:text-[88px]">
            {roomName}
          </h1>
          <p className="mt-3 text-lg text-muted lg:mt-5 lg:text-2xl">
            Point your phone camera at the code to join and add photos.
          </p>
          <p className="mt-4 min-h-7 font-mono text-[15px] break-all text-fg/80 lg:text-lg">{display}</p>

          <div className="mt-6 grid gap-2.5 lg:max-w-md">
            <div className={`grid gap-2.5 ${canShare ? "grid-cols-2" : "grid-cols-1"}`}>
              <button
                type="button"
                onClick={copy}
                disabled={!link}
                className="flex h-14 items-center justify-center gap-2.5 rounded-2xl border border-line-strong text-[17px] font-semibold transition-colors hover:bg-surface active:scale-[0.98]"
              >
                {copied ? <CheckIcon size={20} className="text-success" /> : <CopyIcon size={20} className="text-muted" />}
                {copied ? "Copied" : "Copy link"}
              </button>
              {canShare && (
                <button
                  type="button"
                  onClick={share}
                  disabled={!link}
                  className="flex h-14 items-center justify-center gap-2.5 rounded-2xl border border-line-strong text-[17px] font-semibold transition-colors hover:bg-surface active:scale-[0.98]"
                >
                  <ShareIcon size={20} className="text-muted" />
                  Share
                </button>
              )}
            </div>
            <Link
              href={roomHref}
              className="flex h-14 items-center justify-center gap-2.5 rounded-2xl bg-accent text-[17px] font-semibold text-on-accent transition-transform active:scale-[0.98]"
            >
              Enter room
              <ArrowRightIcon size={20} />
            </Link>
          </div>
          <p className="sr-only" aria-live="polite">
            {copied ? "Link copied" : ""}
          </p>
        </div>
      </main>
    </div>
  );
}
