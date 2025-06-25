
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    const supabase = createClient(supabaseUrl!, supabaseKey!)
    
    const body = await req.text()
    const topic = req.headers.get('X-Shopify-Topic')
    const shop = req.headers.get('X-Shopify-Shop-Domain')
    
    console.log(`Webhook received: ${topic} from ${shop}`)
    
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
    
    return new Response('OK', {
      status: 200,
      headers: corsHeaders
    })
    
  } catch (error) {
    console.error('Webhook error:', error)
    return new Response('Error', {
      status: 500,
      headers: corsHeaders
    })
  }
})
