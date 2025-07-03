// Advanced DDoS protection middleware with multiple detection methods

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

export interface DDoSConfig {
  enabled: boolean;
  requestsPerMinute: number;
  requestsPerHour: number;
  requestsPerDay: number;
  maxRequestSize: number;
  maxConcurrentRequests: number;
  blockDuration: number; // in milliseconds
  suspiciousPatterns: string[];
  geoBanlist: string[]; // Country codes to block
  whitelistedIPs: string[];
}

export interface ThreatLevel {
  level: 'low' | 'medium' | 'high' | 'critical';
  score: number;
  reasons: string[];
  action: 'allow' | 'challenge' | 'rate_limit' | 'block';
}

// In-memory stores (in production, use Redis cluster)
const rateLimitStore = new Map<string, {
  minute: { count: number; resetTime: number };
  hour: { count: number; resetTime: number };
  day: { count: number; resetTime: number };
}>()

const blockedIPs = new Map<string, { until: number; reason: string }>()
const concurrentRequests = new Map<string, number>()
const suspiciousActivity = new Map<string, {
  score: number;
  patterns: Set<string>;
  firstSeen: number;
  lastSeen: number;
}>()

// Global request tracking for pattern detection
const requestPatterns = new Map<string, {
  urls: Set<string>;
  userAgents: Set<string>;
  requestTimes: number[];
}>()

// Default DDoS protection configuration
export const DEFAULT_DDOS_CONFIG: DDoSConfig = {
  enabled: true,
  requestsPerMinute: 100,
  requestsPerHour: 1000,
  requestsPerDay: 10000,
  maxRequestSize: 10 * 1024 * 1024, // 10MB
  maxConcurrentRequests: 50,
  blockDuration: 60 * 60 * 1000, // 1 hour
  suspiciousPatterns: [
    'union select', 'drop table', '<script', 'javascript:', 'eval(',
    '../', '../../', '/etc/passwd', '/proc/', 'cmd.exe', 'powershell'
  ],
  geoBanlist: [], // No geo blocking by default
  whitelistedIPs: []
}

/**
 * Main DDoS protection function
 */
