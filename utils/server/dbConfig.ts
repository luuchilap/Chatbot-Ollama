// Database configuration validation

export const DB_CONFIG = {
  user: process.env.PG_USER || 'postgres',
  host: process.env.PG_HOST || 'localhost',
  database: process.env.PG_DATABASE || 'chatbot_ollama',
  password: process.env.PG_PASSWORD || 'lap20040106',
  port: parseInt(process.env.PG_PORT || '5432'),
};

/**
 * Validates the database configuration and warns about missing env variables
 * @returns True if configuration is valid
 */
export function validateDBConfig(): boolean {
  const missingVars: string[] = [];
  
  if (!process.env.PG_USER) {
    console.warn('PG_USER environment variable not set, using default: postgres');
  }
  
  if (!process.env.PG_HOST) {
    console.warn('PG_HOST environment variable not set, using default: localhost');
  }
  
  if (!process.env.PG_DATABASE) {
    console.warn('PG_DATABASE environment variable not set, using default: chatbot_ollama');
  }
  
  if (!process.env.PG_PASSWORD) {
    console.warn('PG_PASSWORD environment variable not set, using default password');
  }
  
  if (!process.env.PG_PORT) {
    console.warn('PG_PORT environment variable not set, using default: 5432');
  }

  return true;
}

/**
 * Get formatted database connection string
 */
export function getDBConnectionString(): string {
  return `postgres://${DB_CONFIG.user}:${DB_CONFIG.password}@${DB_CONFIG.host}:${DB_CONFIG.port}/${DB_CONFIG.database}`;
} 