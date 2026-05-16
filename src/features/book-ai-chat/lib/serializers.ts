import type { BookAiConversation, BookAiMessage, Prisma } from "@prisma/client";

import type {
  BookAiConversationSummary,
  BookAiConversationDetail,
  BookAiMessageSummary,
  BookContextSnapshot,
} from "@/features/book-ai-chat/types";

function readContextSnapshot(
  raw: Prisma.JsonValue | null | undefined,
  fallbackTitle: string,
  fallbackAuthor: string,
): BookContextSnapshot {
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
          : fallbackTitle,
      subtitle:
        typeof candidate.subtitle === "string" ? candidate.subtitle : null,
      authorText:
        typeof candidate.authorText === "string" && candidate.authorText.length > 0
          ? candidate.authorText
          : fallbackAuthor,
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
    id: "",
    workKey: null,
    editionKey: null,
    title: fallbackTitle,
    subtitle: null,
    authorText: fallbackAuthor,
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

export function serializeBookAiMessage(
  message: Pick<BookAiMessage, "id" | "role" | "body" | "createdAt">,
): BookAiMessageSummary {
  return {
    id: message.id,
    role: message.role,
    body: message.body,
    createdAt: message.createdAt.toISOString(),
  };
}

export function serializeBookAiConversationSummary(
  conversation: Pick<
    BookAiConversation,
    | "id"
    | "title"
    | "bookTitle"
    | "bookAuthor"
    | "bookCoverUrl"
    | "lastMessageAt"
    | "updatedAt"
  >,
): BookAiConversationSummary {
  return {
    id: conversation.id,
    title: conversation.title,
    bookTitle: conversation.bookTitle,
    bookAuthor: conversation.bookAuthor,
    bookCoverUrl: conversation.bookCoverUrl ?? null,
    lastMessageAt: conversation.lastMessageAt?.toISOString() ?? null,
    updatedAt: conversation.updatedAt.toISOString(),
  };
}

export function serializeBookAiConversationDetail(
  conversation: BookAiConversation & { messages: BookAiMessage[] },
): BookAiConversationDetail {
  const context = readContextSnapshot(
    conversation.contextJson,
    conversation.bookTitle,
    conversation.bookAuthor,
  );

  return {
    ...serializeBookAiConversationSummary(conversation),
    openLibraryUrl: conversation.openLibraryUrl ?? null,
    context,
    messages: conversation.messages.map(serializeBookAiMessage),
  };
}
