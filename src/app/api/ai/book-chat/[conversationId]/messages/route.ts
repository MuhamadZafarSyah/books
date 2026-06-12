import { NextResponse, type NextRequest } from "next/server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  AiAllKeysFailedError,
  AiNotConfiguredError,
  AiProviderError,
  callAiWithRetry,
  type AiChatMessage,
} from "@/lib/ai/provider";
import {
  buildSystemInstruction,
  getFallbackUnavailableMessage,
  RESPONSE_SCHEMA,
} from "@/features/book-ai-chat/lib/prompt";
import { enforceScope } from "@/features/book-ai-chat/lib/scope-guard";
import { serializeBookAiMessage } from "@/features/book-ai-chat/lib/serializers";
import type { BookContextSnapshot } from "@/features/book-ai-chat/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BODY_LENGTH = 2000;
const HISTORY_FOR_MODEL = 16;

type IncomingPayload = {
  message?: unknown;
};

type ContextRow = {
  id: string;
  bookTitle: string;
  bookAuthor: string;
  contextJson: unknown;
};

function readSnapshot(row: ContextRow): BookContextSnapshot {
  const raw = row.contextJson;
  if (raw && typeof raw === "object" && !Array.isArray(raw)) {
    const candidate = raw as Record<string, unknown>;
    return {
      id: typeof candidate.id === "string" ? candidate.id : "",
      workKey: typeof candidate.workKey === "string" ? candidate.workKey : null,
      editionKey:
        typeof candidate.editionKey === "string" ? candidate.editionKey : null,
      title:
        typeof candidate.title === "string" && candidate.title.length > 0
          ? candidate.title
          : row.bookTitle,
      subtitle:
        typeof candidate.subtitle === "string" ? candidate.subtitle : null,
      authorText:
        typeof candidate.authorText === "string" &&
        candidate.authorText.length > 0
          ? candidate.authorText
          : row.bookAuthor,
      authors: Array.isArray(candidate.authors)
        ? candidate.authors.filter((value): value is string => typeof value === "string")
        : [],
      coverUrl:
        typeof candidate.coverUrl === "string" ? candidate.coverUrl : null,
      firstPublishYear:
        typeof candidate.firstPublishYear === "number"
          ? candidate.firstPublishYear
          : null,
      publishDate:
        typeof candidate.publishDate === "string" ? candidate.publishDate : null,
      languages: Array.isArray(candidate.languages)
        ? candidate.languages.filter((value): value is string => typeof value === "string")
        : [],
      publishers: Array.isArray(candidate.publishers)
        ? candidate.publishers.filter((value): value is string => typeof value === "string")
        : [],
      subjects: Array.isArray(candidate.subjects)
        ? candidate.subjects.filter((value): value is string => typeof value === "string")
        : [],
      pageCount:
        typeof candidate.pageCount === "number" ? candidate.pageCount : null,
      description:
        typeof candidate.description === "string" ? candidate.description : null,
      openLibraryUrl:
        typeof candidate.openLibraryUrl === "string"
          ? candidate.openLibraryUrl
          : null,
    };
  }

  return {
    id: row.id,
    workKey: null,
    editionKey: null,
    title: row.bookTitle,
    subtitle: null,
    authorText: row.bookAuthor,
    authors: [],
    coverUrl: null,
    firstPublishYear: null,
    publishDate: null,
    languages: [],
    publishers: [],
    subjects: [],
    pageCount: null,
    description: null,
    openLibraryUrl: null,
  };
}

