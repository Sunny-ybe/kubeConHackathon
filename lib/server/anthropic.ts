// Server-only Claude client + two helpers every route uses. FROZEN.
// Replaces the original OpenAI client (approved by the human).
import Anthropic from "@anthropic-ai/sdk";

let client: Anthropic | null = null;

export function anthropic(): Anthropic {
  if (client) return client;
  if (!process.env.ANTHROPIC_API_KEY) throw new Error("Set ANTHROPIC_API_KEY in .env.local");
  client = new Anthropic({ maxRetries: 1 });
  return client;
}

/** Best price/performance default; override in .env.local. */
export function visionModel(): string {
  return process.env.CLAUDE_VISION_MODEL || "claude-sonnet-5-5";
}

export function textModel(): string {
  return process.env.CLAUDE_TEXT_MODEL || process.env.CLAUDE_VISION_MODEL || "claude-sonnet-5-5";
}

export type ImageInput = { base64: string; mediaType?: "image/jpeg" | "image/png" };

type CallOpts = {
  system?: string;
  prompt: string;
  image?: ImageInput;
  model?: string;
  maxTokens?: number;
  timeoutMs?: number;
};

function content(o: CallOpts): Anthropic.ContentBlockParam[] {
  const blocks: Anthropic.ContentBlockParam[] = [];
  if (o.image) {
    blocks.push({
      type: "image",
      source: { type: "base64", media_type: o.image.mediaType ?? "image/jpeg", data: o.image.base64 },
    });
  }
  blocks.push({ type: "text", text: o.prompt });
  return blocks;
}

/** `between_tools` (no extended thinking) is Sonnet 5.5 only; other models just run at low effort. */
function fast(model: string) {
  return model.startsWith("claude-sonnet-5-5") ? { thinking: { type: "between_tools" } } : {};
}

function textOf(msg: Anthropic.Message): string {
  if (msg.stop_reason === "refusal") throw new Error("Claude declined this request");
  return msg.content
    .map((b) => (b.type === "text" ? b.text : ""))
    .join("")
    .trim();
}

/**
 * Prompt (+ optional image) in, plain text out.
 * Thinking stays minimal (low effort) so calls are fast enough for the demo.
 */
export async function claudeText(o: CallOpts): Promise<string> {
  const model = o.model ?? textModel();
  const msg = await anthropic().messages.create(
    {
      model,
      max_tokens: o.maxTokens ?? 2000,
      ...(o.system ? { system: o.system } : {}),
      ...fast(model),
      output_config: { effort: "low" },
      messages: [{ role: "user", content: content(o) }],
    } as Anthropic.MessageCreateParamsNonStreaming,
    { timeout: o.timeoutMs ?? 45_000 },
  );
  return textOf(msg);
}

/**
 * Prompt (+ optional image) in, JSON out, constrained by a JSON Schema via structured outputs.
 * Schema objects need `additionalProperties: false` and a full `required` list.
 */
export async function claudeJSON<T>(o: CallOpts & { schema: Record<string, unknown> }): Promise<T> {
  const model = o.model ?? visionModel();
  const msg = await anthropic().messages.create(
    {
      model,
      max_tokens: o.maxTokens ?? 2000,
      ...(o.system ? { system: o.system } : {}),
      ...fast(model),
      output_config: { effort: "low", format: { type: "json_schema", schema: o.schema } },
      messages: [{ role: "user", content: content(o) }],
    } as Anthropic.MessageCreateParamsNonStreaming,
    { timeout: o.timeoutMs ?? 20_000 },
  );
  return JSON.parse(textOf(msg)) as T;
}
