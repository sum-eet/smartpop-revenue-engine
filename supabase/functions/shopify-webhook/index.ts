
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { getClientIP } from '../_shared/security-validation.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-shopify-topic, x-shopify-hmac-sha256, x-shopify-shop-domain',
}

/**
 * Verify Shopify webhook HMAC signature
 */
async function verifyShopifyWebhook(body: string, signature: string, secret: string): Promise<boolean> {
  if (!signature || !secret) {
    return false;
  }
  
  try {
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
    
    const signatureBytes = await crypto.subtle.sign('HMAC', key, encoder.encode(body));
    const expectedSignature = btoa(String.fromCharCode(...new Uint8Array(signatureBytes)));
    
    // Shopify sends the signature with 'sha256=' prefix
    const receivedSignature = signature.replace('sha256=', '');
    
    return expectedSignature === receivedSignature;
  } catch (error) {
    console.error('HMAC verification error:', error);
    return false;
  }
}

serve(async (req) => {
  const timestamp = new Date().toISOString();
  const clientIP = getClientIP(req);
  
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // CRITICAL SECURITY: Verify webhook authenticity
    const body = await req.text()
    const signature = req.headers.get('X-Shopify-Hmac-Sha256')
    const topic = req.headers.get('X-Shopify-Topic')
    const shop = req.headers.get('X-Shopify-Shop-Domain')
    
    console.log(`[${timestamp}] Webhook received: ${topic} from ${shop} (IP: ${clientIP})`);
    
    // Get webhook secret from environment
    const webhookSecret = Deno.env.get('SHOPIFY_WEBHOOK_SECRET');
    if (!webhookSecret) {
      console.error(`[${timestamp}] SECURITY ERROR: No webhook secret configured`);
      return new Response('Webhook secret not configured', { 
        status: 500, 
        headers: corsHeaders 
      });
    }
    
    // Verify HMAC signature
    if (!signature) {
      console.warn(`[${timestamp}] SECURITY WARNING: Missing HMAC signature from ${shop}`);
      return new Response('Missing HMAC signature', { 
        status: 401, 
        headers: corsHeaders 
      });
    }
    
    const isValidSignature = await verifyShopifyWebhook(body, signature, webhookSecret);
    if (!isValidSignature) {
      console.error(`[${timestamp}] SECURITY ERROR: Invalid HMAC signature from ${shop} (IP: ${clientIP})`);
      return new Response('Invalid signature', { 
        status: 401, 
        headers: corsHeaders 
      });
    }
    
    console.log(`[${timestamp}] ✅ Webhook authenticated for ${shop}`);
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    const supabase = createClient(supabaseUrl!, supabaseKey!)
    
    if (topic === 'app/uninstalled') {
      // Remove shop from database when app is uninstalled
      await supabase
        .from('shops')
        .delete()
        .eq('shop_domain', shop)
    }
    
    if (topic === 'orders/create' || topic === 'orders/updated') {
      const order = JSON.parse(body)
      
      // Track revenue attribution for discount codes
      if (order.discount_codes && order.discount_codes.length > 0) {
        const discountCode = order.discount_codes[0].code
        
        // Find matching conversion
        const { data: conversion } = await supabase
          .from('popup_conversions')
          .select('*')
          .eq('discount_code_used', discountCode)
          .is('order_id', null)
          .order('converted_at', { ascending: false })
          .limit(1)
          .single()
        
        if (conversion) {
          // Update conversion with order data
          await supabase
            .from('popup_conversions')
            .update({
              order_id: order.id.toString(),
              revenue_amount: parseFloat(order.total_price)
            })
            .eq('id', conversion.id)
        }
      }
    }
    
    console.log(`[${timestamp}] ✅ Webhook processed successfully for ${shop}`);
    return new Response('OK', {
      status: 200,
      headers: corsHeaders
    })
    
  } catch (error) {
    console.error(`[${timestamp}] Webhook error from IP ${clientIP}:`, error)
    return new Response('Internal server error', {
      status: 500,
      headers: corsHeaders
    })
  }
})
