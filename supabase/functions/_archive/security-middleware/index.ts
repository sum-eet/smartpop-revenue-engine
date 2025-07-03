import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Security middleware for comprehensive protection
export interface SecurityConfig {
  requireAuth: boolean;
  rateLimit?: {
    windowMs: number;
    maxRequests: number;
  };
  maxRequestSize?: number;
  allowedMethods?: string[];
  requireHttps?: boolean;
  validateInput?: boolean;
  logRequests?: boolean;
}

export interface SecurityContext {
  isAuthenticated: boolean;
  shopDomain?: string;
  apiKey?: string;
  rateLimitRemaining: number;
  ipAddress: string;
  userAgent?: string;
  requestId: string;
}

// In-memory stores for rate limiting (in production, use Redis)
const globalRateLimit = new Map<string, { count: number; resetTime: number }>()
const suspiciousIPs = new Set<string>()
const blockedIPs = new Set<string>()

// Default security configurations for different endpoint types
export const SECURITY_CONFIGS = {
  PUBLIC_READ: {
    requireAuth: false,
    rateLimit: { windowMs: 60000, maxRequests: 1000 },
    maxRequestSize: 1024 * 1024, // 1MB
    allowedMethods: ['GET', 'OPTIONS'],
    requireHttps: true,
    validateInput: true,
    logRequests: true
  },
  AUTHENTICATED: {
    requireAuth: true,
    rateLimit: { windowMs: 60000, maxRequests: 500 },
    maxRequestSize: 10 * 1024 * 1024, // 10MB
    allowedMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    requireHttps: true,
    validateInput: true,
    logRequests: true
  },
  WEBHOOK: {
    requireAuth: false, // Webhooks use signature verification
    rateLimit: { windowMs: 60000, maxRequests: 100 },
    maxRequestSize: 5 * 1024 * 1024, // 5MB
    allowedMethods: ['POST', 'OPTIONS'],
    requireHttps: true,
    validateInput: true,
    logRequests: true
  },
  ANALYTICS: {
    requireAuth: true,
    rateLimit: { windowMs: 60000, maxRequests: 50 }, // More restrictive for expensive queries
    maxRequestSize: 1024 * 1024, // 1MB
    allowedMethods: ['GET', 'POST', 'OPTIONS'],
    requireHttps: true,
    validateInput: true,
    logRequests: true
  }
}

/**
 * Main security middleware function
 */
