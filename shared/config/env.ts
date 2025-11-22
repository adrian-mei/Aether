/**
 * Environment Configuration
 * Centralizes all environment variable access and validation.
 */

export const Env = {
  // Public (Client-side)
  NEXT_PUBLIC_ENABLE_LOGGING: process.env.NEXT_PUBLIC_ENABLE_LOGGING !== 'false', // Default true
  NEXT_PUBLIC_LOG_LEVEL: process.env.NEXT_PUBLIC_LOG_LEVEL || (process.env.NODE_ENV === 'development' ? 'debug' : 'info'),
  NEXT_PUBLIC_ENABLE_REMOTE_LOGGING: process.env.NEXT_PUBLIC_ENABLE_REMOTE_LOGGING === 'true',
  NEXT_PUBLIC_ACCESS_CODE_HASH: process.env.NEXT_PUBLIC_ACCESS_CODE_HASH,

  // Private (Server-side)
  GOOGLE_GENERATIVE_AI_API_KEY: process.env.GOOGLE_GENERATIVE_AI_API_KEY,
  ACCESS_CODE: process.env.ACCESS_CODE,
  
  // Node Environment
  NODE_ENV: process.env.NODE_ENV || 'development',
  
  /**
   * Validates that required server-side variables are present.
   * Should be called on server startup or API route usage.
   */
  validateServerEnv: () => {
    if (typeof window !== 'undefined') return; // Skip on client

    const missing = [];
    if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) missing.push('GOOGLE_GENERATIVE_AI_API_KEY');
    
    if (missing.length > 0) {
      throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
    }
  }
} as const;
