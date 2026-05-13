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
  clientId?: string;
  pending?: boolean;
  failed?: boolean;
};

export type ChatBootstrap = {
  currentUser: ChatUserSummary;
  activeConversationId: string | null;
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
      type: "message.failed";
      conversationId: string;
      clientId: string;
      reason: string;
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
      type: "message.send";
      conversationId: string;
      body: string;
      clientId: string;
    }
  | {
      type: "typing.update";
      conversationId: string;
      isTyping: boolean;
    }
  | {
      type: "ping";
    };
