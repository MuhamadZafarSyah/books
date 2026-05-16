import type { Metadata } from "next";

import { getBookAiConversationHistory } from "@/actions/book-ai-chat";
import { BookAiChatShell } from "@/features/book-ai-chat/components/book-ai-chat-shell";
import { requireAuth } from "@/lib/session";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Diskusi AI | Shelfgram",
  description: "Daftar diskusi AI buku Anda di Shelfgram.",
};

export default async function BookAiDiscussionsIndexPage() {
  await requireAuth();
  const history = await getBookAiConversationHistory();

  return (
    <div className="mx-auto h-full min-h-0 w-full max-w-6xl">
      <BookAiChatShell data={{ conversation: null, history }} />
    </div>
  );
}
