/**
 * Application-wide configuration.
 * Centralizes settings for logging, features, and other global behaviors.
 * Reads from environment variables where applicable.
 */
export const AppConfig = {
  logging: {
    // Master switch: If false, the logger does nothing.
    // Defaults to true unless explicitly disabled.
    enabled: process.env.NEXT_PUBLIC_ENABLE_LOGGING !== 'false', 
    
    // Level filter: 'debug' | 'info' | 'warn' | 'error'
    // Defaults to 'info' in production, 'debug' in development
    level: process.env.NEXT_PUBLIC_LOG_LEVEL || (process.env.NODE_ENV === 'development' ? 'debug' : 'info'),
    
    // Remote logging switch (sending logs to /api/log)
    // Defaults to false to save bandwidth unless needed
    enableRemote: process.env.NEXT_PUBLIC_ENABLE_REMOTE_LOGGING === 'true',
  }
};

export type AppConfigType = typeof AppConfig;
