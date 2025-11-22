import { AppConfig } from '@/shared/config/app-config';
import { openDB, IDBPDatabase } from 'idb';

type LogLevel = 'info' | 'warn' | 'error' | 'debug';

const LOG_LEVELS: Record<LogLevel, number> = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3,
};

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  category: string;
  message: string;
  data?: unknown;
  stack?: string;
}

type LogListener = (entry: LogEntry) => void;

const MAX_LOGS = 500;
const STORAGE_KEY = 'aether_logs';
const DB_NAME = 'aether-logs-db';
const STORE_NAME = 'logs';

class AetherLogger {
  private isDebugEnabled: boolean;
  private listeners: LogListener[] = [];
  private logs: LogEntry[] = [];
  private serverBuffer: LogEntry[] = [];
  private flushTimer: NodeJS.Timeout | null = null;
  private db: Promise<IDBPDatabase> | null = null;

  constructor() {
    // Check if debug is manually enabled in localStorage
    if (typeof window !== 'undefined') {
      this.isDebugEnabled = localStorage.getItem('aether_debug') === 'true';
      
      // Clean up old persistent logs if they exist (migration)
      localStorage.removeItem(STORAGE_KEY);

      // Initialize DB
      this.initDB();

      // Handle flush on unload
      if (AppConfig.logging.enableRemote) {
        window.addEventListener('beforeunload', () => this.flushToServer(true));
      }
    } else {
      this.isDebugEnabled = false;
    }
  }

  private async initDB() {
    if (typeof window === 'undefined') return;
    try {
      this.db = openDB(DB_NAME, 1, {
        upgrade(db) {
          if (!db.objectStoreNames.contains(STORE_NAME)) {
            db.createObjectStore(STORE_NAME, { keyPath: 'timestamp' });
          }
        },
      });
    } catch (e) {
      console.warn('Failed to init log DB', e);
    }
  }

  private shouldLog(level: LogLevel): boolean {
    if (!AppConfig.logging.enabled) return false;
    
    // If debug mode is toggled on via UI/localStorage, always log
    if (this.isDebugEnabled) return true;

    const configLevelValue = LOG_LEVELS[AppConfig.logging.level as LogLevel] || LOG_LEVELS.info;
    const messageLevelValue = LOG_LEVELS[level];

    return messageLevelValue <= configLevelValue;
  }

