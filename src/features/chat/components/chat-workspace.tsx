"use client";

import { useCallback, useMemo, useRef, useState, useTransition } from "react";
import { BookOpen, MessageCircle, Plus, Search, Send, Users } from "lucide-react";
import { useDebounceCallback } from "usehooks-ts";

import {
  getChatBootstrap,
  getConversationMessages,
  markConversationRead,
  startDirectConversation,
} from "@/actions/chat";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import type { ChatBootstrap, ChatConversationSummary, ChatMessageSummary, ChatSocketEvent, ChatUserSummary } from "@/lib/chat/types";
import { useChatSocket } from "@/features/chat/hooks/use-chat-socket";

const TYPING_DEBOUNCE_MS = 600;

function getInitials(user: Pick<ChatUserSummary, "name" | "email">) {
  const source = user.name || user.email?.split("@")[0] || "SG";
  const parts = source.trim().split(/\s+/).filter(Boolean);

  if (parts.length > 1) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  return source.slice(0, 2).toUpperCase();
}

function conversationSubtitle(conversation: ChatConversationSummary, currentUserId: string) {
  const others = conversation.participants.filter((participant) => participant.id !== currentUserId);
  if (others.length === 0) return "Catatan pribadi";
  return others.map((participant) => participant.online ? "Online" : participant.email).filter(Boolean).join(" - ");
}

function ConversationAvatar({ conversation, currentUserId }: { conversation: ChatConversationSummary; currentUserId: string }) {
  const user = conversation.participants.find((participant) => participant.id !== currentUserId) ?? conversation.participants[0];

  return (
    <div className="relative grid size-11 shrink-0 place-items-center rounded-2xl bg-[#d0e9d4] font-heading text-sm font-semibold text-primary shadow-sm">
      {user ? getInitials(user) : <BookOpen aria-hidden="true" className="size-5" />}
      {user?.online && <span className="absolute -right-0.5 -top-0.5 size-3 rounded-full border-2 border-card bg-[#2f7d4f]" />}
    </div>
  );
}

function TypingBubble() {
  return (
    <div className="flex justify-start">
      <div className="flex items-center gap-1 rounded-[1.35rem] rounded-bl-md bg-secondary px-4 py-3 shadow-sm">
        <span className="size-1.5 animate-pulse rounded-full bg-muted-foreground [animation-delay:0ms]" />
        <span className="size-1.5 animate-pulse rounded-full bg-muted-foreground [animation-delay:140ms]" />
        <span className="size-1.5 animate-pulse rounded-full bg-muted-foreground [animation-delay:280ms]" />
        <span className="sr-only">User sedang mengetik</span>
      </div>
    </div>
  );
}

function appendMessage(
  current: Record<string, ChatMessageSummary[]>,
  conversationId: string,
  message: ChatMessageSummary,
) {
  const existing = current[conversationId] ?? [];
  if (existing.some((item) => item.id === message.id)) return current;
  return { ...current, [conversationId]: [...existing, message] };
}

function mergeSocketMessage(
  current: Record<string, ChatMessageSummary[]>,
  conversationId: string,
  message: ChatMessageSummary,
) {
  const existing = current[conversationId] ?? [];
  const optimisticIndex = message.clientId
    ? existing.findIndex((item) => item.id === message.clientId || item.clientId === message.clientId)
    : -1;

  if (optimisticIndex >= 0) {
    const nextMessages = [...existing];
    nextMessages[optimisticIndex] = message;
    return { ...current, [conversationId]: nextMessages };
  }

  if (existing.some((item) => item.id === message.id || (message.clientId && item.clientId === message.clientId))) {
    return current;
  }

  return { ...current, [conversationId]: [...existing, message] };
}

