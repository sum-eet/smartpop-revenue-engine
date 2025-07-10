import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { validatePublicRequest, createSecurityErrorResponse } from '../_shared/security-validation.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
}

serve(async (req) => {
  const timestamp = new Date().toISOString()
  console.log(`[${timestamp}] === EMAIL CAPTURE API ===`)
  
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    if (req.method === 'POST') {
      // CRITICAL SECURITY: Validate request before processing
      const validation = validatePublicRequest(req)
      
      if (!validation.isValid) {
        console.warn(`[${timestamp}] Email capture blocked: ${validation.error}`);
        return createSecurityErrorResponse(validation.error!, 403, corsHeaders);
      }
      
      const supabaseUrl = Deno.env.get('SUPABASE_URL')
      const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
      const supabase = createClient(supabaseUrl!, supabaseKey!)
      
      const { email, shopDomain, popupId, discountCode, pageUrl, metadata } = await req.json()
      
      // Use validated shop from security check
      const validatedShop = validation.shop!
      
      console.log(`[${timestamp}] Email capture request:`, { 
        email: email ? '***@' + email.split('@')[1] : 'none',
        shopDomain: validatedShop,
        popupId,
        hasDiscountCode: !!discountCode,
        rateLimitRemaining: validation.rateLimitRemaining
      })
      
      // Server-side email validation
      if (!validateEmailServerSide(email)) {
        console.log(`[${timestamp}] Invalid email format:`, email)
        return new Response(JSON.stringify({ 
          success: false, 
          error: 'Invalid email format' 
        }), { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      // Get shop ID from validated shop domain
      const { data: shop, error: shopError } = await supabase
        .from('shops')
        .select('id')
        .eq('shop_domain', validatedShop)
        .single()

      if (shopError || !shop) {
        console.error(`[${timestamp}] Shop not found:`, validatedShop, shopError)
        return new Response(JSON.stringify({ 
          success: false, 
          error: 'Shop not found' 
        }), { 
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      // Hash email for privacy
      const emailHash = await hashEmail(email)
      
      // Create or update subscriber
      const subscriberData = {
        email: email.toLowerCase().trim(),
        email_hash: emailHash,
        shop_id: shop.id,
        popup_id: popupId,
        discount_code: discountCode,
        page_url: pageUrl || 'unknown',
        user_agent: req.headers.get('User-Agent') || 'unknown',
        ip_address: req.headers.get('CF-Connecting-IP') || 
                   req.headers.get('X-Forwarded-For')?.split(',')[0]?.trim() ||
                   req.headers.get('X-Real-IP') || 
                   'unknown',
        referrer: req.headers.get('Referer') || 'direct',
        updated_at: new Date().toISOString()
      }

      console.log(`[${timestamp}] Creating/updating subscriber for shop:`, shop.id)

      const { data, error } = await supabase
        .from('email_subscribers')
        .upsert(subscriberData, {
          onConflict: 'shop_id,email',
          ignoreDuplicates: false
        })
        .select()

      if (error) {
        console.error(`[${timestamp}] Database error:`, error)
        
        // If table doesn't exist, fall back to old popup_events table
        if (error.message?.includes('email_subscribers') && error.message?.includes('does not exist')) {
          console.log(`[${timestamp}] Falling back to popup_events table`)
          
          const fallbackData = {
            popup_id: popupId,
            event_type: 'email_capture',
            email: email.toLowerCase().trim(),
            shop_domain: validatedShop,
            page_url: pageUrl,
            timestamp: new Date().toISOString(),
            user_agent: req.headers.get('User-Agent'),
            visitor_ip: subscriberData.ip_address
          }

          const { error: fallbackError } = await supabase
            .from('popup_events')
            .insert([fallbackData])

          if (fallbackError) {
            console.error(`[${timestamp}] Fallback error:`, fallbackError)
            return new Response(JSON.stringify({ 
              success: false, 
              error: 'Failed to save email' 
            }), { 
              status: 500,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            })
          }

          console.log(`[${timestamp}] Email saved to fallback table`)
          return new Response(JSON.stringify({ 
            success: true,
            message: 'Email captured successfully (fallback)',
            subscriberId: null
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          })
        }

        return new Response(JSON.stringify({ 
          success: false, 
          error: 'Failed to save email' 
        }), { 
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      console.log(`[${timestamp}] Email captured successfully:`, data?.[0]?.id)
      return new Response(JSON.stringify({ 
        success: true,
        message: 'Email captured successfully',
        subscriberId: data?.[0]?.id
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error(`[${timestamp}] Function error:`, error)
    return new Response(JSON.stringify({ 
      success: false,
      error: 'Internal server error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})

// Server-side email validation (same as client-side)
function validateEmailServerSide(email: string): boolean {
  if (!email || typeof email !== 'string') return false
  
  const cleanEmail = email.trim()
  
  // Length validation
  if (cleanEmail.length < 5 || cleanEmail.length > 254) return false
  
  // RFC 5322 regex
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+\/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/
  
  if (!emailRegex.test(cleanEmail)) return false
  
  // Split validation
  const parts = cleanEmail.split('@')
  if (parts.length !== 2) return false
  
  const [local, domain] = parts
  
  // Local part validation (before @)
  if (local.length > 64) return false
  if (local.startsWith('.') || local.endsWith('.')) return false
  if (local.includes('..')) return false
  
  // Domain validation
  if (domain.length > 253) return false
  if (!domain.includes('.')) return false
  if (domain.startsWith('.') || domain.endsWith('.')) return false
  if (domain.includes('..')) return false
  
  return true
}

// Hash email for privacy
async function hashEmail(email: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(email.toLowerCase().trim())
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}