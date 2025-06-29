import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Rate limiting store
const rateLimitStore = new Map<string, { count: number; resetTime: number }>()

// Enhanced auth middleware with secure API key validation
export async function validateAuth(req: Request): Promise<{
  success: boolean;
  error?: string;
  details?: string;
  shopDomain?: string;
  apiKey?: string;
  rateLimit?: { remaining: number; resetTime: number };
}> {
  const timestamp = new Date().toISOString()
  console.log(`[${timestamp}] === AUTH VALIDATION ===`)
  
  // Get client IP for rate limiting
  const clientIP = req.headers.get('CF-Connecting-IP') || 
                  req.headers.get('X-Forwarded-For')?.split(',')[0]?.trim() ||
                  req.headers.get('X-Real-IP') || 
                  'unknown'

  // Rate limiting check
  const rateLimit = await checkRateLimit(clientIP)
  if (!rateLimit.allowed) {
    console.log(`[${timestamp}] Rate limit exceeded for IP: ${clientIP}`)
    return {
      success: false,
      error: 'Rate limit exceeded',
      details: `Too many requests. Try again in ${Math.ceil((rateLimit.resetTime - Date.now()) / 1000)} seconds`,
      rateLimit: { remaining: 0, resetTime: rateLimit.resetTime }
    }
  }

  // Get auth headers
  const apiKey = req.headers.get('x-api-key')
  const shopDomain = req.headers.get('x-shop-domain')
  
  console.log(`[${timestamp}] API Key provided:`, !!apiKey)
  console.log(`[${timestamp}] Shop Domain:`, shopDomain)
  
  if (!apiKey || !shopDomain) {
    console.log(`[${timestamp}] AUTH FAILED: Missing headers`)
    return {
      success: false,
      error: 'Authentication required',
      details: 'Missing required authentication headers: x-api-key, x-shop-domain',
      rateLimit: { remaining: rateLimit.remaining, resetTime: rateLimit.resetTime }
    }
  }

  // Validate API key format
  if (!isValidApiKeyFormat(apiKey)) {
    console.log(`[${timestamp}] AUTH FAILED: Invalid API key format`)
    return {
      success: false,
      error: 'Invalid API key format',
      rateLimit: { remaining: rateLimit.remaining, resetTime: rateLimit.resetTime }
    }
  }

  // Validate shop domain format
  if (!isValidShopDomain(shopDomain)) {
    console.log(`[${timestamp}] AUTH FAILED: Invalid shop domain format`)
    return {
      success: false,
      error: 'Invalid shop domain format',
      rateLimit: { remaining: rateLimit.remaining, resetTime: rateLimit.resetTime }
    }
  }

  try {
    // Validate API key against database
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    const supabase = createClient(supabaseUrl!, supabaseKey!)

    const { data: apiKeyRecord, error } = await supabase
      .from('api_keys')
      .select('*')
      .eq('key_hash', await hashApiKey(apiKey))
      .eq('is_active', true)
      .single()

    if (error || !apiKeyRecord) {
      console.log(`[${timestamp}] AUTH FAILED: Invalid API key`)
      return {
        success: false,
        error: 'Invalid API key',
        rateLimit: { remaining: rateLimit.remaining, resetTime: rateLimit.resetTime }
      }
    }

    // Check if API key is expired
    if (apiKeyRecord.expires_at && new Date(apiKeyRecord.expires_at) < new Date()) {
      console.log(`[${timestamp}] AUTH FAILED: API key expired`)
      return {
        success: false,
        error: 'API key expired',
        rateLimit: { remaining: rateLimit.remaining, resetTime: rateLimit.resetTime }
      }
    }

    // Validate shop domain matches API key
    if (apiKeyRecord.shop_domain !== shopDomain) {
      console.log(`[${timestamp}] AUTH FAILED: Shop domain mismatch`)
      return {
        success: false,
        error: 'Shop domain does not match API key',
        rateLimit: { remaining: rateLimit.remaining, resetTime: rateLimit.resetTime }
      }
    }

    // Check shop is active
    const { data: shop, error: shopError } = await supabase
      .from('shops')
      .select('is_active, subscription_status')
      .eq('shop_domain', shopDomain)
      .single()

    if (shopError || !shop) {
      console.log(`[${timestamp}] AUTH FAILED: Shop not found`)
      return {
        success: false,
        error: 'Shop not found',
        rateLimit: { remaining: rateLimit.remaining, resetTime: rateLimit.resetTime }
      }
    }

    if (!shop.is_active) {
      console.log(`[${timestamp}] AUTH FAILED: Shop inactive`)
      return {
        success: false,
        error: 'Shop account inactive',
        rateLimit: { remaining: rateLimit.remaining, resetTime: rateLimit.resetTime }
      }
    }

    if (shop.subscription_status !== 'active') {
      console.log(`[${timestamp}] AUTH FAILED: Invalid subscription`)
      return {
        success: false,
        error: 'Invalid subscription status',
        rateLimit: { remaining: rateLimit.remaining, resetTime: rateLimit.resetTime }
      }
    }

    // Update API key last used timestamp
    await supabase
      .from('api_keys')
      .update({ 
        last_used_at: timestamp,
        usage_count: apiKeyRecord.usage_count + 1
      })
      .eq('id', apiKeyRecord.id)

    console.log(`[${timestamp}] AUTH SUCCESS for shop:`, shopDomain)
    return {
      success: true,
      shopDomain,
      apiKey,
      rateLimit: { remaining: rateLimit.remaining, resetTime: rateLimit.resetTime }
    }

  } catch (error) {
    console.error(`[${timestamp}] AUTH ERROR:`, error)
    return {
      success: false,
      error: 'Authentication system error',
      details: 'Please try again later',
      rateLimit: { remaining: rateLimit.remaining, resetTime: rateLimit.resetTime }
    }
  }
}

