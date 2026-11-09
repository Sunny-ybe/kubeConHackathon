// Server-only tracing helper. FROZEN.
// span() wraps a step in an OpenTelemetry span. With no tracer registered (the default),
// @opentelemetry/api is a no-op, so this costs nothing. It only records data once Dash0
// is switched on through instrumentation.ts (tasks/agent-e-observability.md).
import { SpanStatusCode, trace, type Attributes } from "@opentelemetry/api";

const tracer = trace.getTracer("backrow");

/** Run `fn` inside a span named `name`. Errors are recorded on the span and rethrown. */
export async function span<T>(name: string, fn: () => Promise<T>, attrs?: Attributes): Promise<T> {
  return tracer.startActiveSpan(name, { attributes: attrs }, async (s) => {
    try {
      return await fn();
    } catch (err) {
      s.recordException(err as Error);
      s.setStatus({ code: SpanStatusCode.ERROR, message: (err as Error)?.message });
      throw err;
    } finally {
      s.end();
    }
  });
}
