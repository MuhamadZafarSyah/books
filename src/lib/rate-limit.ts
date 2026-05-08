import { Ratelimit } from "@upstash/ratelimit"
import { Redis } from "@upstash/redis"

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
})

// 5 requests per 60-second sliding window
const ratelimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(5, "60 s"),
  analytics: true,
})

/**
 * Check rate limit for a given key (e.g. "register:user@example.com").
 * Returns { success: true } if allowed, or { success: false, error } if blocked.
 */
export async function checkRateLimit(
  key: string
): Promise<{ success: boolean; error?: string }> {
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
