import crypto from "crypto";

const TOKEN_TTL_MS = 1000 * 60 * 10;

type SocketTokenPayload = {
  userId: string;
  userName: string | null;
  conversationIds: string[];
  rooms: Record<string, string[]>;
  exp: number;
};

function getSecret() {
  return process.env.AUTH_SECRET || process.env.CHAT_WS_INTERNAL_SECRET || "dev-chat-secret";
}

function toBase64Url(value: string) {
  return Buffer.from(value).toString("base64url");
}

function signPayload(payload: string) {
  return crypto.createHmac("sha256", getSecret()).update(payload).digest("base64url");
}

export function createChatSocketToken({
  conversationIds,
  rooms,
  userId,
  userName,
}: {
  userId: string;
  userName: string | null;
  conversationIds: string[];
  rooms: Record<string, string[]>;
}) {
  const payload: SocketTokenPayload = {
    userId,
    userName,
    conversationIds,
    rooms,
    exp: Date.now() + TOKEN_TTL_MS,
  };
  const encoded = toBase64Url(JSON.stringify(payload));
  return `${encoded}.${signPayload(encoded)}`;
}