export async function ddosProtection(
  req: Request,
  config: DDoSConfig = DEFAULT_DDOS_CONFIG
): Promise<{
  allowed: boolean;
  response?: Response;
  threatLevel: ThreatLevel;
}> {
  if (!config.enabled) {
    return {
      allowed: true,
      threatLevel: { level: 'low', score: 0, reasons: [], action: 'allow' }
    }
  }

  const timestamp = new Date().toISOString()
  const clientIP = getClientIP(req)
  const userAgent = req.headers.get('User-Agent') || 'unknown'
  const url = new URL(req.url)
  
  console.log(`[${timestamp}] DDoS protection check for IP: ${clientIP}`)

  try {
    // Initialize threat assessment
    let threatScore = 0
    const reasons: string[] = []

    // 1. Check if IP is whitelisted
    if (config.whitelistedIPs.includes(clientIP)) {
      return {
        allowed: true,
        threatLevel: { level: 'low', score: 0, reasons: ['whitelisted'], action: 'allow' }
      }
    }

    // 2. Check if IP is currently blocked
    const blockInfo = blockedIPs.get(clientIP)
    if (blockInfo && Date.now() < blockInfo.until) {
      console.log(`[${timestamp}] Blocked IP attempted access: ${clientIP} (${blockInfo.reason})`)
      await logDDoSEvent('blocked_ip_attempt', clientIP, req, { 
        reason: blockInfo.reason,
        timeRemaining: blockInfo.until - Date.now()
      })
      
      return {
        allowed: false,
        response: createDDoSResponse('IP blocked due to suspicious activity', 403, clientIP),
        threatLevel: { level: 'critical', score: 100, reasons: [blockInfo.reason], action: 'block' }
      }
    }

    // 3. Rate limiting checks
    const rateLimitResult = checkRateLimits(clientIP, config)
    if (!rateLimitResult.allowed) {
      threatScore += 30
      reasons.push(`rate_limit_${rateLimitResult.type}`)
      
      console.log(`[${timestamp}] Rate limit exceeded: ${rateLimitResult.type} for IP: ${clientIP}`)
      await logDDoSEvent('rate_limit_exceeded', clientIP, req, rateLimitResult)
      
      // Escalate to temporary block after multiple rate limit violations
      if (rateLimitResult.type === 'minute' && rateLimitResult.violations > 3) {
        blockIP(clientIP, 'repeated_rate_limit_violations', 10 * 60 * 1000) // 10 min block
        threatScore = 100
        reasons.push('escalated_to_block')
      }
    }

    // 4. Concurrent request limiting
    const currentConcurrent = concurrentRequests.get(clientIP) || 0
    if (currentConcurrent >= config.maxConcurrentRequests) {
      threatScore += 40
      reasons.push('too_many_concurrent_requests')
      
      console.log(`[${timestamp}] Too many concurrent requests from IP: ${clientIP} (${currentConcurrent})`)
      await logDDoSEvent('concurrent_limit_exceeded', clientIP, req, { 
        concurrent: currentConcurrent,
        limit: config.maxConcurrentRequests
      })
    }

    // 5. Request size validation
    const contentLength = parseInt(req.headers.get('Content-Length') || '0')
    if (contentLength > config.maxRequestSize) {
      threatScore += 25
      reasons.push('oversized_request')
      
      console.log(`[${timestamp}] Oversized request from IP: ${clientIP} (${contentLength} bytes)`)
      await logDDoSEvent('oversized_request', clientIP, req, { 
        size: contentLength,
        limit: config.maxRequestSize
      })
    }

    // 6. Suspicious content patterns
    const suspiciousContent = await checkSuspiciousPatterns(req, config.suspiciousPatterns)
    if (suspiciousContent.detected) {
      threatScore += 50
      reasons.push('suspicious_content')
      
      console.log(`[${timestamp}] Suspicious content detected from IP: ${clientIP}`)
      await logDDoSEvent('suspicious_content', clientIP, req, suspiciousContent)
    }

    // 7. Behavioral pattern analysis
    const behaviorAnalysis = analyzeBehavioralPatterns(clientIP, userAgent, url.pathname)
    threatScore += behaviorAnalysis.score
    reasons.push(...behaviorAnalysis.reasons)

    // 8. Geolocation blocking (if configured)
    if (config.geoBanlist.length > 0) {
      const geoThreat = await checkGeolocation(clientIP, config.geoBanlist)
      if (geoThreat.blocked) {
        threatScore += 100
        reasons.push('geo_blocked')
        
        blockIP(clientIP, 'geolocation_blocked', config.blockDuration)
      }
    }

    // 9. Request frequency analysis
    const frequencyAnalysis = analyzeRequestFrequency(clientIP)
    threatScore += frequencyAnalysis.score
    reasons.push(...frequencyAnalysis.reasons)

    // Track concurrent request
    concurrentRequests.set(clientIP, currentConcurrent + 1)
    
    // Clean up concurrent counter after request
    setTimeout(() => {
      const current = concurrentRequests.get(clientIP) || 0
      if (current > 0) {
        concurrentRequests.set(clientIP, current - 1)
      }
    }, 1000) // Assume average request takes 1 second

    // Determine threat level and action
    const threatLevel = calculateThreatLevel(threatScore, reasons)
    
    // Take action based on threat level
    switch (threatLevel.action) {
      case 'block':
        blockIP(clientIP, 'high_threat_score', config.blockDuration)
        await logDDoSEvent('ip_blocked', clientIP, req, { 
          threatScore, 
          reasons,
          duration: config.blockDuration
        })
        return {
          allowed: false,
          response: createDDoSResponse('Request blocked due to security concerns', 403, clientIP),
          threatLevel
        }
        
      case 'challenge':
        // For now, just log and allow (could implement CAPTCHA here)
        await logDDoSEvent('challenge_required', clientIP, req, { threatScore, reasons })
        return {
          allowed: true,
          threatLevel
        }
        
      case 'rate_limit':
        if (!rateLimitResult.allowed) {
          return {
            allowed: false,
            response: createRateLimitResponse(rateLimitResult, clientIP),
            threatLevel
          }
        }
        return {
          allowed: true,
          threatLevel
        }
        
      default: // allow
        return {
          allowed: true,
          threatLevel
        }
    }

  } catch (error) {
    console.error(`[${timestamp}] DDoS protection error:`, error)
    await logDDoSEvent('protection_error', clientIP, req, { error: error.message })
    
    // Fail open (allow request) rather than fail closed
    return {
      allowed: true,
      threatLevel: { level: 'low', score: 0, reasons: ['protection_error'], action: 'allow' }
    }
  }
}

