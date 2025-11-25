import { Env } from '@/shared/config/env';
import { logger } from '@/shared/lib/logger';

export class ApiClient {
  private static get baseUrl() {
    if (!Env.NEXT_PUBLIC_API_URL) {
      throw new Error('NEXT_PUBLIC_API_URL is not defined. Please check your .env file.');
    }
    // Remove trailing slash if present
    return Env.NEXT_PUBLIC_API_URL.replace(/\/$/, '');
  }

  /**
   * Helper to construct full URL
   */
  private static getUrl(endpoint: string): string {
    // Ensure endpoint starts with slash
    const path = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    return `${this.baseUrl}${path}`;
  }

  /**
   * Mock request handler
   */
  private static async mockRequest(endpoint: string, init?: RequestInit): Promise<Response> {
    const method = init?.method || 'GET';
    const body = init?.body;
    
    // Log the mock network call
    console.groupCollapsed(`%c[MOCK API] ${method} ${endpoint}`, 'color: #10b981; font-weight: bold;');
    console.log('Endpoint:', endpoint);
    console.log('Method:', method);
    if (body) console.log('Body:', JSON.parse(body as string));
    console.log('Headers:', init?.headers);
    console.groupEnd();

    logger.info('API', `[MOCK] ${method} ${endpoint}`);

    // Simulate network delay (500-1500ms)
    const delay = Math.random() * 1000 + 500;
    await new Promise(resolve => setTimeout(resolve, delay));

    // Return mock response based on endpoint
    let responseData = {};
    
    if (endpoint.includes('/session/start')) {
      responseData = { status: 'connected', sessionId: 'mock-session-123', mode: 'mock' };
    } else if (endpoint.includes('/voice/state')) {
      responseData = { success: true };
    }

    return new Response(JSON.stringify(responseData), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  /**
   * Wrapper for fetch to handle base URL and default headers
   */
  public static async fetch(endpoint: string, init?: RequestInit): Promise<Response> {
    // Check for explicit mock override (e.g. for testing specific UI states)
    const forceMock = (typeof window !== 'undefined' && (window as any).__FORCE_MOCK__);

    if (!forceMock) {
      try {
        const url = this.getUrl(endpoint);
        
        // Try real fetch
        const response = await fetch(url, {
          ...init,
          headers: {
            'Content-Type': 'application/json',
            ...init?.headers,
          },
        });

        // If successful or client error (4xx), return it
        if (response.status < 500) {
          return response;
        }
        
        logger.warn('API', `Backend returned ${response.status}`);
        return response; // Return the error response
      } catch (e) {
        // Network error (Server down / CORS / Offline)
        logger.warn('API', 'Backend unavailable', e);
        
        // Return a simulated 503 Service Unavailable response
        return new Response(JSON.stringify({ error: 'Service Unavailable', code: 'OFFLINE' }), {
            status: 503,
            statusText: 'Service Unavailable',
            headers: { 'Content-Type': 'application/json' }
        });
      }
    }

    // Only use mock if explicitly forced or if we are in a pure mock environment
    // For now, if we reach here, it implies forceMock was true
    return this.mockRequest(endpoint, init);
  }

  /**
   * Helper for POST requests
   */
  public static async post(endpoint: string, body: unknown, headers?: HeadersInit): Promise<Response> {
    return this.fetch(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });
  }
}
