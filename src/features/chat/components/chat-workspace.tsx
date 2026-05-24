"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { BookOpen, ChevronLeft, MessageCircle, PanelLeftIcon, Send, Users } from "lucide-react";
import { useDebounceCallback, useMediaQuery } from "usehooks-ts";
import gsap from "gsap";

import {
  getChatBootstrap,
  getConversationMessages,
  markConversationRead,
} from "@/actions/chat";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type { ChatBootstrap, ChatConversationSummary, ChatMessageSummary, ChatSocketEvent, ChatUserSummary } from "@/lib/chat/types";
import { useChatSocket } from "@/features/chat/hooks/use-chat-socket";
import { toast } from "sonner";

const TYPING_DEBOUNCE_MS = 600;
const LAPTOP_QUERY = "(min-width: 1024px)";

// Resizable sidebar — hanya aktif saat sidebar expanded di viewport `lg:` ke
// atas. Width disimpan ke localStorage agar preferensi user persisten.
const SIDEBAR_DEFAULT_WIDTH = 256; // 16rem
const SIDEBAR_COLLAPSED_WIDTH = 64; // 4rem (dipakai oleh mode compact, bukan resize)
const SIDEBAR_MIN_WIDTH = 0;
const SIDEBAR_MAX_WIDTH = 320;
const SIDEBAR_STORAGE_KEY = "chat-workspace:sidebar-width";

// Threshold dan dimensi hit area resize handle.
//
// Saat `sidebarWidth` lebih kecil dari threshold (mendekati 0), aside hampir
// hilang sehingga handle 4-6 px nyaris tidak bisa di-grab. Pada kondisi itu
// hit area di-expand dan digeser ke dalam panel main supaya tetap mudah
// di-klik dan cursor `col-resize` selalu kelihatan.
const SIDEBAR_HIT_BOUNDARY_THRESHOLD = 24;
const SIDEBAR_HIT_NORMAL = 14; // total hit area (px) saat sidebar terbuka
const SIDEBAR_HIT_AT_BOUNDARY = 28; // saat sidebar hampir/penuh tertutup
const SIDEBAR_HIT_OVERLAP_INTO_SIDEBAR = 6; // berapa px hit area menjorok ke arah sidebar

function clampSidebarWidth(value: number) {
  return Math.min(Math.max(value, SIDEBAR_MIN_WIDTH), SIDEBAR_MAX_WIDTH);
}

/**
 * Hitung posisi + lebar hit area resize handle berbasis lebar sidebar saat ini.
 *
 * - Saat `width` cukup besar: handle ramping (14 px) berpusat di garis batas
 *   antara sidebar dan main, dengan sebagian kecil masuk ke main agar
 *   cursor `col-resize` tetap mudah ditemukan.
 * - Saat `width` mendekati 0: handle melebar (28 px) dan posisinya di-anchor
 *   ke `left: 0` dengan ekspansi ke kanan, sehingga handle secara efektif
 *   muncul di tepi kiri panel main dan tetap bisa ditarik kembali.
 */
function getResizeHandleGeometry(width: number) {
  const atBoundary = width < SIDEBAR_HIT_BOUNDARY_THRESHOLD;
  const hitWidth = atBoundary ? SIDEBAR_HIT_AT_BOUNDARY : SIDEBAR_HIT_NORMAL;
  const left = Math.max(
    0,
    width - SIDEBAR_HIT_OVERLAP_INTO_SIDEBAR,
  );
  return { atBoundary, hitWidth, left };
}

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
    <div className="relative shrink-0">
      <Avatar className="size-9 shadow-sm">
        {user?.image && <AvatarImage alt={user.name ?? user.email ?? "Avatar pembaca"} src={user.image} />}
        <AvatarFallback className="bg-[#d0e9d4] font-heading text-xs font-semibold text-primary">
          {user ? getInitials(user) : <BookOpen aria-hidden="true" className="size-4" />}
        </AvatarFallback>
      </Avatar>
      {user?.online && <span className="absolute -right-0.5 -top-0.5 size-2.5 rounded-full border-2 border-card bg-[#2f7d4f]" />}
    </div>
  );
}

