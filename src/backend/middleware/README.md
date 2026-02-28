# Middleware

This directory contains middleware functions for API route protection and rate limiting.

## Available Middleware

### `requireAuth`

Validates JWT tokens and attaches user information to the request.

**Requirements:** 1.3, 1.4, 7.6

**Usage:**
```typescript
import { requireAuth } from '@/lib/middleware';

export async function POST(request: NextRequest) {
  return requireAuth(request, async (req) => {
    // req.user is now available
    const userId = req.user.userId;
    
    // Your handler logic here
    return NextResponse.json({ success: true });
  });
}
```

### `rateLimit`

Enforces rate limiting (10 requests per minute per user).

**Requirements:** 7.2

**Usage:**
```typescript
import { rateLimit } from '@/lib/middleware';

export async function POST(request: NextRequest) {
  return rateLimit(request, async (req) => {
    // Rate limit check passed
    // Your handler logic here
    return NextResponse.json({ success: true });
  });
}
```

### Combined Usage

To use both authentication and rate limiting together:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, rateLimit } from '@/lib/middleware';

export async function POST(request: NextRequest) {
  // First, require authentication
  return requireAuth(request, async (authenticatedReq) => {
    // Then, apply rate limiting
    return rateLimit(authenticatedReq, async (req) => {
      // Both checks passed
      // req.user is available
      const userId = req.user.userId;
      
      // Your handler logic here
      return NextResponse.json({ 
        success: true,
        userId 
      });
    });
  });
}
```

## Rate Limiting Details

- **Window:** 1 minute (60 seconds)
- **Max Requests:** 10 per user per window
- **Storage:** In-memory (for development/small scale)
- **Response:** 429 Too Many Requests with `Retry-After` header

### Rate Limit Response Format

When rate limit is exceeded:

```json
{
  "error": "Too many requests. Please wait before trying again.",
  "code": "RATE_LIMIT_EXCEEDED",
  "retryAfter": 45
}
```

Headers:
- `Retry-After`: Number of seconds to wait before retrying

## Testing Utilities

For testing purposes, the rate limit module exports helper functions:

```typescript
import { resetRateLimit, getRateLimitCount } from '@/lib/middleware';

// Reset rate limit for a user (useful in tests)
resetRateLimit(userId);

// Get current request count for a user
const count = getRateLimitCount(userId);
```

## Production Considerations

The current rate limiting implementation uses an in-memory store, which works well for:
- Development environments
- Single-instance deployments
- Small to medium scale applications

For production at scale, consider:
- Using Redis for distributed rate limiting
- Implementing rate limit cleanup/garbage collection
- Adding rate limit monitoring and alerts
- Configuring different limits per endpoint or user tier

## Error Handling

Both middleware functions return appropriate HTTP status codes:

- **401 Unauthorized:** Missing or invalid JWT token
- **429 Too Many Requests:** Rate limit exceeded

All errors include:
- `error`: Human-readable error message
- `code`: Machine-readable error code
- Additional context (e.g., `retryAfter` for rate limits)
