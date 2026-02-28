// Unit tests for usage tracking service
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { checkLimit, getCurrentUsage, getCurrentBillingPeriodStart } from '../../lib/services/usage';
import * as dbClient from '../../lib/db/client';

// Mock the database client
vi.mock('../../lib/db/client');

describe('Usage Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getCurrentBillingPeriodStart', () => {
    it('should return first day of current month at midnight UTC', () => {
      const result = getCurrentBillingPeriodStart();
      const now = new Date();
      
      expect(result.getUTCDate()).toBe(1);
      expect(result.getUTCMonth()).toBe(now.getUTCMonth());
      expect(result.getUTCFullYear()).toBe(now.getUTCFullYear());
      expect(result.getUTCHours()).toBe(0);
      expect(result.getUTCMinutes()).toBe(0);
      expect(result.getUTCSeconds()).toBe(0);
      expect(result.getUTCMilliseconds()).toBe(0);
    });
  });

  describe('checkLimit', () => {
    it('should allow pro users unlimited access', async () => {
      vi.mocked(dbClient.queryOne).mockResolvedValueOnce({ plan: 'pro' });

      const result = await checkLimit('user-123');

      expect(result.allowed).toBe(true);
      expect(result.reason).toBeUndefined();
    });

    it('should allow free users under the limit', async () => {
      vi.mocked(dbClient.queryOne)
        .mockResolvedValueOnce({ plan: 'free' })
        .mockResolvedValueOnce({ count: '3' });

      const result = await checkLimit('user-123');

      expect(result.allowed).toBe(true);
      expect(result.currentUsage).toBe(3);
      expect(result.limit).toBe(5);
    });

    it('should block free users at exactly 5 generations', async () => {
      vi.mocked(dbClient.queryOne)
        .mockResolvedValueOnce({ plan: 'free' })
        .mockResolvedValueOnce({ count: '5' });

      const result = await checkLimit('user-123');

      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('Free plan limit reached');
      expect(result.currentUsage).toBe(5);
      expect(result.limit).toBe(5);
    });

    it('should block free users over the limit', async () => {
      vi.mocked(dbClient.queryOne)
        .mockResolvedValueOnce({ plan: 'free' })
        .mockResolvedValueOnce({ count: '7' });

      const result = await checkLimit('user-123');

      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('Upgrade to Pro');
      expect(result.currentUsage).toBe(7);
    });

    it('should allow free users with 0 usage', async () => {
      vi.mocked(dbClient.queryOne)
        .mockResolvedValueOnce({ plan: 'free' })
        .mockResolvedValueOnce({ count: '0' });

      const result = await checkLimit('user-123');

      expect(result.allowed).toBe(true);
      expect(result.currentUsage).toBe(0);
      expect(result.limit).toBe(5);
    });

    it('should throw error if user not found', async () => {
      vi.mocked(dbClient.queryOne).mockResolvedValueOnce(null);

      await expect(checkLimit('nonexistent-user')).rejects.toThrow('USER_NOT_FOUND');
    });

    it('should query history table with correct billing period', async () => {
      const mockQueryOne = vi.mocked(dbClient.queryOne);
      mockQueryOne
        .mockResolvedValueOnce({ plan: 'free' })
        .mockResolvedValueOnce({ count: '2' });

      await checkLimit('user-123');

      // Check that the second query (usage count) was called with billing period start
      const secondCall = mockQueryOne.mock.calls[1];
      expect(secondCall[0]).toContain('created_at >= $2');
      
      const billingPeriodStart = secondCall[1]?.[1] as Date;
      expect(billingPeriodStart).toBeInstanceOf(Date);
      expect(billingPeriodStart.getUTCDate()).toBe(1);
    });
  });

  describe('getCurrentUsage', () => {
    it('should return usage count for current billing period', async () => {
      vi.mocked(dbClient.queryOne).mockResolvedValueOnce({ count: '4' });

      const result = await getCurrentUsage('user-123');

      expect(result).toBe(4);
    });

    it('should return 0 if no usage found', async () => {
      vi.mocked(dbClient.queryOne).mockResolvedValueOnce({ count: '0' });

      const result = await getCurrentUsage('user-123');

      expect(result).toBe(0);
    });

    it('should return 0 if query returns null', async () => {
      vi.mocked(dbClient.queryOne).mockResolvedValueOnce(null);

      const result = await getCurrentUsage('user-123');

      expect(result).toBe(0);
    });

    it('should query with correct billing period start date', async () => {
      const mockQueryOne = vi.mocked(dbClient.queryOne);
      mockQueryOne.mockResolvedValueOnce({ count: '2' });

      await getCurrentUsage('user-123');

      const call = mockQueryOne.mock.calls[0];
      expect(call[0]).toContain('created_at >= $2');
      
      const billingPeriodStart = call[1]?.[1] as Date;
      expect(billingPeriodStart).toBeInstanceOf(Date);
      expect(billingPeriodStart.getUTCDate()).toBe(1);
    });
  });

  describe('Edge Cases', () => {
    it('should handle boundary at exactly 4 generations (last allowed)', async () => {
      vi.mocked(dbClient.queryOne)
        .mockResolvedValueOnce({ plan: 'free' })
        .mockResolvedValueOnce({ count: '4' });

      const result = await checkLimit('user-123');

      expect(result.allowed).toBe(true);
      expect(result.currentUsage).toBe(4);
    });

    it('should handle string count conversion correctly', async () => {
      vi.mocked(dbClient.queryOne)
        .mockResolvedValueOnce({ plan: 'free' })
        .mockResolvedValueOnce({ count: '10' });

      const result = await checkLimit('user-123');

      expect(result.allowed).toBe(false);
      expect(result.currentUsage).toBe(10);
    });
  });
});
