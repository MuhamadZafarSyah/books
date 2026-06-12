import "server-only";

const DEFAULT_MODEL = "gemini-2.0-flash";
const DEFAULT_TIMEOUT_MS = 25_000;

export type GeminiContent = {
  role: "user" | "model";
  parts: Array<{ text: string }>;
};

export type GeminiRequest = {
  systemInstruction: string;
  contents: GeminiContent[];
  /** Optional model override for provider-agnostic callers. */
  model?: string;
  /** Optional JSON schema for `responseMimeType: application/json`. */
  responseSchema?: Record<string, unknown>;
  /** Optional generation config overrides. */
  temperature?: number;
  maxOutputTokens?: number;
};

export type GeminiResult = {
  text: string;
  finishReason: string | null;
};

export type GeminiErrorKind =
  | "rate-limit"
  | "auth"
  | "bad-request"
  | "server"
  | "timeout"
  | "network"
  | "parse"
  | "unknown";

export class GeminiError extends Error {
  kind: GeminiErrorKind;
  status?: number;

  constructor(kind: GeminiErrorKind, message: string, status?: number) {
    super(message);
    this.name = "GeminiError";
    this.kind = kind;
    this.status = status;
  }

  /**
   * Whether this error is worth retrying with the next API key. Rate limits
   * and transient server/network errors are retryable; bad request, auth
   * problems, and parse failures are not.
   */
  isRetryable() {
    return (
      this.kind === "rate-limit" ||
      this.kind === "server" ||
      this.kind === "timeout" ||
      this.kind === "network"
    );
  }
}

export function getGeminiModel(modelOverride?: string) {
  return (modelOverride ?? process.env.GEMINI_MODEL ?? DEFAULT_MODEL).trim() || DEFAULT_MODEL;
}

export function getGeminiTimeout() {
  const raw = Number(process.env.AI_TIMEOUT_MS ?? process.env.GEMINI_TIMEOUT_MS ?? "");
  return Number.isFinite(raw) && raw > 0 ? raw : DEFAULT_TIMEOUT_MS;
}

type RawCandidate = {
  content?: { parts?: Array<{ text?: string }> };
  finishReason?: string;
};

type RawResponse = {
  candidates?: RawCandidate[];
  promptFeedback?: { blockReason?: string };
  error?: { code?: number; status?: string; message?: string };
};

/**
 * Single low-level call to Gemini. Returns text on success or throws a
 * `GeminiError` so the retry layer can decide what to do.
 */
export async function callGemini(
  apiKey: string,
  request: GeminiRequest,
): Promise<GeminiResult> {
  const model = getGeminiModel(request.model);
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
    model,
  )}:generateContent?key=${encodeURIComponent(apiKey)}`;

  const body: Record<string, unknown> = {
    systemInstruction: {
      role: "system",
      parts: [{ text: request.systemInstruction }],
    },
    contents: request.contents,
    generationConfig: {
      temperature: request.temperature ?? 0.6,
      maxOutputTokens: request.maxOutputTokens ?? 1024,
      responseMimeType: request.responseSchema
        ? "application/json"
        : "text/plain",
      ...(request.responseSchema
        ? { responseSchema: request.responseSchema }
        : {}),
    },
  };

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), getGeminiTimeout());

  let response: Response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
      signal: controller.signal,
      cache: "no-store",
    });
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new GeminiError("timeout", "Gemini request timed out");
    }
    throw new GeminiError(
      "network",
      error instanceof Error ? error.message : "Network error",
    );
  }
  clearTimeout(timeoutId);

  if (!response.ok) {
    const status = response.status;
    let message = `Gemini HTTP ${status}`;
    try {
      const data = (await response.json()) as RawResponse;
      if (data.error?.message) message = data.error.message;
    } catch {
      // ignore body parse error
    }
    if (status === 429) throw new GeminiError("rate-limit", message, status);
    if (status === 503) throw new GeminiError("server", message, status);
    if (status === 401 || status === 403) {
      // 403 with `RATE_LIMIT_EXCEEDED` / `RESOURCE_EXHAUSTED` should be a
      // rate-limit, not a permanent auth failure.
      const lowered = message.toLowerCase();
      if (
        lowered.includes("quota") ||
        lowered.includes("rate") ||
        lowered.includes("resource_exhausted") ||
        lowered.includes("rate_limit_exceeded")
      ) {
        throw new GeminiError("rate-limit", message, status);
      }
      throw new GeminiError("auth", message, status);
    }
    if (status >= 500) throw new GeminiError("server", message, status);
    throw new GeminiError("bad-request", message, status);
  }

  let payload: RawResponse;
  try {
    payload = (await response.json()) as RawResponse;
  } catch (error) {
    throw new GeminiError(
      "parse",
      error instanceof Error ? error.message : "Failed to parse Gemini response",
    );
  }

  const candidate = payload.candidates?.[0];
  const text =
    candidate?.content?.parts
      ?.map((part) => part.text ?? "")
      .join("")
      .trim() ?? "";

  if (!text) {
    throw new GeminiError("parse", "Gemini returned an empty response");
  }

  return { text, finishReason: candidate?.finishReason ?? null };
}