// Enhanced rate limiting
async function checkRateLimit(clientIP: string): Promise<{
  allowed: boolean;
  remaining: number;
  resetTime: number;
}> {
  const now = Date.now()
  const windowMs = 60 * 1000 // 1 minute window
  const maxRequests = 100 // Max requests per window

  const key = `rate_limit:${clientIP}`
  const current = rateLimitStore.get(key)

  if (!current || now > current.resetTime) {
    // New window
    const newLimit = {
      count: 1,
      resetTime: now + windowMs
    }
    rateLimitStore.set(key, newLimit)
    return {
      allowed: true,
      remaining: maxRequests - 1,
      resetTime: newLimit.resetTime
    }
  }

  if (current.count >= maxRequests) {
    return {
      allowed: false,
      remaining: 0,
      resetTime: current.resetTime
    }
  }

  current.count++
  rateLimitStore.set(key, current)

  return {
    allowed: true,
    remaining: maxRequests - current.count,
    resetTime: current.resetTime
  }
}

// Validate API key format
function isValidApiKeyFormat(apiKey: string): boolean {
  // API keys should be in format: sk_(test|live)_[shop_identifier]_[32_char_hash]
  const pattern = /^sk_(test|live)_[a-zA-Z0-9_-]+_[a-zA-Z0-9]{32}$/
  return pattern.test(apiKey)
}

// Validate shop domain format
function isValidShopDomain(shopDomain: string): boolean {
  // Shop domains should be in format: [shop-name].myshopify.com
  const pattern = /^[a-zA-Z0-9][a-zA-Z0-9-]*[a-zA-Z0-9]\.myshopify\.com$/
  return pattern.test(shopDomain) && shopDomain.length <= 100
}

// Hash API key for secure storage lookup
async function hashApiKey(apiKey: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(apiKey)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}

// Validate input for SQL injection prevention
export function sanitizeInput(input: string | null | undefined): string {
  if (!input) return ''
  
  // Remove potentially dangerous characters
  return input
    .replace(/['"\\;--]/g, '') // Remove quotes, backslashes, semicolons, SQL comments
    .replace(/\s+/g, ' ') // Normalize whitespace
    .trim()
    .slice(0, 1000) // Limit length
}

// Validate JSON input
export function validateJsonInput(input: any, maxDepth: number = 5, maxSize: number = 1024 * 1024): boolean {
  try {
    const jsonString = JSON.stringify(input)
    
    // Check size
    if (jsonString.length > maxSize) {
      return false
    }

    // Check depth
    let depth = 0
    let maxDepthFound = 0
    
    for (const char of jsonString) {
      if (char === '{' || char === '[') {
        depth++
        maxDepthFound = Math.max(maxDepthFound, depth)
      } else if (char === '}' || char === ']') {
        depth--
      }
    }

    return maxDepthFound <= maxDepth
  } catch {
    return false
  }
}

// Create standardized auth response
export function createAuthResponse(error: string, details?: string, rateLimit?: any) {
  const response = {
    error,
    details,
    timestamp: new Date().toISOString()
  }

  const headers: Record<string, string> = {
    'Access-Control-Allow-Origin': process.env.ALLOWED_ORIGINS || 'https://smartpop.app',
    'Content-Type': 'application/json',
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block'
  }

  if (rateLimit) {
    headers['X-RateLimit-Remaining'] = rateLimit.remaining.toString()
    headers['X-RateLimit-Reset'] = Math.ceil(rateLimit.resetTime / 1000).toString()
  }

  return new Response(JSON.stringify(response), {
    status: 401,
    headers
  })
}

// Clean up expired rate limit entries periodically
setInterval(() => {
  const now = Date.now()
  for (const [key, value] of rateLimitStore.entries()) {
    if (now > value.resetTime) {
      rateLimitStore.delete(key)
    }
  }
}, 60000) // Clean up every minute