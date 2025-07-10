import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { getCachedDashboardMetrics, invalidateDashboardCache, precomputeShopMetrics } from '../_shared/performance-cache.ts'

/**
 * Event Streaming and Processing Pipeline
 * 
 * This function processes events in real-time and updates aggregated metrics
 * Designed to handle high-volume event streams efficiently
 */

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

interface EventProcessingRequest {
  events: PopupEvent[];
  batchSize?: number;
  processImmediately?: boolean;
}

interface PopupEvent {
  id?: string;
  popup_id: string;
  event_type: 'view' | 'conversion' | 'close' | 'impression';
  shop_domain: string;
  session_id?: string;
  visitor_ip?: string;
  user_agent?: string;
  page_url?: string;
  email?: string;
  timestamp: string;
  metadata?: Record<string, any>;
}

interface ProcessingResult {
  processed: number;
  failed: number;
  metrics_updated: boolean;
  cache_invalidated: boolean;
  processing_time_ms: number;
}

serve(async (req) => {
  const startTime = Date.now();
  const timestamp = new Date().toISOString();
  
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const supabase = createClient(supabaseUrl!, supabaseKey!);

    const requestData: EventProcessingRequest = await req.json();
    
    console.log(`[${timestamp}] Processing ${requestData.events?.length || 0} events`);

    if (!requestData.events || !Array.isArray(requestData.events)) {
      return new Response(JSON.stringify({ 
        error: 'Invalid request: events array required' 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const result = await processEventBatch(
      supabase, 
      requestData.events, 
      requestData.batchSize || 100,
      requestData.processImmediately || false,
      timestamp
    );

    const processingTime = Date.now() - startTime;
    result.processing_time_ms = processingTime;

    console.log(`[${timestamp}] Processed ${result.processed} events in ${processingTime}ms`);

    return new Response(JSON.stringify({
      success: true,
      result,
      timestamp
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error(`[${timestamp}] Event processing error:`, error);
    return new Response(JSON.stringify({
      error: 'Event processing failed',
      details: error.message,
      timestamp
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

async function processEventBatch(
  supabase: any,
  events: PopupEvent[],
  batchSize: number,
  processImmediately: boolean,
  timestamp: string
): Promise<ProcessingResult> {
  let processed = 0;
  let failed = 0;
  const affectedShops = new Set<string>();
  
  // Process events in batches to avoid overwhelming the database
  for (let i = 0; i < events.length; i += batchSize) {
    const batch = events.slice(i, i + batchSize);
    
    try {
      // Insert raw events
      const { data: insertedEvents, error: insertError } = await supabase
        .from('popup_events')
        .insert(batch.map(event => ({
          id: event.id || crypto.randomUUID(),
          popup_id: event.popup_id,
          event_type: event.event_type,
          shop_domain: event.shop_domain,
          session_id: event.session_id,
          visitor_ip: event.visitor_ip,
          user_agent: event.user_agent,
          page_url: event.page_url,
          email: event.email,
          timestamp: event.timestamp,
          created_at: event.timestamp,
          metadata: event.metadata || {}
        })))
        .select();

      if (insertError) {
        console.error(`[${timestamp}] Batch insert error:`, insertError);
        failed += batch.length;
        continue;
      }

      processed += batch.length;
      
      // Track affected shops for cache invalidation
      batch.forEach(event => affectedShops.add(event.shop_domain));

      // Process attribution events if needed
      await processAttributionEvents(supabase, batch, timestamp);

      // Update hourly aggregations if processing immediately
      if (processImmediately) {
        await updateHourlyAggregations(supabase, batch, timestamp);
      }

    } catch (batchError) {
      console.error(`[${timestamp}] Batch processing error:`, batchError);
      failed += batch.length;
    }
  }

  // Update aggregated metrics and invalidate cache
  let metricsUpdated = false;
  let cacheInvalidated = false;

  if (processed > 0) {
    try {
      // Update aggregations for current hour
      if (processImmediately) {
        for (const shopDomain of affectedShops) {
          await updateShopAggregations(supabase, shopDomain, timestamp);
        }
        metricsUpdated = true;
      }

      // Invalidate cache for affected shops
      for (const shopDomain of affectedShops) {
        await invalidateDashboardCache(shopDomain, supabase);
        
        // Precompute new metrics for immediate availability
        if (processImmediately) {
          await precomputeShopMetrics(shopDomain, supabase);
        }
      }
      cacheInvalidated = true;

    } catch (aggregationError) {
      console.error(`[${timestamp}] Aggregation update error:`, aggregationError);
    }
  }

  return {
    processed,
    failed,
    metrics_updated: metricsUpdated,
    cache_invalidated: cacheInvalidated,
    processing_time_ms: 0 // Will be set by caller
  };
}

async function processAttributionEvents(
  supabase: any,
  events: PopupEvent[],
  timestamp: string
): Promise<void> {
  try {
    const attributionEvents = events
      .filter(event => event.event_type === 'view' || event.event_type === 'conversion')
      .map(event => ({
        event_id: `evt_${Date.now()}_${Math.random().toString(36).substring(2)}`,
        session_id: event.session_id || `session_${Date.now()}`,
        visitor_id: event.visitor_ip || `visitor_${Date.now()}`,
        shop_domain: event.shop_domain,
        event_type: event.event_type === 'view' ? 'popup_shown' : 'email_submitted',
        event_timestamp: event.timestamp,
        popup_id: event.popup_id,
        email: event.email,
        attribution_window_days: 7,
        cross_device: false,
        metadata: {
          page_url: event.page_url,
          user_agent: event.user_agent,
          ...event.metadata
        },
        client_ip: event.visitor_ip,
        user_agent: event.user_agent,
        created_at: new Date().toISOString()
      }));

    if (attributionEvents.length > 0) {
      const { error } = await supabase
        .from('attribution_events')
        .insert(attributionEvents);

      if (error) {
        console.error(`[${timestamp}] Attribution events insert error:`, error);
      }
    }
  } catch (error) {
    console.error(`[${timestamp}] Attribution processing error:`, error);
  }
}

async function updateHourlyAggregations(
  supabase: any,
  events: PopupEvent[],
  timestamp: string
): Promise<void> {
  try {
    const currentHour = new Date();
    currentHour.setMinutes(0, 0, 0);

    // Group events by shop and popup for aggregation
    const aggregations = new Map<string, {
      shop_domain: string;
      popup_id: string;
      views: number;
      conversions: number;
      closes: number;
      unique_visitors: Set<string>;
    }>();

    events.forEach(event => {
      const key = `${event.shop_domain}:${event.popup_id}`;
      
      if (!aggregations.has(key)) {
        aggregations.set(key, {
          shop_domain: event.shop_domain,
          popup_id: event.popup_id,
          views: 0,
          conversions: 0,
          closes: 0,
          unique_visitors: new Set()
        });
      }

      const agg = aggregations.get(key)!;
      
      switch (event.event_type) {
        case 'view':
          agg.views++;
          break;
        case 'conversion':
          agg.conversions++;
          break;
        case 'close':
          agg.closes++;
          break;
      }

      if (event.visitor_ip) {
        agg.unique_visitors.add(event.visitor_ip);
      }
    });

    // Update hourly aggregations
    for (const [, agg] of aggregations) {
      const conversionRate = agg.views > 0 ? (agg.conversions / agg.views) * 100 : 0;
      
      await supabase
        .from('popup_events_hourly')
        .upsert({
          shop_domain: agg.shop_domain,
          popup_id: agg.popup_id,
          hour_bucket: currentHour.toISOString(),
          total_views: agg.views,
          total_conversions: agg.conversions,
          total_closes: agg.closes,
          unique_visitors: agg.unique_visitors.size,
          conversion_rate: conversionRate,
          updated_at: new Date().toISOString()
        }, { onConflict: 'shop_domain,popup_id,hour_bucket' });
    }
  } catch (error) {
    console.error(`[${timestamp}] Hourly aggregation update error:`, error);
  }
}

async function updateShopAggregations(
  supabase: any,
  shopDomain: string,
  timestamp: string
): Promise<void> {
  try {
    // Update current hour aggregation for the shop
    const currentHour = new Date();
    currentHour.setMinutes(0, 0, 0);

    await supabase.rpc('aggregate_popup_events_hourly', {
      target_hour: currentHour.toISOString()
    });

    // Update daily aggregation if it's near end of day or if explicitly requested
    const now = new Date();
    if (now.getHours() >= 23 || now.getHours() === 0) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      await supabase.rpc('aggregate_popup_events_daily', {
        target_date: today.toISOString().split('T')[0]
      });
    }

    // Refresh materialized views
    await supabase.rpc('refresh_dashboard_views');

  } catch (error) {
    console.error(`[${timestamp}] Shop aggregation update error:`, error);
  }
}

/**
 * Webhook endpoint for real-time event processing
 * This can be called by other systems to process events immediately
 */
export async function processEventWebhook(
  supabase: any,
  event: PopupEvent,
  timestamp: string
): Promise<void> {
  try {
    // Insert the single event
    await supabase
      .from('popup_events')
      .insert([{
        id: crypto.randomUUID(),
        popup_id: event.popup_id,
        event_type: event.event_type,
        shop_domain: event.shop_domain,
        session_id: event.session_id,
        visitor_ip: event.visitor_ip,
        user_agent: event.user_agent,
        page_url: event.page_url,
        email: event.email,
        timestamp: event.timestamp,
        created_at: new Date().toISOString()
      }]);

    // Process attribution
    await processAttributionEvents(supabase, [event], timestamp);

    // Update aggregations
    await updateHourlyAggregations(supabase, [event], timestamp);

    // Invalidate cache
    await invalidateDashboardCache(event.shop_domain, supabase);

  } catch (error) {
    console.error(`[${timestamp}] Webhook event processing error:`, error);
  }
}

/**
 * Batch processing for scheduled tasks
 */
export async function processPendingEvents(supabase: any): Promise<ProcessingResult> {
  const timestamp = new Date().toISOString();
  
  try {
    // Get unprocessed events (you might have a processing_status column)
    const { data: pendingEvents } = await supabase
      .from('popup_events_raw') // Hypothetical raw events table
      .select('*')
      .is('processed_at', null)
      .order('created_at', { ascending: true })
      .limit(1000);

    if (!pendingEvents || pendingEvents.length === 0) {
      return {
        processed: 0,
        failed: 0,
        metrics_updated: false,
        cache_invalidated: false,
        processing_time_ms: 0
      };
    }

    // Process the batch
    const result = await processEventBatch(
      supabase,
      pendingEvents,
      100,
      true,
      timestamp
    );

    // Mark events as processed
    if (result.processed > 0) {
      const processedIds = pendingEvents.slice(0, result.processed).map(e => e.id);
      await supabase
        .from('popup_events_raw')
        .update({ processed_at: new Date().toISOString() })
        .in('id', processedIds);
    }

    return result;

  } catch (error) {
    console.error(`[${timestamp}] Pending events processing error:`, error);
    throw error;
  }
}