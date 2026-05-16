import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { getBookAiConversationPageData } from "@/actions/book-ai-chat";
import { BookAiChatShell } from "@/features/book-ai-chat/components/book-ai-chat-shell";
import { requireAuth } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ conversationId: string }>;
}): Promise<Metadata> {
  const { conversationId } = await params;
  await requireAuth();
  const data = await getBookAiConversationPageData(conversationId);
  if (!data) return { title: "Diskusi tidak ditemukan | Shelfgram" };
  return {
    title: `${data.conversation.title} | Shelfgram`,
  };
}

export default async function BookAiDiscussionPage({
  params,
}: {
  params: Promise<{ conversationId: string }>;
}) {
  const { conversationId } = await params;
  await requireAuth();

  const data = await getBookAiConversationPageData(conversationId);
  if (!data) notFound();

  return (
    <div className="mx-auto h-full min-h-0 w-full max-w-6xl">
      <BookAiChatShell data={data} />
    </div>
  );
}
