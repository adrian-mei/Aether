export const RATE_LIMIT_WINDOW = 60 * 60 * 1000; // 1 hour
export const MAX_REQUESTS_PER_WINDOW = 20; // Allow some buffer over the client-side 10

interface RateLimitEntry {
  count: number;
  timestamp: number;
}

export class ServerRateLimiter {
  private rateLimitMap = new Map<string, RateLimitEntry>();

  constructor(
    private limitWindow = RATE_LIMIT_WINDOW,
    private maxRequests = MAX_REQUESTS_PER_WINDOW
  ) {}

  /**
   * Checks if a request from the given IP is allowed.
   * Increments the count if allowed.
   * Returns true if allowed, false if rate limit exceeded.
   */
  public check(ip: string): boolean {
    // Clean up old entries occasionally (simple optimization)
    if (Math.random() < 0.01) {
      this.cleanup();
    }

    const now = Date.now();
    const userLimit = this.rateLimitMap.get(ip);

    if (userLimit) {
      if (now - userLimit.timestamp > this.limitWindow) {
        // Reset window
        this.rateLimitMap.set(ip, { count: 1, timestamp: now });
        return true;
      } else {
        if (userLimit.count >= this.maxRequests) {
          return false;
        }
        userLimit.count++;
        return true;
      }
    } else {
      this.rateLimitMap.set(ip, { count: 1, timestamp: now });
      return true;
    }
  }

  /**
   * Cleans up expired entries from the map.
   */
  public cleanup() {
    const now = Date.now();
    for (const [key, data] of this.rateLimitMap.entries()) {
      if (now - data.timestamp > this.limitWindow) {
        this.rateLimitMap.delete(key);
      }
    }
  }

  /**
   * Helper to get current count for an IP (for testing/debugging)
   */
  public getCount(ip: string): number {
    return this.rateLimitMap.get(ip)?.count || 0;
  }
  
  /**
   * Helper to clear the map (for testing)
   */
  public clear() {
    this.rateLimitMap.clear();
  }
}

// Singleton instance for the application
export const serverRateLimiter = new ServerRateLimiter();
