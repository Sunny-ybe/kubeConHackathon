// Server-only: reads a slide photo with Claude vision (SPEC §7.1).
import { claudeJSON } from "./server/anthropic";

export type SlideReading = {
  is_slide: boolean;
  title: string;
  text: string;
  alt_text: string;
  topics: string[];
};

export const VISION_PROMPT = `You read photos of presentation slides taken by audience members, often from far away,
at an angle, or blurry. Return ONLY a JSON object with these keys:
"is_slide": true if the photo mainly shows a presentation slide or screen content, else false.
"title": the slide's title, or "" if none.
"text": all readable text on the slide in reading order, verbatim, lines separated by \\n.
        Never invent text you cannot read; skip unreadable parts.
"alt_text": 1-3 sentences describing any diagram, chart, code, or image on the slide for
            someone who cannot see it. "" if the slide is only text.
"topics": up to 5 short lowercase topic tags.
Describe only the slide. Never describe people, faces, clothing, or the room.`;

/** Hosted rooms (SPEC §14) accept any photo, so every photo gets a caption and a description. */
export const PHOTO_VISION_PROMPT = `You read photos that people upload to a shared event room: presentation slides, screens,
whiteboards, posters, or any other photo. Return ONLY a JSON object with these keys:
"is_slide": true if the photo mainly shows a presentation slide or screen content, else false.
"title": the slide's title if it is a slide; otherwise a short caption of the photo (max 8 words).
"text": all readable text in the photo in reading order, verbatim, lines separated by \\n.
        Never invent text you cannot read; skip unreadable parts. "" if there is none.
"alt_text": 1-3 sentences describing the image for someone who cannot see it, so it can be
            found later by what it shows (objects, scene, diagrams, charts, code).
"topics": up to 5 short lowercase topic tags.
Never identify or describe people's faces, identity, or clothing; say "a person" at most.`;

export const VISION_SCHEMA = {
  type: "object",
  properties: {
    is_slide: { type: "boolean" },
    title: { type: "string" },
    text: { type: "string" },
    alt_text: { type: "string" },
    topics: { type: "array", items: { type: "string" } },
  },
  required: ["is_slide", "title", "text", "alt_text", "topics"],
  additionalProperties: false,
};

const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");

/** Video poster frames (SPEC §15) use the photo prompt with this prefix. */
export const VIDEO_PREFIX = "This is a frame from a short video.\n";

export async function readSlide(jpeg: Buffer, opts: { photo?: boolean; video?: boolean } = {}): Promise<SlideReading> {
  // PNG magic bytes; everything else is sent as JPEG (the client always resizes to JPEG).
  const isPng = jpeg.subarray(0, 4).toString("hex") === "89504e47";
  const raw = await claudeJSON<Partial<SlideReading>>({
    prompt: opts.video ? VIDEO_PREFIX + PHOTO_VISION_PROMPT : opts.photo ? PHOTO_VISION_PROMPT : VISION_PROMPT,
    image: { base64: jpeg.toString("base64"), mediaType: isPng ? "image/png" : "image/jpeg" },
    schema: VISION_SCHEMA,
    timeoutMs: 20_000,
  });
  return {
    is_slide: raw?.is_slide === true,
    title: str(raw?.title),
    text: str(raw?.text),
    alt_text: str(raw?.alt_text),
    topics: Array.isArray(raw?.topics)
      ? raw.topics.filter((t): t is string => typeof t === "string").map((t) => t.trim().toLowerCase()).filter(Boolean).slice(0, 5)
      : [],
  };
}
