/**
 * Redis Singleton
 *
 * Proporciona una única instancia de cliente Redis para toda la aplicación
 * para evitar pool exhaustion cuando múltiples servicios crean sus propios clientes.
 *
 * CORRECCIÓN: Bug #14 - Redis Connection Pool Exhaustion
 *
 * Uso:
 * ```typescript
 * import { getRedisClient } from '../utils/redis-singleton';
 *
 * const redis = getRedisClient();
 * await redis.set('key', 'value');
 * ```
 */

import Redis from 'ioredis';

let redisClient: Redis | null = null;
let isClosing = false;

/**
 * Get Redis client singleton instance
 */
export function getRedisClient(): Redis {
  if (!redisClient || isClosing) {
    console.log('📡 Creating Redis client singleton...');

    redisClient = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD || undefined,
      db: parseInt(process.env.REDIS_DB || '0'),

      // Connection settings
      retryStrategy: (times) => {
        if (times > 10) {
          console.error('❌ Redis connection failed after 10 retries');
          return null; // Stop retrying after 10 attempts
        }
        const delay = Math.min(times * 50, 2000);
        console.log(`⏳ Redis retry ${times}/10 in ${delay}ms...`);
        return delay;
      },

      // Performance settings
      maxRetriesPerRequest: 3,
      enableReadyCheck: true,
      enableOfflineQueue: true,

      // Connection pool settings
      lazyConnect: false, // Connect immediately
      keepAlive: 30000, // Keep connection alive (30s)

      // Reconnect settings
      reconnectOnError: (err) => {
        const targetError = 'READONLY';
        if (err.message.includes(targetError)) {
          // Reconnect when Redis is in read-only mode
          return true;
        }
        return false;
      },
    });

    // Event handlers
    redisClient.on('connect', () => {
      console.log('✅ Redis connected');
      isClosing = false;
    });

    redisClient.on('ready', () => {
      console.log('✅ Redis ready');
    });

    redisClient.on('error', (err) => {
      console.error('❌ Redis error:', err.message);
    });

    redisClient.on('close', () => {
      console.log('📴 Redis connection closed');
    });

    redisClient.on('reconnecting', () => {
      console.log('🔄 Redis reconnecting...');
    });

    redisClient.on('end', () => {
      console.log('🛑 Redis connection ended');
      redisClient = null;
    });
  }

  return redisClient;
}

/**
 * Close Redis connection gracefully
 */
export async function closeRedisConnection(): Promise<void> {
  if (redisClient && !isClosing) {
    isClosing = true;
    console.log('🛑 Closing Redis connection...');

    try {
      await redisClient.quit();
      console.log('✅ Redis connection closed gracefully');
    } catch (error: any) {
      console.error('❌ Error closing Redis:', error.message);
      // Force disconnect if quit fails
      redisClient.disconnect();
    } finally {
      redisClient = null;
      isClosing = false;
    }
  }
}

/**
 * Check if Redis is connected and ready
 */
export function isRedisConnected(): boolean {
  return redisClient !== null && redisClient.status === 'ready';
}

/**
 * Get Redis connection status
 */
export function getRedisStatus(): {
  connected: boolean;
  status: string;
  host: string;
  port: number;
} {
  if (!redisClient) {
    return {
      connected: false,
      status: 'disconnected',
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
    };
  }

  return {
    connected: redisClient.status === 'ready',
    status: redisClient.status,
    host: redisClient.options.host || 'localhost',
    port: redisClient.options.port || 6379,
  };
}

// Graceful shutdown handlers
process.on('SIGTERM', async () => {
  console.log('\n⚠️  SIGTERM received, closing Redis connection...');
  await closeRedisConnection();
});

process.on('SIGINT', async () => {
  console.log('\n⚠️  SIGINT received, closing Redis connection...');
  await closeRedisConnection();
});
