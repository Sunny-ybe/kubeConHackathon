"use client";
import { useRef, useState } from "react";
import { LANGS, formatTime } from "@/lib/config";
import { translate } from "@/lib/client";
import type { Slide } from "@/lib/types";
import { ClockIcon, CloseIcon, DiagramIcon, ImageIcon, SpeakerIcon, StopIcon, TranslateIcon, UsersIcon } from "@/components/icons";
import { useDialog } from "@/components/hooks/useDialog";
import { useSpeech } from "@/components/hooks/useSpeech";
import SlideImage from "./SlideImage";

type Lang = (typeof LANGS)[number];
type Parts = { title: string; text: string; alt: string };

type Props = { slide: Slide; roomName: string; onClose: () => void };

/** Bottom sheet for one slide: photo, big text, Read aloud, Translate, diagram description. */
export default function SlideSheet({ slide, roomName, onClose }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  useDialog(ref, onClose);
  const { speaking, speak, stop } = useSpeech();

  const original: Parts = { title: slide.title, text: slide.text, alt: slide.alt_text };
  const [lang, setLang] = useState<Lang | null>(null);
  const [translated, setTranslated] = useState<Parts | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");

  const shown = lang && translated ? translated : original;
  const snaps = slide.snaps ?? 1;
  const photo = slide.kind === "photo";
  // Photos (hosted rooms) describe the image; slides describe their diagram.
  const altLabel = photo ? "Description" : "Diagram";
  const title = shown.title || (photo ? "Untitled photo" : "Untitled slide");

  async function chooseLang(code: string) {
    stop();
    const next = LANGS.find((l) => l.code === code) ?? null;
    if (!next) return showOriginal();
    setLang(next);
    setStatus("loading");
    try {
      const tr = async (s: string) => (s.trim() ? (await translate(s, next.code)).text : "");
      const [t, x, a] = await Promise.all([tr(original.title), tr(original.text), tr(original.alt)]);
      setTranslated({ title: t, text: x, alt: a });
      setStatus("idle");
    } catch {
      setLang(null);
      setTranslated(null);
      setStatus("error");
    }
  }

  function showOriginal() {
    stop();
    setLang(null);
    setTranslated(null);
    setStatus("idle");
  }

  function toggleRead() {
    if (speaking) return stop();
    const parts = photo
      ? [shown.title, shown.text || shown.alt]
      : [shown.title, shown.text, shown.alt && `${lang ? "" : "Diagram: "}${shown.alt}`];
    speak(parts.filter(Boolean).join(".\n"), translated ? lang?.speech : "en-US");
  }

  const textLang = translated && lang ? lang.code : undefined;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <div className="animate-fade absolute inset-0 bg-black/75" onClick={onClose} aria-hidden="true" />
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby="sheet-title"
        tabIndex={-1}
        className="animate-sheet relative flex max-h-[94dvh] w-full max-w-2xl flex-col overflow-hidden rounded-t-3xl border-t border-line bg-surface sm:border-x"
      >
        <div className="flex items-center justify-between px-3 pt-2">
          <span className="w-12" aria-hidden="true" />
          <span className="h-1 w-10 rounded-full bg-line-strong" aria-hidden="true" />
          <button
            type="button"
            onClick={onClose}
            data-autofocus
            aria-label="Close slide"
            className="grid size-12 place-items-center rounded-full text-muted transition-colors hover:text-fg"
          >
            <CloseIcon size={22} />
          </button>
        </div>

        <div className="overflow-y-auto overscroll-contain px-5 pb-safe sm:px-7">
          <div className="relative aspect-video overflow-hidden rounded-xl border border-line bg-canvas">
            {slide.media === "video" && slide.video_url ? (
              <video
                src={slide.video_url}
                poster={slide.image_url}
                controls
                playsInline
                preload="metadata"
                aria-label={title}
                className="absolute inset-0 size-full bg-black object-contain"
              />
            ) : (
              <SlideImage slide={slide} size="full" large />
            )}
          </div>

          <p className="mt-5 text-sm text-muted">
            <span className="text-fg/90">{slide.talk_title || "Open session"}</span>
            {/* Hosted rooms: the talk is named after the room, so don't say it twice. */}
            {roomName !== slide.talk_title && (
              <>
                <span aria-hidden="true"> · </span>
                {roomName}
              </>
            )}
            <span aria-hidden="true"> · </span>
            <span className="tabular-nums">{formatTime(slide.taken_at)}</span>
          </p>
          <h2 id="sheet-title" lang={textLang} className="mt-1.5 text-[28px] leading-[1.15] font-semibold tracking-tight text-balance">
            {title}
          </h2>
          {slide.status === "pending" ? (
            <p className="mt-3 flex items-center gap-2 text-[15px] text-muted">
              <ClockIcon size={18} />
              <span>Waiting for host. Only you can see it for now.</span>
            </p>
          ) : (
            !photo && (
              <p className="mt-3 flex items-center gap-2 text-[15px] text-muted">
                <UsersIcon size={18} />
                <span>
                  Snapped by <span className="font-semibold text-fg tabular-nums">{snaps}</span>{" "}
                  {snaps === 1 ? "person" : "people"}
                </span>
              </p>
            )
          )}

          <div className="mt-5 grid grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={toggleRead}
              aria-pressed={speaking}
              className={`flex h-14 items-center justify-center gap-2.5 rounded-2xl text-[17px] font-semibold transition-colors active:scale-[0.98] ${
                speaking ? "bg-accent text-on-accent" : "bg-fg text-canvas"
              }`}
            >
              {speaking ? <StopIcon size={22} /> : <SpeakerIcon size={22} />}
              {speaking ? "Stop" : "Read aloud"}
            </button>
            <label className="relative flex h-14 items-center justify-center gap-2.5 rounded-2xl border border-line-strong text-[17px] font-semibold focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-accent">
              <TranslateIcon size={22} />
              <span className="truncate">{lang ? lang.label : "Translate"}</span>
              <select
                aria-label="Translate slide"
                value={lang?.code ?? ""}
                onChange={(e) => chooseLang(e.target.value)}
                className="absolute inset-0 cursor-pointer appearance-none opacity-0"
              >
                <option value="">English (original)</option>
                {LANGS.map((l) => (
                  <option key={l.code} value={l.code}>
                    {l.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div aria-live="polite" className="min-h-0">
            {status === "loading" && (
              <p className="mt-4 text-[15px] text-muted">Translating to {lang?.label}…</p>
            )}
            {status === "error" && <p className="mt-4 text-[15px] text-accent">Couldn&apos;t translate right now. Try again.</p>}
            {translated && lang && status === "idle" && (
              <p className="mt-4 flex items-center justify-between gap-3 rounded-xl border border-line px-4 py-1 text-[15px] text-muted">
                <span>Translated to {lang.label}</span>
                <button type="button" onClick={showOriginal} className="min-h-12 font-semibold text-fg underline-offset-4 hover:underline">
                  Show original
                </button>
              </p>
            )}
          </div>

          {status === "loading" ? (
            <div className="mt-6 space-y-3" aria-hidden="true">
              <div className="shimmer h-5 w-full rounded-md" />
              <div className="shimmer h-5 w-11/12 rounded-md" />
              <div className="shimmer h-5 w-3/4 rounded-md" />
            </div>
          ) : shown.text ? (
            <p lang={textLang} className="mt-6 text-slide whitespace-pre-line text-fg">
              {shown.text}
            </p>
          ) : photo ? null : (
            <p className="mt-6 text-lg text-muted">No readable text on this slide.</p>
          )}

          {shown.alt && status !== "loading" && (
            <section aria-label={altLabel} className="mt-7 rounded-2xl border border-line bg-canvas/50 p-5">
              <h3 className="flex items-center gap-2 text-xs font-medium tracking-wider text-muted uppercase">
                {photo ? <ImageIcon size={16} /> : <DiagramIcon size={16} />}
                {altLabel}
              </h3>
              <p lang={textLang} className="mt-2.5 text-lg leading-relaxed text-fg/90">
                {shown.alt}
              </p>
            </section>
          )}
          <div className="h-8" />
        </div>
      </div>
    </div>
  );
}
