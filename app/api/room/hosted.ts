// Server-only: hosted rooms (SPEC §14). owner_device_id never leaves the server.
import { ROOMS_INDEX } from "@/lib/config";
import { es } from "@/lib/server/es";

export type HostedRoom = { room: string; name: string; owner_device_id: string; created_at: string };

/** The hosted room doc for `room`, or null for scheduled/unknown rooms. */
export async function hostedRoom(room: string): Promise<HostedRoom | null> {
  if (!room) return null;
  try {
    const res = await es().get<HostedRoom>({ index: ROOMS_INDEX, id: room });
    return res.found && res._source ? res._source : null;
  } catch (err) {
    if ((err as { meta?: { statusCode?: number } })?.meta?.statusCode === 404) return null;
    throw err;
  }
}

export function isHost(doc: HostedRoom | null, deviceId: string): boolean {
  return !!doc && !!deviceId && doc.owner_device_id === deviceId;
}
