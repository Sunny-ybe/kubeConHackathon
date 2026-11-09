import type { Metadata } from "next";
import QRCode from "qrcode";
import { DEMO_ROOM } from "@/lib/config";
import { LiveBoard } from "@/components/live/LiveBoard";

export const metadata: Metadata = { title: "Backrow Live" };

export default async function LivePage() {
  const base = (process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000").replace(/\/$/, "");
  const joinUrl = `${base}/r/${DEMO_ROOM}`;
  const qrDataUrl = await QRCode.toDataURL(joinUrl, { width: 392, margin: 0, errorCorrectionLevel: "M" });
  return <LiveBoard qrDataUrl={qrDataUrl} joinUrl={joinUrl} />;
}