export async function securityMiddleware(
  req: Request,
  config: SecurityConfig
): Promise<{ 
  allowed: boolean; 
  response?: Response; 
  context?: SecurityContext 
}> {
  const requestId = generateRequestId()
  const timestamp = new Date().toISOString()
  const startTime = Date.now()
  
  console.log(`[${timestamp}] [${requestId}] Security check started`)

  try {
    // Extract request info
    const url = new URL(req.url)
    const method = req.method
    const ipAddress = getClientIP(req)
    const userAgent = req.headers.get('User-Agent') || 'unknown'

    // Initialize context
    const context: SecurityContext = {
      isAuthenticated: false,
      rateLimitRemaining: 0,
      ipAddress,
      userAgent,
      requestId
    }

    // 1. Check blocked IPs
    if (blockedIPs.has(ipAddress)) {
      console.log(`[${timestamp}] [${requestId}] Blocked IP attempted access: ${ipAddress}`)
      await logSecurityEvent('ip_blocked', ipAddress, req, { reason: 'IP in blocklist' })
      return {
        allowed: false,
        response: createSecurityResponse('Access denied', 403, requestId)
      }
    }

    // 2. HTTPS enforcement
    if (config.requireHttps && url.protocol !== 'https:' && !isDevelopment()) {
      console.log(`[${timestamp}] [${requestId}] HTTP request to HTTPS-only endpoint`)
      return {
        allowed: false,
        response: createSecurityResponse('HTTPS required', 426, requestId)
      }
    }

    // 3. Method validation
    if (config.allowedMethods && !config.allowedMethods.includes(method)) {
      console.log(`[${timestamp}] [${requestId}] Invalid method: ${method}`)
      return {
        allowed: false,
        response: createSecurityResponse('Method not allowed', 405, requestId)
      }
    }

    // 4. Request size validation
    if (config.maxRequestSize && method !== 'GET' && method !== 'OPTIONS') {
      const contentLength = parseInt(req.headers.get('Content-Length') || '0')
      if (contentLength > config.maxRequestSize) {
        console.log(`[${timestamp}] [${requestId}] Request too large: ${contentLength} bytes`)
        await logSecurityEvent('request_too_large', ipAddress, req, { size: contentLength })
        return {
          allowed: false,
          response: createSecurityResponse('Request entity too large', 413, requestId)
        }
      }
    }

    // 5. Rate limiting
    if (config.rateLimit) {
      const rateLimitResult = await checkRateLimit(ipAddress, config.rateLimit)
      context.rateLimitRemaining = rateLimitResult.remaining

      if (!rateLimitResult.allowed) {
        console.log(`[${timestamp}] [${requestId}] Rate limit exceeded for IP: ${ipAddress}`)
        await logSecurityEvent('rate_limit_exceeded', ipAddress, req, {
          limit: config.rateLimit.maxRequests,
          window: config.rateLimit.windowMs
        })
        
        // Mark IP as suspicious after multiple rate limit violations
        markSuspiciousIP(ipAddress)
        
        return {
          allowed: false,
          response: createRateLimitResponse(rateLimitResult, requestId)
        }
      }
    }

    // 6. Authentication check
    if (config.requireAuth) {
      const authResult = await validateAuth(req)
      if (!authResult.success) {
        console.log(`[${timestamp}] [${requestId}] Authentication failed: ${authResult.error}`)
        await logSecurityEvent('auth_failure', ipAddress, req, { 
          error: authResult.error,
          hasApiKey: !!req.headers.get('x-api-key'),
          hasShopDomain: !!req.headers.get('x-shop-domain')
        })
        
        // Track failed auth attempts
        trackFailedAuth(ipAddress)
        
        return {
          allowed: false,
          response: authResult.response || createSecurityResponse('Authentication required', 401, requestId)
        }
      }

      context.isAuthenticated = true
      context.shopDomain = authResult.shopDomain
      context.apiKey = authResult.apiKey
    }

    // 7. Input validation (for POST/PUT requests)
    if (config.validateInput && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
      const validationResult = await validateRequestInput(req)
      if (!validationResult.valid) {
        console.log(`[${timestamp}] [${requestId}] Input validation failed: ${validationResult.error}`)
        await logSecurityEvent('input_validation_failed', ipAddress, req, { 
          error: validationResult.error 
        })
        return {
          allowed: false,
          response: createSecurityResponse('Invalid input data', 400, requestId)
        }
      }
    }

    // 8. Suspicious activity detection
    if (await detectSuspiciousActivity(ipAddress, userAgent, url.pathname)) {
      console.log(`[${timestamp}] [${requestId}] Suspicious activity detected from IP: ${ipAddress}`)
      await logSecurityEvent('suspicious_activity', ipAddress, req, {
        patterns: ['unusual_user_agent', 'suspicious_path', 'high_frequency']
      })
      
      // Don't block immediately, but increase monitoring
      markSuspiciousIP(ipAddress)
    }

    // 9. Log successful request if enabled
    if (config.logRequests) {
      await logRequestAudit(context, req, 200, Date.now() - startTime)
    }

    console.log(`[${timestamp}] [${requestId}] Security check passed`)
    return {
      allowed: true,
      context
    }

  } catch (error) {
    console.error(`[${timestamp}] [${requestId}] Security middleware error:`, error)
    await logSecurityEvent('middleware_error', getClientIP(req), req, { 
      error: error.message 
    })
    
    return {
      allowed: false,
      response: createSecurityResponse('Security check failed', 500, requestId)
    }
  }
}

/**
 * Enhanced rate limiting with per-shop limits
 */
async function checkRateLimit(
  ipAddress: string, 
  config: { windowMs: number; maxRequests: number }
): Promise<{ allowed: boolean; remaining: number; resetTime: number }> {
  const now = Date.now()
  const key = `rate_limit:${ipAddress}`
  const current = globalRateLimit.get(key)

  if (!current || now > current.resetTime) {
    // New window
    const newLimit = {
      count: 1,
      resetTime: now + config.windowMs
    }
    globalRateLimit.set(key, newLimit)
    return {
      allowed: true,
      remaining: config.maxRequests - 1,
      resetTime: newLimit.resetTime
    }
  }

  if (current.count >= config.maxRequests) {
    return {
      allowed: false,
      remaining: 0,
      resetTime: current.resetTime
    }
  }

  current.count++
  globalRateLimit.set(key, current)

  return {
    allowed: true,
    remaining: config.maxRequests - current.count,
    resetTime: current.resetTime
  }
}

