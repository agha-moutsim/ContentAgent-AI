// Unit tests for requireAuth middleware
import { describe, it, expect, beforeEach } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, getAuthenticatedUser, AuthenticatedRequest } from '../../lib/middleware/auth';
import { generateToken } from '../../lib/utils/jwt';

describe('requireAuth middleware', () => {
  const mockHandler = async (req: AuthenticatedRequest) => {
    return NextResponse.json({ success: true, userId: req.user?.userId });
  };

  describe('Token extraction', () => {
    it('should extract token from Authorization header', async () => {
      const token = generateToken('user-123', 'test@example.com', 'free');
      const request = new NextRequest('http://localhost:3000/api/test', {
        headers: {
          authorization: `Bearer ${token}`,
        },
      });

      const response = await requireAuth(request, mockHandler);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.userId).toBe('user-123');
    });

    it('should extract token from cookie', async () => {
      const token = generateToken('user-456', 'test2@example.com', 'pro');
      const request = new NextRequest('http://localhost:3000/api/test', {
        headers: {
          cookie: `auth_token=${token}`,
        },
      });

      const response = await requireAuth(request, mockHandler);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.userId).toBe('user-456');
    });

    it('should prefer Authorization header over cookie', async () => {
      const headerToken = generateToken('user-header', 'header@example.com', 'free');
      const cookieToken = generateToken('user-cookie', 'cookie@example.com', 'free');
      
      const request = new NextRequest('http://localhost:3000/api/test', {
        headers: {
          authorization: `Bearer ${headerToken}`,
          cookie: `auth_token=${cookieToken}`,
        },
      });

      const response = await requireAuth(request, mockHandler);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.userId).toBe('user-header');
    });
  });

  describe('Missing token', () => {
    it('should return 401 when no token provided', async () => {
      const request = new NextRequest('http://localhost:3000/api/test');

      const response = await requireAuth(request, mockHandler);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Authentication required');
      expect(data.code).toBe('AUTH_REQUIRED');
    });

    it('should return 401 when Authorization header is malformed', async () => {
      const request = new NextRequest('http://localhost:3000/api/test', {
        headers: {
          authorization: 'InvalidFormat token123',
        },
      });

      const response = await requireAuth(request, mockHandler);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Authentication required');
      expect(data.code).toBe('AUTH_REQUIRED');
    });
  });

  describe('Invalid token', () => {
    it('should return 401 for invalid token', async () => {
      const request = new NextRequest('http://localhost:3000/api/test', {
        headers: {
          authorization: 'Bearer invalid-token-string',
        },
      });

      const response = await requireAuth(request, mockHandler);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Invalid authentication token');
      expect(data.code).toBe('AUTH_INVALID_TOKEN');
    });

    it('should return 401 for malformed JWT', async () => {
      const request = new NextRequest('http://localhost:3000/api/test', {
        headers: {
          authorization: 'Bearer not.a.valid.jwt',
        },
      });

      const response = await requireAuth(request, mockHandler);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.code).toBe('AUTH_INVALID_TOKEN');
    });
  });

  describe('Expired token', () => {
    it('should return 401 with specific error for expired token', async () => {
      // Create a token that's already expired (using jwt directly)
      const jwt = await import('jsonwebtoken');
      const config = await import('../../lib/config');
      
      const expiredToken = jwt.default.sign(
        {
          userId: 'user-123',
          email: 'test@example.com',
          plan: 'free',
        },
        config.config.auth.jwtSecret,
        { expiresIn: '-1h' } // Expired 1 hour ago
      );

      const request = new NextRequest('http://localhost:3000/api/test', {
        headers: {
          authorization: `Bearer ${expiredToken}`,
        },
      });

      const response = await requireAuth(request, mockHandler);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Session expired. Please log in again.');
      expect(data.code).toBe('AUTH_TOKEN_EXPIRED');
    });
  });

  describe('User attachment', () => {
    it('should attach user object to request', async () => {
      const token = generateToken('user-789', 'attach@example.com', 'pro');
      const request = new NextRequest('http://localhost:3000/api/test', {
        headers: {
          authorization: `Bearer ${token}`,
        },
      });

      let capturedUser: any = null;
      const testHandler = async (req: AuthenticatedRequest) => {
        capturedUser = req.user;
        return NextResponse.json({ success: true });
      };

      await requireAuth(request, testHandler);

      expect(capturedUser).toBeDefined();
      expect(capturedUser.userId).toBe('user-789');
      expect(capturedUser.email).toBe('attach@example.com');
      expect(capturedUser.plan).toBe('pro');
      expect(capturedUser.iat).toBeDefined();
      expect(capturedUser.exp).toBeDefined();
    });
  });

  describe('getAuthenticatedUser helper', () => {
    it('should return user from authenticated request', async () => {
      const token = generateToken('user-helper', 'helper@example.com', 'free');
      const request = new NextRequest('http://localhost:3000/api/test', {
        headers: {
          authorization: `Bearer ${token}`,
        },
      });

      const testHandler = async (req: AuthenticatedRequest) => {
        const user = getAuthenticatedUser(req);
        return NextResponse.json({ userId: user.userId, email: user.email });
      };

      const response = await requireAuth(request, testHandler);
      const data = await response.json();

      expect(data.userId).toBe('user-helper');
      expect(data.email).toBe('helper@example.com');
    });

    it('should throw error if user not attached', () => {
      const request = new NextRequest('http://localhost:3000/api/test') as AuthenticatedRequest;
      
      expect(() => getAuthenticatedUser(request)).toThrow('User not authenticated');
    });
  });

  describe('Error handling', () => {
    it('should handle handler errors gracefully', async () => {
      const token = generateToken('user-error', 'error@example.com', 'free');
      const request = new NextRequest('http://localhost:3000/api/test', {
        headers: {
          authorization: `Bearer ${token}`,
        },
      });

      const errorHandler = async (req: AuthenticatedRequest) => {
        throw new Error('Handler error');
      };

      // The middleware should let handler errors propagate
      await expect(requireAuth(request, errorHandler)).rejects.toThrow('Handler error');
    });
  });
});
