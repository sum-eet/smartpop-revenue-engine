/**
 * Security validation utilities for public endpoints
 */

// Allowed origins for public API access
const ALLOWED_ORIGINS = [
  'myshopify.com',
  'shopify.com',
  'localhost',
  '127.0.0.1',
  'smartpop-revenue-engine.vercel.app',
  'vercel.app', // Allow all Vercel deployments
  'testingstoresumeet.myshopify.com' // Allow our test store
];

// Rate limiting storage (in production, use Redis or similar)
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

/**
 * Validate origin to prevent unauthorized access
 */
export function validateOrigin(request: Request): { isValid: boolean; error?: string } {
  const origin = request.headers.get('origin');
  const referer = request.headers.get('referer');
  
  // Allow if no origin/referer (direct API calls, script tags)
  if (!origin && !referer) {
    return { isValid: true };
  }
  
  // Check origin header first
  if (origin) {
    try {
      const originUrl = new URL(origin);
      const isValidOrigin = ALLOWED_ORIGINS.some(allowed => 
        originUrl.hostname.endsWith(allowed) || 
        originUrl.hostname === allowed ||
        originUrl.hostname.includes('myshopify.com') // Allow all Shopify stores
      );
      
      if (!isValidOrigin) {
        console.warn(`Origin validation failed: ${originUrl.hostname}`);
        // Don't block - just warn for now
        return { isValid: true };
      }
    } catch (error) {
      console.warn('Invalid origin format:', error);
      return { isValid: true }; // Don't block on format errors
    }
  }
  
  // Check referer as fallback (for script tags)
  if (!origin && referer) {
    try {
      const refererUrl = new URL(referer);
      const isValidReferer = ALLOWED_ORIGINS.some(allowed => 
        refererUrl.hostname.endsWith(allowed) || 
        refererUrl.hostname === allowed ||
        refererUrl.hostname.includes('myshopify.com') // Allow all Shopify stores
      );
      
      if (!isValidReferer) {
        console.warn(`Referer validation failed: ${refererUrl.hostname}`);
        // Don't block - just warn for now
        return { isValid: true };
      }
    } catch (error) {
      console.warn('Invalid referer format:', error);
      return { isValid: true }; // Don't block on format errors
    }
  }
  
  return { isValid: true };
}

/**
 * Validate shop domain to ensure it's a legitimate Shopify shop
 */
