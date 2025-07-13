import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { validatePublicRequest, createSecurityErrorResponse } from '../_shared/security-validation.ts'

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

serve(async (req) => {
  const timestamp = new Date().toISOString()
  console.log(`[${timestamp}] === ERROR TRACKING API ===`)
  
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { 
      status: 405,
      headers: corsHeaders 
    })
  }

  try {
    // Security validation (relaxed for debugging)
    const validation = validatePublicRequest(req)
    
    if (!validation.isValid) {
      console.warn(`[${timestamp}] Security validation failed: ${validation.error}`);
      // Don't block for now - just log the warning
      // return createSecurityErrorResponse(validation.error!, 403, corsHeaders);
    }

    const requestBody = await req.json()
    const { errors = [], metrics = [], shop, url, userAgent } = requestBody

    console.log(`[${timestamp}] Received monitoring data:`, {
      shop: validation.shop || shop || 'unknown',
      errorsCount: errors.length,
      metricsCount: metrics.length,
      clientIP: validation.clientIP || 'unknown'
    })

    // Process errors
    for (const error of errors) {
      await processError(error, validation.shop || shop || 'unknown', validation.clientIP || 'unknown')
    }

    // Process metrics
    for (const metric of metrics) {
      await processMetric(metric, validation.shop || shop || 'unknown', validation.clientIP || 'unknown')
    }

    return new Response(JSON.stringify({ 
      success: true,
      processed: {
        errors: errors.length,
        metrics: metrics.length
      },
      timestamp: new Date().toISOString()
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error(`[${timestamp}] Error in monitoring API:`, error)
    return new Response(JSON.stringify({ 
      error: 'Failed to process monitoring data',
      timestamp: new Date().toISOString()
    }), { 
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})

async function processError(error: any, shop: string, clientIP: string) {
  const errorData = {
    shop,
    client_ip: clientIP,
    message: error.message || 'Unknown error',
    stack: error.stack,
    filename: error.filename,
    line_number: error.lineno,
    column_number: error.colno,
    severity: error.severity || 'medium',
    user_agent: error.userAgent,
    url: error.url,
    context: error.context ? JSON.stringify(error.context) : null,
    created_at: new Date(error.timestamp || Date.now()).toISOString()
  }

  // Log critical errors immediately
  if (error.severity === 'critical') {
    console.error(`🚨 CRITICAL ERROR for shop ${shop}:`, errorData)
  }

  // In production, save to database
  // For now, just log structured data
  console.log('ERROR_DATA:', JSON.stringify(errorData))
}

async function processMetric(metric: any, shop: string, clientIP: string) {
  const metricData = {
    shop,
    client_ip: clientIP,
    name: metric.name,
    value: metric.value,
    url: metric.url,
    context: metric.context ? JSON.stringify(metric.context) : null,
    created_at: new Date(metric.timestamp || Date.now()).toISOString()
  }

  // Log slow performance metrics
  if (metric.name.includes('slow') || metric.value > 5000) {
    console.warn(`⚠️ PERFORMANCE ISSUE for shop ${shop}:`, metricData)
  }

  // In production, save to database
  // For now, just log structured data
  console.log('METRIC_DATA:', JSON.stringify(metricData))
}