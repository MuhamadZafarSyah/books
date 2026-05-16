import "server-only";

import {
  callGemini,
  GeminiError,
  type GeminiRequest,
  type GeminiResult,
} from "@/lib/ai/gemini";

function readApiKeys(): string[] {
  const raw = process.env.GEMINI_API_KEYS ?? "";
  return raw
    .split(",")
    .map((value) => value.trim())
    .filter((value) => value.length > 0);
}

function maskKey(key: string) {
  if (key.length <= 8) return "***";
  return `${key.slice(0, 4)}…${key.slice(-4)}`;
}

export class GeminiAllKeysFailedError extends Error {
  attempts: Array<{ keyMask: string; error: GeminiError }>;

  constructor(attempts: Array<{ keyMask: string; error: GeminiError }>) {
    super("All Gemini API keys failed");
    this.name = "GeminiAllKeysFailedError";
    this.attempts = attempts;
  }
}

export class GeminiNotConfiguredError extends Error {
  constructor() {
    super("GEMINI_API_KEYS is not configured");
    this.name = "GeminiNotConfiguredError";
  }
}

/**
 * Try Gemini with each configured API key in order. Switches to the next
 * key only on retryable errors (rate-limits, transient server/network
 * issues). Bad-request / auth / parse errors short-circuit and surface
 * immediately because they will not get better with another key.
 */
export async function callGeminiWithRetry(
  request: GeminiRequest,
): Promise<GeminiResult> {
  const keys = readApiKeys();
  if (keys.length === 0) throw new GeminiNotConfiguredError();

  const attempts: Array<{ keyMask: string; error: GeminiError }> = [];

  for (const key of keys) {
    try {
      return await callGemini(key, request);
    } catch (error) {
      const wrapped =
        error instanceof GeminiError
          ? error
          : new GeminiError(
              "unknown",
              error instanceof Error ? error.message : "Unknown Gemini error",
            );

      attempts.push({ keyMask: maskKey(key), error: wrapped });
      console.warn(
        `[gemini] key ${maskKey(key)} failed (${wrapped.kind})`,
        wrapped.message,
      );

      if (!wrapped.isRetryable()) {
        // Hard failure, no point in trying more keys.
        throw wrapped;
      }
    }
  }

  throw new GeminiAllKeysFailedError(attempts);
}