/**
 * POST /api/ai/book-chat/[conversationId]/messages
 *
 * Body: { message: string }
 *
 * Persists the user message, generates an assistant reply via the configured
 * AI provider with retry, enforces scope server-side, persists the assistant
 * reply, and returns both serialized messages.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ conversationId: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { conversationId } = await params;
  if (!conversationId) {
    return NextResponse.json(
      { error: "Conversation tidak valid." },
      { status: 400 },
    );
  }

  let payload: IncomingPayload;
  try {
    payload = (await request.json()) as IncomingPayload;
  } catch {
    return NextResponse.json(
      { error: "Body tidak valid." },
      { status: 400 },
    );
  }

  const trimmed =
    typeof payload.message === "string" ? payload.message.trim() : "";
  if (!trimmed) {
    return NextResponse.json(
      { error: "Pesan tidak boleh kosong." },
      { status: 400 },
    );
  }
  if (trimmed.length > MAX_BODY_LENGTH) {
    return NextResponse.json(
      { error: "Pesan terlalu panjang." },
      { status: 400 },
    );
  }

  const conversation = await prisma.bookAiConversation.findFirst({
    where: { id: conversationId, userId: session.user.id },
    select: {
      id: true,
      bookTitle: true,
      bookAuthor: true,
      contextJson: true,
    },
  });

  if (!conversation) {
    return NextResponse.json(
      { error: "Conversation tidak ditemukan." },
      { status: 404 },
    );
  }

  const snapshot = readSnapshot(conversation);

  // 1) Persist the user message and read the recent history (in-tx so the
  //    new message is included in the model's context).
  const { userMessage, history } = await prisma.$transaction(async (tx) => {
    const created = await tx.bookAiMessage.create({
      data: {
        conversationId: conversation.id,
        role: "USER",
        body: trimmed,
      },
    });
    await tx.bookAiConversation.update({
      where: { id: conversation.id },
      data: { lastMessageAt: created.createdAt },
    });
    const recent = await tx.bookAiMessage.findMany({
      where: { conversationId: conversation.id },
      orderBy: { createdAt: "desc" },
      take: HISTORY_FOR_MODEL,
      select: { role: true, body: true },
    });
    return { userMessage: created, history: recent.reverse() };
  });

  // 2) Build prompt + history payload.
  const messages: AiChatMessage[] = history.map((message) => ({
    role: message.role === "USER" ? "user" : "assistant",
    content: message.body,
  }));

  // 3) Call the configured AI provider. Translate every failure mode into
  //    a controlled assistant response so the user always gets a final
  //    bubble, even on outage.
  let assistantBody: string;
  try {
    const result = await callAiWithRetry({
      systemInstruction: buildSystemInstruction(snapshot),
      messages,
      responseSchema: RESPONSE_SCHEMA as unknown as Record<string, unknown>,
      temperature: 0.6,
      maxOutputTokens: 1024,
    });
    const guarded = enforceScope(result.text);
    assistantBody = guarded.text;
  } catch (error) {
    if (error instanceof AiNotConfiguredError) {
      console.error("[book-ai] AI provider not configured", error.message);
      assistantBody = getFallbackUnavailableMessage();
    } else if (error instanceof AiAllKeysFailedError) {
      console.error(
        "[book-ai] All AI provider keys failed",
        error.attempts.map((attempt) => ({
          provider: attempt.provider,
          model: attempt.model,
          key: attempt.keyMask,
          kind: attempt.error.kind,
          message: attempt.error.message,
        })),
      );
      assistantBody = getFallbackUnavailableMessage();
    } else if (error instanceof AiProviderError) {
      console.error(
        "[book-ai] AI provider error",
        error.provider,
        error.kind,
        error.message,
      );
      assistantBody = getFallbackUnavailableMessage();
    } else {
      console.error("[book-ai] Unexpected error", error);
      assistantBody = getFallbackUnavailableMessage();
    }
  }

  // 4) Persist the assistant reply.
  const assistantMessage = await prisma.bookAiMessage.create({
    data: {
      conversationId: conversation.id,
      role: "ASSISTANT",
      body: assistantBody,
    },
  });
  await prisma.bookAiConversation.update({
    where: { id: conversation.id },
    data: { lastMessageAt: assistantMessage.createdAt },
  });

  return NextResponse.json({
    userMessage: serializeBookAiMessage(userMessage),
    assistantMessage: serializeBookAiMessage(assistantMessage),
  });
}