function TypingBubble() {
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const node = containerRef.current;
    if (!node) return;

    const ctx = gsap.context(() => {
      gsap.fromTo(
        node,
        { scale: 0.6, opacity: 0, y: 8, transformOrigin: "0% 100%" },
        { scale: 1, opacity: 1, y: 0, duration: 0.32, ease: "back.out(1.6)" },
      );

      const dots = node.querySelectorAll<HTMLSpanElement>("[data-typing-dot]");
      if (dots.length > 0) {
        gsap.to(dots, {
          y: -3,
          duration: 0.45,
          ease: "sine.inOut",
          stagger: { each: 0.12, repeat: -1, yoyo: true },
          repeat: -1,
          yoyo: true,
        });
      }
    }, node);

    return () => ctx.revert();
  }, []);

  return (
    <div className="flex justify-start">
      <div
        ref={containerRef}
        className="flex items-center gap-1.5 rounded-[1.35rem] rounded-bl-md bg-secondary px-4 py-3 shadow-sm"
      >
        <span data-typing-dot className="size-1.5 rounded-full bg-muted-foreground" />
        <span data-typing-dot className="size-1.5 rounded-full bg-muted-foreground" />
        <span data-typing-dot className="size-1.5 rounded-full bg-muted-foreground" />
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
  const isLaptopUp = useMediaQuery(LAPTOP_QUERY, {
    defaultValue: false,
    initializeWithValue: false,
  });
  const [isConversationListOpen, setIsConversationListOpen] = useState(false);
  // Resizable sidebar state. `hasMountedShell` digunakan untuk menahan
  // override inline-style sampai client mount sehingga SSR tetap memakai
  // class-based grid (`lg:grid-cols-[16rem_...]`) dan tidak ada flicker
  // saat hydrate.
  const [sidebarWidth, setSidebarWidth] = useState(SIDEBAR_DEFAULT_WIDTH);
  const [isResizingSidebar, setIsResizingSidebar] = useState(false);
  const [hasMountedShell, setHasMountedShell] = useState(false);
  const sidebarWidthRef = useRef(SIDEBAR_DEFAULT_WIDTH);
  const [conversations, setConversations] = useState(initialData.conversations);
  const [messagesByConversation, setMessagesByConversation] = useState(initialData.messagesByConversation);
  const [activeConversationId, setActiveConversationId] = useState(initialData.activeConversationId ?? initialData.conversations[0]?.id ?? "");
  const [loadedConversationIds, setLoadedConversationIds] = useState(() => new Set(Object.keys(initialData.messagesByConversation)));
  const [draft, setDraft] = useState("");
  const [typingUsers, setTypingUsers] = useState<Record<string, string[]>>({});
  const [isPending, startTransition] = useTransition();
  const lastTypingStateRef = useRef<{ conversationId: string; isTyping: boolean } | null>(null);
  const loadingConversationIdsRef = useRef(new Set<string>());
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const activeConversation = conversations.find((conversation) => conversation.id === activeConversationId) ?? null;
  const activeMessages = activeConversationId ? messagesByConversation[activeConversationId] ?? [] : [];
  const conversationIds = useMemo(() => conversations.map((conversation) => conversation.id), [conversations]);
  const remoteTypingUserIds = activeConversationId
    ? (typingUsers[activeConversationId] ?? []).filter((userId) => userId !== initialData.currentUser.id)
    : [];
  const latestMessageId = activeMessages[activeMessages.length - 1]?.id ?? "";
  const usesInPlaceConversationDrawer = compact || !isLaptopUp;
  const showConversationDrawerToggle = compact || !isLaptopUp;
  const showConversationHeaderToggle = !compact && !isLaptopUp;
  const showConversationListDetails = compact ? isConversationListOpen : isLaptopUp || isConversationListOpen;

  const refreshBootstrap = useCallback(() => {
    startTransition(async () => {
      const data = await getChatBootstrap(activeConversationId || undefined);
      setConversations(data.conversations);
      setMessagesByConversation((current) => ({ ...data.messagesByConversation, ...current }));

      if (!activeConversationId && data.conversations[0]) {
        setActiveConversationId(data.conversations[0].id);
      }
    });
  }, [activeConversationId]);

  // Mount: baca preferensi width dari localStorage. Defer setState ke
  // microtask supaya tidak melanggar `react-hooks/set-state-in-effect`.
  useEffect(() => {
    void Promise.resolve().then(() => {
      try {
        const raw = window.localStorage.getItem(SIDEBAR_STORAGE_KEY);
        const parsed = raw ? Number.parseFloat(raw) : Number.NaN;
        if (Number.isFinite(parsed)) {
          const clamped = clampSidebarWidth(parsed);
          sidebarWidthRef.current = clamped;
          setSidebarWidth(clamped);
        }
      } catch {
        // localStorage bisa tidak tersedia di mode private; aman diabaikan.
      }
      setHasMountedShell(true);
    });
  }, []);

  /**
   * Drag handle untuk resize sidebar chat.
   *
   * Memakai pointer events agar mendukung mouse + touch + pen. Listener
   * dipasang di `window` selama drag berlangsung sehingga gerakan keluar
   * dari handle (misalnya di atas iframe map) tetap tertangkap. Saat
   * pointerup, width final di-persist ke `localStorage`.
   */
  const handleSidebarPointerDown = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (event.button !== 0 && event.pointerType === "mouse") return;
      event.preventDefault();

      const startX = event.clientX;
      const startWidth = sidebarWidthRef.current;

      const handleMove = (moveEvent: PointerEvent) => {
        const next = clampSidebarWidth(
          startWidth + (moveEvent.clientX - startX),
        );
        sidebarWidthRef.current = next;
        setSidebarWidth(next);
      };

      const handleUp = () => {
        window.removeEventListener("pointermove", handleMove);
        window.removeEventListener("pointerup", handleUp);
        window.removeEventListener("pointercancel", handleUp);
        setIsResizingSidebar(false);
        try {
          window.localStorage.setItem(
            SIDEBAR_STORAGE_KEY,
            String(sidebarWidthRef.current),
          );
        } catch {
          // Aman diabaikan.
        }
      };

      setIsResizingSidebar(true);
      window.addEventListener("pointermove", handleMove);
      window.addEventListener("pointerup", handleUp);
      window.addEventListener("pointercancel", handleUp);
    },
    [],
  );

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      messagesEndRef.current?.scrollIntoView({ block: "end", behavior: "auto" });
    });

    return () => cancelAnimationFrame(frame);
  }, [activeConversationId, latestMessageId, activeMessages.length, remoteTypingUserIds.length]);

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
    }
  }, []);

  const { send: sendSocketEvent, status: socketStatus } = useChatSocket({
    conversationIds,
    currentUserId: initialData.currentUser.id,
    onEvent: handleSocketEvent,
    onBootstrapInvalidated: refreshBootstrap,
  });

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

  const selectConversation = useCallback((conversationId: string) => {
    if (usesInPlaceConversationDrawer) {
      setIsConversationListOpen(false);
    }

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
  }, [activeConversationId, conversations, loadedConversationIds, usesInPlaceConversationDrawer]);

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
    if (!sent) {
      toast.error("Gagal mengirim pesan.");
      return;
    }

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

  // Aktifkan resize hanya saat: client sudah mount + di viewport laptop +
  // tidak compact (compact memakai collapse icon-only sendiri) + sidebar
  // saat ini expanded. Pada kondisi lain, fallback ke class-based grid
  // existing (`lg:grid-cols-[16rem_...]` / drawer overlay) supaya UX
  // mobile dan dock kompak tidak berubah.
  const isResizableSidebar =
    hasMountedShell && isLaptopUp && !compact && showConversationListDetails;

  const sidebarWidthForLayout = isResizableSidebar
    ? sidebarWidth
    : compact && !showConversationListDetails
      ? SIDEBAR_COLLAPSED_WIDTH
      : SIDEBAR_DEFAULT_WIDTH;

  const inlineGridStyle = isResizableSidebar
    ? { gridTemplateColumns: `${sidebarWidthForLayout}px minmax(0, 1fr)` }
    : undefined;

  return (
    <div
      className={cn(
        "relative grid min-h-0 rounded-lg overflow-hidden border border-border bg-card/90 shadow-[0_18px_54px_rgba(36,26,18,0.08)]",
        // Saat sedang drag, jangan animasikan grid-template-columns supaya
        // gerakan terasa langsung mengikuti pointer.
        !isResizingSidebar &&
          "transition-[grid-template-columns] duration-300 ease-out",
        compact
          ? cn(
              "h-full",
              showConversationListDetails
                ? "grid-cols-[16rem_minmax(0,1fr)]"
                : "grid-cols-[4rem_minmax(0,1fr)]",
            )
          : cn(
              "flex-1",
              // Class fallback hanya dipakai saat `isResizableSidebar` false
              // (mis. SSR awal atau breakpoint < lg). Ketika `inlineGridStyle`
              // ada, ia akan menimpa `grid-cols-*` lewat priority style.
              "lg:grid-cols-[16rem_minmax(0,1fr)]",
              isConversationListOpen
                ? "grid-cols-[16rem_minmax(0,1fr)]"
                : "grid-cols-[0rem_minmax(0,1fr)]",
            ),
      )}
      style={inlineGridStyle}
    >
      <aside className="relative min-h-0 overflow-hidden">
        <div
          className={cn(
            "flex h-full flex-col border-r border-border bg-secondary/35 transition-[width,transform] duration-300 ease-out",
            compact ? (showConversationListDetails ? "w-64" : "w-16") : "w-64 lg:w-auto",
            !compact && (showConversationListDetails ? "translate-x-0" : "-translate-x-full lg:translate-x-0"),
            // Saat resize aktif, biarkan child mengikuti container width
            // (yang dikontrol grid-template-columns inline) tanpa class
            // `lg:w-auto` yang sudah default di non-compact.
            isResizableSidebar && "w-full lg:w-full",
            // Hilangkan transisi width saat sedang drag agar gerakan
            // sidebar mengikuti pointer secara real-time.
            isResizingSidebar && "transition-none",
          )}
        >
          <div
            className={cn(
              "flex shrink-0 items-center border-b border-border",
              compact ? "h-12 justify-center p-1.5" : "h-12 justify-center p-1.5 lg:h-auto lg:justify-between lg:gap-2 lg:p-2.5",
              showConversationListDetails && "justify-between gap-2 p-2.5",
            )}
          >
            <div className={cn("hidden", !compact && "lg:block", showConversationListDetails && "block")}>
              <p className="font-heading text-xl font-semibold text-primary">Messages</p>
              <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                {socketStatus === "open" ? "Realtime online" : "Realtime standby"}
              </p>
            </div>
            {compact ? (
              <Button
                aria-expanded={isConversationListOpen}
                aria-label={isConversationListOpen ? "Tutup daftar chat" : "Buka daftar chat"}
                className={cn("grid size-9 place-items-center rounded-xl bg-primary/10 text-primary hover:bg-primary/15", showConversationListDetails && "hidden")}
                onClick={() => setIsConversationListOpen((current) => !current)}
                size="icon-sm"
                type="button"
                variant="ghost"
              >
                <MessageCircle aria-hidden="true" className="size-4" />
              </Button>
            ) : (
              <div className={cn("grid size-9 place-items-center rounded-xl bg-primary/10 text-primary", !compact && "lg:hidden", showConversationListDetails && "hidden")}>
                <MessageCircle aria-hidden="true" className="size-4" />
              </div>
            )}
            {/* <Button aria-label="Refresh chat" className={cn(compact ? "hidden" : "hidden lg:inline-flex")} onClick={refreshBootstrap} size="icon-sm" type="button" variant="outline">
              <Search className="size-4" />
            </Button> */}
            {showConversationDrawerToggle && (
              <Button
                aria-label="Tutup daftar chat"
                className={cn("hidden", showConversationListDetails && "inline-flex")}
                onClick={() => setIsConversationListOpen(false)}
                size="icon-sm"
                type="button"
                variant="ghost"
              >
                <ChevronLeft className="size-4" />
              </Button>
            )}
          </div>
          <ScrollArea className="min-h-0 flex-1" type="hover">
            <div className={cn("grid gap-1.5 p-1.5", !compact && "lg:gap-1 lg:p-2", showConversationListDetails && "gap-1 p-2")}>
              {conversations.map((conversation) => {
                const preview = conversation.lastMessage?.body || conversationSubtitle(conversation, initialData.currentUser.id);
                const conversationButton = (
                  <button
                    key={conversation.id}
                    aria-label={`Buka chat dengan ${conversation.title}`}
                    className={cn(
                      "relative flex min-w-0 w-full cursor-pointer items-center overflow-hidden rounded-2xl text-left transition-[background-color,box-shadow,transform] duration-300 ease-out hover:bg-card motion-reduce:transition-none",
                      compact ? "justify-center p-1.5" : "justify-center p-1.5 lg:justify-start lg:gap-2 lg:p-2",
                      showConversationListDetails && "justify-start gap-2 p-2",
                      activeConversationId === conversation.id && "bg-card shadow-sm",
                    )}
                    onClick={() => selectConversation(conversation.id)}
                    type="button"
                  >
                    <ConversationAvatar conversation={conversation} currentUserId={initialData.currentUser.id} />
                    <span className={cn("hidden min-w-0 max-w-full flex-1 overflow-hidden", !compact && "lg:block", showConversationListDetails && "block")}>
                      <span className="block max-w-full truncate text-[13px] font-semibold leading-5 text-foreground">{conversation.title}</span>
                      <span className="block max-w-full truncate text-[11px] leading-4 text-muted-foreground">
                        {preview}
                      </span>
                    </span>
                    {conversation.unreadCount > 0 && (
                      <span className={cn("absolute right-1 top-1 grid size-4 place-items-center rounded-full bg-primary text-[9px] font-bold text-primary-foreground", !compact && "lg:hidden", showConversationListDetails && "hidden")}>
                        {conversation.unreadCount > 9 ? "9+" : conversation.unreadCount}
                      </span>
                    )}
                    {conversation.unreadCount > 0 && (
                      <span className={cn("hidden size-5 place-items-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground", !compact && "lg:grid", showConversationListDetails && "grid")}>
                        {conversation.unreadCount}
                      </span>
                    )}
                  </button>
                );

                if (showConversationListDetails || !isLaptopUp) {
                  return conversationButton;
                }

                return (
                  <Tooltip key={conversation.id}>
                    <TooltipTrigger asChild>
                      {conversationButton}
                    </TooltipTrigger>
                    <TooltipContent
                      className={cn(
                        "flex max-w-56 flex-col items-start rounded-2xl bg-[#17120d] px-3 py-2 text-[#fff9f0] shadow-[0_18px_44px_rgba(0,0,0,0.28)]",
                        !compact && "lg:hidden",
                      )}
                      side="right"
                      sideOffset={10}
                    >
                      <span className="text-sm font-semibold leading-5">{conversation.title}</span>
                      <span className="mt-0.5 line-clamp-2 text-xs leading-4 text-[#fff9f0]/70">
                        {preview}
                      </span>
                    </TooltipContent>
                  </Tooltip>
                );
              })}
              {/* {conversations.length === 0 && (
                <div className="grid place-items-center rounded-2xl border border-dashed border-border p-2 text-center text-xs text-muted-foreground lg:p-4 lg:text-sm">
                  <MessageCircle aria-hidden="true" className="mb-2 size-5 text-primary lg:hidden" />
                  <span className="hidden lg:block">Belum ada percakapan. Buka profil pembaca lain lalu tekan Message untuk memulai room baru.</span>
                </div>
              )} */}
            </div>
          </ScrollArea>
        </div>
      </aside>

      <section className="flex min-h-0 flex-col overflow-hidden">
        {activeConversation ? (
          <>
            <div className="flex shrink-0 items-center gap-2.5 border-b border-border p-2.5 sm:p-3">
              {showConversationHeaderToggle && (
                <Button
                  aria-expanded={isConversationListOpen}
                  aria-label={isConversationListOpen ? "Tutup daftar chat" : "Buka daftar chat"}
                  className="lg:hidden"
                  onClick={() => setIsConversationListOpen((current) => !current)}
                  size="icon-sm"
                  type="button"
                  variant="ghost"
                >
                  <PanelLeftIcon className={cn("size-4 transition-transform duration-300", isConversationListOpen && "scale-x-[-1]")} />
                </Button>
              )}
              <ConversationAvatar conversation={activeConversation} currentUserId={initialData.currentUser.id} />
              <div className="min-w-0 flex-1">
                <h1 className="truncate font-heading text-base font-semibold text-primary sm:text-lg">{activeConversation.title}</h1>
                <p className="truncate text-[11px] leading-4 text-muted-foreground sm:text-xs">
                  {typingUsers[activeConversation.id]?.filter((userId) => userId !== initialData.currentUser.id).length
                    ? "Sedang mengetik..."
                    : conversationSubtitle(activeConversation, initialData.currentUser.id)}
                </p>
              </div>
              <Users aria-hidden="true" className="hidden size-4 text-muted-foreground lg:block" />
            </div>
            <ScrollArea className="min-h-0 flex-1 overflow-hidden" type="hover">
              <div className="grid min-w-0 gap-3 p-3 sm:p-4">
                {activeMessages.map((message) => {
                  const isMine = message.senderId === initialData.currentUser.id;
                  return (
                    <div className={cn("flex min-w-0", isMine ? "justify-end" : "justify-start")} key={message.id}>
                      <div
                        className={cn(
                          "max-w-[86%] min-w-0 break-words whitespace-pre-wrap [overflow-wrap:anywhere] rounded-[1.35rem] px-4 py-3 text-sm leading-6 shadow-sm transition-[opacity,transform] duration-300 ease-out motion-reduce:transition-none sm:max-w-[78%]",
                          isMine ? "rounded-br-md bg-primary text-primary-foreground" : "rounded-bl-md bg-secondary text-foreground",
                          message.pending && "opacity-60",
                          message.failed && "border border-destructive/30 bg-destructive/10 text-destructive opacity-100",
                        )}
                      >
                        <p className="break-words [overflow-wrap:anywhere]">{message.body}</p>
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
                <div ref={messagesEndRef} aria-hidden="true" />
              </div>
            </ScrollArea>
            <div className="shrink-0 border-t border-border p-2 sm:p-3">
              <form
                className="flex items-end gap-2  border border-border bg-background p-2"
                onSubmit={(event) => {
                  event.preventDefault();
                  sendMessage();
                }}
              >
                <textarea
                  className="max-h-28 min-h-10 flex-1 resize-none overflow-y-auto bg-transparent px-3 py-2 text-sm outline-none [scrollbar-color:color-mix(in_srgb,var(--primary)_55%,transparent)_transparent] [scrollbar-width:thin] placeholder:text-muted-foreground sm:min-h-11 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-primary/35 hover:[&::-webkit-scrollbar-thumb]:bg-primary/55 [&::-webkit-scrollbar-track]:bg-transparent"
                  onBlur={() => activeConversationId && syncTypingNow(activeConversationId, false)}
                  onChange={(event) => handleDraftChange(event.target.value)}
                  placeholder="Tulis pesan..."
                  value={draft}
                />
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
              <h1 className="mt-5 font-heading text-2xl font-semibold text-primary sm:text-3xl">Realtime chat</h1>
              <p className="mt-2 max-w-md text-sm leading-6 text-muted-foreground">
                Pilih history chat di kiri. Untuk memulai percakapan baru, buka profil pembaca lain lalu tekan Message.
              </p>
            </div>
          </div>
        )}
      </section>

      {/*
        Resize handle: dipasang di level grid container (bukan di dalam
        `<aside>`) supaya tidak ter-clip oleh `overflow-hidden` aside saat
        sidebar `width = 0`. Posisi dan lebar hit area dihitung adaptif via
        `getResizeHandleGeometry` agar tetap mudah di-grab walau sidebar
        sudah tertutup penuh.
      */}
      {isResizableSidebar ? (
        <ResizeHandle
          width={sidebarWidth}
          isResizing={isResizingSidebar}
          onPointerDown={handleSidebarPointerDown}
          onKeyAdjust={(delta) => {
            const next = clampSidebarWidth(sidebarWidthRef.current + delta);
            sidebarWidthRef.current = next;
            setSidebarWidth(next);
            try {
              window.localStorage.setItem(SIDEBAR_STORAGE_KEY, String(next));
            } catch {
              // Aman diabaikan.
            }
          }}
        />
      ) : null}
    </div>
  );
}

/**
 * Handle resize sidebar yang adaptif terhadap lebar saat ini.
 *
 * - Posisi `left` mengikuti tepi kanan sidebar dengan offset kecil agar
 *   sebagian hit area menjorok ke main panel — memudahkan grab.
 * - Saat sidebar mendekati 0 px (`atBoundary === true`), hit area melebar
 *   2× dan ditarik penuh ke `left: 0` sehingga handle "duduk" di tepi
 *   kiri panel main dan tetap bisa di-drag kembali ke kanan untuk
 *   membuka sidebar.
 * - Visual grip tetap ramping (1×32 px) agar tidak terasa berat; yang
 *   dilebarkan hanyalah area tap.
 */
function ResizeHandle({
  width,
  isResizing,
  onPointerDown,
  onKeyAdjust,
}: {
  width: number;
  isResizing: boolean;
  onPointerDown: (event: React.PointerEvent<HTMLDivElement>) => void;
  onKeyAdjust: (delta: number) => void;
}) {
  const { atBoundary, hitWidth, left } = getResizeHandleGeometry(width);

  return (
    <div
      role="separator"
      aria-orientation="vertical"
      aria-valuenow={width}
      aria-valuemin={SIDEBAR_MIN_WIDTH}
      aria-valuemax={SIDEBAR_MAX_WIDTH}
      aria-label="Geser untuk mengubah lebar daftar chat"
      tabIndex={0}
      onPointerDown={onPointerDown}
      onKeyDown={(event) => {
        if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
        event.preventDefault();
        onKeyAdjust(event.key === "ArrowRight" ? 16 : -16);
      }}
      // Pakai inline style untuk lebar/posisi karena nilainya dinamis
      // dan diluar palet Tailwind. Z-index tinggi memastikan handle ada
      // di atas konten panel main.
      style={{
        left: `${left}px`,
        width: `${hitWidth}px`,
      }}
      className={cn(
        "group absolute inset-y-0 z-20 flex cursor-col-resize items-center justify-center",
        "focus-visible:outline-none",
        // Saat sedang drag, jangan animasikan posisi/lebar handle agar
        // gerakan terasa langsung.
        !isResizing && "transition-[left,width] duration-200 ease-out",
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          "h-8 w-1 rounded-full transition-colors duration-200",
          // Saat di boundary (sidebar tertutup), grip lebih kontras
          // sebagai affordance bahwa sidebar masih bisa ditarik kembali.
          atBoundary
            ? "bg-primary/55 group-hover:bg-primary/80"
            : "bg-border group-hover:bg-primary/50",
          "group-focus-visible:bg-primary/70",
          isResizing && "bg-primary/70",
        )}
      />
    </div>
  );
}
