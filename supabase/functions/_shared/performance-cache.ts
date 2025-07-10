/**
 * High-Performance Caching Layer for SmartPop Analytics
 * 
 * Since we don't have direct Redis access in Supabase, this implements:
 * 1. In-memory caching with TTL
 * 2. Database-backed persistent cache
 * 3. Pre-computed metrics storage
 * 4. Smart cache invalidation
 */

interface CacheEntry {
  key: string;
  value: any;
  expires_at: number;
  created_at: number;
  shop_domain?: string;
  cache_type: 'memory' | 'database' | 'aggregated';
}

interface CacheStats {
  hits: number;
  misses: number;
  sets: number;
  deletes: number;
  last_reset: number;
}

class PerformanceCache {
  private memoryCache = new Map<string, CacheEntry>();
  private stats: CacheStats = {
    hits: 0,
    misses: 0,
    sets: 0,
    deletes: 0,
    last_reset: Date.now()
  };

  // Cache TTL configurations (in milliseconds)
  private readonly TTL_CONFIG = {
    // Real-time data (15 seconds)
    realtime: 15 * 1000,
    // Dashboard metrics (5 minutes)
    dashboard: 5 * 60 * 1000,
    // Analytics data (15 minutes)
    analytics: 15 * 60 * 1000,
    // Aggregated data (1 hour)
    aggregated: 60 * 60 * 1000,
    // Historical data (24 hours)
    historical: 24 * 60 * 60 * 1000,
    // Static data (1 week)
    static: 7 * 24 * 60 * 60 * 1000
  };

  /**
   * Get cached value with automatic fallback to database
   */
  async get<T>(
    key: string, 
    supabase?: any, 
    fallbackQuery?: () => Promise<T>,
    ttlType: keyof typeof this.TTL_CONFIG = 'dashboard'
  ): Promise<T | null> {
    // Try memory cache first
    const memoryEntry = this.memoryCache.get(key);
    if (memoryEntry && memoryEntry.expires_at > Date.now()) {
      this.stats.hits++;
      return memoryEntry.value;
    }

    // Try database cache
    if (supabase) {
      try {
        const { data: dbEntry } = await supabase
          .from('cache_storage')
          .select('value, expires_at')
          .eq('cache_key', key)
          .gt('expires_at', new Date().toISOString())
          .single();

        if (dbEntry) {
          this.stats.hits++;
          // Store in memory for next time
          this.memoryCache.set(key, {
            key,
            value: dbEntry.value,
            expires_at: new Date(dbEntry.expires_at).getTime(),
            created_at: Date.now(),
            cache_type: 'memory'
          });
          return dbEntry.value;
        }
      } catch (error) {
        // Database cache miss or error, continue to fallback
      }
    }

    // Cache miss - use fallback query if provided
    if (fallbackQuery) {
      this.stats.misses++;
      try {
        const value = await fallbackQuery();
        if (value !== null && value !== undefined) {
          await this.set(key, value, ttlType, supabase);
        }
        return value;
      } catch (error) {
        console.error(`Cache fallback query failed for key ${key}:`, error);
        return null;
      }
    }

    this.stats.misses++;
    return null;
  }

  /**
   * Set cached value in both memory and database
   */
  async set<T>(
    key: string, 
    value: T, 
    ttlType: keyof typeof this.TTL_CONFIG = 'dashboard',
    supabase?: any,
    shopDomain?: string
  ): Promise<void> {
    const ttl = this.TTL_CONFIG[ttlType];
    const expiresAt = Date.now() + ttl;

    // Store in memory
    this.memoryCache.set(key, {
      key,
      value,
      expires_at: expiresAt,
      created_at: Date.now(),
      shop_domain: shopDomain,
      cache_type: 'memory'
    });

    // Store in database for persistence
    if (supabase) {
      try {
        await supabase
          .from('cache_storage')
          .upsert({
            cache_key: key,
            value: value,
            expires_at: new Date(expiresAt).toISOString(),
            shop_domain: shopDomain,
            cache_type: ttlType,
            created_at: new Date().toISOString()
          }, { onConflict: 'cache_key' });
      } catch (error) {
        console.warn(`Failed to store cache in database for key ${key}:`, error);
      }
    }

    this.stats.sets++;
  }

  /**
   * Delete cached value
   */
  async delete(key: string, supabase?: any): Promise<void> {
    this.memoryCache.delete(key);
    
    if (supabase) {
      try {
        await supabase
          .from('cache_storage')
          .delete()
          .eq('cache_key', key);
      } catch (error) {
        console.warn(`Failed to delete cache from database for key ${key}:`, error);
      }
    }

    this.stats.deletes++;
  }

