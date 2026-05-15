const INVALID_CLUSTER_TOKENS = new Set(["api", "ws", "sockjs"]);

function trimOrNull(value: string | undefined | null) {
  if (!value) return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function parseClusterFromHostLike(value: string) {
  const normalized = /^https?:\/\//i.test(value) ? value : `https://${value}`;

  try {
    const hostname = new URL(normalized).hostname.toLowerCase();
    const match =
      /^(?:api-|ws-|sockjs-)?([a-z0-9-]+)\.(?:pusher|pusherapp)\.com$/i.exec(
        hostname,
      );

    return match?.[1] ?? null;
  } catch {
    return null;
  }
}

export function normalizePusherCluster(value: string | null) {
  if (!value) return null;

  const hostCluster = parseClusterFromHostLike(value);
  const candidate = (hostCluster ?? value).trim().toLowerCase();

  if (!candidate || INVALID_CLUSTER_TOKENS.has(candidate)) {
    return null;
  }

  return /^[a-z0-9-]+$/i.test(candidate) ? candidate : null;
}

/**
 * Server-only Pusher config. Accessed via Node `process.env` at runtime so
 * dynamic lookup is fine here.
 */
export function getPusherServerConfig() {
  const appId = trimOrNull(process.env.PUSHER_APP_ID);
  const key = trimOrNull(process.env.PUSHER_KEY);
  const secret = trimOrNull(process.env.PUSHER_SECRET);
  const cluster = normalizePusherCluster(trimOrNull(process.env.PUSHER_CLUSTER));

  if (!appId || !key || !secret || !cluster) return null;

  return { appId, key, secret, cluster };
}

/**
 * Client Pusher config.
 *
 * IMPORTANT: Each `process.env.NEXT_PUBLIC_*` access MUST be a literal
 * member expression for Next.js (webpack/turbopack) to inline the value at
 * build time into the browser bundle. Dynamic lookup like `process.env[key]`
 * resolves to `undefined` in the browser, which silently breaks Pusher.
 */
export function getPusherClientConfig() {
  const key = trimOrNull(process.env.NEXT_PUBLIC_PUSHER_KEY);
  const cluster = normalizePusherCluster(
    trimOrNull(process.env.NEXT_PUBLIC_PUSHER_CLUSTER),
  );

  if (!key || !cluster) return null;

  return { key, cluster };
}