/**
 * Enhanced rate limiting with multiple time windows
 */
function checkRateLimits(clientIP: string, config: DDoSConfig): {
  allowed: boolean;
  type?: 'minute' | 'hour' | 'day';
  remaining: number;
  resetTime: number;
  violations: number;
} {
  const now = Date.now()
  const current = rateLimitStore.get(clientIP) || {
    minute: { count: 0, resetTime: now + 60000 },
    hour: { count: 0, resetTime: now + 3600000 },
    day: { count: 0, resetTime: now + 86400000 }
  }

  // Check and reset windows
  if (now > current.minute.resetTime) {
    current.minute = { count: 0, resetTime: now + 60000 }
  }
  if (now > current.hour.resetTime) {
    current.hour = { count: 0, resetTime: now + 3600000 }
  }
  if (now > current.day.resetTime) {
    current.day = { count: 0, resetTime: now + 86400000 }
  }

  // Increment counters
  current.minute.count++
  current.hour.count++
  current.day.count++

  rateLimitStore.set(clientIP, current)

  // Check limits
  if (current.minute.count > config.requestsPerMinute) {
    return {
      allowed: false,
      type: 'minute',
      remaining: 0,
      resetTime: current.minute.resetTime,
      violations: current.minute.count - config.requestsPerMinute
    }
  }

  if (current.hour.count > config.requestsPerHour) {
    return {
      allowed: false,
      type: 'hour',
      remaining: 0,
      resetTime: current.hour.resetTime,
      violations: current.hour.count - config.requestsPerHour
    }
  }

  if (current.day.count > config.requestsPerDay) {
    return {
      allowed: false,
      type: 'day',
      remaining: 0,
      resetTime: current.day.resetTime,
      violations: current.day.count - config.requestsPerDay
    }
  }

  return {
    allowed: true,
    remaining: Math.min(
      config.requestsPerMinute - current.minute.count,
      config.requestsPerHour - current.hour.count,
      config.requestsPerDay - current.day.count
    ),
    resetTime: current.minute.resetTime,
    violations: 0
  }
}

/**
 * Check for suspicious content patterns
 */
async function checkSuspiciousPatterns(req: Request, patterns: string[]): Promise<{
  detected: boolean;
  patterns: string[];
  location: string[];
}> {
  const detectedPatterns: string[] = []
  const location: string[] = []

  try {
    // Check URL
    const url = req.url.toLowerCase()
    for (const pattern of patterns) {
      if (url.includes(pattern.toLowerCase())) {
        detectedPatterns.push(pattern)
        location.push('url')
      }
    }

    // Check headers
    for (const [name, value] of req.headers.entries()) {
      const headerValue = value.toLowerCase()
      for (const pattern of patterns) {
        if (headerValue.includes(pattern.toLowerCase())) {
          detectedPatterns.push(pattern)
          location.push(`header:${name}`)
        }
      }
    }

    // Check body for POST/PUT requests
    if ((req.method === 'POST' || req.method === 'PUT') && req.body) {
      try {
        const body = await req.clone().text()
        const bodyLower = body.toLowerCase()
        for (const pattern of patterns) {
          if (bodyLower.includes(pattern.toLowerCase())) {
            detectedPatterns.push(pattern)
            location.push('body')
          }
        }
      } catch {
        // Ignore body parsing errors
      }
    }

    return {
      detected: detectedPatterns.length > 0,
      patterns: [...new Set(detectedPatterns)],
      location: [...new Set(location)]
    }
  } catch (error) {
    console.error('Error checking suspicious patterns:', error)
    return { detected: false, patterns: [], location: [] }
  }
}

/**
 * Analyze behavioral patterns for bot detection
 */
