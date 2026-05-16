import "server-only";

import { REFUSAL_PHRASE } from "@/features/book-ai-chat/lib/prompt-public";

export type GuardedAnswer =
  | { kind: "answer"; text: string }
  | { kind: "refusal"; text: typeof REFUSAL_PHRASE };

export function getRefusalAnswer(): GuardedAnswer {
  return { kind: "refusal", text: REFUSAL_PHRASE };
}

type ParsedModelOutput = {
  inScope: boolean;
  answer: string;
};

function parseModelJson(raw: string): ParsedModelOutput | null {
  if (!raw) return null;

  let text = raw.trim();
  // Strip Markdown code fences if Gemini wraps JSON anyway.
  if (text.startsWith("```")) {
    text = text.replace(/^```(?:json)?\n?/i, "").replace(/```$/, "").trim();
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return null;
  }

  if (!parsed || typeof parsed !== "object") return null;
  const candidate = parsed as { inScope?: unknown; answer?: unknown };
  if (typeof candidate.inScope !== "boolean") return null;
  if (typeof candidate.answer !== "string") return null;

  return { inScope: candidate.inScope, answer: candidate.answer };
}

const SUSPICIOUS_PATTERNS: RegExp[] = [
  /\b(system|developer)\s*(prompt|instruction|message)\b/i,
  /\babaikan\s+(instruksi|aturan|sistem)/i,
  /\bignore\s+(all|previous)\s+instructions\b/i,
  /\bjailbreak\b/i,
  /\boverride\s+(rules|policy|system)\b/i,
];

function looksLikeLeak(text: string) {
  return SUSPICIOUS_PATTERNS.some((pattern) => pattern.test(text));
}

/**
 * Server-side enforcement layer. Any model output that isn't a clean JSON
 * with `inScope: true` and a substantive `answer` is collapsed to the
 * exact refusal phrase. Belt-and-braces for prompt injection.
 */
export function enforceScope(rawModelOutput: string): GuardedAnswer {
  const parsed = parseModelJson(rawModelOutput);
  if (!parsed) return getRefusalAnswer();
  if (!parsed.inScope) return getRefusalAnswer();

  const trimmed = parsed.answer.trim();
  if (trimmed.length === 0) return getRefusalAnswer();
  if (looksLikeLeak(trimmed)) return getRefusalAnswer();

  return { kind: "answer", text: trimmed };
}
