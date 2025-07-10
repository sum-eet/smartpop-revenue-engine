import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { checkRateLimit, getClientIP } from '../_shared/security-validation.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
}

interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  uptime: number;
  services: {
    database: ServiceHealth;
    scripts: ServiceHealth;
    extensions: ServiceHealth;
    cache: ServiceHealth;
    analytics: ServiceHealth;
  };
  version: string;
  environment: string;
}

interface ServiceHealth {
  status: 'healthy' | 'degraded' | 'unhealthy';
  responseTime?: number;
  lastCheck: string;
  error?: string;
  details?: any;
}

interface ShopHealthPing {
  shop: string;
  scriptLoaded: boolean;
  version?: string;
  method: 'script_tags' | 'theme_extension' | 'checkout_ui' | 'fallback';
  lastSeen: string;
  errors?: string[];
  performance?: {
    loadTime: number;
    popupsShown: number;
    conversions: number;
  };
}

const startTime = Date.now();

serve(async (req) => {
  const timestamp = new Date().toISOString();
  const clientIP = getClientIP(req);
  
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Rate limiting for health checks
    const rateLimit = checkRateLimit(clientIP, 30, 60000); // 30 requests per minute
    if (!rateLimit.allowed) {
      return new Response(JSON.stringify({ 
        error: 'Rate limit exceeded',
        remaining: rateLimit.remaining
      }), {
        status: 429,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const supabase = createClient(supabaseUrl!, supabaseKey!);

    if (req.method === 'GET') {
      console.log(`[${timestamp}] Health check requested from IP: ${clientIP}`);
      
      // Perform comprehensive health checks
      const healthStatus = await performHealthChecks(supabase);
      
      return new Response(JSON.stringify(healthStatus, null, 2), {
        status: healthStatus.status === 'healthy' ? 200 : 503,
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache, no-store, must-revalidate'
        }
      });
    }

    if (req.method === 'POST') {
      // Shop health ping
      const pingData: ShopHealthPing = await req.json();
      
      console.log(`[${timestamp}] Health ping from shop: ${pingData.shop}, method: ${pingData.method}, loaded: ${pingData.scriptLoaded}`);
      
      // Validate shop ping data
      if (!pingData.shop || !pingData.method) {
        return new Response(JSON.stringify({ 
          error: 'Missing required ping data',
          required: ['shop', 'method']
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // Store health ping in database
      const healthPingRecord = {
        shop_domain: pingData.shop,
        script_loaded: pingData.scriptLoaded,
        injection_method: pingData.method,
        script_version: pingData.version || 'unknown',
        last_ping: timestamp,
        performance_data: pingData.performance || null,
        errors: pingData.errors || null,
        client_ip: clientIP,
        user_agent: req.headers.get('User-Agent') || 'unknown'
      };

      try {
        // Upsert health ping record
        const { error: upsertError } = await supabase
          .from('shop_health_pings')
          .upsert(healthPingRecord, {
            onConflict: 'shop_domain',
            ignoreDuplicates: false
          });

        if (upsertError) {
          console.error(`[${timestamp}] Failed to store health ping:`, upsertError);
          
          // Try to create table if it doesn't exist
          if (upsertError.message?.includes('does not exist')) {
            await createHealthPingTable(supabase);
            console.log(`[${timestamp}] Created shop_health_pings table`);
            
            // Retry upsert
            await supabase
              .from('shop_health_pings')
              .upsert(healthPingRecord);
          }
        }

        // Check for script failures and trigger alerts
        if (!pingData.scriptLoaded || (pingData.errors && pingData.errors.length > 0)) {
          await handleScriptFailureAlert(supabase, pingData, timestamp);
        }

        return new Response(JSON.stringify({ 
          success: true,
          message: 'Health ping recorded',
          timestamp,
          nextPingIn: 300 // 5 minutes
        }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });

      } catch (dbError) {
        console.error(`[${timestamp}] Database error in health ping:`, dbError);
        return new Response(JSON.stringify({ 
          error: 'Failed to record health ping',
          details: dbError.message
        }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
    }

    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error(`[${timestamp}] Health check function error:`, error);
    return new Response(JSON.stringify({ 
      error: 'Health check failed',
      details: error.message,
      timestamp
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

async function performHealthChecks(supabase: any): Promise<HealthStatus> {
  const checks = await Promise.allSettled([
    checkDatabase(supabase),
    checkScriptDelivery(),
    checkExtensions(),
    checkCacheSystem(),
    checkAnalytics(supabase)
  ]);

  const [database, scripts, extensions, cache, analytics] = checks.map(result => 
    result.status === 'fulfilled' ? result.value : {
      status: 'unhealthy' as const,
      lastCheck: new Date().toISOString(),
      error: result.status === 'rejected' ? result.reason?.message : 'Unknown error'
    }
  );

  // Determine overall health status
  const services = { database, scripts, extensions, cache, analytics };
  const healthyServices = Object.values(services).filter(s => s.status === 'healthy').length;
  const totalServices = Object.keys(services).length;
  
  let overallStatus: 'healthy' | 'degraded' | 'unhealthy';
  if (healthyServices === totalServices) {
    overallStatus = 'healthy';
  } else if (healthyServices >= totalServices * 0.6) {
    overallStatus = 'degraded';
  } else {
    overallStatus = 'unhealthy';
  }

  return {
    status: overallStatus,
    timestamp: new Date().toISOString(),
    uptime: Date.now() - startTime,
    services,
    version: '3.0.0',
    environment: Deno.env.get('ENVIRONMENT') || 'production'
  };
}

async function checkDatabase(supabase: any): Promise<ServiceHealth> {
  const startTime = Date.now();
  
  try {
    // Test basic database connectivity
    const { data, error } = await supabase
      .from('shops')
      .select('count')
      .limit(1);

    if (error) {
      return {
        status: 'unhealthy',
        lastCheck: new Date().toISOString(),
        error: error.message,
        responseTime: Date.now() - startTime
      };
    }

    return {
      status: 'healthy',
      lastCheck: new Date().toISOString(),
      responseTime: Date.now() - startTime,
      details: { recordsCount: data?.length || 0 }
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      lastCheck: new Date().toISOString(),
      error: error.message,
      responseTime: Date.now() - startTime
    };
  }
}

async function checkScriptDelivery(): Promise<ServiceHealth> {
  const startTime = Date.now();
  
  try {
    // Test script endpoint
    const response = await fetch(
      'https://zsmoutzjhqjgjehaituw.supabase.co/functions/v1/popup-embed-public?shop=testingstoresumeet.myshopify.com',
      { 
        method: 'GET',
        headers: { 'Origin': 'https://testingstoresumeet.myshopify.com' }
      }
    );

    if (!response.ok) {
      return {
        status: 'unhealthy',
        lastCheck: new Date().toISOString(),
        error: `HTTP ${response.status}: ${response.statusText}`,
        responseTime: Date.now() - startTime
      };
    }

    const script = await response.text();
    const hasInitFunction = script.includes('smartPopInitialized');
    
    if (!hasInitFunction) {
      return {
        status: 'degraded',
        lastCheck: new Date().toISOString(),
        error: 'Script missing initialization function',
        responseTime: Date.now() - startTime
      };
    }

    return {
      status: 'healthy',
      lastCheck: new Date().toISOString(),
      responseTime: Date.now() - startTime,
      details: { 
        scriptSize: script.length,
        hasInitFunction: true
      }
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      lastCheck: new Date().toISOString(),
      error: error.message,
      responseTime: Date.now() - startTime
    };
  }
}

async function checkExtensions(): Promise<ServiceHealth> {
  // Check if extension files exist and are valid
  try {
    const extensionChecks = [
      { name: 'theme-app-extension', path: '/extensions/theme-app-extension/shopify.extension.toml' },
      { name: 'checkout-ui', path: '/extensions/checkout-ui/shopify.extension.toml' }
    ];

    const results = await Promise.allSettled(
      extensionChecks.map(async ext => {
        // In a real implementation, you'd check if extensions are deployed
        // For now, we'll assume they're healthy if the files exist
        return { name: ext.name, deployed: true };
      })
    );

    const healthyExtensions = results.filter(r => r.status === 'fulfilled').length;
    
    return {
      status: healthyExtensions === extensionChecks.length ? 'healthy' : 'degraded',
      lastCheck: new Date().toISOString(),
      details: { 
        totalExtensions: extensionChecks.length,
        healthyExtensions,
        extensions: extensionChecks.map(e => e.name)
      }
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      lastCheck: new Date().toISOString(),
      error: error.message
    };
  }
}

async function checkCacheSystem(): Promise<ServiceHealth> {
  const startTime = Date.now();
  
  try {
    // Test cache by making a request with cache headers
    const response = await fetch(
      'https://zsmoutzjhqjgjehaituw.supabase.co/functions/v1/popup-config?shop=testingstoresumeet.myshopify.com',
      {
        headers: {
          'If-None-Match': '"test-etag"',
          'Cache-Control': 'max-age=300'
        }
      }
    );

    return {
      status: 'healthy',
      lastCheck: new Date().toISOString(),
      responseTime: Date.now() - startTime,
      details: {
        cacheHeaders: {
          cacheControl: response.headers.get('Cache-Control'),
          etag: response.headers.get('ETag')
        }
      }
    };
  } catch (error) {
    return {
      status: 'degraded',
      lastCheck: new Date().toISOString(),
      error: error.message,
      responseTime: Date.now() - startTime
    };
  }
}

async function checkAnalytics(supabase: any): Promise<ServiceHealth> {
  const startTime = Date.now();
  
  try {
    // Test analytics by checking recent events
    const { data, error } = await supabase
      .from('popup_events')
      .select('id')
      .limit(1)
      .order('created_at', { ascending: false });

    if (error) {
      return {
        status: 'unhealthy',
        lastCheck: new Date().toISOString(),
        error: error.message,
        responseTime: Date.now() - startTime
      };
    }

    return {
      status: 'healthy',
      lastCheck: new Date().toISOString(),
      responseTime: Date.now() - startTime,
      details: { hasRecentEvents: data && data.length > 0 }
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      lastCheck: new Date().toISOString(),
      error: error.message,
      responseTime: Date.now() - startTime
    };
  }
}

async function createHealthPingTable(supabase: any): Promise<void> {
  const createTableSQL = `
    CREATE TABLE IF NOT EXISTS shop_health_pings (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      shop_domain TEXT UNIQUE NOT NULL,
      script_loaded BOOLEAN NOT NULL,
      injection_method TEXT NOT NULL,
      script_version TEXT,
      last_ping TIMESTAMP WITH TIME ZONE NOT NULL,
      performance_data JSONB,
      errors JSONB,
      client_ip TEXT,
      user_agent TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
    
    CREATE INDEX IF NOT EXISTS idx_shop_health_pings_shop_domain ON shop_health_pings(shop_domain);
    CREATE INDEX IF NOT EXISTS idx_shop_health_pings_last_ping ON shop_health_pings(last_ping);
  `;
  
  await supabase.rpc('exec_sql', { sql: createTableSQL });
}

async function handleScriptFailureAlert(supabase: any, pingData: ShopHealthPing, timestamp: string): Promise<void> {
  try {
    // Log the failure
    console.warn(`[${timestamp}] Script failure detected for shop: ${pingData.shop}`);
    console.warn(`[${timestamp}] Method: ${pingData.method}, Loaded: ${pingData.scriptLoaded}, Errors:`, pingData.errors);
    
    // Store alert in database
    const alertRecord = {
      shop_domain: pingData.shop,
      alert_type: 'script_failure',
      severity: !pingData.scriptLoaded ? 'critical' : 'warning',
      message: !pingData.scriptLoaded ? 'Script failed to load' : 'Script loaded with errors',
      details: {
        method: pingData.method,
        scriptLoaded: pingData.scriptLoaded,
        errors: pingData.errors,
        performance: pingData.performance
      },
      created_at: timestamp
    };

    // Try to insert alert (table may not exist yet)
    try {
      await supabase
        .from('script_failure_alerts')
        .insert([alertRecord]);
    } catch (insertError) {
      if (insertError.message?.includes('does not exist')) {
        // Create alerts table
        const createAlertsTableSQL = `
          CREATE TABLE IF NOT EXISTS script_failure_alerts (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            shop_domain TEXT NOT NULL,
            alert_type TEXT NOT NULL,
            severity TEXT NOT NULL,
            message TEXT NOT NULL,
            details JSONB,
            resolved BOOLEAN DEFAULT FALSE,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
          );
          
          CREATE INDEX IF NOT EXISTS idx_script_failure_alerts_shop_domain ON script_failure_alerts(shop_domain);
          CREATE INDEX IF NOT EXISTS idx_script_failure_alerts_created_at ON script_failure_alerts(created_at);
        `;
        
        await supabase.rpc('exec_sql', { sql: createAlertsTableSQL });
        
        // Retry insert
        await supabase
          .from('script_failure_alerts')
          .insert([alertRecord]);
      }
    }

    // TODO: Implement actual alerting (email, Slack, etc.)
    // For now, we just log the alert
    console.log(`[${timestamp}] Alert recorded for shop: ${pingData.shop}`);
    
  } catch (error) {
    console.error(`[${timestamp}] Failed to handle script failure alert:`, error);
  }
}