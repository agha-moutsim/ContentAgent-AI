import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { query, queryOne, queryMany, transaction, healthCheck } from '../../lib/db/client';

// Mock pg module
vi.mock('pg', () => {
  const mockQuery = vi.fn();
  const mockConnect = vi.fn();
  const mockRelease = vi.fn();
  const mockOn = vi.fn();
  
  const MockPool = vi.fn(() => ({
    query: mockQuery,
    connect: mockConnect,
    on: mockOn,
    end: vi.fn(),
  }));
  
  return {
    Pool: MockPool,
    __mockQuery: mockQuery,
    __mockConnect: mockConnect,
    __mockRelease: mockRelease,
  };
});

describe('Database Client', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('query', () => {
    it('should execute a query successfully', async () => {
      const { Pool, __mockQuery } = await import('pg') as any;
      const mockResult = { rows: [{ id: 1, name: 'test' }], rowCount: 1 };
      __mockQuery.mockResolvedValueOnce(mockResult);

      const result = await query('SELECT * FROM users WHERE id = $1', [1]);

      expect(result).toEqual(mockResult);
      expect(__mockQuery).toHaveBeenCalledWith('SELECT * FROM users WHERE id = $1', [1]);
    });

    it('should handle query errors', async () => {
      const { __mockQuery } = await import('pg') as any;
      const error = new Error('Connection failed');
      __mockQuery.mockRejectedValueOnce(error);

      await expect(query('SELECT * FROM users')).rejects.toThrow('Connection failed');
    });

    it('should log slow queries', async () => {
      const { __mockQuery } = await import('pg') as any;
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      
      // Mock a slow query (> 1 second)
      __mockQuery.mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve({ rows: [], rowCount: 0 }), 1100))
      );

      await query('SELECT * FROM users');

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Slow query detected'),
        expect.any(String)
      );
      
      consoleSpy.mockRestore();
    });
  });

  describe('queryOne', () => {
    it('should return first row when results exist', async () => {
      const { __mockQuery } = await import('pg') as any;
      const mockResult = { rows: [{ id: 1, name: 'test' }, { id: 2, name: 'test2' }], rowCount: 2 };
      __mockQuery.mockResolvedValueOnce(mockResult);

      const result = await queryOne('SELECT * FROM users WHERE id = $1', [1]);

      expect(result).toEqual({ id: 1, name: 'test' });
    });

    it('should return null when no results', async () => {
      const { __mockQuery } = await import('pg') as any;
      const mockResult = { rows: [], rowCount: 0 };
      __mockQuery.mockResolvedValueOnce(mockResult);

      const result = await queryOne('SELECT * FROM users WHERE id = $1', [999]);

      expect(result).toBeNull();
    });
  });

  describe('queryMany', () => {
    it('should return all rows', async () => {
      const { __mockQuery } = await import('pg') as any;
      const mockRows = [{ id: 1, name: 'test1' }, { id: 2, name: 'test2' }];
      const mockResult = { rows: mockRows, rowCount: 2 };
      __mockQuery.mockResolvedValueOnce(mockResult);

      const result = await queryMany('SELECT * FROM users');

      expect(result).toEqual(mockRows);
    });

    it('should return empty array when no results', async () => {
      const { __mockQuery } = await import('pg') as any;
      const mockResult = { rows: [], rowCount: 0 };
      __mockQuery.mockResolvedValueOnce(mockResult);

      const result = await queryMany('SELECT * FROM users WHERE id = $1', [999]);

      expect(result).toEqual([]);
    });
  });

  describe('transaction', () => {
    it('should commit successful transactions', async () => {
      const { __mockConnect } = await import('pg') as any;
      const mockClient = {
        query: vi.fn()
          .mockResolvedValueOnce({ rows: [], rowCount: 0 }) // BEGIN
          .mockResolvedValueOnce({ rows: [{ id: 1 }], rowCount: 1 }) // User operation
          .mockResolvedValueOnce({ rows: [], rowCount: 0 }), // COMMIT
        release: vi.fn(),
      };
      __mockConnect.mockResolvedValueOnce(mockClient);

      const result = await transaction(async (client) => {
        await client.query('INSERT INTO users (email) VALUES ($1)', ['test@example.com']);
        return { success: true };
      });

      expect(result).toEqual({ success: true });
      expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should rollback failed transactions', async () => {
      const { __mockConnect } = await import('pg') as any;
      const mockClient = {
        query: vi.fn()
          .mockResolvedValueOnce({ rows: [], rowCount: 0 }) // BEGIN
          .mockRejectedValueOnce(new Error('Constraint violation')) // User operation fails
          .mockResolvedValueOnce({ rows: [], rowCount: 0 }), // ROLLBACK
        release: vi.fn(),
      };
      __mockConnect.mockResolvedValueOnce(mockClient);

      await expect(
        transaction(async (client) => {
          await client.query('INSERT INTO users (email) VALUES ($1)', ['test@example.com']);
        })
      ).rejects.toThrow('Constraint violation');

      expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
      expect(mockClient.release).toHaveBeenCalled();
    });
  });

  describe('healthCheck', () => {
    it('should return true when database is healthy', async () => {
      const { __mockQuery } = await import('pg') as any;
      __mockQuery.mockResolvedValueOnce({ rows: [{ '?column?': 1 }], rowCount: 1 });

      const result = await healthCheck();

      expect(result).toBe(true);
      expect(__mockQuery).toHaveBeenCalledWith('SELECT 1', undefined);
    });

    it('should return false when database is unhealthy', async () => {
      const { __mockQuery } = await import('pg') as any;
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      __mockQuery.mockRejectedValueOnce(new Error('Connection refused'));

      const result = await healthCheck();

      expect(result).toBe(false);
      expect(consoleSpy).toHaveBeenCalledWith(
        'Database health check failed:',
        expect.any(Error)
      );
      
      consoleSpy.mockRestore();
    });
  });

  describe('retry logic', () => {
    it('should retry on connection errors', async () => {
      const { __mockQuery } = await import('pg') as any;
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      
      // Fail twice, then succeed
      __mockQuery
        .mockRejectedValueOnce(new Error('ECONNREFUSED'))
        .mockRejectedValueOnce(new Error('connection timeout'))
        .mockResolvedValueOnce({ rows: [{ id: 1 }], rowCount: 1 });

      const result = await query('SELECT * FROM users');

      expect(result.rows).toEqual([{ id: 1 }]);
      expect(__mockQuery).toHaveBeenCalledTimes(3);
      expect(consoleSpy).toHaveBeenCalledTimes(2);
      
      consoleSpy.mockRestore();
    });

    it('should not retry on non-connection errors', async () => {
      const { __mockQuery } = await import('pg') as any;
      const error = new Error('Syntax error in SQL');
      __mockQuery.mockRejectedValueOnce(error);

      await expect(query('SELECT * FORM users')).rejects.toThrow('Syntax error in SQL');
      expect(__mockQuery).toHaveBeenCalledTimes(1);
    });

    it('should give up after max retries', async () => {
      const { __mockQuery } = await import('pg') as any;
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const error = new Error('ECONNREFUSED');
      
      // Always fail
      __mockQuery.mockRejectedValue(error);

      await expect(query('SELECT * FROM users')).rejects.toThrow('ECONNREFUSED');
      expect(__mockQuery).toHaveBeenCalledTimes(3); // Initial + 2 retries
      
      consoleSpy.mockRestore();
    });
  });
});
