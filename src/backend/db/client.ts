// Database client wrapper with connection pooling and error handling
import { Pool, PoolClient, QueryResult, QueryResultRow } from 'pg';
import { config } from '../config';

// Connection pool configuration
const poolConfig = {
  connectionString: config.database.url,
  max: 20, 
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 15000, // Increased to 15s
  maxUses: 7500,
  statement_timeout: 15000, // Increased to 15s
  keepAlive: true, // Maintain connection
};

// Create connection pool
let pool: Pool | null = null;

function getPool(): Pool {
  if (!pool) {
    pool = new Pool(poolConfig);
    
    // Handle pool errors
    pool.on('error', (err) => {
      console.error('Unexpected error on idle database client', err);
    });
  }
  return pool;
}

// Connection retry logic
async function withRetry<T>(
  operation: () => Promise<T>,
  maxRetries: number = 5, // Increased to 5 retries
  delayMs: number = 2000 // Increased initial delay to 2s
): Promise<T> {
  let lastError: Error | null = null;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;
      const errorMsg = error instanceof Error ? error.message : String(error);
      
      // Check if error is retryable (including DNS temporary failures)
      const isRetryable = 
        errorMsg.includes('ECONNREFUSED') ||
        errorMsg.includes('ETIMEDOUT') ||
        errorMsg.includes('ENOTFOUND') ||
        errorMsg.includes('EAI_AGAIN') || // DNS Temporary Failure
        errorMsg.includes('ECONNRESET') ||
        errorMsg.includes('connection') ||
        errorMsg.includes('timeout');
      
      if (!isRetryable || attempt === maxRetries) {
        throw error;
      }
      
      // Wait before retrying with exponential backoff
      const delay = delayMs * Math.pow(2.2, attempt - 1);
      console.warn(`Database connection busy or DNS failure (attempt ${attempt}/${maxRetries}). Retrying in ${Math.round(delay)}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError;
}

// Query helper function with error handling
export async function query<T extends QueryResultRow = any>(
  text: string,
  params?: any[]
): Promise<QueryResult<T>> {
  return withRetry(async () => {
    const pool = getPool();
    const start = Date.now();
    
    try {
      const result = await pool.query<T>(text, params);
      const duration = Date.now() - start;
      
      // Log slow queries (> 1 second)
      if (duration > 1000) {
        console.warn(`Slow query detected (${duration}ms):`, text);
      }
      
      return result;
    } catch (error) {
      const duration = Date.now() - start;
      console.error('Database query error:', {
        error: error instanceof Error ? error.message : String(error),
        query: text,
        params: params ? '[REDACTED]' : undefined,
        duration,
      });
      throw error;
    }
  });
}

// Query helper that returns a single row or null
export async function queryOne<T extends QueryResultRow = any>(
  text: string,
  params?: any[]
): Promise<T | null> {
  const result = await query<T>(text, params);
  return result.rows[0] || null;
}

// Query helper that returns all rows
export async function queryMany<T extends QueryResultRow = any>(
  text: string,
  params?: any[]
): Promise<T[]> {
  const result = await query<T>(text, params);
  return result.rows;
}

// Transaction helper
export async function transaction<T>(
  callback: (client: PoolClient) => Promise<T>
): Promise<T> {
  return withRetry(async () => {
    const pool = getPool();
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      const result = await callback(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Transaction error:', error instanceof Error ? error.message : String(error));
      throw error;
    } finally {
      client.release();
    }
  });
}

// Health check function
export async function healthCheck(): Promise<boolean> {
  try {
    await query('SELECT 1');
    return true;
  } catch (error) {
    console.error('Database health check failed:', error);
    return false;
  }
}

// Close pool (for graceful shutdown)
export async function closePool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
  }
}

// Export pool getter for advanced use cases
export { getPool };