  /**
   * Invalidate cache by pattern or shop domain
   */
  async invalidate(pattern: string | RegExp, supabase?: any, shopDomain?: string): Promise<void> {
    // Invalidate memory cache
    const keysToDelete: string[] = [];
    for (const [key, entry] of this.memoryCache.entries()) {
      const matchesPattern = typeof pattern === 'string' 
        ? key.includes(pattern)
        : pattern.test(key);
      const matchesShop = !shopDomain || entry.shop_domain === shopDomain;
      
      if (matchesPattern && matchesShop) {
        keysToDelete.push(key);
      }
    }

    keysToDelete.forEach(key => this.memoryCache.delete(key));

    // Invalidate database cache
    if (supabase) {
      try {
        let query = supabase.from('cache_storage').delete();
        
        if (typeof pattern === 'string') {
          query = query.ilike('cache_key', `%${pattern}%`);
        }
        
        if (shopDomain) {
          query = query.eq('shop_domain', shopDomain);
        }

        await query;
      } catch (error) {
        console.warn(`Failed to invalidate database cache:`, error);
      }
    }
  }

  /**
   * Clean expired entries from memory cache
   */
  cleanup(): void {
    const now = Date.now();
    const expiredKeys: string[] = [];

    for (const [key, entry] of this.memoryCache.entries()) {
      if (entry.expires_at <= now) {
        expiredKeys.push(key);
      }
    }

    expiredKeys.forEach(key => this.memoryCache.delete(key));
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats & { memorySize: number; hitRate: number } {
    const total = this.stats.hits + this.stats.misses;
    return {
      ...this.stats,
      memorySize: this.memoryCache.size,
      hitRate: total > 0 ? (this.stats.hits / total) * 100 : 0
    };
  }

  /**
   * Clear all cache
   */
  async clear(supabase?: any): Promise<void> {
    this.memoryCache.clear();
    
    if (supabase) {
      try {
        await supabase.from('cache_storage').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      } catch (error) {
        console.warn('Failed to clear database cache:', error);
      }
    }

    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
      last_reset: Date.now()
    };
  }
}

// Global cache instance
const globalCache = new PerformanceCache();

/**
 * High-level caching functions for common use cases
 */

export async function getCachedDashboardMetrics(
  shopDomain: string,
  supabase: any
): Promise<any> {
  const cacheKey = `dashboard:metrics:${shopDomain}`;
  
  return await globalCache.get(cacheKey, supabase, async () => {
    // Fallback: Query aggregated metrics from materialized view
    const { data } = await supabase
      .from('shop_metrics_realtime')
      .select('*')
      .eq('shop_domain', shopDomain)
      .single();
    
    return data;
  }, 'dashboard');
}

export async function getCachedPopupPerformance(
  shopDomain: string,
  supabase: any
): Promise<any[]> {
  const cacheKey = `popup:performance:${shopDomain}`;
  
  return await globalCache.get(cacheKey, supabase, async () => {
    // Fallback: Query from materialized view
    const { data } = await supabase
      .from('popup_performance_summary')
      .select('*')
      .eq('shop_domain', shopDomain)
      .order('conversion_rate', { ascending: false });
    
    return data || [];
  }, 'analytics');
}