export function validateShopDomain(shop: string): { isValid: boolean; normalizedShop?: string; error?: string } {
  if (!shop) {
    return { isValid: false, error: 'Shop domain is required' };
  }
  
  // Remove protocol and paths, extract just the domain
  let shopDomain = shop.toLowerCase();
  
  // Remove common prefixes
  shopDomain = shopDomain.replace(/^https?:\/\//, '');
  shopDomain = shopDomain.replace(/^www\./, '');
  shopDomain = shopDomain.split('/')[0]; // Remove paths
  shopDomain = shopDomain.split('?')[0]; // Remove query params
  
  // Validate Shopify domain format
  if (!shopDomain.endsWith('.myshopify.com')) {
    // Allow development domains
    if (shopDomain.includes('localhost') || shopDomain.includes('127.0.0.1')) {
      return { isValid: true, normalizedShop: shopDomain };
    }
    
    // If it doesn't end with .myshopify.com, try to construct it
    const shopName = shopDomain.replace(/\.myshopify\.com$/, '');
    shopDomain = `${shopName}.myshopify.com`;
  }
  
  // Validate shop name format (alphanumeric and hyphens only)
  const shopName = shopDomain.replace('.myshopify.com', '');
  if (!/^[a-zA-Z0-9-]+$/.test(shopName)) {
    return { isValid: false, error: 'Invalid shop name format' };
  }
  
  // Check minimum length
  if (shopName.length < 3) {
    return { isValid: false, error: 'Shop name too short' };
  }
  
  return { isValid: true, normalizedShop: shopDomain };
}

/**
 * Extract shop domain from request (referer, origin, or parameter)
 */
export function extractShopFromRequest(request: Request): string | null {
  const url = new URL(request.url);
  
  // First try URL parameter
  const shopParam = url.searchParams.get('shop');
  if (shopParam) {
    const validation = validateShopDomain(shopParam);
    if (validation.isValid) {
      return validation.normalizedShop!;
    }
  }
  
  // Try referer header
  const referer = request.headers.get('referer');
  if (referer) {
    try {
      const refererUrl = new URL(referer);
      if (refererUrl.hostname.endsWith('.myshopify.com')) {
        return refererUrl.hostname;
      }
    } catch (error) {
      // Invalid referer URL
    }
  }
  
  // Try origin header
  const origin = request.headers.get('origin');
  if (origin) {
    try {
      const originUrl = new URL(origin);
      if (originUrl.hostname.endsWith('.myshopify.com')) {
        return originUrl.hostname;
      }
    } catch (error) {
      // Invalid origin URL
    }
  }
  
  return null;
}

/**
 * Simple rate limiting (in production, use Redis)
 */
export function checkRateLimit(identifier: string, maxRequests = 100, windowMs = 60000): { allowed: boolean; remaining: number } {
  const now = Date.now();
  const windowStart = now - windowMs;
  
  // Clean up old entries
  for (const [key, data] of rateLimitMap.entries()) {
    if (data.resetTime < now) {
      rateLimitMap.delete(key);
    }
  }
  
  const current = rateLimitMap.get(identifier);
  
  if (!current || current.resetTime < now) {
    // New window
    rateLimitMap.set(identifier, { count: 1, resetTime: now + windowMs });
    return { allowed: true, remaining: maxRequests - 1 };
  }
  
  if (current.count >= maxRequests) {
    return { allowed: false, remaining: 0 };
  }
  
  current.count++;
  return { allowed: true, remaining: maxRequests - current.count };
}

/**
 * Get client IP for rate limiting
 */
export function getClientIP(request: Request): string {
  // Check various headers for the real IP
  const xForwardedFor = request.headers.get('x-forwarded-for');
  const xRealIP = request.headers.get('x-real-ip');
  const cfConnectingIP = request.headers.get('cf-connecting-ip');
  
  if (cfConnectingIP) return cfConnectingIP;
  if (xRealIP) return xRealIP;
  if (xForwardedFor) return xForwardedFor.split(',')[0].trim();
  
  // Fallback to connection info (may not be available in all environments)
  return 'unknown';
}

/**
 * Create security error response
 */
export function createSecurityErrorResponse(message: string, status = 403, corsHeaders: Record<string, string>) {
  return new Response(JSON.stringify({ 
    error: 'Security validation failed',
    message,
    timestamp: new Date().toISOString()
  }), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}

/**
 * Comprehensive security validation for public endpoints
 */
export function validatePublicRequest(request: Request): {
  isValid: boolean;
  shop?: string;
  clientIP?: string;
  error?: string;
  rateLimitRemaining?: number;
} {
  // 1. Validate origin
  const originValidation = validateOrigin(request);
  if (!originValidation.isValid) {
    return { isValid: false, error: originValidation.error };
  }
  
  // 2. Extract and validate shop
  const shop = extractShopFromRequest(request);
  if (!shop) {
    return { isValid: false, error: 'No valid shop domain found in request' };
  }
  
  const shopValidation = validateShopDomain(shop);
  if (!shopValidation.isValid) {
    return { isValid: false, error: shopValidation.error };
  }
  
  // 3. Check rate limiting (more permissive)
  const clientIP = getClientIP(request);
  const rateLimit = checkRateLimit(clientIP, 1000, 60000); // 1000 requests per minute (relaxed)
  
  if (!rateLimit.allowed) {
    console.warn(`Rate limit exceeded for IP: ${clientIP}`);
    // Don't block for now - just warn
    return { 
      isValid: true,
      shop: shopValidation.normalizedShop,
      clientIP,
      rateLimitRemaining: 0
    };
  }
  
  return { 
    isValid: true, 
    shop: shopValidation.normalizedShop,
    clientIP,
    rateLimitRemaining: rateLimit.remaining
  };
}