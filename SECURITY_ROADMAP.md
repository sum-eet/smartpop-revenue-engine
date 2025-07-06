# 🔐 SmartPop Security & Performance Roadmap

## Overview
This document outlines the enterprise-grade security and performance enhancements for SmartPop Revenue Engine, designed to achieve SOC2 compliance and robust DDOS protection.

## Current Status ✅

### Phase 1 & 2: COMPLETED
- **Shop Data Isolation**: ✅ Fixed cross-shop data leakage
- **Backward Compatibility**: ✅ Zero breaking changes to existing implementations
- **SOC2 Basic Requirements**: ✅ Data isolation, audit logging, access controls
- **DDOS Basic Protection**: ✅ Payload reduction, query optimization

**Security Level**: **MODERATE** (Enterprise-ready for SOC2)

---

## Phase 3: API Authentication 🔐

### Objective
Add JWT-based authentication system without breaking existing functionality.

### Implementation Strategy

#### 3.1 Authentication Middleware
```typescript
// New auth middleware with backward compatibility
interface AuthResult {
  authenticated: boolean;
  shop?: string;
  userId?: string;
  error?: string;
  status?: number;
}

function checkAuth(req: Request, required: boolean = false): AuthResult {
  const authHeader = req.headers.get('Authorization');
  const apiKey = req.headers.get('X-API-Key');
  const shopifySession = req.headers.get('X-Shopify-Session');
  
  // No auth provided
  if (!authHeader && !apiKey && !shopifySession) {
    if (required) {
      return { 
        authenticated: false, 
        error: 'Authentication required', 
        status: 401 
      };
    }
    console.warn('⚠️ Unauthenticated request - backward compatibility mode');
    return { authenticated: false };
  }
  
  // JWT Token validation
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.replace('Bearer ', '');
    const decoded = validateJWT(token);
    if (decoded) {
      return { 
        authenticated: true, 
        shop: decoded.shop, 
        userId: decoded.sub 
      };
    }
  }
  
  // API Key validation
  if (apiKey) {
    const keyData = await validateApiKey(apiKey);
    if (keyData) {
      return { 
        authenticated: true, 
        shop: keyData.shop_domain, 
        userId: keyData.user_id 
      };
    }
  }
  
  // Shopify OAuth session
  if (shopifySession) {
    const session = await validateShopifySession(shopifySession);
    if (session) {
      return { 
        authenticated: true, 
        shop: session.shop, 
        userId: session.userId 
      };
    }
  }
  
  return { 
    authenticated: false, 
    error: 'Invalid credentials', 
    status: 403 
  };
}
```

#### 3.2 Database Schema
```sql
-- Authentication tokens table
CREATE TABLE auth_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID REFERENCES shops(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  token_type TEXT NOT NULL CHECK (token_type IN ('api_key', 'jwt_refresh', 'shopify_oauth')),
  token_name TEXT, -- Human readable name like "Dashboard API Key"
  permissions JSONB DEFAULT '["read", "write"]',
  expires_at TIMESTAMP WITH TIME ZONE,
  last_used_at TIMESTAMP WITH TIME ZONE,
  last_used_ip INET,
  usage_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_by UUID, -- User who created this token
  is_active BOOLEAN DEFAULT true
);

-- User sessions table
CREATE TABLE user_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  shop_id UUID REFERENCES shops(id) ON DELETE CASCADE,
  session_token TEXT NOT NULL UNIQUE,
  refresh_token TEXT,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  last_activity TIMESTAMP WITH TIME ZONE DEFAULT now(),
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  is_active BOOLEAN DEFAULT true
);

-- Indexes for performance
CREATE INDEX idx_auth_tokens_hash ON auth_tokens(token_hash);
CREATE INDEX idx_auth_tokens_shop ON auth_tokens(shop_id);
CREATE INDEX idx_user_sessions_token ON user_sessions(session_token);
CREATE INDEX idx_user_sessions_user ON user_sessions(user_id);
```

