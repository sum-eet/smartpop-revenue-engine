import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { validatePublicRequest, createSecurityErrorResponse } from '../_shared/security-validation.ts'
import { checkCacheValidation, createNotModifiedResponse, createCachedResponse, CACHE_CONFIGS, generateETag } from '../_shared/caching.ts'

// CORS headers for public script access
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
}

serve(async (req) => {
  const timestamp = new Date().toISOString()
  console.log(`[${timestamp}] === PUBLIC POPUP EMBED API ===`)
  
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    if (req.method === 'GET') {
      // CRITICAL SECURITY: Validate request before serving any content
      const validation = validatePublicRequest(req)
      
      if (!validation.isValid) {
        console.warn(`[${timestamp}] Security validation failed: ${validation.error}`);
        return createSecurityErrorResponse(validation.error!, 403, corsHeaders);
      }
      
      const url = new URL(req.url)
      const shop = validation.shop! // Use validated shop from security check
      const debug = url.searchParams.get('debug') === 'true'
      const version = url.searchParams.get('version') || 'latest'
      const variant = url.searchParams.get('variant') || 'default'
      
      console.log(`[${timestamp}] Serving popup embed for validated shop: ${shop}, version: ${version}, variant: ${variant} (Rate limit remaining: ${validation.rateLimitRemaining})`)

      // Generate the JavaScript embed code with versioning and A/B testing
      const embedScript = generateEmbedScript(shop, debug, req, version, variant)
      
      // Generate ETag for caching
      const etag = await generateETag(embedScript);
      
      // Check if client has cached version
      if (checkCacheValidation(req, etag)) {
        console.log(`[${timestamp}] Returning 304 Not Modified for shop: ${shop}`);
        const cacheHeaders = {
          ...corsHeaders,
          'ETag': `"${etag}"`,
          'Cache-Control': 'public, max-age=300, stale-while-revalidate=1800'
        };
        return createNotModifiedResponse(cacheHeaders);
      }

      console.log(`[${timestamp}] Serving fresh embed script for shop: ${shop}`);
      
      // Return cached response with proper headers
      return createCachedResponse(
        embedScript,
        'application/javascript',
        CACHE_CONFIGS.POPUP_EMBED,
        corsHeaders,
        etag
      );
    } else {
      return new Response('Method not allowed', { 
        status: 405,
        headers: corsHeaders 
      })
    }
  } catch (error) {
    console.error(`[${timestamp}] Error in public embed API:`, error)
    return new Response('Internal server error', { 
      status: 500,
      headers: corsHeaders 
    })
  }
})

