// Unit tests for JWT utility functions
import { describe, it, expect, beforeAll, vi } from 'vitest';
import { generateToken, verifyToken, refreshTokenIfNeeded } from '../../lib/utils/jwt';
import jwt from 'jsonwebtoken';

// Mock the config module to use test secret
vi.mock('../../lib/config', () => ({
  config: {
    auth: {
      jwtSecret: 'test-secret-key-min-32-characters-long'
    }
  }
}));

const TEST_SECRET = 'test-secret-key-min-32-characters-long';

describe('JWT Utility Functions', () => {
  describe('generateToken', () => {
    it('should generate a valid JWT token', () => {
      const token = generateToken('user-123', 'test@example.com', 'free');
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.split('.').length).toBe(3); // JWT has 3 parts
    });

    it('should include user data in token payload', () => {
      const token = generateToken('user-456', 'pro@example.com', 'pro');
      const decoded = verifyToken(token);
      
      expect(decoded.userId).toBe('user-456');
      expect(decoded.email).toBe('pro@example.com');
      expect(decoded.plan).toBe('pro');
    });

    it('should set expiration to 7 days', () => {
      const token = generateToken('user-789', 'test@example.com', 'free');
      const decoded = verifyToken(token);
      
      const now = Math.floor(Date.now() / 1000);
      const sevenDaysInSeconds = 7 * 24 * 60 * 60;
      const expectedExpiry = now + sevenDaysInSeconds;
      
      // Allow 5 second tolerance for test execution time
      expect(decoded.exp).toBeGreaterThan(now);
      expect(decoded.exp).toBeLessThanOrEqual(expectedExpiry + 5);
    });
  });

  describe('verifyToken', () => {
    it('should verify and decode a valid token', () => {
      const token = generateToken('user-123', 'test@example.com', 'free');
      const decoded = verifyToken(token);
      
      expect(decoded.userId).toBe('user-123');
      expect(decoded.email).toBe('test@example.com');
      expect(decoded.plan).toBe('free');
      expect(decoded.iat).toBeDefined();
      expect(decoded.exp).toBeDefined();
    });

    it('should throw error for invalid token', () => {
      expect(() => verifyToken('invalid.token.here')).toThrow();
    });

    it('should throw error for expired or invalid token', () => {
      // Test with a clearly malformed token that will fail verification
      const invalidToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJ1c2VyLTEyMyIsImVtYWlsIjoidGVzdEBleGFtcGxlLmNvbSIsInBsYW4iOiJmcmVlIiwiZXhwIjoxfQ.invalid';
      
      expect(() => verifyToken(invalidToken)).toThrow();
    });

    it('should throw AUTH_INVALID_TOKEN for malformed token', () => {
      expect(() => verifyToken('not-a-jwt')).toThrow('AUTH_INVALID_TOKEN');
    });

    it('should throw AUTH_INVALID_TOKEN for token with wrong signature', () => {
      const wrongToken = jwt.sign(
        { userId: 'user-123', email: 'test@example.com', plan: 'free' },
        'wrong-secret-key',
        { expiresIn: '7d' }
      );
      
      expect(() => verifyToken(wrongToken)).toThrow('AUTH_INVALID_TOKEN');
    });
  });

  describe('refreshTokenIfNeeded', () => {
    it('should return same token if more than 1 day until expiry', () => {
      const token = generateToken('user-123', 'test@example.com', 'free');
      const refreshed = refreshTokenIfNeeded(token);
      
      expect(refreshed).toBe(token);
    });

    it('should generate new token if less than 1 day until expiry', () => {
      // Create token that expires in 12 hours
      const shortLivedToken = jwt.sign(
        { userId: 'user-123', email: 'test@example.com', plan: 'free' },
        TEST_SECRET,
        { expiresIn: '12h' }
      );
      
      const refreshed = refreshTokenIfNeeded(shortLivedToken);
      
      // Should return a new token
      expect(refreshed).not.toBe(shortLivedToken);
      const decoded = verifyToken(refreshed);
      expect(decoded.userId).toBe('user-123');
      expect(decoded.email).toBe('test@example.com');
      expect(decoded.plan).toBe('free');
    });

    it('should throw error for expired or invalid token', () => {
      const invalidToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJ1c2VyLTEyMyIsImVtYWlsIjoidGVzdEBleGFtcGxlLmNvbSIsInBsYW4iOiJmcmVlIiwiZXhwIjoxfQ.invalid';
      
      expect(() => refreshTokenIfNeeded(invalidToken)).toThrow();
    });

    it('should throw error for invalid token', () => {
      expect(() => refreshTokenIfNeeded('invalid-token')).toThrow();
    });
  });
});