#### 3.3 Token Management API
```typescript
// Token management endpoints
export const tokenRoutes = {
  // Create API key
  'POST /auth/api-keys': async (req) => {
    const auth = checkAuth(req, true);
    const { name, permissions, expiresIn } = await req.json();
    
    const apiKey = generateApiKey();
    const hashedKey = await hashToken(apiKey);
    
    await supabase.from('auth_tokens').insert({
      shop_id: auth.shopId,
      token_hash: hashedKey,
      token_type: 'api_key',
      token_name: name,
      permissions: permissions,
      expires_at: new Date(Date.now() + expiresIn),
      created_by: auth.userId
    });
    
    return { apiKey, message: 'API key created successfully' };
  },
  
  // List API keys
  'GET /auth/api-keys': async (req) => {
    const auth = checkAuth(req, true);
    
    const { data } = await supabase
      .from('auth_tokens')
      .select('id, token_name, permissions, expires_at, last_used_at, usage_count, is_active')
      .eq('shop_id', auth.shopId)
      .eq('token_type', 'api_key');
    
    return data;
  },
  
  // Revoke API key
  'DELETE /auth/api-keys/:id': async (req) => {
    const auth = checkAuth(req, true);
    const tokenId = req.params.id;
    
    await supabase
      .from('auth_tokens')
      .update({ is_active: false })
      .eq('id', tokenId)
      .eq('shop_id', auth.shopId);
    
    return { message: 'API key revoked successfully' };
  }
};
```

#### 3.4 Gradual Rollout Plan
1. **Week 1**: Deploy auth middleware in optional mode
2. **Week 2**: Add token management dashboard  
3. **Week 3**: Issue API keys to existing customers
4. **Week 4**: Monitor adoption and usage patterns
5. **Week 5**: Make auth required for sensitive endpoints
6. **Week 6**: Full auth enforcement (with exemptions for legacy)

---

## Phase 4: Rate Limiting ⚡

### Objective
Implement sophisticated rate limiting to prevent DDOS attacks and ensure fair usage.

### Implementation Strategy

#### 4.1 Multi-Tier Rate Limiting
```typescript
interface RateLimit {
  windowMs: number;
  maxRequests: number;
  keyGenerator: (req: Request) => string;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
}

const rateLimits: Record<string, RateLimit> = {
  // Global IP-based limiting (prevents IP-based attacks)
  'global_ip': {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 100,
    keyGenerator: (req) => `ip:${getClientIP(req)}`
  },
  
  // Per shop limiting (prevents single shop abuse)
  'shop': {
    windowMs: 60 * 1000, // 1 minute  
    maxRequests: 200,
    keyGenerator: (req) => `shop:${extractShop(req) || 'anonymous'}`
  },
  
  // Per authenticated user (highest limits for verified users)
  'user': {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 500,
    keyGenerator: (req) => `user:${extractUserId(req) || 'anonymous'}`
  },
  
  // Per endpoint (protect expensive operations)
  'endpoint': {
    windowMs: 60 * 1000,
    maxRequests: 50,
    keyGenerator: (req) => `endpoint:${new URL(req.url).pathname}:${getClientIP(req)}`
  }
};
```

