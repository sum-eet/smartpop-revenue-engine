import { getSessionToken } from './app-bridge';
import type { SessionTokenPayload } from './types';

/**
 * API request wrapper with session token authentication
 */
export const apiRequestWithToken = async (
  url: string,
  options: RequestInit = {}
): Promise<Response> => {
  const token = await getSessionToken();
  
  const headers = new Headers(options.headers);
  
  // Add session token if available (for embedded apps)
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  
  // Always set content type for API requests
  if (!headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  return fetch(url, {
    ...options,
    headers,
  });
};

/**
 * Parse session token payload
 */
export const parseSessionToken = (token: string): SessionTokenPayload | null => {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch (error) {
    console.error('Failed to parse session token:', error);
    return null;
  }
};

/**
 * Validate session token (client-side basic validation)
 */
export const validateSessionToken = (token: string): boolean => {
  const payload = parseSessionToken(token);
  if (!payload) return false;

  // Check expiration
  const now = Math.floor(Date.now() / 1000);
  if (payload.exp < now) {
    console.warn('Session token expired');
    return false;
  }

  // Check not before
  if (payload.nbf > now) {
    console.warn('Session token not yet valid');
    return false;
  }

  return true;
};

/**
 * Get shop domain from session token
 */
export const getShopFromToken = (token: string): string | null => {
  const payload = parseSessionToken(token);
  if (!payload) return null;

  // Extract shop domain from dest field
  try {
    const dest = payload.dest;
    const url = new URL(`https://${dest}`);
    return url.hostname;
  } catch (error) {
    console.error('Failed to extract shop from token:', error);
    return null;
  }
};

/**
 * Enhanced fetch with automatic session token handling
 */
export const fetchWithAuth = async (
  url: string,
  options: RequestInit = {}
): Promise<Response> => {
  try {
    const response = await apiRequestWithToken(url, options);
    
    // Handle 401 responses by trying to refresh session token
    if (response.status === 401) {
      console.log('Session token expired, attempting to refresh...');
      
      // Get fresh session token
      const newToken = await getSessionToken();
      
      if (newToken) {
        // Retry with new token
        const headers = new Headers(options.headers);
        headers.set('Authorization', `Bearer ${newToken}`);
        
        return fetch(url, {
          ...options,
          headers,
        });
      }
    }
    
    return response;
  } catch (error) {
    console.error('API request failed:', error);
    throw error;
  }
};

/**
 * Create authenticated API client
 */
export const createApiClient = (baseUrl: string) => {
  return {
    get: (path: string, options?: RequestInit) =>
      fetchWithAuth(`${baseUrl}${path}`, { ...options, method: 'GET' }),
    
    post: (path: string, data?: any, options?: RequestInit) =>
      fetchWithAuth(`${baseUrl}${path}`, {
        ...options,
        method: 'POST',
        body: data ? JSON.stringify(data) : undefined,
      }),
    
    put: (path: string, data?: any, options?: RequestInit) =>
      fetchWithAuth(`${baseUrl}${path}`, {
        ...options,
        method: 'PUT',
        body: data ? JSON.stringify(data) : undefined,
      }),
    
    delete: (path: string, options?: RequestInit) =>
      fetchWithAuth(`${baseUrl}${path}`, { ...options, method: 'DELETE' }),
  };
};

// Create default API client for Supabase functions
export const supabaseApiClient = createApiClient(
  'https://zsmoutzjhqjgjehaituw.supabase.co/functions/v1'
);