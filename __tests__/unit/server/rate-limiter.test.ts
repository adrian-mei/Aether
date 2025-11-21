import { ServerRateLimiter, RATE_LIMIT_WINDOW, MAX_REQUESTS_PER_WINDOW } from '@/features/rate-limit/server/rate-limiter';

describe('ServerRateLimiter', () => {
  let rateLimiter: ServerRateLimiter;

  beforeEach(() => {
    // Create a new instance for each test to avoid state pollution
    // Mock Math.random to avoid cleanup running unexpectedly during tests unless we want it to
    jest.spyOn(Math, 'random').mockReturnValue(0.5); // No cleanup
    rateLimiter = new ServerRateLimiter(RATE_LIMIT_WINDOW, MAX_REQUESTS_PER_WINDOW);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should allow requests within the limit', () => {
    const ip = '127.0.0.1';
    for (let i = 0; i < MAX_REQUESTS_PER_WINDOW; i++) {
      expect(rateLimiter.check(ip)).toBe(true);
    }
  });

  it('should block requests exceeding the limit', () => {
    const ip = '127.0.0.1';
    // Consume all allowed requests
    for (let i = 0; i < MAX_REQUESTS_PER_WINDOW; i++) {
      rateLimiter.check(ip);
    }
    // Next one should be blocked
    expect(rateLimiter.check(ip)).toBe(false);
  });

  it('should reset the limit after the window expires', () => {
    const ip = '127.0.0.1';
    const now = Date.now();
    
    // Spy on Date.now
    const dateSpy = jest.spyOn(Date, 'now');
    dateSpy.mockReturnValue(now);

    // Consume limit
    for (let i = 0; i < MAX_REQUESTS_PER_WINDOW; i++) {
      rateLimiter.check(ip);
    }
    expect(rateLimiter.check(ip)).toBe(false);

    // Advance time past window
    dateSpy.mockReturnValue(now + RATE_LIMIT_WINDOW + 1000);

    // Should be allowed now
    expect(rateLimiter.check(ip)).toBe(true);
    expect(rateLimiter.getCount(ip)).toBe(1);
  });

  it('should track different IPs independently', () => {
    const ip1 = '127.0.0.1';
    const ip2 = '192.168.1.1';

    // Consume limit for ip1
    for (let i = 0; i < MAX_REQUESTS_PER_WINDOW; i++) {
      rateLimiter.check(ip1);
    }
    expect(rateLimiter.check(ip1)).toBe(false);

    // ip2 should still be allowed
    expect(rateLimiter.check(ip2)).toBe(true);
  });

  it('should cleanup expired entries', () => {
    // Force cleanup to run
    jest.spyOn(Math, 'random').mockReturnValue(0.001);
    
    const ip = '127.0.0.1';
    const now = Date.now();
    const dateSpy = jest.spyOn(Date, 'now');
    
    // Create entry
    dateSpy.mockReturnValue(now);
    rateLimiter.check(ip);
    expect(rateLimiter.getCount(ip)).toBe(1);

    // Advance time past window
    dateSpy.mockReturnValue(now + RATE_LIMIT_WINDOW + 1000);
    
    // Trigger check (which triggers cleanup)
    // We use a different IP to trigger the cleanup check without resetting the original IP (though cleanup deletes it)
    rateLimiter.check('other-ip');

    // Original IP should be gone (count 0)
    expect(rateLimiter.getCount(ip)).toBe(0);
  });
});
