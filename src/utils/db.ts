import { Client } from 'pg';

import logger from 'src/utils/logger';

let client: Client | null = null;

async function getClient(): Promise<Client> {
  if (!client) {
    const connectionString = process.env.AZURE_PG_CONNECTION;
    if (!connectionString) {
      throw new Error('AZURE_PG_CONNECTION environment variable is not set');
    }
    client = new Client({
      connectionString,
      keepAlive: true,
      connectionTimeoutMillis: 2000, // Fail fast if connection fails
      query_timeout: 5000, // Timeout queries after 5 seconds
      statement_timeout: 0, // Disable for long-running batched inserts
    });

    client.on('error', (err) => {
      logger.error('Database client error', {
        error: err.message,
        stack: err.stack,
        timestamp: new Date().toISOString(),
      });
      client = null; // Reset client on error
    });

    await client.connect();
    logger.info('Database client connected', { timestamp: new Date().toISOString() });
  }
  return client;
}

export async function query<T = any>(
  queryText: string,
  params: any[] = [],
  retries = 3,
  delayMs = 1000
): Promise<{ rows: T[] }> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const pgClient = await getClient();
      const result = await pgClient.query(queryText, params);
      return { rows: result.rows };
    } catch (error: any) {
      if (attempt < retries && (error.message.includes('timeout') || error.code === '53300')) {
        logger.warn(`Retry ${attempt}/${retries} for query: ${error.message}`, { queryText });
        if (error.code === '53300') {
          client = null; // Force reconnect on slot exhaustion
        }
        await new Promise((resolve) => setTimeout(resolve, delayMs));
        continue;
      }
      logger.error('Query error', { error: error.message, stack: error.stack });
      throw error;
    }
  }
  throw new Error('Max retries reached');
}

// Cleanup on app shutdown
process.on('SIGTERM', async () => {
  if (client) {
    await client.end();
    logger.info('Database client disconnected');
    client = null;
  }
});