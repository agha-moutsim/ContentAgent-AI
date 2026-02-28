// Usage tracking service for subscription limit enforcement
import { queryOne } from '../db/client';
// import { User } from '../types'; // unused, kept for reference

/**
 * Result of usage limit check
 */
export interface UsageLimitResult {
  allowed: boolean;
  reason?: string;
  currentUsage?: number;
  limit?: number;
}

/**
 * Checks if a user is allowed to generate content based on their plan and usage
 * @param userId - User's unique identifier
 * @returns Object indicating if generation is allowed and reason if not
 * 
 * Requirements:
 * - 3.1: Free users have usage tracked
 * - 3.2: Free users blocked after 5 generations
 * - 3.3: Pro users have unlimited access
 * - 3.4: Usage resets at billing period
 * - 3.5: Plan validation before generation
 */
export async function checkLimit(userId: string): Promise<UsageLimitResult> {
  // Fetch user plan
  const user = await queryOne<{ plan: 'free' | 'pro' }>(
    'SELECT plan FROM users WHERE id = $1',
    [userId]
  );

  if (!user) {
    throw new Error('USER_NOT_FOUND');
  }

  // Pro users have unlimited access (Requirement 3.3)
  if (user.plan === 'pro') {
    return { allowed: true };
  }

  // Free plan: check monthly limit (Requirements 3.1, 3.2, 3.4)
  const currentPeriodStart = getCurrentBillingPeriodStart();
  
  // Calculate usage dynamically from history table
  const usageResult = await queryOne<{ count: string }>(
    `SELECT COUNT(*) as count
     FROM history
     WHERE user_id = $1 AND created_at >= $2`,
    [userId, currentPeriodStart]
  );

  const usageThisPeriod = parseInt(usageResult?.count || '0', 10);
  const FREE_PLAN_LIMIT = 5;

  // Check if limit exceeded (Requirement 3.2)
  if (usageThisPeriod >= FREE_PLAN_LIMIT) {
    return {
      allowed: false,
      reason: 'Free plan limit reached. Upgrade to Pro for unlimited generations.',
      currentUsage: usageThisPeriod,
      limit: FREE_PLAN_LIMIT,
    };
  }

  return {
    allowed: true,
    currentUsage: usageThisPeriod,
    limit: FREE_PLAN_LIMIT,
  };
}

/**
 * Gets the current usage count for a user in the current billing period
 * @param userId - User's unique identifier
 * @returns Current usage count
 */
export async function getCurrentUsage(userId: string): Promise<number> {
  const currentPeriodStart = getCurrentBillingPeriodStart();
  
  const result = await queryOne<{ count: string }>(
    `SELECT COUNT(*) as count
     FROM history
     WHERE user_id = $1 AND created_at >= $2`,
    [userId, currentPeriodStart]
  );

  return parseInt(result?.count || '0', 10);
}

/**
 * Returns the start date of the current billing period (first day of current month)
 * This is used to calculate usage for free users
 * 
 * Requirement 3.4: Billing period resets monthly
 * 
 * @returns Date object representing the start of the current billing period
 */
export function getCurrentBillingPeriodStart(): Date {
  const now = new Date();
  // Set to first day of current month at midnight UTC
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0, 0));
}
