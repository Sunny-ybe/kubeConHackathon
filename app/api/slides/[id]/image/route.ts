import { SLIDES_INDEX } from "@/lib/config";
import { es } from "@/lib/server/es";

export const dynamic = "force-dynamic";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const field = new URL(req.url).searchParams.get("size") === "thumb" ? "thumb" : "image";
  try {
    const res = await es().get<Record<string, string>>({ index: SLIDES_INDEX, id, _source_includes: [field] });
    const b64 = res.found ? res._source?.[field] : undefined;
    if (!b64) return new Response("Not found", { status: 404 });
    return new Response(Buffer.from(b64, "base64"), {
      headers: { "Content-Type": "image/jpeg", "Cache-Control": "public, max-age=31536000, immutable" },
    });
  } catch (err) {
    if ((err as { meta?: { statusCode?: number } })?.meta?.statusCode === 404) {
      return new Response("Not found", { status: 404 });
    }
    console.error("image fetch failed", err);
    return new Response("Error", { status: 500 });
  }
}
