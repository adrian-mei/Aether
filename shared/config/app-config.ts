import { Env } from '@/shared/config/env';

/**
 * Application-wide configuration.
 * Centralizes settings for logging, features, and other global behaviors.
 * Reads from environment variables where applicable.
 */
export const AppConfig = {
  logging: {
    // Master switch: If false, the logger does nothing.
    // Defaults to true unless explicitly disabled.
    enabled: Env.NEXT_PUBLIC_ENABLE_LOGGING,
    
    // Level filter: 'debug' | 'info' | 'warn' | 'error'
    // Defaults to 'info' in production, 'debug' in development
    level: Env.NEXT_PUBLIC_LOG_LEVEL,
    
    // Remote logging switch (sending logs to /api/log)
    // Defaults to false to save bandwidth unless needed
    enableRemote: Env.NEXT_PUBLIC_ENABLE_REMOTE_LOGGING,
  }
};

export type AppConfigType = typeof AppConfig;