function generateEmbedScript(shop: string, debug: boolean = false, request?: Request, version: string = 'latest', variant: string = 'default'): string {
  const apiBaseUrl = 'https://zsmoutzjhqjgjehaituw.supabase.co/functions/v1'
  
  return `
// SmartPop Customer Popup Script - Ultra Fast & Secure
// Shop: ${shop} | Version: ${version} | Variant: ${variant}
(function() {
  'use strict';
  
  // Skip if admin context
  const h = location.hostname, p = location.pathname;
  if (h === 'admin.shopify.com' || p.includes('/admin') || p.includes('/apps') || 
      p.includes('/install') || p.includes('/auth') || window !== top) return;

  // Prevent multiple initializations
  if (window.smartPopInitialized) return;
  window.smartPopInitialized = true;

  let popups = [];
  let shown = new Set();
  
  // Load popup configurations from API
  async function loadPopups() {
    try {
      // Call the popup-config-public API that doesn't require authentication
      const response = await fetch('https://zsmoutzjhqjgjehaituw.supabase.co/functions/v1/popup-config-public?shop=${shop}');
      const data = await response.json();
      
      if (response.ok && data.campaigns) {
        // Transform API data to expected format
        popups = data.campaigns.map(popup => ({
          id: popup.id,
          name: popup.name || popup.title,
          title: popup.title || popup.name,
          description: popup.description,
          discount_percent: popup.discount_percent,
          discount_code: popup.discount_code,
          trigger_type: popup.trigger_type,
          trigger_value: popup.trigger_value,
          is_active: popup.is_active,
          triggers: {
            timeOnSite: popup.trigger_type === 'time_delay' ? parseInt(popup.trigger_value || '3') : null,
            scrollDepth: popup.trigger_type === 'scroll_depth' ? parseInt(popup.trigger_value || '50') : null,
            isFirstVisit: popup.trigger_type === 'page_view',
            hasExitIntent: popup.trigger_type === 'exit_intent'
          }
        }));
        console.log('SmartPop: Loaded', popups.length, 'popups from API');
      } else {
        // Fallback to basic popup if API fails
        popups = [
          {
            id: 'fallback-popup',
            name: 'Welcome Offer',
            title: 'Welcome to Our Store!',
            description: 'Get 15% off your first purchase!',
            discount_percent: 15,
            discount_code: 'WELCOME15',
            triggers: { timeOnSite: 3 }
          }
        ];
        console.log('SmartPop: Using fallback popup data');
      }
    } catch (error) {
      console.error('SmartPop: Failed to load popups', error);
      // Fallback data
      popups = [
        {
          id: 'error-fallback',
          name: 'Special Offer',
          title: 'Don\'t Miss Out!',
          description: 'Limited time offer!',
          triggers: { timeOnSite: 5 }
        }
      ];
    }
  }
  
  // Behavior tracking
  let behavior = {
    timeOnSite: 0,
    scrollDepth: 0,
    hasExitIntent: false
  };
  
  function startTracking() {
    // Time tracking
    setInterval(() => behavior.timeOnSite++, 1000);
    
    // Scroll tracking
    let scrollTicking = false;
    window.addEventListener('scroll', () => {
      if (!scrollTicking) {
        requestAnimationFrame(() => {
          const scrolled = (window.scrollY / (document.body.scrollHeight - window.innerHeight)) * 100;
          behavior.scrollDepth = Math.max(behavior.scrollDepth, scrolled || 0);
          scrollTicking = false;
        });
        scrollTicking = true;
      }
    }, { passive: true });
    
    // Exit intent tracking
    document.addEventListener('mouseleave', (e) => {
      if (e.clientY <= 0) behavior.hasExitIntent = true;
    });
  }
  
  // Check if popup should trigger
  function checkTriggers() {
    if (popups.length === 0) return;
    
    const eligible = popups.find(popup => {
      if (shown.has(popup.id)) return false;
      
      const triggers = popup.triggers || {};
      
      if (triggers.timeOnSite && behavior.timeOnSite < triggers.timeOnSite) return false;
      if (triggers.scrollDepth && behavior.scrollDepth < triggers.scrollDepth) return false;
      if (triggers.hasExitIntent && !behavior.hasExitIntent) return false;
      
      return true;
    });
    
    if (eligible) {
      showPopup(eligible);
      shown.add(eligible.id);
    }
  }
  
  // Show popup
  function showPopup(popup) {
    // Clean up existing popups
    document.querySelectorAll('[id^="smartpop-"]').forEach(p => p.remove());
    
    // Create overlay
    const overlay = document.createElement('div');
    overlay.id = 'smartpop-' + popup.id;
    overlay.style.cssText = 'position:fixed;inset:0;z-index:999999;background:rgba(0,0,0,0.7);display:flex;align-items:center;justify-content:center;font-family:sans-serif';
    
    // Create content
    const content = document.createElement('div');
    content.style.cssText = 'background:white;border-radius:12px;padding:32px;max-width:450px;width:90%;position:relative;box-shadow:0 20px 40px rgba(0,0,0,0.3);text-align:center';
    
    const title = (popup.name || 'Special Offer').replace(/[<>]/g, '');
    const desc = (popup.description || 'Limited time offer!').replace(/[<>]/g, '');
    const code = (popup.discount_code || '').replace(/[<>]/g, '');
    
    content.innerHTML = 
      '<button onclick="this.closest(\\'[id^=smartpop-]\\').remove()" style="position:absolute;top:16px;right:16px;background:none;border:none;font-size:24px;cursor:pointer;color:#999">×</button>' +
      '<h2 style="margin:0 0 16px;font-size:24px;color:#333">' + title + '</h2>' +
      '<p style="margin:0 0 24px;color:#666">' + desc + '</p>' +
      '<form onsubmit="handleSubmit(event, this, \\'' + popup.id + '\\', \\'' + code + '\\')" style="display:flex;flex-direction:column;gap:16px">' +
      '<input type="email" placeholder="Enter email" required style="padding:12px;border:2px solid #e1e5e9;border-radius:8px;font-size:16px;box-sizing:border-box">' +
      '<button type="submit" style="background:#007cba;color:white;padding:12px 24px;border:none;border-radius:8px;cursor:pointer;font-size:16px;font-weight:600">Get Discount</button>' +
      '</form>';
    
    overlay.appendChild(content);
    document.body.appendChild(overlay);
    
    // Track popup view
    fetch('https://zsmoutzjhqjgjehaituw.supabase.co/functions/v1/popup-track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        popupId: popup.id,
        eventType: 'view',
        shop: '${shop}',
        pageUrl: window.location.href,
        timestamp: new Date().toISOString()
      })
    }).catch(() => {});
  }
  
  // Handle form submission
  window.handleSubmit = function(event, form, popupId, discountCode) {
    event.preventDefault();
    const email = form.querySelector('input').value;
    
    if (email) {
      // Track conversion
      fetch('https://zsmoutzjhqjgjehaituw.supabase.co/functions/v1/popup-track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventType: 'conversion',
          shop: '${shop}',
          popupId: popupId,
          email: email,
          timestamp: new Date().toISOString(),
          pageUrl: window.location.href,
          discountCode: discountCode
        })
      }).catch(() => {});
      
      // Show success
      const successHtml = '<div style="text-align:center;padding:40px 20px"><div style="font-size:48px;color:#10b981;margin-bottom:16px">✓</div><h3>Thank You!</h3><p>Check your email for your discount code.</p>' + 
        (discountCode ? '<div style="background:#f8f9fa;padding:16px;margin:16px 0;border-radius:8px"><strong>' + discountCode + '</strong></div>' : '') + 
        '</div>';
      
      form.parentElement.innerHTML = successHtml;
      
      // Copy code to clipboard
      if (discountCode && navigator.clipboard) {
        navigator.clipboard.writeText(discountCode).catch(() => {});
      }
      
      // Auto-close after 3 seconds
      setTimeout(() => {
        const popup = document.querySelector('[id^="smartpop-"]');
        if (popup) popup.remove();
      }, 3000);
    }
  };
  
  // Initialize
  async function init() {
    await loadPopups(); // Now async - wait for popup data
    startTracking();
    setInterval(checkTriggers, 1000);
  }
  
  // Start when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
`;
}