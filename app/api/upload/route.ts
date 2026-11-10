import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import type { VideoUploadPayload } from "@/lib/types";
import { MAX_VIDEO_BYTES, VIDEO_TYPES } from "@/lib/config";
import { hostedRoom } from "../room/hosted";

export const runtime = "nodejs";

/**
 * Client-token endpoint for direct phone-to-Blob video uploads (SPEC §15). Hosted rooms only.
 * The client calls upload(`videos/<room>/<name>`, file, { handleUploadUrl: "/api/upload", clientPayload }).
 */
export async function POST(req: Request) {
  let body: HandleUploadBody;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Send JSON" }, { status: 400 });
  }

  // Validate before handleUpload so a bad request gets a clear 400/403, token or not.
  if (body?.type === "blob.generate-client-token") {
    let payload: Partial<VideoUploadPayload> | null = null;
    try {
      payload = JSON.parse(body.payload?.clientPayload ?? "");
    } catch {}
    const room = typeof payload?.room === "string" ? payload.room.trim() : "";
    const deviceId = typeof payload?.device_id === "string" ? payload.device_id.trim() : "";
    if (!room || !deviceId) return Response.json({ error: "Send room and device_id" }, { status: 400 });
    if (!String(body.payload?.pathname ?? "").startsWith(`videos/${room}/`)) {
      return Response.json({ error: `Upload to videos/${room}/…` }, { status: 400 });
    }
    try {
      if (!(await hostedRoom(room))) {
        return Response.json({ error: "Videos can only be shared in rooms started on Backrow" }, { status: 403 });
      }
    } catch (err) {
      console.error("upload room lookup failed", err);
      return Response.json({ error: "Could not check this room. Try again." }, { status: 500 });
    }
  } else if (body?.type !== "blob.upload-completed") {
    return Response.json({ error: "Unknown upload event" }, { status: 400 });
  }

  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return Response.json({ error: "Video uploads aren't set up yet" }, { status: 503 });
  }
  try {
    const result = await handleUpload({
      body,
      request: req,
      onBeforeGenerateToken: async () => ({
        allowedContentTypes: [...VIDEO_TYPES],
        maximumSizeInBytes: MAX_VIDEO_BYTES,
        addRandomSuffix: true,
      }),
    });
    return Response.json(result);
  } catch (err) {
    console.error("upload token failed", err);
    return Response.json({ error: (err as Error).message }, { status: 400 });
  }
}
