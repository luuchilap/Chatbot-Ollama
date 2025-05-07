import { Pool, PoolClient } from 'pg';
import { DB_CONFIG, validateDBConfig } from '../utils/server/dbConfig';

// Validate database configuration
validateDBConfig();

// PostgreSQL connection configuration
const pool = new Pool(DB_CONFIG);

// Class to handle database operations
export class DBService {
  private static instance: DBService;
  private pool: Pool;

  private constructor() {
    this.pool = pool;
  }

  // Singleton pattern
  public static getInstance(): DBService {
    if (!DBService.instance) {
      DBService.instance = new DBService();
    }
    return DBService.instance;
  }

  // Get a client from the connection pool
  public async getClient(): Promise<PoolClient> {
    try {
      const client = await this.pool.connect();
      return client;
    } catch (error) {
      console.error('Error getting database client:', error);
      throw error;
    }
  }

  // Execute a query with parameters
  public async query(text: string, params: any[] = []): Promise<any> {
    const client = await this.getClient();
    try {
      const result = await client.query(text, params);
      return result.rows;
    } catch (error) {
      console.error('Error executing query:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  // Execute a transaction
  public async executeTransaction(callback: (client: PoolClient) => Promise<any>): Promise<any> {
    const client = await this.getClient();
    try {
      await client.query('BEGIN');
      const result = await callback(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Transaction error:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  // Close the pool
  public async end(): Promise<void> {
    await this.pool.end();
  }
}

// Export singleton instance
export const dbService = DBService.getInstance(); 