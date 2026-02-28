import { query, queryOne, queryMany } from '../db/client';
import { HistoryRecord, ContentPackage } from '../types';

/**
 * Service for managing content generation history
 */
export const historyService = {
  /**
   * Saves a new content generation record to history
   */
  async saveRecord(userId: string, inputIdea: string, contentPackage: ContentPackage): Promise<HistoryRecord> {
    const res = await queryOne<HistoryRecord>(
      `INSERT INTO history (user_id, input_idea, content_package)
       VALUES ($1, $2, $3)
       RETURNING id, user_id as "userId", input_idea as "inputIdea", content_package as "contentPackage", created_at as "createdAt"`,
      [userId, inputIdea, JSON.stringify(contentPackage)]
    );

    if (!res) {
      throw new Error('Failed to save history record');
    }

    return res;
  },

  /**
   * Retrieves all history records for a specific user
   */
  async getUserHistory(userId: string): Promise<HistoryRecord[]> {
    return await queryMany<HistoryRecord>(
      `SELECT id, user_id as "userId", input_idea as "inputIdea", content_package as "contentPackage", created_at as "createdAt"
       FROM history
       WHERE user_id = $1
       ORDER BY created_at DESC`,
      [userId]
    );
  },

  /**
   * Retrieves a single history record by ID, ensuring it belongs to the user
   */
  async getRecordById(id: string, userId: string): Promise<HistoryRecord | null> {
    return await queryOne<HistoryRecord>(
      `SELECT id, user_id as "userId", input_idea as "inputIdea", content_package as "contentPackage", created_at as "createdAt"
       FROM history
       WHERE id = $1 AND user_id = $2`,
      [id, userId]
    );     
  },

  /**
   * Deletes a history record
   */
  async deleteRecord(id: string, userId: string): Promise<boolean> {
    const res = await query(
      'DELETE FROM history WHERE id = $1 AND user_id = $2 RETURNING id',
      [id, userId]
    );
    return (res.rowCount ?? 0) > 0;
  },

  /**
   * Counts the number of history records for a user
   */
  async countUserRecords(userId: string): Promise<number> {
    const res = await queryOne<{ count: string }>(
      'SELECT COUNT(*) as count FROM history WHERE user_id = $1',
      [userId]
    );
    return parseInt(res?.count || '0', 10);
  },

  /**
   * Retrieves usage statistics for a rolling time window
   * @param userId - ID of the user
   * @param limit - Usage limit (e.g., 3 for free tier)
   * @returns count in window and resetTime (Date when usage will drop below limit)
   */
  async getUsageStats(userId: string, limit: number): Promise<{ count: number; resetTime: Date | null }> {
    // 1. Get count in last 1 hour
    const windowRes = await queryOne<{ count: string }>(
      `SELECT COUNT(*) as count 
       FROM history 
       WHERE user_id = $1 AND created_at > NOW() - INTERVAL '1 hour'`,
      [userId]
    );
    const count = parseInt(windowRes?.count || '0', 10);

    // 2. If at or above limit, find when the oldest record in that window will expire
    let resetTime: Date | null = null;
    if (count >= limit) {
      // Find the Nth newest record (where N = limit)
      // This record dropping out of the 1h window will make room for a new one
      const oldestInWindow = await queryOne<{ created_at: Date }>(
        `SELECT created_at 
         FROM history 
         WHERE user_id = $1 AND created_at > NOW() - INTERVAL '1 hour'
         ORDER BY created_at ASC 
         LIMIT 1 OFFSET ${limit - 1}`,
        [userId]
      );

      if (oldestInWindow) {
        // Reset happens 1 hour after that record was created
        resetTime = new Date(new Date(oldestInWindow.created_at).getTime() + 1 * 60 * 60 * 1000);
      } else {
        // Fallback for edge cases: resets in 1 hour from now
        resetTime = new Date(Date.now() + 1 * 60 * 60 * 1000);
      }
    }

    return { count, resetTime };
  }
};
