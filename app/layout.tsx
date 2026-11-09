// Placeholder so the app builds. Agent B owns this file and replaces it.
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = { title: "Backrow" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