/**
 * Validate request input for common attacks
 */
async function validateRequestInput(req: Request): Promise<{ valid: boolean; error?: string }> {
  try {
    const contentType = req.headers.get('Content-Type') || ''
    
    if (contentType.includes('application/json')) {
      const body = await req.clone().text()
      
      // Check for JSON bomb attacks
      if (body.length > 10 * 1024 * 1024) { // 10MB limit
        return { valid: false, error: 'JSON payload too large' }
      }

      // Check for deeply nested objects
      const depth = getJSONDepth(body)
      if (depth > 20) {
        return { valid: false, error: 'JSON nesting too deep' }
      }

      // Check for suspicious patterns
      const suspiciousPatterns = [
        /<script[^>]*>.*?<\/script>/gi,
        /javascript:/gi,
        /data:text\/html/gi,
        /vbscript:/gi,
        /on\w+\s*=/gi
      ]

      for (const pattern of suspiciousPatterns) {
        if (pattern.test(body)) {
          return { valid: false, error: 'Potentially malicious content detected' }
        }
      }

      // Validate JSON structure
      try {
        JSON.parse(body)
      } catch {
        return { valid: false, error: 'Invalid JSON format' }
      }
    }

    return { valid: true }
  } catch (error) {
    return { valid: false, error: 'Input validation error' }
  }
}

/**
 * Detect suspicious activity patterns
 */
async function detectSuspiciousActivity(
  ipAddress: string, 
  userAgent: string, 
  path: string
): Promise<boolean> {
  // Check for bot-like user agents
  const botPatterns = [
    /bot/i, /crawler/i, /spider/i, /scraper/i, /scanner/i, /curl/i, /wget/i
  ]
  
  const isSuspiciousUserAgent = botPatterns.some(pattern => pattern.test(userAgent))
  
  // Check for suspicious paths
  const suspiciousPaths = [
    '/admin', '/wp-admin', '/.env', '/config', '/backup', '/phpinfo',
    '/etc/passwd', '/proc/', '/sys/', '..', '<script', 'union select'
  ]
  
  const isSuspiciousPath = suspiciousPaths.some(suspicious => 
    path.toLowerCase().includes(suspicious.toLowerCase())
  )

  // Check if IP is already marked as suspicious
  const isKnownSuspicious = suspiciousIPs.has(ipAddress)

  return isSuspiciousUserAgent || isSuspiciousPath || isKnownSuspicious
}

/**
 * Mark IP as suspicious for enhanced monitoring
 */
function markSuspiciousIP(ipAddress: string) {
  suspiciousIPs.add(ipAddress)
  
  // Auto-remove from suspicious list after 24 hours
  setTimeout(() => {
    suspiciousIPs.delete(ipAddress)
  }, 24 * 60 * 60 * 1000)
}

/**
 * Track failed authentication attempts
 */
const failedAuthAttempts = new Map<string, { count: number; lastAttempt: number }>()

function trackFailedAuth(ipAddress: string) {
  const now = Date.now()
  const current = failedAuthAttempts.get(ipAddress) || { count: 0, lastAttempt: 0 }
  
  // Reset counter if last attempt was more than 1 hour ago
  if (now - current.lastAttempt > 60 * 60 * 1000) {
    current.count = 1
  } else {
    current.count++
  }
  
  current.lastAttempt = now
  failedAuthAttempts.set(ipAddress, current)
  
  // Block IP after 10 failed attempts in 1 hour
  if (current.count >= 10) {
    blockedIPs.add(ipAddress)
    console.log(`IP ${ipAddress} blocked due to ${current.count} failed auth attempts`)
    
    // Auto-unblock after 24 hours
    setTimeout(() => {
      blockedIPs.delete(ipAddress)
      failedAuthAttempts.delete(ipAddress)
    }, 24 * 60 * 60 * 1000)
  }
}

/**
 * Log security events to database
 */