function analyzeBehavioralPatterns(clientIP: string, userAgent: string, path: string): {
  score: number;
  reasons: string[];
} {
  const now = Date.now()
  let score = 0
  const reasons: string[] = []

  // Get or create pattern data
  let patterns = requestPatterns.get(clientIP)
  if (!patterns) {
    patterns = {
      urls: new Set(),
      userAgents: new Set(),
      requestTimes: []
    }
    requestPatterns.set(clientIP, patterns)
  }

  // Add current request data
  patterns.urls.add(path)
  patterns.userAgents.add(userAgent)
  patterns.requestTimes.push(now)

  // Keep only recent request times (last hour)
  patterns.requestTimes = patterns.requestTimes.filter(time => now - time < 3600000)

  // Bot-like user agent patterns
  const botPatterns = [
    /bot/i, /crawler/i, /spider/i, /scraper/i, /scanner/i, /curl/i, /wget/i, /python/i
  ]
  
  if (botPatterns.some(pattern => pattern.test(userAgent))) {
    score += 15
    reasons.push('bot_user_agent')
  }

  // Suspicious request frequency (too regular)
  if (patterns.requestTimes.length >= 10) {
    const intervals = []
    for (let i = 1; i < patterns.requestTimes.length; i++) {
      intervals.push(patterns.requestTimes[i] - patterns.requestTimes[i - 1])
    }
    
    const avgInterval = intervals.reduce((a, b) => a + b) / intervals.length
    const variance = intervals.reduce((acc, interval) => acc + Math.pow(interval - avgInterval, 2), 0) / intervals.length
    
    // Very low variance indicates bot-like behavior
    if (variance < 1000) { // Less than 1 second variance
      score += 20
      reasons.push('regular_request_pattern')
    }
  }

  // Accessing too many different URLs
  if (patterns.urls.size > 50) {
    score += 25
    reasons.push('excessive_url_scanning')
  }

  // Changing user agents (suspicious)
  if (patterns.userAgents.size > 3) {
    score += 30
    reasons.push('multiple_user_agents')
  }

  // Clean up old data
  if (patterns.requestTimes.length === 0) {
    requestPatterns.delete(clientIP)
  }

  return { score, reasons }
}

/**
 * Analyze request frequency for burst detection
 */
function analyzeRequestFrequency(clientIP: string): {
  score: number;
  reasons: string[];
} {
  const patterns = requestPatterns.get(clientIP)
  if (!patterns || patterns.requestTimes.length < 5) {
    return { score: 0, reasons: [] }
  }

  let score = 0
  const reasons: string[] = []
  const now = Date.now()

  // Check for request bursts in the last minute
  const lastMinute = patterns.requestTimes.filter(time => now - time < 60000)
  if (lastMinute.length > 30) {
    score += 20
    reasons.push('request_burst')
  }

  // Check for very rapid requests (< 100ms apart)
  const rapidRequests = patterns.requestTimes.filter((time, index, arr) => {
    if (index === 0) return false
    return time - arr[index - 1] < 100
  })

  if (rapidRequests.length > 5) {
    score += 25
    reasons.push('rapid_fire_requests')
  }

  return { score, reasons }
}

/**
 * Check geolocation blocking
 */
async function checkGeolocation(clientIP: string, bannedCountries: string[]): Promise<{
  blocked: boolean;
  country?: string;
}> {
  try {
    // Skip geolocation for local IPs
    if (isLocalIP(clientIP)) {
      return { blocked: false }
    }

    const response = await fetch(`http://ip-api.com/json/${clientIP}?fields=status,countryCode`)
    const data = await response.json()

    if (data.status === 'success' && bannedCountries.includes(data.countryCode)) {
      return { blocked: true, country: data.countryCode }
    }

    return { blocked: false, country: data.countryCode }
  } catch (error) {
    console.error('Geolocation check failed:', error)
    return { blocked: false }
  }
}

/**
 * Calculate threat level based on score and reasons
 */
