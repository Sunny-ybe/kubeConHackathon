import type { ModerateRequest, ModerateResponse } from "@/lib/types";
import { SLIDES_INDEX } from "@/lib/config";
import { es } from "@/lib/server/es";
import { hostedRoom, isHost } from "../../../room/hosted";

export const runtime = "nodejs";

/** Host approves (status -> approved) or rejects (doc deleted) an upload (SPEC §14). */
export async function POST(req: Request, { params }: { params: Promise<{ room: string }> }) {
  const { room } = await params;
  let input: Partial<ModerateRequest>;
  try {
    input = await req.json();
  } catch {
    return Response.json({ error: "Send JSON" }, { status: 400 });
  }
  const deviceId = typeof input.device_id === "string" ? input.device_id.trim() : "";
  const slideId = typeof input.slide_id === "string" ? input.slide_id.trim() : "";
  const action = input.action;
  if (!slideId || (action !== "approve" && action !== "reject")) {
    return Response.json({ error: "Send slide_id and action approve or reject" }, { status: 400 });
  }

  try {
    if (!isHost(await hostedRoom(room), deviceId)) {
      return Response.json({ error: "Only the host can approve or reject photos" }, { status: 403 });
    }
    // The slide must belong to this room, so a host can't moderate other rooms.
    const doc = await es()
      .get<{ room?: string }>({ index: SLIDES_INDEX, id: slideId, _source_includes: ["room"] })
      .catch((err) => {
        if (err?.meta?.statusCode === 404) return null;
        throw err;
      });
    if (!doc?.found || doc._source?.room !== room) {
      return Response.json({ error: "That photo is not in this room" }, { status: 404 });
    }

    let body: ModerateResponse;
    if (action === "approve") {
      await es().update({ index: SLIDES_INDEX, id: slideId, doc: { status: "approved" }, refresh: "wait_for" });
      body = { ok: true, slide_id: slideId, status: "approved" };
    } else {
      await es().delete({ index: SLIDES_INDEX, id: slideId, refresh: "wait_for" });
      body = { ok: true, slide_id: slideId, status: "deleted" };
    }
    return Response.json(body);
  } catch (err) {
    console.error("moderate failed", err);
    return Response.json({ error: "Could not update that photo. Try again." }, { status: 500 });
  }
}