#### 4.2 Redis-Based Sliding Window
```typescript
interface RateLimitResult {
  blocked: boolean;
  remaining: number;
  resetTime: number;
  limitType?: string;
}

class RateLimiter {
  private redis: Redis;
  
  constructor(redisUrl: string) {
    this.redis = new Redis(redisUrl);
  }
  
  async checkRateLimit(req: Request): Promise<RateLimitResult> {
    const limits = this.getApplicableLimits(req);
    const results = await Promise.all(
      limits.map(limit => this.checkSingleLimit(req, limit))
    );
    
    // If any limit is exceeded, block the request
    const blocked = results.find(r => r.blocked);
    if (blocked) {
      await this.logViolation(req, blocked);
      return {
        blocked: true,
        limitType: blocked.type,
        resetTime: blocked.resetTime,
        remaining: 0
      };
    }
    
    return {
      blocked: false,
      remaining: Math.min(...results.map(r => r.remaining)),
      resetTime: Math.max(...results.map(r => r.resetTime))
    };
  }
  
  private async checkSingleLimit(req: Request, limit: RateLimit): Promise<any> {
    const key = limit.keyGenerator(req);
    const window = limit.windowMs;
    const max = limit.maxRequests;
    const now = Date.now();
    const cutoff = now - window;
    
    // Sliding window log implementation
    const pipe = this.redis.pipeline();
    pipe.zremrangebyscore(key, 0, cutoff);
    pipe.zcard(key);
    pipe.zadd(key, now, `${now}-${Math.random()}`);
    pipe.expire(key, Math.ceil(window / 1000));
    
    const results = await pipe.exec();
    const current = results[1][1] as number;
    
    if (current > max) {
      return {
        blocked: true,
        type: key,
        remaining: 0,
        resetTime: now + window
      };
    }
    
    return {
      blocked: false,
      type: key,
      remaining: max - current,
      resetTime: now + window
    };
  }
  
  private getApplicableLimits(req: Request): RateLimit[] {
    const auth = checkAuth(req);
    const isAuthenticated = auth.authenticated;
    
    // Authenticated users get higher limits
    if (isAuthenticated) {
      return [
        { ...rateLimits.global_ip, maxRequests: 200 },
        { ...rateLimits.shop, maxRequests: 500 },
        { ...rateLimits.user, maxRequests: 1000 },
        { ...rateLimits.endpoint, maxRequests: 100 }
      ];
    }
    
    // Anonymous users get stricter limits
    return [
      { ...rateLimits.global_ip, maxRequests: 50 },
      { ...rateLimits.shop, maxRequests: 100 },
      { ...rateLimits.endpoint, maxRequests: 25 }
    ];
  }
  
  private async logViolation(req: Request, violation: any) {
    const logData = {
      timestamp: new Date().toISOString(),
      ip: getClientIP(req),
      userAgent: req.headers.get('User-Agent'),
      url: req.url,
      method: req.method,
      limitType: violation.type,
      shop: extractShop(req)
    };
    
    // Log to monitoring system
    console.warn('🚨 Rate limit violation:', logData);
    
    // Store in database for analysis
    await supabase.from('rate_limit_violations').insert(logData);
  }
}
```

#### 4.3 Circuit Breaker Pattern
```typescript
class CircuitBreaker {
  private failures: Map<string, number> = new Map();
  private lastFailure: Map<string, number> = new Map();
  private state: Map<string, 'CLOSED' | 'OPEN' | 'HALF_OPEN'> = new Map();
  
  private readonly failureThreshold = 5;
  private readonly timeout = 60000; // 1 minute
  
  async execute<T>(key: string, operation: () => Promise<T>): Promise<T> {
    const currentState = this.state.get(key) || 'CLOSED';
    
    if (currentState === 'OPEN') {
      const lastFailureTime = this.lastFailure.get(key) || 0;
      if (Date.now() - lastFailureTime < this.timeout) {
        throw new Error('Circuit breaker is OPEN');
      }
      this.state.set(key, 'HALF_OPEN');
    }
    
    try {
      const result = await operation();
      this.onSuccess(key);
      return result;
    } catch (error) {
      this.onFailure(key);
      throw error;
    }
  }
  
  private onSuccess(key: string) {
    this.failures.delete(key);
    this.state.set(key, 'CLOSED');
  }
  
  private onFailure(key: string) {
    const failureCount = (this.failures.get(key) || 0) + 1;
    this.failures.set(key, failureCount);
    this.lastFailure.set(key, Date.now());
    
    if (failureCount >= this.failureThreshold) {
      this.state.set(key, 'OPEN');
    }
  }
}
```

#### 4.4 Database Schema for Rate Limiting
```sql
-- Rate limit violations log
CREATE TABLE rate_limit_violations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT now(),
  ip_address INET,
  user_agent TEXT,
  url TEXT,
  method TEXT,
  limit_type TEXT,
  shop_domain TEXT,
  user_id UUID,
  violation_count INTEGER DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Rate limit configurations (dynamic limits)
CREATE TABLE rate_limit_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  limit_type TEXT NOT NULL,
  window_ms INTEGER NOT NULL,
  max_requests INTEGER NOT NULL,
  shop_id UUID REFERENCES shops(id),
  user_tier TEXT CHECK (user_tier IN ('free', 'pro', 'enterprise')),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Indexes for performance
CREATE INDEX idx_violations_timestamp ON rate_limit_violations(timestamp);
CREATE INDEX idx_violations_ip ON rate_limit_violations(ip_address);
CREATE INDEX idx_violations_shop ON rate_limit_violations(shop_domain);
CREATE INDEX idx_rate_configs_type ON rate_limit_configs(limit_type);
```