function calculateThreatLevel(score: number, reasons: string[]): ThreatLevel {
  let level: ThreatLevel['level']
  let action: ThreatLevel['action']

  if (score >= 80) {
    level = 'critical'
    action = 'block'
  } else if (score >= 60) {
    level = 'high'
    action = 'challenge'
  } else if (score >= 30) {
    level = 'medium'
    action = 'rate_limit'
  } else {
    level = 'low'
    action = 'allow'
  }

  return { level, score, reasons, action }
}

/**
 * Block an IP address
 */
function blockIP(ip: string, reason: string, duration: number): void {
  const until = Date.now() + duration
  blockedIPs.set(ip, { until, reason })
  
  console.log(`IP ${ip} blocked for ${duration}ms due to: ${reason}`)
  
  // Auto-cleanup expired blocks
  setTimeout(() => {
    const blockInfo = blockedIPs.get(ip)
    if (blockInfo && Date.now() >= blockInfo.until) {
      blockedIPs.delete(ip)
      console.log(`IP ${ip} unblocked`)
    }
  }, duration)
}

/**
 * Log DDoS events to database
 */
async function logDDoSEvent(
  eventType: string,
  clientIP: string,
  req: Request,
  details: any = {}
): Promise<void> {
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    
    if (!supabaseUrl || !supabaseKey) return

    const supabase = createClient(supabaseUrl, supabaseKey)
    
    await supabase
      .from('security_logs')
      .insert([{
        ip_address: clientIP,
        event_type: eventType,
        user_agent: req.headers.get('User-Agent'),
        request_path: new URL(req.url).pathname,
        request_method: req.method,
        details,
        severity: getDDoSSeverity(eventType)
      }])
  } catch (error) {
    console.error('Failed to log DDoS event:', error)
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

function isLocalIP(ip: string): boolean {
  return ip === 'unknown' || 
         ip.startsWith('127.') || 
         ip.startsWith('192.168.') || 
         ip.startsWith('10.') ||
         ip.startsWith('172.16.') ||
         ip === '::1'
}

function getDDoSSeverity(eventType: string): string {
  const severityMap: Record<string, string> = {
    'ip_blocked': 'critical',
    'blocked_ip_attempt': 'critical',
    'rate_limit_exceeded': 'warning',
    'concurrent_limit_exceeded': 'warning',
    'suspicious_content': 'error',
    'oversized_request': 'warning',
    'challenge_required': 'info',
    'protection_error': 'error'
  }
  return severityMap[eventType] || 'info'
}

function createDDoSResponse(message: string, status: number, clientIP: string): Response {
  return new Response(JSON.stringify({
    error: message,
    timestamp: new Date().toISOString(),
    blocked: true
  }), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'X-XSS-Protection': '1; mode=block',
      'X-Blocked-IP': clientIP
    }
  })
}

function createRateLimitResponse(rateLimitInfo: any, clientIP: string): Response {
  return new Response(JSON.stringify({
    error: 'Rate limit exceeded',
    type: rateLimitInfo.type,
    resetTime: rateLimitInfo.resetTime,
    timestamp: new Date().toISOString()
  }), {
    status: 429,
    headers: {
      'Content-Type': 'application/json',
      'X-RateLimit-Remaining': rateLimitInfo.remaining.toString(),
      'X-RateLimit-Reset': Math.ceil(rateLimitInfo.resetTime / 1000).toString(),
      'Retry-After': Math.ceil((rateLimitInfo.resetTime - Date.now()) / 1000).toString(),
      'X-Rate-Limited-IP': clientIP
    }
  })
}

// Cleanup functions for memory management
setInterval(() => {
  const now = Date.now()
  
  // Clean up expired blocks
  for (const [ip, blockInfo] of blockedIPs.entries()) {
    if (now >= blockInfo.until) {
      blockedIPs.delete(ip)
    }
  }
  
  // Clean up old rate limit data
  for (const [ip, data] of rateLimitStore.entries()) {
    if (now > data.day.resetTime) {
      rateLimitStore.delete(ip)
    }
  }
  
  // Clean up old request patterns
  for (const [ip, patterns] of requestPatterns.entries()) {
    patterns.requestTimes = patterns.requestTimes.filter(time => now - time < 3600000)
    if (patterns.requestTimes.length === 0) {
      requestPatterns.delete(ip)
    }
  }
}, 300000) // Cleanup every 5 minutes