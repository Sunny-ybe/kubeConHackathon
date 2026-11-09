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

export async function readSlide(jpeg: Buffer): Promise<SlideReading> {
  // PNG magic bytes; everything else is sent as JPEG (the client always resizes to JPEG).
  const isPng = jpeg.subarray(0, 4).toString("hex") === "89504e47";
  const raw = await claudeJSON<Partial<SlideReading>>({
    prompt: VISION_PROMPT,
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
