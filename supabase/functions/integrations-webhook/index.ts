import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { securityMiddleware, SECURITY_CONFIGS } from '../security-middleware/index.ts'
import { sanitizeInput } from '../auth-middleware/index.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': process.env.ALLOWED_ORIGINS || 'https://shopify.dev',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-shopify-hmac-sha256, x-shopify-topic, x-shopify-shop-domain',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block'
}

serve(async (req) => {
  const timestamp = new Date().toISOString()
  console.log(`[${timestamp}] === INTEGRATIONS WEBHOOK API CALLED ===`)
  
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  // Apply security middleware for webhooks
  const securityResult = await securityMiddleware(req, SECURITY_CONFIGS.WEBHOOK)
  if (!securityResult.allowed) {
    return securityResult.response!
  }

  if (req.method === 'POST') {
    try {
      const supabaseUrl = Deno.env.get('SUPABASE_URL')
      const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
      const supabase = createClient(supabaseUrl!, supabaseKey!)

      // Get webhook headers
      const shopifyHmac = req.headers.get('x-shopify-hmac-sha256')
      const shopifyTopic = req.headers.get('x-shopify-topic')
      const shopifyShop = req.headers.get('x-shopify-shop-domain')
      
      console.log(`[${timestamp}] Webhook received:`, {
        topic: shopifyTopic,
        shop: shopifyShop,
        hasHmac: !!shopifyHmac
      })

      // Get request body
      const body = await req.text()
      const webhookData = JSON.parse(body)

      // Verify Shopify webhook if it's from Shopify
      if (shopifyHmac && shopifyTopic && shopifyShop) {
        const isValid = await verifyShopifyWebhook(body, shopifyHmac)
        if (!isValid) {
          console.error(`[${timestamp}] Invalid Shopify webhook signature`)
          return new Response(JSON.stringify({
            error: 'Invalid webhook signature'
          }), {
            status: 401,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          })
        }

        // Process Shopify webhook
        await processShopifyWebhook(supabase, shopifyTopic, shopifyShop, webhookData, timestamp)
      } else {
        // Process generic webhook
        await processGenericWebhook(supabase, req.headers, webhookData, timestamp)
      }

      return new Response(JSON.stringify({
        success: true,
        timestamp
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })

    } catch (error) {
      console.error(`[${timestamp}] Webhook processing error:`, error)
      return new Response(JSON.stringify({
        error: 'Webhook processing failed',
        details: error.message,
        timestamp
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }
  }

  return new Response(JSON.stringify({
    error: 'Method not allowed'
  }), {
    status: 405,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  })
})

async function verifyShopifyWebhook(body: string, signature: string, shopDomain: string): Promise<boolean> {
  try {
    if (!signature || !shopDomain) {
      console.warn('Missing signature or shop domain for webhook verification')
      return false
    }

    // Get shop-specific webhook secret from database
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    const supabase = createClient(supabaseUrl!, supabaseKey!)

    const { data: webhookConfig, error } = await supabase
      .from('webhook_security')
      .select('webhook_secret, is_active, failed_verification_count')
      .eq('shop_domain', shopDomain)
      .eq('is_active', true)
      .single()

    if (error || !webhookConfig) {
      console.warn(`No webhook configuration found for shop: ${shopDomain}`)
      return false
    }

    // Check if shop has too many failed verifications
    if (webhookConfig.failed_verification_count > 10) {
      console.warn(`Shop ${shopDomain} has too many failed verification attempts`)
      return false
    }

    const webhookSecret = webhookConfig.webhook_secret

    // Verify HMAC signature using timing-safe comparison
    const encoder = new TextEncoder()
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(webhookSecret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    )

    const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(body))
    const expectedSignature = btoa(String.fromCharCode(...new Uint8Array(sig)))
    
    // Timing-safe comparison
    const isValid = await timingSafeEqual(expectedSignature, signature)

    if (isValid) {
      // Reset failed count on successful verification
      await supabase
        .from('webhook_security')
        .update({ 
          last_verified_at: new Date().toISOString(),
          failed_verification_count: 0
        })
        .eq('shop_domain', shopDomain)
    } else {
      // Increment failed count
      await supabase
        .from('webhook_security')
        .update({ 
          failed_verification_count: webhookConfig.failed_verification_count + 1
        })
        .eq('shop_domain', shopDomain)
    }
    
    return isValid
  } catch (error) {
    console.error('Failed to verify Shopify webhook:', error)
    return false
  }
}

// Timing-safe string comparison to prevent timing attacks
async function timingSafeEqual(a: string, b: string): Promise<boolean> {
  if (a.length !== b.length) {
    return false
  }

  const encoder = new TextEncoder()
  const aBytes = encoder.encode(a)
  const bBytes = encoder.encode(b)

  let result = 0
  for (let i = 0; i < aBytes.length; i++) {
    result |= aBytes[i] ^ bBytes[i]
  }

  return result === 0
}

async function processShopifyWebhook(
  supabase: any, 
  topic: string, 
  shop: string, 
  data: any, 
  timestamp: string
) {
  console.log(`[${timestamp}] Processing Shopify webhook:`, topic)

  // Store webhook for audit trail
  await supabase
    .from('shopify_webhooks')
    .insert([{
      id: `${shop}_${topic}_${Date.now()}`,
      topic,
      shop_domain: shop,
      payload: data,
      created_at: timestamp,
      verified: true
    }])

  switch (topic) {
    case 'orders/create':
      await handleOrderCreate(supabase, shop, data, timestamp)
      break
    case 'orders/updated':
      await handleOrderUpdate(supabase, shop, data, timestamp)
      break
    case 'orders/paid':
      await handleOrderPaid(supabase, shop, data, timestamp)
      break
    case 'customers/create':
      await handleCustomerCreate(supabase, shop, data, timestamp)
      break
    case 'customers/update':
      await handleCustomerUpdate(supabase, shop, data, timestamp)
      break
    case 'app/uninstalled':
      await handleAppUninstalled(supabase, shop, timestamp)
      break
    default:
      console.log(`[${timestamp}] Unhandled Shopify webhook topic: ${topic}`)
  }
}

async function handleOrderCreate(supabase: any, shop: string, order: any, timestamp: string) {
  console.log(`[${timestamp}] New order created:`, order.id)

  try {
    // Generate tracking events for the order
    const events = []
    
    // Purchase event
    events.push({
      id: `purchase_${order.id}_${Date.now()}`,
      session_id: `shopify_${order.id}`, // Use order ID as session for server-side events
      user_id: order.customer?.id?.toString(),
      event_type: 'ecommerce',
      event_data: {
        type: 'purchase',
        transactionId: order.id.toString(),
        revenue: parseFloat(order.total_price),
        currency: order.currency,
        timestamp: new Date(order.created_at)
      },
      timestamp: new Date(order.created_at)
    })

    // Individual product events
    order.line_items?.forEach((item: any) => {
      events.push({
        id: `product_purchase_${order.id}_${item.id}_${Date.now()}`,
        session_id: `shopify_${order.id}`,
        user_id: order.customer?.id?.toString(),
        event_type: 'ecommerce',
        event_data: {
          type: 'purchase',
          productId: item.product_id?.toString(),
          productName: item.title,
          price: parseFloat(item.price),
          currency: order.currency,
          quantity: item.quantity,
          transactionId: order.id.toString(),
          timestamp: new Date(order.created_at)
        },
        timestamp: new Date(order.created_at)
      })
    })

    // Insert tracking events
    if (events.length > 0) {
      const { error } = await supabase
        .from('tracking_events')
        .insert(events)
      
      if (error) {
        console.error(`[${timestamp}] Failed to insert order events:`, error)
      } else {
        console.log(`[${timestamp}] Inserted ${events.length} order events`)
      }
    }

    // Trigger CRM sync if customer data available
    if (order.customer?.email) {
      await triggerCRMSync(supabase, {
        email: order.customer.email,
        firstName: order.customer.first_name,
        lastName: order.customer.last_name,
        phone: order.customer.phone,
        shopifyId: order.customer.id,
        totalSpent: parseFloat(order.customer.total_spent || '0'),
        ordersCount: (order.customer.orders_count || 0) + 1,
        lastOrderValue: parseFloat(order.total_price),
        lastOrderDate: new Date(order.created_at),
        shop
      }, timestamp)
    }

  } catch (error) {
    console.error(`[${timestamp}] Failed to process order create:`, error)
  }
}

async function handleOrderUpdate(supabase: any, shop: string, order: any, timestamp: string) {
  console.log(`[${timestamp}] Order updated:`, order.id)
  // Handle order status changes, shipping updates, etc.
}

async function handleOrderPaid(supabase: any, shop: string, order: any, timestamp: string) {
  console.log(`[${timestamp}] Order paid:`, order.id)
  
  // Track payment completion
  const paymentEvent = {
    id: `payment_${order.id}_${Date.now()}`,
    session_id: `shopify_${order.id}`,
    user_id: order.customer?.id?.toString(),
    event_type: 'ecommerce',
    event_data: {
      type: 'payment_completed',
      transactionId: order.id.toString(),
      revenue: parseFloat(order.total_price),
      currency: order.currency,
      paymentMethod: order.payment_gateway_names?.[0] || 'unknown',
      timestamp: new Date()
    },
    timestamp: new Date()
  }

  await supabase
    .from('tracking_events')
    .insert([paymentEvent])
}

async function handleCustomerCreate(supabase: any, shop: string, customer: any, timestamp: string) {
  console.log(`[${timestamp}] New customer created:`, customer.email)
  
  await triggerCRMSync(supabase, {
    email: customer.email,
    firstName: customer.first_name,
    lastName: customer.last_name,
    phone: customer.phone,
    shopifyId: customer.id,
    totalSpent: parseFloat(customer.total_spent || '0'),
    ordersCount: customer.orders_count || 0,
    createdAt: new Date(customer.created_at),
    shop,
    isNewCustomer: true
  }, timestamp)
}

async function handleCustomerUpdate(supabase: any, shop: string, customer: any, timestamp: string) {
  console.log(`[${timestamp}] Customer updated:`, customer.email)
  
  await triggerCRMSync(supabase, {
    email: customer.email,
    firstName: customer.first_name,
    lastName: customer.last_name,
    phone: customer.phone,
    shopifyId: customer.id,
    totalSpent: parseFloat(customer.total_spent || '0'),
    ordersCount: customer.orders_count || 0,
    updatedAt: new Date(customer.updated_at),
    shop
  }, timestamp)
}

async function handleAppUninstalled(supabase: any, shop: string, timestamp: string) {
  console.log(`[${timestamp}] App uninstalled from shop:`, shop)
  
  // Mark shop as inactive
  await supabase
    .from('shops')
    .update({
      is_active: false,
      uninstalled_at: timestamp
    })
    .eq('shop_domain', shop)
}

async function processGenericWebhook(
  supabase: any,
  headers: Headers,
  data: any,
  timestamp: string
) {
  console.log(`[${timestamp}] Processing generic webhook`)
  
  // Store generic webhook
  await supabase
    .from('generic_webhooks')
    .insert([{
      id: `webhook_${Date.now()}`,
      headers: Object.fromEntries(headers.entries()),
      payload: data,
      created_at: timestamp
    }])
}

async function triggerCRMSync(supabase: any, customerData: any, timestamp: string) {
  try {
    // Store in CRM sync queue
    await supabase
      .from('crm_sync_queue')
      .insert([{
        id: `crm_sync_${customerData.shopifyId || Date.now()}`,
        customer_data: customerData,
        sync_status: 'pending',
        created_at: timestamp
      }])

    console.log(`[${timestamp}] CRM sync queued for:`, customerData.email)
  } catch (error) {
    console.error(`[${timestamp}] Failed to queue CRM sync:`, error)
  }
}