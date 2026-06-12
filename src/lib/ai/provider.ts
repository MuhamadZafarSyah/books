import "server-only";

import {
  callGemini,
  GeminiError,
  type GeminiContent,
} from "@/lib/ai/gemini";

const DEFAULT_GEMINI_MODEL = "gemini-2.0-flash";
const DEFAULT_TIMEOUT_MS = 25_000;
const OPENAI_CHAT_COMPLETIONS_URL = "https://api.openai.com/v1/chat/completions";
const OPENROUTER_CHAT_COMPLETIONS_URL =
  "https://openrouter.ai/api/v1/chat/completions";

export type AiProvider = "gemini" | "openrouter" | "openai";

export type AiChatMessage = {
  role: "user" | "assistant";
  content: string;
};

export type AiChatRequest = {
  systemInstruction: string;
  messages: AiChatMessage[];
  /** Optional JSON schema. Gemini enforces it; OpenAI-compatible providers rely on prompt JSON rules. */
  responseSchema?: Record<string, unknown>;
  temperature?: number;
  maxOutputTokens?: number;
};

export type AiChatResult = {
  text: string;
  finishReason: string | null;
  provider: AiProvider;
  model: string;
};

export type AiErrorKind =
  | "rate-limit"
  | "auth"
  | "bad-request"
  | "server"
  | "timeout"
  | "network"
  | "parse"
  | "unknown";

export class AiProviderError extends Error {
  kind: AiErrorKind;
  provider: AiProvider;
  status?: number;

  constructor(
    provider: AiProvider,
    kind: AiErrorKind,
    message: string,
    status?: number,
  ) {
    super(message);
    this.name = "AiProviderError";
    this.provider = provider;
    this.kind = kind;
    this.status = status;
  }

  isRetryable() {
    return (
      this.kind === "rate-limit" ||
      this.kind === "server" ||
      this.kind === "timeout" ||
      this.kind === "network"
    );
  }
}

export class AiNotConfiguredError extends Error {
  constructor(message = "AI_API_KEY and AI_MODEL are not configured") {
    super(message);
    this.name = "AiNotConfiguredError";
  }
}

export class AiAllKeysFailedError extends Error {
  attempts: Array<{
    provider: AiProvider;
    model: string;
    keyMask: string;
    error: AiProviderError;
  }>;

  constructor(
    attempts: Array<{
      provider: AiProvider;
      model: string;
      keyMask: string;
      error: AiProviderError;
    }>,
  ) {
    super("All AI API keys failed");
    this.name = "AiAllKeysFailedError";
    this.attempts = attempts;
  }
}

type AiConfig = {
  provider: AiProvider;
  model: string;
  keys: string[];
  timeoutMs: number;
};

type OpenAiCompatibleMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

type OpenAiCompatibleRequestBody = {
  model: string;
  messages: OpenAiCompatibleMessage[];
  temperature: number;
  max_tokens: number;
  response_format?: { type: "json_object" };
};

type RawOpenAiCompatibleResponse = {
  choices?: Array<{
    message?: { content?: unknown };
    finish_reason?: string | null;
  }>;
  error?: { message?: string; type?: string; code?: string | number };
};

function readFirstEnv(names: string[]) {
  for (const name of names) {
    const value = process.env[name]?.trim();
    if (value) return value;
  }
  return "";
}

function splitKeys(raw: string) {
  return raw
    .split(",")
    .map((value) => value.trim())
    .filter((value) => value.length > 0);
}

function maskKey(key: string) {
  if (key.length <= 8) return "***";
  return `${key.slice(0, 4)}...${key.slice(-4)}`;
}

function getTimeoutMs() {
  const raw = Number(process.env.AI_TIMEOUT_MS ?? process.env.GEMINI_TIMEOUT_MS ?? "");
  return Number.isFinite(raw) && raw > 0 ? raw : DEFAULT_TIMEOUT_MS;
}

function detectProvider(model: string, key: string): AiProvider {
  const normalizedModel = model.toLowerCase();
  const normalizedKey = key.toLowerCase();

  if (normalizedKey.startsWith("sk-or-")) {
    return "openrouter";
  }

  if (
    normalizedModel.startsWith("gemini-") ||
    normalizedModel.startsWith("models/gemini-")
  ) {
    return "gemini";
  }

  if (normalizedModel.includes("/")) {
    return "openrouter";
  }

  return "openai";
}

function resolveAiConfig(): AiConfig {
  const primaryKeys = readFirstEnv(["AI_API_KEY", "API_KEY"]);
  const legacyGeminiKeys = process.env.GEMINI_API_KEYS?.trim() ?? "";
  const rawKeys = primaryKeys || legacyGeminiKeys;

  if (!rawKeys) {
    throw new AiNotConfiguredError("AI_API_KEY or API_KEY is not configured");
  }

  const keys = splitKeys(rawKeys);
  if (keys.length === 0) {
    throw new AiNotConfiguredError("AI_API_KEY or API_KEY is empty");
  }

  const model =
    readFirstEnv(["AI_MODEL", "MODEL", "GEMINI_MODEL"]) ||
    (!primaryKeys && legacyGeminiKeys ? DEFAULT_GEMINI_MODEL : "");

  if (!model) {
    throw new AiNotConfiguredError("AI_MODEL or MODEL is not configured");
  }

  return {
    provider: detectProvider(model, keys[0]),
    model,
    keys,
    timeoutMs: getTimeoutMs(),
  };
}

