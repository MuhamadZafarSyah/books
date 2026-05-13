import { getChatBootstrap } from "@/actions/chat";
import { ChatWorkspace } from "@/features/chat/components/chat-workspace";

export default async function ChatPage() {
  const data = await getChatBootstrap();

  return (
    <div className="mx-auto flex h-full min-h-0 max-w-6xl flex-col gap-6 overflow-hidden">
      <div className="shrink-0">
        <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[#8c7861] dark:text-[#d6b28b]">
          Realtime chat
        </p>
        <h1 className="mt-3 font-heading text-4xl font-semibold tracking-tight text-primary">
          Percakapan pembaca
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
          Kirim pesan real-time, simpan history permanen ke database, dan gunakan Redis untuk presence, unread, typing, dan recent messages.
        </p>
      </div>
      <ChatWorkspace initialData={data} />
    </div>
  );
}
