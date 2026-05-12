export type ChatUserSummary = {
  id: string;
  name: string | null;
  email: string | null;
  image: string | null;
  online: boolean;
};

export type ChatConversationSummary = {
  id: string;
  title: string;
  type: "DIRECT" | "GROUP";
  lastMessageAt: string | null;
  unreadCount: number;
  participants: ChatUserSummary[];
  lastMessage: ChatMessageSummary | null;
};

export type ChatMessageSummary = {
  id: string;
  conversationId: string;
  senderId: string;
  senderName: string | null;
  body: string;
  type: "TEXT" | "IMAGE" | "FILE" | "SYSTEM";
  createdAt: string;
  pending?: boolean;
};

export type ChatBootstrap = {
  currentUser: ChatUserSummary;
  conversations: ChatConversationSummary[];
  suggestedUsers: ChatUserSummary[];
  messagesByConversation: Record<string, ChatMessageSummary[]>;
  socketUrl: string | null;
};

export type ChatSocketEvent =
  | {
      type: "message.created";
      conversationId: string;
      message: ChatMessageSummary;
    }
  | {
      type: "typing.updated";
      conversationId: string;
      userId: string;
      isTyping: boolean;
    }
  | {
      type: "presence.updated";
      userId: string;
      online: boolean;
    }
  | {
      type: "conversation.read";
      conversationId: string;
      userId: string;
      readAt: string;
    };

export type ChatClientSocketEvent =
  | {
      type: "typing.update";
      conversationId: string;
      isTyping: boolean;
    }
  | {
      type: "ping";
    };

export type SendMessageInput = {
  conversationId: string;
  body: string;
  clientId?: string;
};
