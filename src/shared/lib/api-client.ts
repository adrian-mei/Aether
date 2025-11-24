import { Env } from '@/config/env';
import { logger } from '@/shared/lib/logger';

export class ApiClient {
  private static get baseUrl() {
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
      responseData = { status: 'connected', sessionId: 'mock-session-123' };
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
    // Use mock handler for now
    return this.mockRequest(endpoint, init);

    /* Real implementation commented out for UI-only mode
    const url = this.getUrl(endpoint);
    
    return fetch(url, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        ...init?.headers,
      },
    });
    */
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
