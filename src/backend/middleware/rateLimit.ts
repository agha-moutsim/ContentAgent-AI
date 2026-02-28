// Rate limiting middleware for API routes
import { NextResponse } from 'next/server';
import { AuthenticatedRequest } from './auth';

/**
 * In-memory store for rate limiting
 * Maps userId to array of request timestamps
 */
const rateLimitStore = new Map<string, number[]>();

/**
 * Rate limit configuration
 */
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 10; // 10 requests per minute

/**
 * Clean up old timestamps from the store
 * Removes timestamps older than the rate limit window
 */
function cleanupOldTimestamps(userId: string, now: number): void {
  const timestamps = rateLimitStore.get(userId);
  if (!timestamps) return;

  const cutoff = now - RATE_LIMIT_WINDOW_MS;
  const validTimestamps = timestamps.filter(ts => ts > cutoff);
  
  if (validTimestamps.length === 0) {
    rateLimitStore.delete(userId);
  } else {
    rateLimitStore.set(userId, validTimestamps);
  }
}

/**
 * Rate limiting middleware
 * Enforces 10 requests per minute per user
 * Returns 429 with retry-after header when exceeded
 * 
 * Requirements: 7.2
 * 
 * @param request - Authenticated request with user attached
 * @param handler - Handler function to call if rate limit not exceeded
 * @returns NextResponse
 */
export async function rateLimit(
  request: AuthenticatedRequest,
  handler: (req: AuthenticatedRequest) => Promise<NextResponse>
): Promise<NextResponse> {
  // Ensure user is authenticated (should be guaranteed by requireAuth)
  if (!request.user) {
    return NextResponse.json(
      {
        error: 'Authentication required',
        code: 'AUTH_REQUIRED',
      },
      { status: 401 }
    );
  }

  const userId = request.user.userId;
  const now = Date.now();

  // Clean up old timestamps for this user
  cleanupOldTimestamps(userId, now);

  // Get current timestamps for this user
  const timestamps = rateLimitStore.get(userId) || [];

  // Check if rate limit exceeded
  if (timestamps.length >= RATE_LIMIT_MAX_REQUESTS) {
    // Calculate retry-after in seconds
    const oldestTimestamp = timestamps[0];
    const retryAfterMs = (oldestTimestamp + RATE_LIMIT_WINDOW_MS) - now;
    const retryAfterSeconds = Math.ceil(retryAfterMs / 1000);

    return NextResponse.json(
      {
        error: 'Too many requests. Please wait before trying again.',
        code: 'RATE_LIMIT_EXCEEDED',
        retryAfter: retryAfterSeconds,
      },
      {
        status: 429,
        headers: {
          'Retry-After': retryAfterSeconds.toString(),
        },
      }
    );
  }

  // Add current timestamp
  timestamps.push(now);
  rateLimitStore.set(userId, timestamps);

  // Call the handler
  return await handler(request);
}

/**
 * Helper function to reset rate limit for a user (useful for testing)
 * @param userId - User ID to reset
 */
export function resetRateLimit(userId: string): void {
  rateLimitStore.delete(userId);
}

/**
 * Helper function to get current request count for a user (useful for testing)
 * @param userId - User ID to check
 * @returns Number of requests in current window
 */
export function getRateLimitCount(userId: string): number {
  const now = Date.now();
  cleanupOldTimestamps(userId, now);
  return rateLimitStore.get(userId)?.length || 0;
}