function markMessageFailed(
  current: Record<string, ChatMessageSummary[]>,
  conversationId: string,
  clientId: string,
) {
  const messages = current[conversationId] ?? [];
  let changed = false;

  const nextMessages = messages.map((message) => {
    if (message.id !== clientId && message.clientId !== clientId) return message;
    changed = true;
    return { ...message, pending: false, failed: true };
  });

  if (!changed) return current;

  return {
    ...current,
    [conversationId]: nextMessages,
  };
}

function createOptimisticMessage({
  body,
  clientId,
  conversationId,
  currentUser,
}: {
  body: string;
  clientId: string;
  conversationId: string;
  currentUser: ChatUserSummary;
}): ChatMessageSummary {
  return {
    id: clientId,
    conversationId,
    senderId: currentUser.id,
    senderName: currentUser.name,
    body,
    type: "TEXT",
    createdAt: new Date().toISOString(),
    clientId,
    pending: true,
  };
}

function updateConversationPreview(
  conversations: ChatConversationSummary[],
  conversationId: string,
  message: ChatMessageSummary,
) {
  return conversations.map((conversation) =>
    conversation.id === conversationId
      ? { ...conversation, lastMessage: message, lastMessageAt: message.createdAt }
      : conversation,
  );
}

export function ChatWorkspace({ initialData, compact = false }: { initialData: ChatBootstrap; compact?: boolean }) {
  const [conversations, setConversations] = useState(initialData.conversations);
  const [suggestedUsers, setSuggestedUsers] = useState(initialData.suggestedUsers);
  const [messagesByConversation, setMessagesByConversation] = useState(initialData.messagesByConversation);
  const [activeConversationId, setActiveConversationId] = useState(initialData.conversations[0]?.id ?? "");
  const [loadedConversationIds, setLoadedConversationIds] = useState(() => new Set(Object.keys(initialData.messagesByConversation)));
  const [draft, setDraft] = useState("");
  const [typingUsers, setTypingUsers] = useState<Record<string, string[]>>({});
  const [isPending, startTransition] = useTransition();
  const lastTypingStateRef = useRef<{ conversationId: string; isTyping: boolean } | null>(null);
  const loadingConversationIdsRef = useRef(new Set<string>());

  const activeConversation = conversations.find((conversation) => conversation.id === activeConversationId) ?? null;
  const activeMessages = activeConversationId ? messagesByConversation[activeConversationId] ?? [] : [];
  const conversationIds = useMemo(() => conversations.map((conversation) => conversation.id), [conversations]);
  const remoteTypingUserIds = activeConversationId
    ? (typingUsers[activeConversationId] ?? []).filter((userId) => userId !== initialData.currentUser.id)
    : [];

  const handleSocketEvent = useCallback((event: ChatSocketEvent) => {
    if (event.type === "message.created") {
      setMessagesByConversation((current) => mergeSocketMessage(current, event.conversationId, event.message));
      setConversations((current) => updateConversationPreview(current, event.conversationId, event.message));
    }

    if (event.type === "message.failed") {
      setMessagesByConversation((current) => markMessageFailed(current, event.conversationId, event.clientId));
    }

    if (event.type === "typing.updated") {
      setTypingUsers((current) => {
        const users = new Set(current[event.conversationId] ?? []);
        if (event.isTyping) users.add(event.userId);
        else users.delete(event.userId);
        return { ...current, [event.conversationId]: [...users] };
      });
    }

    if (event.type === "presence.updated") {
      setConversations((current) =>
        current.map((conversation) => ({
          ...conversation,
          participants: conversation.participants.map((participant) =>
            participant.id === event.userId ? { ...participant, online: event.online } : participant,
          ),
        })),
      );
      setSuggestedUsers((current) =>
        current.map((user) => (user.id === event.userId ? { ...user, online: event.online } : user)),
      );
    }
  }, []);

  const { send: sendSocketEvent, status: socketStatus } = useChatSocket({ conversationIds, onEvent: handleSocketEvent });

  const syncTypingState = useCallback(
    (conversationId: string, isTyping: boolean) => {
      const lastTypingState = lastTypingStateRef.current;
      if (lastTypingState?.conversationId === conversationId && lastTypingState.isTyping === isTyping) return;

      lastTypingStateRef.current = { conversationId, isTyping };
      sendSocketEvent({ type: "typing.update", conversationId, isTyping });
    },
    [sendSocketEvent],
  );

  const debouncedSyncTyping = useDebounceCallback(
    (conversationId: string, isTyping: boolean) => {
      syncTypingState(conversationId, isTyping);
    },
    TYPING_DEBOUNCE_MS,
    { maxWait: 2000 },
  );

  const syncTypingNow = useCallback(
    (conversationId: string, isTyping: boolean) => {
      debouncedSyncTyping.cancel();
      syncTypingState(conversationId, isTyping);
    },
    [debouncedSyncTyping, syncTypingState],
  );

  const refreshBootstrap = useCallback(() => {
    startTransition(async () => {
      const data = await getChatBootstrap();
      setConversations(data.conversations);
      setSuggestedUsers(data.suggestedUsers);
      setMessagesByConversation((current) => ({ ...data.messagesByConversation, ...current }));
      if (!activeConversationId && data.conversations[0]) setActiveConversationId(data.conversations[0].id);
    });
  }, [activeConversationId]);

  const selectConversation = useCallback((conversationId: string) => {
    if (conversationId === activeConversationId) return;

    setActiveConversationId(conversationId);

    const selectedConversation = conversations.find((conversation) => conversation.id === conversationId);
    if (selectedConversation?.unreadCount) {
      setConversations((current) =>
        current.map((conversation) =>
          conversation.id === conversationId ? { ...conversation, unreadCount: 0 } : conversation,
        ),
      );
      startTransition(async () => {
        await markConversationRead(conversationId);
      });
    }

    if (loadedConversationIds.has(conversationId) || loadingConversationIdsRef.current.has(conversationId)) return;

    loadingConversationIdsRef.current.add(conversationId);
    startTransition(async () => {
      try {
        const messages = await getConversationMessages(conversationId);
        setMessagesByConversation((current) => ({ ...current, [conversationId]: messages }));
        setLoadedConversationIds((current) => new Set(current).add(conversationId));
      } finally {
        loadingConversationIdsRef.current.delete(conversationId);
      }
    });
  }, [activeConversationId, conversations, loadedConversationIds]);

  const startConversation = useCallback((userId: string) => {
    startTransition(async () => {
      const conversationId = await startDirectConversation(userId);
      const data = await getChatBootstrap();
      setConversations(data.conversations);
      setSuggestedUsers(data.suggestedUsers);
      setMessagesByConversation((current) => ({ ...current, ...data.messagesByConversation }));
      setLoadedConversationIds((current) => new Set([...current, ...Object.keys(data.messagesByConversation)]));
      setActiveConversationId(conversationId);
    });
  }, []);

  const sendMessage = useCallback(() => {
    const body = draft.trim();
    if (!activeConversationId || !body) return;

    const clientId = crypto.randomUUID();
    const optimisticMessage = createOptimisticMessage({
      body,
      clientId,
      conversationId: activeConversationId,
      currentUser: initialData.currentUser,
    });

    const sent = sendSocketEvent({ type: "message.send", conversationId: activeConversationId, body, clientId });
    if (!sent) return;

    setDraft("");
    syncTypingNow(activeConversationId, false);
    setMessagesByConversation((current) => appendMessage(current, activeConversationId, optimisticMessage));
    setConversations((current) => updateConversationPreview(current, activeConversationId, optimisticMessage));
  }, [activeConversationId, draft, initialData.currentUser, sendSocketEvent, syncTypingNow]);

  const handleDraftChange = (value: string) => {
    setDraft(value);
    if (activeConversationId) {
      debouncedSyncTyping(activeConversationId, value.trim().length > 0);
    }
  };

  return (
    <div className={cn("grid overflow-hidden rounded-[1.75rem] border border-border bg-card/90 shadow-[0_18px_54px_rgba(36,26,18,0.08)]", compact ? "h-[31rem] grid-rows-[auto_1fr]" : "min-h-0 flex-1 grid-rows-[auto_minmax(0,1fr)] lg:grid-cols-[20rem_minmax(0,1fr)] lg:grid-rows-[minmax(0,1fr)]")}>
      <aside className={cn("min-h-0 border-border bg-secondary/35", compact ? "border-b" : "border-b lg:border-b-0 lg:border-r")}>
        <div className="flex items-center justify-between gap-3 border-b border-border p-4">
          <div>
            <p className="font-heading text-2xl font-semibold text-primary">Messages</p>
            <p className="mt-1 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              {socketStatus === "open" ? "Realtime online" : "Realtime standby"}
            </p>
          </div>
          <Button aria-label="Refresh chat" onClick={refreshBootstrap} size="icon-sm" type="button" variant="outline">
            <Search className="size-4" />
          </Button>
        </div>
        <ScrollArea className={compact ? "h-32" : "h-[18rem] lg:h-[calc(100dvh-15rem)]"} type="hover">
          <div className="grid gap-1 p-2">
            {conversations.map((conversation) => (
              <button
                className={cn(
                  "flex w-full cursor-pointer items-center gap-3 rounded-2xl p-3 text-left transition-[background-color,box-shadow,transform] duration-300 ease-out hover:-translate-y-0.5 hover:bg-card motion-reduce:transition-none",
                  activeConversationId === conversation.id && "bg-card shadow-sm",
                )}
                key={conversation.id}
                onClick={() => selectConversation(conversation.id)}
                type="button"
              >
                <ConversationAvatar conversation={conversation} currentUserId={initialData.currentUser.id} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold text-foreground">{conversation.title}</span>
                  <span className="mt-1 block truncate text-xs text-muted-foreground">
                    {conversation.lastMessage?.body || conversationSubtitle(conversation, initialData.currentUser.id)}
                  </span>
                </span>
                {conversation.unreadCount > 0 && (
                  <span className="grid size-5 place-items-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                    {conversation.unreadCount}
                  </span>
                )}
              </button>
            ))}
            {conversations.length === 0 && (
              <div className="rounded-2xl border border-dashed border-border p-4 text-sm text-muted-foreground">
                Belum ada percakapan. Mulai dari daftar pembaca di bawah.
              </div>
            )}
          </div>
        </ScrollArea>
        {/* {!compact && (
          <div className="border-t border-border p-3">
            <p className="px-2 text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground">Mulai chat</p>
            <div className="mt-2 grid gap-1">
              {suggestedUsers.slice(0, 4).map((user) => (
                <button
                  className="flex cursor-pointer items-center gap-3 rounded-2xl p-2 text-left transition-[background-color,transform] duration-300 ease-out hover:-translate-y-0.5 hover:bg-card motion-reduce:transition-none"
                  key={user.id}
                  onClick={() => startConversation(user.id)}
                  type="button"
                >
                  <div className="grid size-9 place-items-center rounded-xl bg-[#d0e9d4] font-heading text-xs font-semibold text-primary">
                    {getInitials(user)}
                  </div>
                  <span className="min-w-0 flex-1 truncate text-sm font-semibold">{user.name || user.email}</span>
                  <Plus className="size-4 text-muted-foreground" />
                </button>
              ))}
            </div>
          </div>
        )} */}
      </aside>

      <section className="flex min-h-0 flex-col overflow-hidden">
        {activeConversation ? (
          <>
            <div className="flex shrink-0 items-center gap-3 border-b border-border p-4">
              <ConversationAvatar conversation={activeConversation} currentUserId={initialData.currentUser.id} />
              <div className="min-w-0 flex-1">
                <h1 className="truncate font-heading text-xl font-semibold text-primary">{activeConversation.title}</h1>
                <p className="truncate text-xs text-muted-foreground">
                  {typingUsers[activeConversation.id]?.filter((userId) => userId !== initialData.currentUser.id).length
                    ? "Sedang mengetik..."
                    : conversationSubtitle(activeConversation, initialData.currentUser.id)}
                </p>
              </div>
              <Users aria-hidden="true" className="size-5 text-muted-foreground" />
            </div>
            <ScrollArea className="min-h-0 flex-1 overflow-hidden" type="hover">
              <div className="grid gap-3 p-4">
                {activeMessages.map((message) => {
                  const isMine = message.senderId === initialData.currentUser.id;
                  return (
                    <div className={cn("flex", isMine ? "justify-end" : "justify-start")} key={message.id}>
                      <div
                        className={cn(
                          "max-w-[78%] rounded-[1.35rem] px-4 py-3 text-sm leading-6 shadow-sm transition-[opacity,transform] duration-300 ease-out motion-reduce:transition-none",
                          isMine ? "rounded-br-md bg-primary text-primary-foreground" : "rounded-bl-md bg-secondary text-foreground",
                          message.pending && "opacity-60",
                          message.failed && "border border-destructive/30 bg-destructive/10 text-destructive opacity-100",
                        )}
                      >
                        <p>{message.body}</p>
                        <p className={cn("mt-1 text-[10px]", isMine ? "text-primary-foreground/64" : "text-muted-foreground")}>
                          {message.failed ? "Gagal terkirim" : new Date(message.createdAt).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}
                        </p>
                      </div>
                    </div>
                  );
                })}
                {activeMessages.length === 0 && (
                  <div className="mx-auto grid max-w-sm place-items-center py-14 text-center">
                    <div className="grid size-14 place-items-center rounded-2xl bg-primary/10 text-primary">
                      <MessageCircle className="size-7" />
                    </div>
                    <p className="mt-4 font-heading text-2xl font-semibold text-primary">Mulai percakapan</p>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">Kirim pesan pertama dan history akan tersimpan di database.</p>
                  </div>
                )}
                {remoteTypingUserIds.length > 0 && <TypingBubble />}
              </div>
            </ScrollArea>
            <div className="shrink-0 border-t border-border p-3">
              <form
                className="flex items-end gap-2 rounded-[1.5rem] border border-border bg-background p-2"
                onSubmit={(event) => {
                  event.preventDefault();
                  sendMessage();
                }}
              >
                <textarea
                  className="max-h-28 min-h-11 flex-1 resize-none bg-transparent px-3 py-2 text-sm outline-none placeholder:text-muted-foreground"
                  onBlur={() => activeConversationId && syncTypingNow(activeConversationId, false)}
                  onChange={(event) => handleDraftChange(event.target.value)}
                  placeholder="Tulis pesan..."
                  value={draft}
                />
                {/* <Button disabled={!draft.trim() || isPending || socketStatus !== "open"} size="icon" type="submit" className="rounded-2xl">
                  <Send className="size-4" />
                </Button> */}
                <Button disabled={!draft.trim() || isPending} size="icon" type="submit" className="rounded-2xl">
                  <Send className="size-4" />
                </Button>
              </form>
            </div>
          </>
        ) : (
          <div className="grid flex-1 place-items-center p-8 text-center">
            <div>
              <div className="mx-auto grid size-16 place-items-center rounded-3xl bg-primary/10 text-primary">
                <MessageCircle className="size-8" />
              </div>
              <h1 className="mt-5 font-heading text-3xl font-semibold text-primary">Realtime chat</h1>
              <p className="mt-2 max-w-md text-sm leading-6 text-muted-foreground">
                Pilih pembaca untuk memulai chat. Pesan tersimpan permanen di Neon dan recent messages dicache di Redis.
              </p>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
