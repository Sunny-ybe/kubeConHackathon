import QRCode from "qrcode";
import { DEMO_ROOM } from "@/lib/config";
import { roomName, rooms } from "@/components/schedule";
import { BackrowMark } from "@/components/icons";

export const metadata = { title: "QR codes · Backrow" };

const base = (process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000").replace(/\/$/, "");
const roomUrl = (room: string) => `${base}/r/${encodeURIComponent(room)}`;
const display = (url: string) => url.replace(/^https?:\/\//, "");
const qr = (url: string) => QRCode.toDataURL(url, { width: 512, margin: 1 });

/** Printable QR codes: one huge demo code, then one per room. White page so it prints cleanly. */
export default async function QrPage() {
  const demoUrl = roomUrl(DEMO_ROOM);
  const [demoQr, ...roomQrs] = await Promise.all([demoUrl, ...rooms.map((r) => roomUrl(r.room))].map(qr));

  return (
    <div className="min-h-dvh bg-white text-black print:min-h-0">
      <main className="mx-auto max-w-5xl px-6 py-10 sm:px-10 sm:py-14">
        <section
          aria-labelledby="demo-qr"
          className="grid items-center gap-8 border-b border-black/10 pb-12 md:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] md:gap-14 print:break-after-page print:border-0"
        >
          <div>
            <p className="flex items-center gap-2 text-[15px] font-semibold tracking-tight">
              <BackrowMark size={22} />
              Backrow
            </p>
            <h1 id="demo-qr" className="mt-6 text-5xl leading-[1.02] font-semibold tracking-[-0.035em] sm:text-7xl">
              Snap this slide.
            </h1>
            <p className="mt-5 max-w-[30ch] text-xl leading-snug text-black/60">
              Scan to join {roomName(DEMO_ROOM)}, then tap <span className="font-semibold text-black">Snap a slide</span>.
            </p>
            <p className="mt-6 font-mono text-base text-black/70">{display(demoUrl)}</p>
          </div>
          {/* eslint-disable-next-line @next/next/no-img-element -- data URL */}
          <img
            src={demoQr}
            alt={`QR code for ${display(demoUrl)}`}
            width={512}
            height={512}
            className="aspect-square w-full max-w-[480px] justify-self-center [image-rendering:pixelated] md:justify-self-end"
          />
        </section>

        <section aria-labelledby="rooms-qr" className="pt-12">
          <h2 id="rooms-qr" className="text-sm font-semibold tracking-wider text-black/60 uppercase">
            Every room
          </h2>
          <ul className="mt-6 grid grid-cols-2 gap-x-6 gap-y-10 sm:grid-cols-3">
            {rooms.map((r, i) => (
              <li key={r.room} className="break-inside-avoid">
                {/* eslint-disable-next-line @next/next/no-img-element -- data URL */}
                <img
                  src={roomQrs[i]}
                  alt={`QR code for ${r.name}`}
                  width={512}
                  height={512}
                  className="aspect-square w-full rounded-lg border border-black/10 p-2 [image-rendering:pixelated]"
                />
                <p className="mt-3 text-lg leading-tight font-semibold tracking-tight">{r.name}</p>
                <p className="mt-0.5 truncate font-mono text-[13px] text-black/60">{display(roomUrl(r.room))}</p>
              </li>
            ))}
          </ul>
        </section>
      </main>
    </div>
  );
}
