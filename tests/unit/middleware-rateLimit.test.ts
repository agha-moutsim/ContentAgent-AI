// Unit tests for rate limiting middleware
import { describe, it, expect, beforeEach } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';
import { rateLimit, resetRateLimit, getRateLimitCount } from '../../lib/middleware/rateLimit';
import { AuthenticatedRequest } from '../../lib/middleware/auth';
import { JWTPayload } from '../../lib/types';

describe('Rate Limiting Middleware', () => {
  const mockUser: JWTPayload = {
    userId: 'test-user-123',
    email: 'test@example.com',
    plan: 'free',
    iat: Date.now(),
    exp: Date.now() + 7 * 24 * 60 * 60 * 1000,
  };

  const mockHandler = async (req: AuthenticatedRequest): Promise<NextResponse> => {
    return NextResponse.json({ success: true });
  };

  beforeEach(() => {
    // Reset rate limit before each test
    resetRateLimit(mockUser.userId);
  });

  it('should allow requests under the rate limit', async () => {
    const request = new NextRequest('http://localhost:3000/api/test') as AuthenticatedRequest;
    request.user = mockUser;

    const response = await rateLimit(request, mockHandler);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
  });

  it('should track request count correctly', async () => {
    const request = new NextRequest('http://localhost:3000/api/test') as AuthenticatedRequest;
    request.user = mockUser;

    // Make 5 requests
    for (let i = 0; i < 5; i++) {
      await rateLimit(request, mockHandler);
    }

    expect(getRateLimitCount(mockUser.userId)).toBe(5);
  });

  it('should return 429 when rate limit exceeded', async () => {
    const request = new NextRequest('http://localhost:3000/api/test') as AuthenticatedRequest;
    request.user = mockUser;

    // Make 10 requests (at limit)
    for (let i = 0; i < 10; i++) {
      await rateLimit(request, mockHandler);
    }

    // 11th request should be rate limited
    const response = await rateLimit(request, mockHandler);
    const data = await response.json();

    expect(response.status).toBe(429);
    expect(data.code).toBe('RATE_LIMIT_EXCEEDED');
    expect(data.error).toBe('Too many requests. Please wait before trying again.');
  });

  it('should include retry-after header when rate limited', async () => {
    const request = new NextRequest('http://localhost:3000/api/test') as AuthenticatedRequest;
    request.user = mockUser;

    // Make 10 requests (at limit)
    for (let i = 0; i < 10; i++) {
      await rateLimit(request, mockHandler);
    }

    // 11th request should be rate limited
    const response = await rateLimit(request, mockHandler);
    const retryAfter = response.headers.get('Retry-After');

    expect(retryAfter).toBeDefined();
    expect(parseInt(retryAfter!)).toBeGreaterThan(0);
    expect(parseInt(retryAfter!)).toBeLessThanOrEqual(60);
  });

  it('should include retryAfter in response body', async () => {
    const request = new NextRequest('http://localhost:3000/api/test') as AuthenticatedRequest;
    request.user = mockUser;

    // Make 10 requests (at limit)
    for (let i = 0; i < 10; i++) {
      await rateLimit(request, mockHandler);
    }

    // 11th request should be rate limited
    const response = await rateLimit(request, mockHandler);
    const data = await response.json();

    expect(data.retryAfter).toBeDefined();
    expect(data.retryAfter).toBeGreaterThan(0);
    expect(data.retryAfter).toBeLessThanOrEqual(60);
  });

  it('should reset rate limit after time window', async () => {
    const request = new NextRequest('http://localhost:3000/api/test') as AuthenticatedRequest;
    request.user = mockUser;

    // Make 10 requests (at limit)
    for (let i = 0; i < 10; i++) {
      await rateLimit(request, mockHandler);
    }

    // Verify we're at the limit
    expect(getRateLimitCount(mockUser.userId)).toBe(10);

    // Reset the rate limit (simulating time passing)
    resetRateLimit(mockUser.userId);

    // Should be able to make requests again
    const response = await rateLimit(request, mockHandler);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(getRateLimitCount(mockUser.userId)).toBe(1);
  });

  it('should track rate limits per user independently', async () => {
    const user1: JWTPayload = { ...mockUser, userId: 'user-1', email: 'user1@example.com' };
    const user2: JWTPayload = { ...mockUser, userId: 'user-2', email: 'user2@example.com' };

    const request1 = new NextRequest('http://localhost:3000/api/test') as AuthenticatedRequest;
    request1.user = user1;

    const request2 = new NextRequest('http://localhost:3000/api/test') as AuthenticatedRequest;
    request2.user = user2;

    // Make 10 requests for user1
    for (let i = 0; i < 10; i++) {
      await rateLimit(request1, mockHandler);
    }

    // User1 should be rate limited
    const response1 = await rateLimit(request1, mockHandler);
    expect(response1.status).toBe(429);

    // User2 should still be able to make requests
    const response2 = await rateLimit(request2, mockHandler);
    expect(response2.status).toBe(200);

    // Cleanup
    resetRateLimit(user1.userId);
    resetRateLimit(user2.userId);
  });

  it('should return 401 if user is not authenticated', async () => {
    const request = new NextRequest('http://localhost:3000/api/test') as AuthenticatedRequest;
    // No user attached

    const response = await rateLimit(request, mockHandler);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.code).toBe('AUTH_REQUIRED');
  });

  it('should allow exactly 10 requests before rate limiting', async () => {
    const request = new NextRequest('http://localhost:3000/api/test') as AuthenticatedRequest;
    request.user = mockUser;

    // Make exactly 10 requests
    for (let i = 0; i < 10; i++) {
      const response = await rateLimit(request, mockHandler);
      expect(response.status).toBe(200);
    }

    // 11th request should be rate limited
    const response = await rateLimit(request, mockHandler);
    expect(response.status).toBe(429);
  });

  it('should handle rapid successive requests', async () => {
    const request = new NextRequest('http://localhost:3000/api/test') as AuthenticatedRequest;
    request.user = mockUser;

    // Make 15 rapid requests
    const responses = await Promise.all(
      Array.from({ length: 15 }, () => rateLimit(request, mockHandler))
    );

    // First 10 should succeed
    for (let i = 0; i < 10; i++) {
      expect(responses[i].status).toBe(200);
    }

    // Remaining 5 should be rate limited
    for (let i = 10; i < 15; i++) {
      expect(responses[i].status).toBe(429);
    }
  });
});
