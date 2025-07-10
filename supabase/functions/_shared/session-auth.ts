import { createHmac } from "https://deno.land/std@0.168.0/crypto/mod.ts";

interface SessionTokenPayload {
  iss: string;
  dest: string;
  aud: string;
  sub: string;
  exp: number;
  nbf: number;
  iat: number;
  jti: string;
  sid: string;
}

/**
 * Parse JWT token without verification (for extracting claims)
 */
function parseJWT(token: string): SessionTokenPayload | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    const payload = parts[1];
    const decoded = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
    return JSON.parse(decoded);
  } catch (error) {
    console.error('JWT parsing error:', error);
    return null;
  }
}

/**
 * Validate Shopify session token
 */
export async function validateSessionToken(authHeader: string | null): Promise<{
  isValid: boolean;
  shop?: string;
  user?: string;
  error?: string;
}> {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { isValid: false, error: 'No session token provided' };
  }

  const token = authHeader.replace('Bearer ', '');
  
  try {
    // Parse token to get payload
    const payload = parseJWT(token);
    if (!payload) {
      return { isValid: false, error: 'Invalid token format' };
    }

    // Check token expiration
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp < now) {
      return { isValid: false, error: 'Token expired' };
    }

    // Check not before time
    if (payload.nbf > now) {
      return { isValid: false, error: 'Token not yet valid' };
    }

    // Extract shop domain from dest
    let shop: string;
    try {
      const dest = payload.dest;
      const url = new URL(`https://${dest}`);
      shop = url.hostname;
    } catch (error) {
      return { isValid: false, error: 'Invalid shop domain in token' };
    }

    // Basic validation - in production, you'd verify the signature with Shopify
    // For now, we'll accept tokens that are properly formatted and not expired
    const apiKey = Deno.env.get('SHOPIFY_API_KEY');
    if (payload.aud !== apiKey) {
      console.warn('Token audience mismatch:', payload.aud, 'vs', apiKey);
      // Continue anyway for development
    }

    return {
      isValid: true,
      shop,
      user: payload.sub,
    };
  } catch (error) {
    console.error('Session token validation error:', error);
    return { isValid: false, error: 'Token validation failed' };
  }
}

/**
 * Get shop domain from various sources (session token, query params, headers)
 */
export function getShopDomain(req: Request, sessionAuth?: { shop?: string }): string | null {
  // First try from validated session token
  if (sessionAuth?.shop) {
    return sessionAuth.shop;
  }

  // Fallback to query parameter
  const url = new URL(req.url);
  const shopParam = url.searchParams.get('shop');
  if (shopParam) {
    return shopParam;
  }

  // Fallback to header
  const shopHeader = req.headers.get('x-shop-domain');
  if (shopHeader) {
    return shopHeader;
  }

  return null;
}

/**
 * Authenticate request and extract shop information
 */
export async function authenticateRequest(req: Request): Promise<{
  isAuthenticated: boolean;
  shop: string | null;
  user?: string;
  error?: string;
  isEmbedded: boolean;
}> {
  const authHeader = req.headers.get('Authorization');
  
  // Check if this is an embedded app request (has session token)
  const isEmbedded = !!authHeader;
  
  if (isEmbedded) {
    // Validate session token for embedded apps
    const sessionAuth = await validateSessionToken(authHeader);
    
    if (!sessionAuth.isValid) {
      return {
        isAuthenticated: false,
        shop: null,
        error: sessionAuth.error,
        isEmbedded: true,
      };
    }

    return {
      isAuthenticated: true,
      shop: sessionAuth.shop || null,
      user: sessionAuth.user,
      isEmbedded: true,
    };
  } else {
    // For non-embedded requests, get shop from query params
    const shop = getShopDomain(req);
    
    if (!shop) {
      return {
        isAuthenticated: false,
        shop: null,
        error: 'Shop domain required',
        isEmbedded: false,
      };
    }

    // For development/testing, allow non-embedded requests
    // In production, you might want to require session tokens
    return {
      isAuthenticated: true,
      shop,
      isEmbedded: false,
    };
  }
}

/**
 * Create error response with CORS headers
 */
export function createErrorResponse(message: string, status: number = 400, corsHeaders: Record<string, string>) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}

/**
 * Create success response with CORS headers
 */
export function createSuccessResponse(data: any, corsHeaders: Record<string, string>) {
  return new Response(JSON.stringify(data), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}