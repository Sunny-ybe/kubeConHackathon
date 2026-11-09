import { randomBytes } from "node:crypto";
import type { CreateRoomRequest, CreateRoomResponse } from "@/lib/types";
import { HOSTED_ROOM_HOURS, ROOMS_INDEX, TALKS_INDEX } from "@/lib/config";
import { es } from "@/lib/server/es";

export const runtime = "nodejs";

const ADJECTIVES = [
  "Amber", "Bright", "Calm", "Clever", "Cosmic", "Crimson", "Golden", "Happy", "Jade", "Lucky",
  "Mellow", "Misty", "Noble", "Quiet", "Rapid", "Silver", "Sunny", "Swift", "Velvet", "Witty",
];
const NOUNS = [
  "Falcon", "Harbor", "Comet", "Otter", "Maple", "River", "Summit", "Lantern", "Meadow", "Pine",
  "Orbit", "Panda", "Canyon", "Willow", "Badger", "Glacier", "Heron", "Ember", "Fox", "Tide",
];

const pick = <T,>(xs: T[]) => xs[Math.floor(Math.random() * xs.length)];

function slugFor(name: string): string {
  const base =
    name
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 32)
      .replace(/-+$/, "") || "room";
  const suffix = [...randomBytes(4)].map((b) => (b % 36).toString(36)).join("");
  return `${base}-${suffix}`;
}

function bad(message: string) {
  return Response.json({ error: message }, { status: 400 });
}

export async function POST(req: Request) {
  let input: Partial<CreateRoomRequest>;
  try {
    input = await req.json();
  } catch {
    return bad("Send JSON");
  }
  const deviceId = typeof input.device_id === "string" ? input.device_id.trim() : "";
  if (!deviceId || deviceId.length > 100) return bad("Missing device_id");
  const typed = typeof input.name === "string" ? input.name.trim().replace(/\s+/g, " ").slice(0, 40).trim() : "";
  const name = typed || `${pick(ADJECTIVES)} ${pick(NOUNS)}`;

  try {
    let room = slugFor(name);
    for (let i = 0; i < 5 && (await es().exists({ index: ROOMS_INDEX, id: room })); i++) room = slugFor(name);

    const now = new Date();
    const end = new Date(now.getTime() + HOSTED_ROOM_HOURS * 3_600_000);
    // wait_for on both so the creator lands in a room that already resolves and attributes snaps.
    await Promise.all([
      es().index({
        index: ROOMS_INDEX,
        id: room,
        op_type: "create",
        refresh: "wait_for",
        document: { room, name, owner_device_id: deviceId, created_at: now.toISOString() },
      }),
      es().index({
        index: TALKS_INDEX,
        id: room,
        refresh: "wait_for",
        document: {
          talk_id: room,
          room,
          room_name: name,
          title: name,
          speakers: "Hosted on Backrow",
          abstract: "",
          start: now.toISOString(),
          end: end.toISOString(),
        },
      }),
    ]);

    const body: CreateRoomResponse = { room, room_name: name };
    return Response.json(body);
  } catch (err) {
    console.error("create room failed", err);
    return Response.json({ error: "Could not start a room. Try again." }, { status: 500 });
  }
}
