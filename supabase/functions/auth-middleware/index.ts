import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-api-key, x-shop-domain, x-shopify-session',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
}

// Phase 4: Advanced Rate Limiting Store
const rateLimitStore = new Map<string, { count: number; resetTime: number }>()

interface AuthResult {
  authenticated: boolean;
  shop?: string;
  userId?: string;
  shopId?: string;
  authMethod?: string;
  error?: string;
  status?: number;
  tokenData?: any;
  rateLimit?: { remaining: number; resetTime: number };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    const supabase = createClient(supabaseUrl!, supabaseKey!)

    if (req.method === 'POST') {
      const { headers, required = false } = await req.json()
      
      console.log('🔐 Auth Check Request:', { 
        hasAuth: !!headers.authorization,
        hasApiKey: !!headers['x-api-key'],
        hasShopifySession: !!headers['x-shopify-session'],
        required 
      })

      const authResult = await validateAuth(supabase, req, headers, required)
      
      return new Response(JSON.stringify(authResult), {
        status: authResult.status || (authResult.authenticated ? 200 : 401),
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('Auth middleware error:', error)
    return new Response(JSON.stringify({ 
      authenticated: false,
      error: 'Authentication service error',
      status: 500 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})

// Phase 3: Enhanced Authentication with Phase 4 Rate Limiting
async function validateAuth(supabase: any, req: Request, headers: any, required: boolean): Promise<AuthResult> {
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
      authenticated: false,
      error: 'Rate limit exceeded',
      status: 429,
      rateLimit: { remaining: 0, resetTime: rateLimit.resetTime }
    }
  }

  // Get auth headers
  const apiKey = headers['x-api-key'] || req.headers.get('x-api-key')
  const shopDomain = headers['x-shop-domain'] || req.headers.get('x-shop-domain')
  const authHeader = headers.authorization || req.headers.get('authorization')
  
  console.log(`[${timestamp}] API Key provided:`, !!apiKey)
  console.log(`[${timestamp}] Shop Domain:`, shopDomain)
  console.log(`[${timestamp}] Auth Header provided:`, !!authHeader)
  
  // DEVELOPMENT BYPASS: Allow test-key for development
  if (apiKey === 'test-key' && shopDomain === 'testingstoresumeet.myshopify.com') {
    console.log(`[${timestamp}] AUTH SUCCESS: Development bypass`)
    return {
      authenticated: true,
      shop: shopDomain,
      authMethod: 'dev-bypass',
      rateLimit: { remaining: rateLimit.remaining, resetTime: rateLimit.resetTime }
    }
  }
  
  // If no authentication provided and not required, return unauthenticated
  if (!apiKey && !authHeader && !required) {
    console.log(`[${timestamp}] No auth provided, not required - allowing`)
    return {
      authenticated: false,
      rateLimit: { remaining: rateLimit.remaining, resetTime: rateLimit.resetTime }
    }
  }
  
  // If authentication required but missing
  if (required && (!apiKey || !shopDomain) && !authHeader) {
    console.log(`[${timestamp}] AUTH FAILED: Missing required headers`)
    return {
      authenticated: false,
      error: 'Authentication required',
      status: 401,
      rateLimit: { remaining: rateLimit.remaining, resetTime: rateLimit.resetTime }
    }
  }

  // Validate API key format if provided
  if (apiKey && !isValidApiKeyFormat(apiKey)) {
    console.log(`[${timestamp}] AUTH FAILED: Invalid API key format`)
    return {
      authenticated: false,
      error: 'Invalid API key format',
      status: 400,
      rateLimit: { remaining: rateLimit.remaining, resetTime: rateLimit.resetTime }
    }
  }

  // Validate shop domain format if provided
  if (shopDomain && !isValidShopDomain(shopDomain)) {
    console.log(`[${timestamp}] AUTH FAILED: Invalid shop domain format`)
    return {
      authenticated: false,
      error: 'Invalid shop domain format',
      status: 400,
      rateLimit: { remaining: rateLimit.remaining, resetTime: rateLimit.resetTime }
    }
  }

  try {
    // Try API key authentication first
    if (apiKey && shopDomain) {
      const { data: apiKeyRecord, error } = await supabase
        .from('auth_tokens')
        .select('*, shops!inner(shop_domain, is_active, subscription_status)')
        .eq('token_hash', await hashApiKey(apiKey))
        .eq('token_type', 'api_key')
        .eq('is_active', true)
        .eq('shops.shop_domain', shopDomain)
        .single()

      if (error || !apiKeyRecord) {
        console.log(`[${timestamp}] AUTH FAILED: Invalid API key`)
        return {
          authenticated: false,
          error: 'Invalid API key',
          status: 401,
          rateLimit: { remaining: rateLimit.remaining, resetTime: rateLimit.resetTime }
        }
      }

      // Check if API key is expired
      if (apiKeyRecord.expires_at && new Date(apiKeyRecord.expires_at) < new Date()) {
        console.log(`[${timestamp}] AUTH FAILED: API key expired`)
        return {
          authenticated: false,
          error: 'API key expired',
          status: 401,
          rateLimit: { remaining: rateLimit.remaining, resetTime: rateLimit.resetTime }
        }
      }

      // Check shop is active
      const shop = apiKeyRecord.shops
      if (!shop.is_active) {
        console.log(`[${timestamp}] AUTH FAILED: Shop inactive`)
        return {
          authenticated: false,
          error: 'Shop account inactive',
          status: 403,
          rateLimit: { remaining: rateLimit.remaining, resetTime: rateLimit.resetTime }
        }
      }

      if (shop.subscription_status !== 'active') {
        console.log(`[${timestamp}] AUTH FAILED: Invalid subscription`)
        return {
          authenticated: false,
          error: 'Invalid subscription status',
          status: 403,
          rateLimit: { remaining: rateLimit.remaining, resetTime: rateLimit.resetTime }
        }
      }

      // Update API key last used timestamp
      await supabase
        .from('auth_tokens')
        .update({ 
          last_used_at: timestamp,
          usage_count: apiKeyRecord.usage_count + 1
        })
        .eq('id', apiKeyRecord.id)

      console.log(`[${timestamp}] AUTH SUCCESS for shop:`, shopDomain)
      return {
        authenticated: true,
        shop: shopDomain,
        shopId: apiKeyRecord.shop_id,
        userId: apiKeyRecord.created_by,
        authMethod: 'api_key',
        tokenData: apiKeyRecord,
        rateLimit: { remaining: rateLimit.remaining, resetTime: rateLimit.resetTime }
      }
    }
    
    // JWT Token validation
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.replace('Bearer ', '')
      // TODO: Implement JWT validation
      console.log(`[${timestamp}] JWT auth not yet implemented`)
      return {
        authenticated: false,
        error: 'JWT authentication not implemented',
        status: 501,
        rateLimit: { remaining: rateLimit.remaining, resetTime: rateLimit.resetTime }
      }
    }
    
    // If we get here, no valid auth was provided
    if (required) {
      console.log(`[${timestamp}] AUTH FAILED: No valid authentication provided`)
      return {
        authenticated: false,
        error: 'Authentication required',
        status: 401,
        rateLimit: { remaining: rateLimit.remaining, resetTime: rateLimit.resetTime }
      }
    }
    
    // Not required, allow through
    return {
      authenticated: false,
      rateLimit: { remaining: rateLimit.remaining, resetTime: rateLimit.resetTime }
    }

  } catch (error) {
    console.error(`[${timestamp}] AUTH ERROR:`, error)
    return {
      authenticated: false,
      error: 'Authentication system error',
      status: 500,
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
  // Allow test-key for development
  if (apiKey === 'test-key') return true
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