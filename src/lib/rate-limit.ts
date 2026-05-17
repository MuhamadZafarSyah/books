import { Ratelimit } from "@upstash/ratelimit"
import { Redis } from "@upstash/redis"

const redis =
  process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
    ? new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL,
        token: process.env.UPSTASH_REDIS_REST_TOKEN,
      })
    : null

// 5 requests per 60-second sliding window (default for sensitive auth flows)
const ratelimit = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(5, "60 s"),
      analytics: true,
    })
  : null

// 30 requests per 60-second sliding window — used for higher-traffic endpoints
// such as the Nominatim geocoding proxy used by the reading-events map picker.
const geocodeRatelimit = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(30, "60 s"),
      analytics: true,
      prefix: "ratelimit:geocode",
    })
  : null

/**
 * Check rate limit for a given key (e.g. "register:user@example.com").
 * Returns { success: true } if allowed, or { success: false, error } if blocked.
 */
export async function checkRateLimit(
  key: string
): Promise<{ success: boolean; error?: string }> {
  if (!ratelimit) {
    return { success: true }
  }

  try {
    const { success } = await ratelimit.limit(key)

    if (!success) {
      return {
        success: false,
        error: "Too many requests. Please try again later.",
      }
    }

    return { success: true }
  } catch (error) {
    // If Redis is unreachable, fail open (allow the request) but log the error
    console.error("Rate limit check failed:", error)
    return { success: true }
  }
}

/**
 * Check the geocoding rate limit (30 requests per minute per key).
 * Used to keep our Nominatim proxy below the OSM Nominatim public usage policy.
 */
export async function checkGeocodeRateLimit(
  key: string
): Promise<{ success: boolean; error?: string }> {
  if (!geocodeRatelimit) {
    return { success: true }
  }

  try {
    const { success } = await geocodeRatelimit.limit(key)

    if (!success) {
      return {
        success: false,
        error: "Terlalu banyak permintaan.",
      }
    }

    return { success: true }
  } catch (error) {
    // If Redis is unreachable, fail open (allow the request) but log the error
    console.error("Geocode rate limit check failed:", error)
    return { success: true }
  }
}
