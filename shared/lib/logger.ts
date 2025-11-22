type LogLevel = 'info' | 'warn' | 'error' | 'debug';

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

class AetherLogger {
  private isDev: boolean;
  private isDebugEnabled: boolean;
  private listeners: LogListener[] = [];
  private logs: LogEntry[] = [];
  private serverBuffer: LogEntry[] = [];
  private flushTimer: NodeJS.Timeout | null = null;

  constructor() {
    this.isDev = process.env.NODE_ENV === 'development';
    // Check if debug is manually enabled in localStorage
    if (typeof window !== 'undefined') {
      this.isDebugEnabled = localStorage.getItem('aether_debug') === 'true';
      // Clean up old persistent logs if they exist
      localStorage.removeItem(STORAGE_KEY);

      // Handle flush on unload
      window.addEventListener('beforeunload', () => this.flushToServer(true));
    } else {
      this.isDebugEnabled = false;
    }
  }

  private flushToServer(isUnload = false) {
    if (this.serverBuffer.length === 0) return;

    const logsToSend = [...this.serverBuffer];
    this.serverBuffer = [];

    try {
      const blob = new Blob([JSON.stringify({ logs: logsToSend })], { type: 'application/json' });
      
      if (isUnload && navigator.sendBeacon) {
        navigator.sendBeacon('/api/log', blob);
      } else {
        // Use fetch for normal flushing
        // We don't use JSON.stringify here again because we can construct from the object directly
        // or just use the body string. But typically fetch body takes string or blob.
        // To avoid double stringify if we used Blob above, let's reuse it if possible, 
        // but fetch body with Content-Type json expects string.
        
        fetch('/api/log', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ logs: logsToSend }),
          keepalive: true 
        }).catch(() => {
           // Silently fail or warn to avoid console noise/recursion
           // console.warn('Log sync skipped'); 
        });
      }
    } catch (e) {
      console.error('Error flushing logs', e);
    }
  }

  private queueForServer(entry: LogEntry) {
    if (typeof window === 'undefined') return; // Client side only sync
    
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

  private addLog(entry: LogEntry) {
    this.logs.push(entry);
    
    // Trim if too many
    if (this.logs.length > MAX_LOGS) {
      this.logs.shift();
    }

    // Notify listeners
    this.listeners.forEach(l => l(entry));
  }

  public subscribe(listener: LogListener) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private format(entry: LogEntry) {
    return `[${entry.timestamp}] [${entry.level.toUpperCase()}] [${entry.category}]: ${entry.message}`;
  }

  public log(level: LogLevel, category: string, message: string, data?: unknown, stack?: string) {
    // Only log if Dev or Debug is enabled
    if (!this.isDev && !this.isDebugEnabled && level !== 'error') return;

    const safeData = this.sanitize(data);

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      category,
      message,
      data: safeData,
      stack,
    };

    // Console Output (use original data for browser console as it handles objs well)
    const formatted = this.format(entry);
    const consoleArgs: unknown[] = [formatted];
    if (data) consoleArgs.push(data);
    if (stack) consoleArgs.push(`\n${stack}`);

    switch (level) {
      case 'info': console.info(...consoleArgs); break;
      case 'warn': console.warn(...consoleArgs); break;
      case 'error': console.error(...consoleArgs); break;
      case 'debug': console.debug(...consoleArgs); break;
    }

    // In-memory storage
    this.addLog(entry);

    // Sync to server for tracing
    this.queueForServer(entry);
  }

  public info(category: string, message: string, data?: unknown) { this.log('info', category, message, data); }
  public warn(category: string, message: string, data?: unknown) { this.log('warn', category, message, data); }
  public error(category: string, message: string, data?: unknown, stack?: string) { this.log('error', category, message, data, stack); }
  public debug(category: string, message: string, data?: unknown) { this.log('debug', category, message, data); }
  
  public getLogs(): LogEntry[] {
    return [...this.logs];
  }

  public clearLogs() {
    this.logs = [];
    this.listeners.forEach(() => {}); // Trigger update? 
    // Actually, DebugOverlay subscribes to *new* entries. 
    // It clears its own local state when clearLogs is called.
    // But other components calling getLogs() should see empty.
  }
  
  public toggleDebug(enable: boolean) {
    this.isDebugEnabled = enable;
    if (typeof window !== 'undefined') {
      localStorage.setItem('aether_debug', String(enable));
    }
  }
}

export const logger = new AetherLogger();
