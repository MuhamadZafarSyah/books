/**
 * Snapshot of the Open Library book stored alongside an AI conversation.
 * This is the single source of truth used to render the room header AND
 * to seed the model prompt server-side, so the user can never inject a
 * different book context via client payloads.
 */
export type BookContextSnapshot = {
  id: string;
  workKey: string | null;
  editionKey: string | null;
  title: string;
  subtitle: string | null;
  authorText: string;
  authors: string[];
  coverUrl: string | null;
  firstPublishYear: number | null;
  publishDate: string | null;
  languages: string[];
  publishers: string[];
  subjects: string[];
  pageCount: number | null;
  description: string | null;
  openLibraryUrl: string | null;
};

export type BookAiMessageSummary = {
  id: string;
  role: "USER" | "ASSISTANT";
  body: string;
  createdAt: string;
  pending?: boolean;
  failed?: boolean;
};

export type BookAiConversationSummary = {
  id: string;
  title: string;
  bookTitle: string;
  bookAuthor: string;
  bookCoverUrl: string | null;
  lastMessageAt: string | null;
  updatedAt: string;
};

export type BookAiConversationDetail = BookAiConversationSummary & {
  context: BookContextSnapshot;
  openLibraryUrl: string | null;
  messages: BookAiMessageSummary[];
};

export type BookAiBootstrap = {
  conversation: BookAiConversationDetail | null;
  history: BookAiConversationSummary[];
};

/**
 * Variant returned by `getBookAiConversationPageData` for the dynamic
 * room route, where the conversation is guaranteed to exist when found.
 */
export type BookAiConversationPageData = {
  conversation: BookAiConversationDetail;
  history: BookAiConversationSummary[];
};