#### 4.5 Monitoring and Alerting
```typescript
// Monitoring dashboard data
interface RateLimitMetrics {
  totalRequests: number;
  blockedRequests: number;
  blockRate: number;
  topViolators: Array<{
    ip: string;
    violations: number;
    shop?: string;
  }>;
  endpointStats: Array<{
    endpoint: string;
    requests: number;
    blocked: number;
  }>;
}

async function getRateLimitMetrics(timeRange: string): Promise<RateLimitMetrics> {
  const { data: violations } = await supabase
    .from('rate_limit_violations')
    .select('*')
    .gte('timestamp', getTimeRangeStart(timeRange));
    
  const { data: requests } = await supabase
    .from('api_requests')
    .select('*')
    .gte('timestamp', getTimeRangeStart(timeRange));
    
  return {
    totalRequests: requests.length,
    blockedRequests: violations.length,
    blockRate: violations.length / requests.length,
    topViolators: aggregateViolatorsByIP(violations),
    endpointStats: aggregateByEndpoint(requests, violations)
  };
}
```

---

## Implementation Timeline

### Phase 3: Authentication (4 weeks)
- **Week 1**: Auth middleware & database schema
- **Week 2**: Token management API & dashboard
- **Week 3**: Shopify OAuth integration
- **Week 4**: Testing & gradual rollout

### Phase 4: Rate Limiting (4 weeks)
- **Week 1**: Redis setup & basic rate limiting
- **Week 2**: Multi-tier limits & circuit breaker
- **Week 3**: Monitoring & alerting system
- **Week 4**: Load testing & optimization

### Phase 5: Advanced Security (2 weeks)
- **Week 1**: Request signing & webhook security
- **Week 2**: Advanced threat detection & IP blocking

---

## Security Levels

| Phase | Security Level | SOC2 Ready | DDOS Protection | Enterprise Ready |
|-------|---------------|------------|-----------------|------------------|
| Current | **MODERATE** | ✅ Yes | 🟡 Basic | ✅ Yes |
| Phase 3 | **HIGH** | ✅ Yes | 🟡 Basic | ✅ Yes |
| Phase 4 | **VERY HIGH** | ✅ Yes | ✅ Strong | ✅ Yes |
| Phase 5 | **ENTERPRISE** | ✅ Yes | ✅ Military Grade | ✅ Yes |

---

## Deployment Strategy

### Zero-Downtime Deployment
1. **Feature Flags**: All new features behind flags
2. **Gradual Rollout**: 1% → 10% → 50% → 100%
3. **Rollback Plan**: Instant rollback capability
4. **Monitoring**: Real-time metrics during rollout

### Testing Strategy
1. **Unit Tests**: 95% code coverage
2. **Integration Tests**: API contract testing
3. **Load Tests**: 10x normal traffic simulation
4. **Security Tests**: Penetration testing & vulnerability scans

---

## Success Metrics

### Authentication (Phase 3)
- [ ] 90% of API calls authenticated within 30 days
- [ ] Zero auth-related downtime
- [ ] <100ms auth overhead per request
- [ ] SOC2 Type II audit passing

### Rate Limiting (Phase 4)
- [ ] 99.9% of legitimate requests pass through
- [ ] DDOS attacks blocked within 30 seconds
- [ ] <10ms rate limiting overhead
- [ ] Zero false positives for legitimate traffic

### Overall Security
- [ ] SOC2 Type II compliance maintained
- [ ] Zero security incidents post-implementation
- [ ] 99.99% uptime maintained
- [ ] Customer satisfaction score >4.8/5

---

## Risk Mitigation

### Technical Risks
- **Risk**: Auth breaks existing integrations
- **Mitigation**: Backward compatibility + gradual rollout
- **Monitoring**: Real-time error rate tracking

- **Risk**: Rate limiting blocks legitimate users  
- **Mitigation**: Conservative limits + whitelist capability
- **Monitoring**: False positive alerts

### Business Risks
- **Risk**: Customer churn due to complexity
- **Mitigation**: Transparent communication + migration support
- **Monitoring**: Customer satisfaction surveys

---

## Conclusion

This roadmap provides a comprehensive path to enterprise-grade security while maintaining backward compatibility and zero downtime. The phased approach ensures minimal risk while delivering maximum security value.

**Next Steps**: 
1. Review and approve roadmap
2. Begin Phase 3 implementation
3. Set up monitoring infrastructure  
4. Schedule Phase 4 planning session

---

*Last Updated: July 6, 2025*  
*Version: 1.0*  
*Status: Ready for Implementation*