async function logSecurityEvent(
  eventType: string,
  ipAddress: string,
  req: Request,
  details: any = {}
) {
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    
    if (!supabaseUrl || !supabaseKey) return

    const supabase = createClient(supabaseUrl, supabaseKey)
    
    await supabase
      .from('security_logs')
      .insert([{
        shop_domain: req.headers.get('x-shop-domain'),
        ip_address: ipAddress,
        event_type: eventType,
        user_agent: req.headers.get('User-Agent'),
        request_path: new URL(req.url).pathname,
        request_method: req.method,
        details,
        severity: getSeverityLevel(eventType)
      }])
  } catch (error) {
    console.error('Failed to log security event:', error)
  }
}

/**
 * Log request audit trail
 */
async function logRequestAudit(
  context: SecurityContext,
  req: Request,
  status: number,
  responseTime: number
) {
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    
    if (!supabaseUrl || !supabaseKey) return

    const supabase = createClient(supabaseUrl, supabaseKey)
    
    const url = new URL(req.url)
    const contentLength = req.headers.get('Content-Length')
    
    await supabase
      .from('request_audit')
      .insert([{
        shop_domain: context.shopDomain,
        api_key_prefix: context.apiKey?.substring(0, 8),
        endpoint: url.pathname,
        method: req.method,
        ip_address: context.ipAddress,
        user_agent: context.userAgent,
        request_size: contentLength ? parseInt(contentLength) : null,
        response_status: status,
        response_time_ms: responseTime
      }])
  } catch (error) {
    console.error('Failed to log request audit:', error)
  }
}

/**
 * Helper functions
 */
function getClientIP(req: Request): string {
  return req.headers.get('CF-Connecting-IP') || 
         req.headers.get('X-Forwarded-For')?.split(',')[0]?.trim() ||
         req.headers.get('X-Real-IP') || 
         'unknown'
}

function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

function isDevelopment(): boolean {
  return Deno.env.get('ENVIRONMENT') === 'development' || 
         Deno.env.get('DENO_DEPLOYMENT_ID') === undefined
}

function getJSONDepth(jsonString: string): number {
  let depth = 0
  let maxDepth = 0
  
  for (const char of jsonString) {
    if (char === '{' || char === '[') {
      depth++
      maxDepth = Math.max(maxDepth, depth)
    } else if (char === '}' || char === ']') {
      depth--
    }
  }
  
  return maxDepth
}

function getSeverityLevel(eventType: string): string {
  const severityMap: Record<string, string> = {
    'ip_blocked': 'critical',
    'auth_failure': 'warning',
    'rate_limit_exceeded': 'warning',
    'suspicious_activity': 'warning',
    'input_validation_failed': 'error',
    'request_too_large': 'error',
    'middleware_error': 'critical'
  }
  return severityMap[eventType] || 'info'
}

function createSecurityResponse(message: string, status: number, requestId: string): Response {
  return new Response(JSON.stringify({
    error: message,
    requestId,
    timestamp: new Date().toISOString()
  }), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'X-XSS-Protection': '1; mode=block',
      'X-Request-ID': requestId
    }
  })
}

function createRateLimitResponse(
  rateLimitInfo: { remaining: number; resetTime: number }, 
  requestId: string
): Response {
  return new Response(JSON.stringify({
    error: 'Rate limit exceeded',
    requestId,
    timestamp: new Date().toISOString()
  }), {
    status: 429,
    headers: {
      'Content-Type': 'application/json',
      'X-RateLimit-Remaining': rateLimitInfo.remaining.toString(),
      'X-RateLimit-Reset': Math.ceil(rateLimitInfo.resetTime / 1000).toString(),
      'Retry-After': Math.ceil((rateLimitInfo.resetTime - Date.now()) / 1000).toString(),
      'X-Request-ID': requestId
    }
  })
}

// Import auth validation from auth middleware
async function validateAuth(req: Request) {
  // This would import the validateAuth function from auth-middleware
  const { validateAuth } = await import('../auth-middleware/index.ts')
  return await validateAuth(req)
}

// Cleanup functions for memory management
setInterval(() => {
  const now = Date.now()
  
  // Clean up expired rate limits
  for (const [key, value] of globalRateLimit.entries()) {
    if (now > value.resetTime) {
      globalRateLimit.delete(key)
    }
  }
  
  // Clean up old failed auth attempts
  for (const [ip, data] of failedAuthAttempts.entries()) {
    if (now - data.lastAttempt > 60 * 60 * 1000) { // 1 hour
      failedAuthAttempts.delete(ip)
    }
  }
}, 60000) // Cleanup every minute