/**
 * Environment Configuration
 * Centralizes all environment variable access and validation.
 */

export const Env = {
  // Public (Client-side)
  NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || '/api/backend',
  NEXT_PUBLIC_WS_URL: process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:3002',
  NEXT_PUBLIC_ENABLE_LOGGING: process.env.NEXT_PUBLIC_ENABLE_LOGGING !== 'false', // Default true
  NEXT_PUBLIC_LOG_LEVEL: process.env.NEXT_PUBLIC_LOG_LEVEL || (process.env.NODE_ENV === 'development' ? 'debug' : 'info'),
  NEXT_PUBLIC_ENABLE_REMOTE_LOGGING: process.env.NEXT_PUBLIC_ENABLE_REMOTE_LOGGING === 'true',
  NEXT_PUBLIC_ACCESS_CODE_HASH: process.env.NEXT_PUBLIC_ACCESS_CODE_HASH,
  NEXT_PUBLIC_USE_REAL_FETCH: process.env.NEXT_PUBLIC_USE_REAL_FETCH !== 'false', // Default to true for integration
  NEXT_PUBLIC_RATE_LIMIT_DAILY: parseInt(process.env.NEXT_PUBLIC_RATE_LIMIT_DAILY || '5', 10),

  // Node Environment
  NODE_ENV: process.env.NODE_ENV || 'development',
} as const;