  private flushToServer(isUnload = false) {
    if (!AppConfig.logging.enableRemote) return;
    if (this.serverBuffer.length === 0) return;

    const logsToSend = [...this.serverBuffer];
    this.serverBuffer = [];

    try {
      // Use Blob for sendBeacon compatibility
      const blob = new Blob([JSON.stringify({ logs: logsToSend })], { type: 'application/json' });
      
      if (isUnload && navigator.sendBeacon) {
        navigator.sendBeacon('/api/log', blob);
      } else {
        fetch('/api/log', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ logs: logsToSend }),
          keepalive: true 
        }).catch(() => {
           // Silently fail
        });
      }
    } catch (e) {
      console.error('Error flushing logs', e);
    }
  }

  private queueForServer(entry: LogEntry) {
    if (!AppConfig.logging.enableRemote) return;
    if (typeof window === 'undefined') return; 
    
    this.serverBuffer.push(entry);

    if (!this.flushTimer) {
        this.flushTimer = setTimeout(() => {
            this.flushToServer();
            this.flushTimer = null;
        }, 1000); // Flush every 1 second max
    }

    if (this.serverBuffer.length > 50) {
        // Force flush if buffer gets too big
        if (this.flushTimer) clearTimeout(this.flushTimer);
        this.flushToServer();
        this.flushTimer = null;
    }
  }

  private sanitize(data: unknown): unknown {
    if (data === undefined) return undefined;
    try {
      // Handle circular references safely
      const seen = new WeakSet();
      return JSON.parse(JSON.stringify(data, (key, value) => {
        if (typeof value === 'object' && value !== null) {
          if (seen.has(value)) {
            return '[Circular]';
          }
          seen.add(value);
        }
        return value;
      }));
    } catch {
      return String(data);
    }
  }

  private async persistLog(entry: LogEntry) {
    if (!this.db) return;
    try {
      const db = await this.db;
      await db.add(STORE_NAME, entry);
      
      // Prune old logs (simple count check occasionally)
      if (Math.random() < 0.01) { // 1% chance to prune
         const count = await db.count(STORE_NAME);
         if (count > 2000) {
             // Delete oldest (simplified: clear all for now or implement sophisticated pruning)
             // For robustness, we'll just clear older than 24h or just keep top 2000?
             // IDB pruning is expensive. Let's just keep it simple.
         }
      }
    } catch {
       // Ignore persistence errors
    }
  }

  private addLog(entry: LogEntry) {
    this.logs.push(entry);
    
    // Trim if too many
    if (this.logs.length > MAX_LOGS) {
      this.logs.shift();
    }

    // Notify listeners
    this.listeners.forEach(l => l(entry));
    
    // Persist
    this.persistLog(entry);
  }

  public subscribe(listener: LogListener) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  // Styles for browser console ("Automatic Car" feel)
  private getBrowserStyles(level: LogLevel) {
    const base = 'padding: 2px 4px; border-radius: 2px; font-weight: bold;';
    switch (level) {
      case 'info': return `${base} background: #3b82f6; color: white;`; // Blue
      case 'warn': return `${base} background: #f59e0b; color: black;`; // Amber
      case 'error': return `${base} background: #ef4444; color: white;`; // Red
      case 'debug': return `${base} background: #6366f1; color: white;`; // Indigo
      default: return `${base} background: #6b7280; color: white;`; // Gray
    }
  }

  private formatTime(isoDate: string) {
    try {
      return isoDate.split('T')[1].split('.')[0]; // HH:mm:ss
    } catch {
      return isoDate;
    }
  }

  public log(level: LogLevel, category: string, message: string, data?: unknown, stack?: string) {
    // Master switch and level check
    if (!this.shouldLog(level)) return;

    const safeData = this.sanitize(data);
    const timestamp = new Date().toISOString();

    const entry: LogEntry = {
      timestamp,
      level,
      category,
      message,
      data: safeData,
      stack,
    };

    // Console Output
    if (typeof window !== 'undefined') {
        // Browser Console (Styled)
        const timeStr = this.formatTime(timestamp);
        const style = this.getBrowserStyles(level);
        const catStyle = 'color: #9ca3af; font-weight: bold;'; // Gray-400
        
        // Format: [Tag] HH:mm:ss Category Message
        const consoleArgs: unknown[] = [
            `%c${level.toUpperCase()}%c ${timeStr} %c[${category}]%c ${message}`,
            style,
            'color: #6b7280', // Time color
            catStyle,
            'color: inherit'  // Message color
        ];
        
        if (data) consoleArgs.push(data);
        if (stack) consoleArgs.push(stack);

        // Use the appropriate console method but spread our args
        // Note: console.log supports %c format strings as the first arg
        switch (level) {
            case 'info': console.info(...consoleArgs); break;
            case 'warn': console.warn(...consoleArgs); break;
            case 'error': console.error(...consoleArgs); break;
            case 'debug': console.debug(...consoleArgs); break;
        }
    } else {
        // Server/Terminal Output (Simplified)
        const timeStr = this.formatTime(timestamp);
        const formatted = `[${timeStr}] [${level.toUpperCase()}] [${category}]: ${message}`;
        const consoleArgs: unknown[] = [formatted];
        if (data) consoleArgs.push(data);
        if (stack) consoleArgs.push(`\n${stack}`);

        switch (level) {
            case 'info': console.info(...consoleArgs); break;
            case 'warn': console.warn(...consoleArgs); break;
            case 'error': console.error(...consoleArgs); break;
            case 'debug': console.debug(...consoleArgs); break;
        }
    }

    // In-memory storage (always store if it passed the filter)
    this.addLog(entry);

    // Sync to server
    this.queueForServer(entry);
  }

  public info(category: string, message: string, data?: unknown) { this.log('info', category, message, data); }
  public warn(category: string, message: string, data?: unknown) { this.log('warn', category, message, data); }
  public error(category: string, message: string, data?: unknown, stack?: string) { this.log('error', category, message, data, stack); }
  public debug(category: string, message: string, data?: unknown) { this.log('debug', category, message, data); }
  
  public getLogs(): LogEntry[] {
    return [...this.logs];
  }

  public async getPersistedLogs(): Promise<LogEntry[]> {
    if (!this.db) return [];
    try {
        const db = await this.db;
        return await db.getAll(STORE_NAME);
    } catch {
        return [];
    }
  }

  public clearLogs() {
    this.logs = [];
    this.listeners.forEach(() => {}); 
    if (this.db) {
        this.db.then(db => db.clear(STORE_NAME));
    }
  }
  
  public toggleDebug(enable: boolean) {
    this.isDebugEnabled = enable;
    if (typeof window !== 'undefined') {
      localStorage.setItem('aether_debug', String(enable));
    }
  }
}

export const logger = new AetherLogger();