function mapStatusToErrorKind(status: number, message: string): AiErrorKind {
  if (status === 429) return "rate-limit";
  if (status === 401 || status === 403) {
    const lowered = message.toLowerCase();
    if (
      lowered.includes("quota") ||
      lowered.includes("rate") ||
      lowered.includes("resource_exhausted") ||
      lowered.includes("rate_limit_exceeded")
    ) {
      return "rate-limit";
    }
    return "auth";
  }
  if (status >= 500) return "server";
  return "bad-request";
}

function mapGeminiError(error: unknown): AiProviderError {
  if (error instanceof GeminiError) {
    return new AiProviderError("gemini", error.kind, error.message, error.status);
  }

  return new AiProviderError(
    "gemini",
    "unknown",
    error instanceof Error ? error.message : "Unknown Gemini error",
  );
}

function extractTextContent(content: unknown) {
  if (typeof content === "string") return content.trim();
  if (!Array.isArray(content)) return "";

  return content
    .map((part) => {
      if (!part || typeof part !== "object") return "";
      const candidate = part as { text?: unknown; content?: unknown };
      if (typeof candidate.text === "string") return candidate.text;
      if (typeof candidate.content === "string") return candidate.content;
      return "";
    })
    .join("")
    .trim();
}

async function callGeminiProvider(
  apiKey: string,
  model: string,
  request: AiChatRequest,
): Promise<AiChatResult> {
  const contents: GeminiContent[] = request.messages.map((message) => ({
    role: message.role === "assistant" ? "model" : "user",
    parts: [{ text: message.content }],
  }));

  try {
    const result = await callGemini(apiKey, {
      systemInstruction: request.systemInstruction,
      contents,
      model,
      responseSchema: request.responseSchema,
      temperature: request.temperature,
      maxOutputTokens: request.maxOutputTokens,
    });

    return {
      text: result.text,
      finishReason: result.finishReason,
      provider: "gemini",
      model,
    };
  } catch (error) {
    throw mapGeminiError(error);
  }
}

async function callOpenAiCompatibleProvider(
  provider: "openrouter" | "openai",
  apiKey: string,
  model: string,
  timeoutMs: number,
  request: AiChatRequest,
): Promise<AiChatResult> {
  const url =
    provider === "openrouter"
      ? OPENROUTER_CHAT_COMPLETIONS_URL
      : OPENAI_CHAT_COMPLETIONS_URL;
  const headers: Record<string, string> = {
    authorization: `Bearer ${apiKey}`,
    "content-type": "application/json",
  };

  if (provider === "openrouter") {
    headers["http-referer"] = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    headers["x-title"] = "Shelfgram";
  }

  const body: OpenAiCompatibleRequestBody = {
    model,
    messages: [
      { role: "system", content: request.systemInstruction },
      ...request.messages,
    ],
    temperature: request.temperature ?? 0.6,
    max_tokens: request.maxOutputTokens ?? 1024,
  };

  if (provider === "openai" && request.responseSchema) {
    body.response_format = { type: "json_object" };
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  let response: Response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
      signal: controller.signal,
      cache: "no-store",
    });
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new AiProviderError(provider, "timeout", "AI request timed out");
    }
    throw new AiProviderError(
      provider,
      "network",
      error instanceof Error ? error.message : "Network error",
    );
  }
  clearTimeout(timeoutId);

  let payload: RawOpenAiCompatibleResponse;
  try {
    payload = (await response.json()) as RawOpenAiCompatibleResponse;
  } catch (error) {
    throw new AiProviderError(
      provider,
      "parse",
      error instanceof Error ? error.message : "Failed to parse AI response",
      response.status,
    );
  }

  if (!response.ok) {
    const message = payload.error?.message ?? `AI HTTP ${response.status}`;
    throw new AiProviderError(
      provider,
      mapStatusToErrorKind(response.status, message),
      message,
      response.status,
    );
  }

  const choice = payload.choices?.[0];
  const text = extractTextContent(choice?.message?.content);
  if (!text) {
    throw new AiProviderError(provider, "parse", "AI returned an empty response");
  }

  return {
    text,
    finishReason: choice?.finish_reason ?? null,
    provider,
    model,
  };
}

async function callConfiguredProvider(
  apiKey: string,
  config: AiConfig,
  request: AiChatRequest,
) {
  if (config.provider === "gemini") {
    return callGeminiProvider(apiKey, config.model, request);
  }

  return callOpenAiCompatibleProvider(
    config.provider,
    apiKey,
    config.model,
    config.timeoutMs,
    request,
  );
}

export async function callAiWithRetry(
  request: AiChatRequest,
): Promise<AiChatResult> {
  const config = resolveAiConfig();
  const attempts: AiAllKeysFailedError["attempts"] = [];

  for (const key of config.keys) {
    try {
      return await callConfiguredProvider(key, config, request);
    } catch (error) {
      const wrapped =
        error instanceof AiProviderError
          ? error
          : new AiProviderError(
              config.provider,
              "unknown",
              error instanceof Error ? error.message : "Unknown AI error",
            );

      attempts.push({
        provider: config.provider,
        model: config.model,
        keyMask: maskKey(key),
        error: wrapped,
      });
      console.warn(
        `[ai] ${config.provider} model ${config.model} key ${maskKey(key)} failed (${wrapped.kind})`,
        wrapped.message,
      );

      if (!wrapped.isRetryable()) {
        throw wrapped;
      }
    }
  }

  throw new AiAllKeysFailedError(attempts);
}
