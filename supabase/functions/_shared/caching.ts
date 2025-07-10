/**
 * Caching utilities for SmartPop functions
 * Implements aggressive caching to reduce costs and improve performance
 */

export interface CacheConfig {
  maxAge: number; // Cache duration in seconds
  staleWhileRevalidate?: number; // Serve stale content while revalidating
  mustRevalidate?: boolean; // Force revalidation
}

export interface CacheHeaders {
  'Cache-Control': string;
  'ETag'?: string;
  'Last-Modified'?: string;
  'Expires'?: string;
  'Vary'?: string;
}

/**
 * Generate optimized cache headers for different content types
 */
export function generateCacheHeaders(config: CacheConfig, etag?: string): CacheHeaders {
  const headers: CacheHeaders = {
    'Cache-Control': buildCacheControl(config)
  };

  if (etag) {
    headers['ETag'] = `"${etag}"`;
  }

  headers['Last-Modified'] = new Date().toUTCString();
  headers['Expires'] = new Date(Date.now() + config.maxAge * 1000).toUTCString();
  
  return headers;
}

/**
 * Build Cache-Control header value
 */
function buildCacheControl(config: CacheConfig): string {
  const directives = [];

  if (config.maxAge > 0) {
    directives.push(`max-age=${config.maxAge}`);
  } else {
    directives.push('no-cache');
  }

  if (config.staleWhileRevalidate) {
    directives.push(`stale-while-revalidate=${config.staleWhileRevalidate}`);
  }

  if (config.mustRevalidate) {
    directives.push('must-revalidate');
  }

  directives.push('public');

  return directives.join(', ');
}

/**
 * Check if request can use cached response
 */
export function checkCacheValidation(request: Request, etag?: string, lastModified?: Date): boolean {
  // Check If-None-Match (ETag)
  if (etag) {
    const ifNoneMatch = request.headers.get('If-None-Match');
    if (ifNoneMatch && ifNoneMatch === `"${etag}"`) {
      return true; // Not modified
    }
  }

  // Check If-Modified-Since
  if (lastModified) {
    const ifModifiedSince = request.headers.get('If-Modified-Since');
    if (ifModifiedSince) {
      const ifModifiedSinceDate = new Date(ifModifiedSince);
      if (lastModified <= ifModifiedSinceDate) {
        return true; // Not modified
      }
    }
  }

  return false; // Modified or no cache headers
}

/**
 * Create 304 Not Modified response
 */
export function createNotModifiedResponse(cacheHeaders: CacheHeaders): Response {
  return new Response(null, {
    status: 304,
    headers: cacheHeaders
  });
}

/**
 * Generate ETag from content
 */
export async function generateETag(content: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(content);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('').substring(0, 16);
}

/**
 * Cache configurations for different endpoint types
 */
export const CACHE_CONFIGS = {
  // Popup embed script - short cache due to dynamic content
  POPUP_EMBED: {
    maxAge: 300, // 5 minutes
    staleWhileRevalidate: 1800, // 30 minutes
    mustRevalidate: false
  } as CacheConfig,

  // Popup configurations - medium cache
  POPUP_CONFIG: {
    maxAge: 300, // 5 minutes
    staleWhileRevalidate: 900, // 15 minutes
    mustRevalidate: false
  } as CacheConfig,

  // Analytics data - short cache for real-time feel
  ANALYTICS: {
    maxAge: 60, // 1 minute
    staleWhileRevalidate: 300, // 5 minutes
    mustRevalidate: false
  } as CacheConfig,

  // Static assets - long cache
  STATIC: {
    maxAge: 86400, // 24 hours
    staleWhileRevalidate: 604800, // 7 days
    mustRevalidate: false
  } as CacheConfig,

  // No cache for sensitive operations
  NO_CACHE: {
    maxAge: 0,
    mustRevalidate: true
  } as CacheConfig
};

/**
 * In-memory cache for popup configurations
 */
class PopupConfigCache {
  private cache = new Map<string, { data: any; timestamp: number; etag: string }>();
  private readonly TTL = 300000; // 5 minutes in milliseconds

  async get(shop: string): Promise<{ data: any; etag: string } | null> {
    const cached = this.cache.get(shop);
    if (!cached) return null;

    // Check if expired
    if (Date.now() - cached.timestamp > this.TTL) {
      this.cache.delete(shop);
      return null;
    }

    return { data: cached.data, etag: cached.etag };
  }

  async set(shop: string, data: any): Promise<string> {
    const etag = await generateETag(JSON.stringify(data));
    this.cache.set(shop, {
      data,
      timestamp: Date.now(),
      etag
    });
    return etag;
  }

  clear(): void {
    this.cache.clear();
  }

  size(): number {
    return this.cache.size;
  }

  // Clean up expired entries
  cleanup(): void {
    const now = Date.now();
    for (const [key, value] of this.cache.entries()) {
      if (now - value.timestamp > this.TTL) {
        this.cache.delete(key);
      }
    }
  }
}

// Global cache instance
export const popupConfigCache = new PopupConfigCache();

// Clean up cache every 10 minutes
setInterval(() => {
  popupConfigCache.cleanup();
}, 600000);

/**
 * Compression utilities for responses
 */
export function shouldCompress(contentType: string, contentLength: number): boolean {
  // Only compress text-based content over 1KB
  const compressibleTypes = [
    'application/json',
    'application/javascript',
    'text/javascript',
    'text/html',
    'text/css',
    'text/plain'
  ];

  return compressibleTypes.some(type => contentType.includes(type)) && contentLength > 1024;
}

/**
 * Create cached response with optimized headers
 */
export async function createCachedResponse(
  content: string,
  contentType: string,
  cacheConfig: CacheConfig,
  corsHeaders: Record<string, string>,
  etag?: string
): Promise<Response> {
  const generatedETag = etag || await generateETag(content);
  const cacheHeaders = generateCacheHeaders(cacheConfig, generatedETag);

  const headers = {
    ...corsHeaders,
    ...cacheHeaders,
    'Content-Type': contentType,
    'Content-Length': content.length.toString()
  };

  // Add compression hint for CDN
  if (shouldCompress(contentType, content.length)) {
    headers['X-Should-Compress'] = 'true';
  }

  return new Response(content, {
    status: 200,
    headers
  });
}

/**
 * Create error response with no-cache headers
 */
export function createErrorResponseWithNoCache(
  error: any,
  status: number,
  corsHeaders: Record<string, string>
): Response {
  const cacheHeaders = generateCacheHeaders(CACHE_CONFIGS.NO_CACHE);
  
  return new Response(JSON.stringify(error), {
    status,
    headers: {
      ...corsHeaders,
      ...cacheHeaders,
      'Content-Type': 'application/json'
    }
  });
}