/**
 * Environment Configuration
 * Centralizes all environment variable access and validation.
 */

export const Env = {
  // Public (Client-side)
  NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://159.54.180.60:3000/api',
  NEXT_PUBLIC_ENABLE_LOGGING: process.env.NEXT_PUBLIC_ENABLE_LOGGING !== 'false', // Default true
  NEXT_PUBLIC_LOG_LEVEL: process.env.NEXT_PUBLIC_LOG_LEVEL || (process.env.NODE_ENV === 'development' ? 'debug' : 'info'),
  NEXT_PUBLIC_ENABLE_REMOTE_LOGGING: process.env.NEXT_PUBLIC_ENABLE_REMOTE_LOGGING === 'true',
  NEXT_PUBLIC_ACCESS_CODE_HASH: process.env.NEXT_PUBLIC_ACCESS_CODE_HASH,

  // Node Environment
  NODE_ENV: process.env.NODE_ENV || 'development',
} as const;