export async function getCachedAnalytics(
  shopDomain: string,
  timeframe: string,
  supabase: any
): Promise<any> {
  const cacheKey = `analytics:${shopDomain}:${timeframe}`;
  
  return await globalCache.get(cacheKey, supabase, async () => {
    // Fallback: Query from daily aggregations
    const days = timeframe === '1d' ? 1 : timeframe === '7d' ? 7 : timeframe === '30d' ? 30 : 90;
    
    const { data: dailyStats } = await supabase
      .from('popup_events_daily')
      .select('*')
      .eq('shop_domain', shopDomain)
      .gte('date_bucket', new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
      .order('date_bucket', { ascending: false });

    // Aggregate the daily stats
    const aggregated = {
      total_views: dailyStats?.reduce((sum, day) => sum + day.total_views, 0) || 0,
      total_conversions: dailyStats?.reduce((sum, day) => sum + day.total_conversions, 0) || 0,
      unique_visitors: dailyStats?.reduce((sum, day) => sum + day.unique_visitors, 0) || 0,
      conversion_rate: 0,
      daily_trend: dailyStats || []
    };

    if (aggregated.total_views > 0) {
      aggregated.conversion_rate = (aggregated.total_conversions / aggregated.total_views) * 100;
    }

    return aggregated;
  }, 'analytics');
}

export async function getCachedAttributionData(
  shopDomain: string,
  timeframe: string,
  supabase: any
): Promise<any> {
  const cacheKey = `attribution:${shopDomain}:${timeframe}`;
  
  return await globalCache.get(cacheKey, supabase, async () => {
    const days = timeframe === '1d' ? 1 : timeframe === '7d' ? 7 : timeframe === '30d' ? 30 : 90;
    
    const { data } = await supabase
      .from('attribution_summary_daily')
      .select('*')
      .eq('shop_domain', shopDomain)
      .gte('date_bucket', new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
      .order('date_bucket', { ascending: false });

    return data || [];
  }, 'analytics');
}

export async function invalidateShopCache(shopDomain: string, supabase: any): Promise<void> {
  await globalCache.invalidate('', supabase, shopDomain);
}

export async function invalidateDashboardCache(shopDomain: string, supabase: any): Promise<void> {
  await globalCache.invalidate(/^dashboard:/, supabase, shopDomain);
}

export async function invalidateAnalyticsCache(shopDomain: string, supabase: any): Promise<void> {
  await globalCache.invalidate(/^analytics:/, supabase, shopDomain);
}

export async function warmupCache(shopDomain: string, supabase: any): Promise<void> {
  // Pre-load common queries into cache
  const promises = [
    getCachedDashboardMetrics(shopDomain, supabase),
    getCachedPopupPerformance(shopDomain, supabase),
    getCachedAnalytics(shopDomain, '7d', supabase),
    getCachedAnalytics(shopDomain, '30d', supabase),
    getCachedAttributionData(shopDomain, '7d', supabase)
  ];

  await Promise.allSettled(promises);
}

/**
 * Pre-computation functions for expensive queries
 */

export async function precomputeShopMetrics(shopDomain: string, supabase: any): Promise<void> {
  try {
    // Calculate real-time metrics and store in cache
    const realTimeMetrics = await calculateRealTimeMetrics(shopDomain, supabase);
    await globalCache.set(`realtime:${shopDomain}`, realTimeMetrics, 'realtime', supabase, shopDomain);

    // Calculate trend data
    const trendData = await calculateTrendData(shopDomain, supabase);
    await globalCache.set(`trends:${shopDomain}`, trendData, 'analytics', supabase, shopDomain);

  } catch (error) {
    console.error(`Failed to precompute metrics for ${shopDomain}:`, error);
  }
}

async function calculateRealTimeMetrics(shopDomain: string, supabase: any): Promise<any> {
  const now = new Date();
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

  const { data: recentEvents } = await supabase
    .from('popup_events')
    .select('event_type, created_at, visitor_ip')
    .eq('shop_domain', shopDomain)
    .gte('created_at', oneHourAgo.toISOString());

  const uniqueVisitors = new Set(recentEvents?.map(e => e.visitor_ip) || []).size;
  const views = recentEvents?.filter(e => e.event_type === 'view').length || 0;
  const conversions = recentEvents?.filter(e => e.event_type === 'conversion').length || 0;

  return {
    active_visitors_last_hour: uniqueVisitors,
    popup_views_last_hour: views,
    conversions_last_hour: conversions,
    conversion_rate_last_hour: views > 0 ? (conversions / views * 100).toFixed(2) : '0.00',
    last_updated: now.toISOString()
  };
}

async function calculateTrendData(shopDomain: string, supabase: any): Promise<any> {
  const { data: dailyData } = await supabase
    .from('popup_events_daily')
    .select('*')
    .eq('shop_domain', shopDomain)
    .gte('date_bucket', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
    .order('date_bucket', { ascending: true });

  return {
    daily_trend: dailyData || [],
    total_days: dailyData?.length || 0,
    avg_daily_views: dailyData?.reduce((sum, day) => sum + day.total_views, 0) / (dailyData?.length || 1),
    avg_daily_conversions: dailyData?.reduce((sum, day) => sum + day.total_conversions, 0) / (dailyData?.length || 1)
  };
}

/**
 * Database table creation for persistent cache
 */
export async function ensureCacheTable(supabase: any): Promise<void> {
  try {
    // This would be better in a migration, but adding here for completeness
    await supabase.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS cache_storage (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          cache_key TEXT UNIQUE NOT NULL,
          value JSONB NOT NULL,
          expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
          shop_domain TEXT,
          cache_type TEXT DEFAULT 'general',
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );

        CREATE INDEX IF NOT EXISTS idx_cache_storage_key ON cache_storage(cache_key);
        CREATE INDEX IF NOT EXISTS idx_cache_storage_expires ON cache_storage(expires_at);
        CREATE INDEX IF NOT EXISTS idx_cache_storage_shop ON cache_storage(shop_domain);

        -- Enable RLS
        ALTER TABLE cache_storage ENABLE ROW LEVEL SECURITY;
        
        -- Policy for service role
        CREATE POLICY IF NOT EXISTS "Service role can manage cache" ON cache_storage
          FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');
      `
    });
  } catch (error) {
    console.warn('Cache table creation failed (may already exist):', error);
  }
}

// Cleanup expired cache entries periodically
setInterval(() => {
  globalCache.cleanup();
}, 60000); // Every minute

export { globalCache };
export default {
  get: globalCache.get.bind(globalCache),
  set: globalCache.set.bind(globalCache),
  delete: globalCache.delete.bind(globalCache),
  invalidate: globalCache.invalidate.bind(globalCache),
  clear: globalCache.clear.bind(globalCache),
  getStats: globalCache.getStats.bind(globalCache)
};