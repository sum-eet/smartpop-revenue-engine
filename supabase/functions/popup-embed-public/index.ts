import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

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
      const url = new URL(req.url)
      const shop = url.searchParams.get('shop') || 'testingstoresumeet.myshopify.com'
      const debug = url.searchParams.get('debug') === 'true'
      
      console.log(`[${timestamp}] Serving popup embed for shop: ${shop}`)

      // Generate the JavaScript embed code with CORRECT admin detection
      const embedScript = generateEmbedScript(shop, debug)

      return new Response(embedScript, {
        status: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/javascript',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      })
    }

    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error(`[${timestamp}] Function error:`, error)
    return new Response(`console.error('SmartPop Embed Error: ${error.message}');`, {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/javascript' }
    })
  }
})

function generateEmbedScript(shop: string, debug: boolean = false): string {
  const apiBaseUrl = 'https://zsmoutzjhqjgjehaituw.supabase.co/functions/v1'
  
  return `
/**
 * SmartPop Revenue Engine - Public Embed Script
 * Shop: ${shop}
 * Generated: ${new Date().toISOString()}
 * Version: 2.0 - Fixed scope issues
 */

(function() {
  'use strict';
  
  // Prevent multiple initializations
  if (window.smartPopInitialized) {
    console.log('🎯 SmartPop already initialized');
    return;
  }
  window.smartPopInitialized = true;

  // CRITICAL ADMIN DETECTION - This is the key fix
  function shouldSkipPopup() {
    const currentUrl = window.location.href;
    const currentPath = window.location.pathname;
    const hostname = window.location.hostname;
    
    ${debug ? `console.log('🔍 SmartPop URL Check:', { url: currentUrl, hostname: hostname, path: currentPath });` : ''}
    
    // MAIN ADMIN DETECTION: admin.shopify.com domain
    if (hostname === 'admin.shopify.com') {
      console.log('🚫 SmartPop: Blocked admin.shopify.com domain');
      return true;
    }
    
    // Admin subdomains
    if (hostname.includes('admin.shopify.com') || 
        hostname.includes('partners.shopify.com') ||
        hostname.includes('accounts.shopify.com') ||
        hostname.includes('app.shopify.com')) {
      console.log('🚫 SmartPop: Blocked Shopify admin subdomain:', hostname);
      return true;
    }
    
    // App-specific paths (when on store domain)
    if (currentPath.includes('/admin') || 
        currentPath.includes('/apps') ||
        currentPath.includes('/account') ||
        currentPath.includes('/oauth') ||
        currentPath.includes('/login') ||
        currentPath.includes('/checkout')) {
      console.log('🚫 SmartPop: Blocked admin path:', currentPath);
      return true;
    }
    
    // Third-party app domains
    if (hostname.includes('shopifyapp.com') ||
        hostname.includes('claude.ai') ||
        hostname.includes('vercel.app') ||
        hostname.includes('netlify.app')) {
      console.log('🚫 SmartPop: Blocked third-party app domain:', hostname);
      return true;
    }
    
    // DOM-based detection
    if (document.querySelector('meta[name="shopify-checkout-api-token"]') ||
        document.querySelector('[data-shopify-app]') ||
        document.querySelector('#shopify-app') ||
        document.querySelector('.shopify-admin') ||
        document.querySelector('[data-shopify-admin]') ||
        document.body?.classList?.contains('admin') ||
        document.body?.classList?.contains('shopify-admin')) {
      console.log('🚫 SmartPop: Blocked admin DOM element detected');
      return true;
    }
    
    // Iframe detection
    if (window !== window.top) {
      console.log('🚫 SmartPop: Blocked iframe context');
      return true;
    }
    
    // URL query parameter detection
    if (currentUrl.includes('shopify_app') ||
        currentUrl.includes('embedded=1') ||
        currentUrl.includes('hmac=') ||
        currentUrl.includes('timestamp=')) {
      console.log('🚫 SmartPop: Blocked Shopify app parameters');
      return true;
    }
    
    console.log('✅ SmartPop: Customer store page confirmed');
    return false;
  }

  // CRITICAL: Exit immediately if should skip
  if (shouldSkipPopup()) {
    console.log('🚫 SmartPop: Exiting due to admin detection');
    return;
  }

  console.log('🚀 SmartPop: Initializing on customer store');

  // Load popups and show them with proper triggers
  async function loadAndShowPopups() {
    try {
      console.log('📥 Loading popup configs...');
      
      const response = await fetch('${apiBaseUrl}/popup-config?action=list&shop_domain=${shop}');
      
      if (!response.ok) {
        console.log('❌ Failed to load popups:', response.status);
        return;
      }
      
      const popups = await response.json();
      console.log('📊 Loaded', popups.length, 'popup configs');
      
      // Find first active popup
      const activePopup = popups.find(p => p.is_active && !p.is_deleted);
      
      if (activePopup) {
        console.log('🎯 Setting up popup:', activePopup.name, 'with trigger:', activePopup.trigger_type);
        setupPopupTrigger(activePopup);
      } else {
        console.log('ℹ️ No active popups to show');
      }
      
    } catch (error) {
      console.error('❌ Error loading popups:', error);
    }
  }
  
  // Setup popup trigger based on type
  function setupPopupTrigger(popup) {
    const triggerType = popup.trigger_type;
    const triggerValue = popup.trigger_value;
    
    console.log('🎯 Setting up trigger:', triggerType, 'with value:', triggerValue);
    
    switch (triggerType) {
      case 'time_delay':
        const delay = parseInt(triggerValue || '5') * 1000;
        setTimeout(() => showPopup(popup), delay);
        break;
        
      case 'scroll_depth':
        // 🔧 FIXED: Input validation and edge case handling
        let targetScrollPercent = parseInt(triggerValue || '50');
        
        // Validate and sanitize trigger value
        if (isNaN(targetScrollPercent) || targetScrollPercent < 0) {
          console.warn('🚨 Invalid scroll trigger value:', triggerValue, '- using default 50%');
          targetScrollPercent = 50;
        }
        if (targetScrollPercent > 100) {
          console.warn('🚨 Scroll trigger > 100%:', targetScrollPercent, '- clamping to 100%');
          targetScrollPercent = 100;
        }
        
        let scrollTriggered = false;
        console.log('🎯 Setting up scroll trigger at', targetScrollPercent + '%');
        
        function checkScroll() {
          if (scrollTriggered) return;
          
          // 🌐 FIXED: Cross-browser scroll position detection
          const scrollTop = window.scrollY || window.pageYOffset || document.documentElement.scrollTop || 0;
          const docHeight = document.documentElement.scrollHeight - document.documentElement.clientHeight;
          
          // 🔧 FIXED: Handle single-screen pages (docHeight = 0)
          if (docHeight <= 0) {
            console.log('📄 Single-screen page detected - triggering immediately for scroll 0%');
            if (targetScrollPercent === 0) {
              scrollTriggered = true;
              showPopup(popup);
              window.removeEventListener('scroll', checkScroll);
            }
            return;
          }
          
          // 🎯 FIXED: Precise calculation with Math.floor for exact trigger point
          const currentScrollPercent = Math.floor((scrollTop / docHeight) * 100);
          
          ${debug ? `console.log('📊 Scroll:', currentScrollPercent + '% / target:', targetScrollPercent + '%');` : ''}
          
          // 🏎️ FIXED: Fast scroll protection - use >= to catch users who scroll past
          if (currentScrollPercent >= targetScrollPercent) {
            scrollTriggered = true;
            console.log('✅ Scroll trigger fired at', currentScrollPercent + '%');
            showPopup(popup);
            window.removeEventListener('scroll', checkScroll);
          }
        }
        
        // ⏰ FIXED: Wait for full page load to get accurate docHeight
        function setupScrollTrigger() {
          const docHeight = document.documentElement.scrollHeight - document.documentElement.clientHeight;
          
          // Check if already at target on page load
          if (docHeight <= 0 && targetScrollPercent === 0) {
            console.log('📄 Page load: Single-screen + 0% trigger = immediate popup');
            showPopup(popup);
            return;
          }
          
          const currentScrollPercent = Math.floor(((window.scrollY || window.pageYOffset || 0) / Math.max(docHeight, 1)) * 100);
          if (currentScrollPercent >= targetScrollPercent) {
            console.log('📄 Page load: Already past trigger point - showing popup');
            showPopup(popup);
            return;
          }
          
          window.addEventListener('scroll', checkScroll, { passive: true });
          
          // 🧠 FIXED: Memory leak protection - cleanup on page unload
          window.addEventListener('beforeunload', function cleanup() {
            window.removeEventListener('scroll', checkScroll);
            window.removeEventListener('beforeunload', cleanup);
          });
        }
        
        // Setup after DOM and images load for accurate height
        if (document.readyState === 'complete') {
          setupScrollTrigger();
        } else {
          window.addEventListener('load', setupScrollTrigger);
        }
        
        break;
        
      case 'exit_intent':
        let exitTriggered = false;
        
        function handleMouseMove(e) {
          if (exitTriggered) return;
          
          // Detect mouse moving toward top of screen
          if (e.clientY <= 5 && e.movementY < 0) {
            exitTriggered = true;
            showPopup(popup);
            document.removeEventListener('mousemove', handleMouseMove);
          }
        }
        
        document.addEventListener('mousemove', handleMouseMove);
        break;
        
      default:
        // Default to time delay
        setTimeout(() => showPopup(popup), 5000);
        break;
    }
  }
  
  function showPopup(popup) {
    const popupHTML = \`
      <div id="smartpop-\${popup.id}" style="
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.7);
        z-index: 999999;
        display: flex;
        align-items: center;
        justify-content: center;
        font-family: -apple-system, BlinkMacSystemFont, sans-serif;
      ">
        <div style="
          background: white;
          border-radius: 12px;
          padding: 32px;
          max-width: 450px;
          width: 90%;
          text-align: center;
          box-shadow: 0 20px 40px rgba(0,0,0,0.3);
          position: relative;
        ">
          <button onclick="document.getElementById('smartpop-\${popup.id}').remove()" style="
            position: absolute;
            top: 16px;
            right: 16px;
            background: none;
            border: none;
            font-size: 24px;
            cursor: pointer;
            color: #666;
          ">×</button>
          
          <h2 style="margin: 0 0 16px 0; color: #333; font-size: 24px;">
            \${popup.title || 'Special Offer!'}
          </h2>
          
          <p style="margin: 0 0 24px 0; color: #666; font-size: 16px;">
            \${popup.description || 'Get a special discount!'}
          </p>
          
          <input type="email" id="email-\${popup.id}" placeholder="\${popup.email_placeholder || 'Enter your email'}" 
                 oninput="validateEmailRealtime('\${popup.id}')"
                 autocomplete="email"
                 required
                 style="
                   width: 100%;
                   padding: 12px;
                   border: 2px solid #ddd;
                   border-radius: 6px;
                   font-size: 16px;
                   margin-bottom: 8px;
                   box-sizing: border-box;
                   transition: border-color 0.3s ease;
                 ">
          <div id="email-feedback-\${popup.id}" style="
            display: none;
            font-size: 12px;
            margin-bottom: 8px;
            min-height: 16px;
          "></div>
          
          <button onclick="submitEmail('\${popup.id}', '\${popup.discount_code || ''}');" 
                  style="
                    background: #007cba;
                    color: white;
                    border: none;
                    padding: 14px 28px;
                    border-radius: 6px;
                    font-size: 16px;
                    cursor: pointer;
                    width: 100%;
                  ">
            \${popup.button_text || 'Get Offer'}
          </button>
        </div>
      </div>
    \`;
    
    document.body.insertAdjacentHTML('beforeend', popupHTML);
    
    // Track view
    fetch('${apiBaseUrl}/popup-track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        popupId: popup.id,
        eventType: 'view',
        shop: '${shop}',
        pageUrl: window.location.href
      })
    }).catch(e => console.log('Track failed:', e));
  }
  
  // Enhanced RFC 5322 compliant email validation
  window.validateEmail = function(email) {
    // Length validation
    if (!email || email.length < 5 || email.length > 254) return false;
    
    // RFC 5322 regex (escaped for template literal)
    const emailRegex = /^[a-zA-Z0-9.!#$%&'*+\/=?^_\`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
    
    if (!emailRegex.test(email)) return false;
    
    // Split validation
    const parts = email.split('@');
    if (parts.length !== 2) return false;
    
    const [local, domain] = parts;
    
    // Local part validation (before @)
    if (local.length > 64) return false;
    if (local.startsWith('.') || local.endsWith('.')) return false;
    if (local.includes('..')) return false;
    
    // Domain validation
    if (domain.length > 253) return false;
    if (!domain.includes('.')) return false;
    if (domain.startsWith('.') || domain.endsWith('.')) return false;
    if (domain.includes('..')) return false;
    
    return true;
  };

  // Real-time email validation feedback
  window.validateEmailRealtime = function(popupId) {
    const email = document.getElementById('email-' + popupId).value.trim();
    const feedbackEl = document.getElementById('email-feedback-' + popupId);
    
    if (!feedbackEl) return; // Fallback if feedback element not found
    
    if (!email) {
      feedbackEl.textContent = '';
      feedbackEl.style.display = 'none';
      return;
    }
    
    feedbackEl.style.display = 'block';
    feedbackEl.style.fontSize = '12px';
    feedbackEl.style.marginTop = '4px';
    
    if (window.validateEmail(email)) {
      feedbackEl.textContent = '✓ Email looks good!';
      feedbackEl.style.color = '#27ae60';
    } else {
      feedbackEl.textContent = 'Please enter a valid email (e.g., user@example.com)';
      feedbackEl.style.color = '#e74c3c';
    }
  };

  // Email submission function (ENHANCED - preserving all existing functionality)
  window.submitEmail = function(popupId, discountCode) {
    const email = document.getElementById('email-' + popupId).value.trim();
    
    // Enhanced validation (fallback to old validation for compatibility)
    if (!window.validateEmail(email)) {
      // Keep original alert message for consistency
      alert('Please enter a valid email address');
      return;
    }
    
    console.log('📧 Submitting email:', email, 'for popup:', popupId);
    
    // Enhanced email capture (with fallback to old system)
    fetch('${apiBaseUrl}/email-capture', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: email,
        shopDomain: '${shop}',
        popupId: popupId,
        discountCode: discountCode,
        pageUrl: window.location.href
      })
    })
    .then(response => response.json())
    .then(result => {
      if (result.success) {
        console.log('✅ Email captured successfully via new API');
      } else {
        console.warn('⚠️ New email API failed, using fallback:', result.error);
        // Fallback to old tracking system
        return fetch('${apiBaseUrl}/popup-track', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            popupId: popupId,
            eventType: 'email_capture',
            email: email,
            shop: '${shop}',
            pageUrl: window.location.href
          })
        });
      }
    })
    .catch(error => {
      console.warn('⚠️ Email capture API error, using fallback:', error);
      // Fallback to old tracking system
      fetch('${apiBaseUrl}/popup-track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          popupId: popupId,
          eventType: 'email_capture',
          email: email,
          shop: '${shop}',
          pageUrl: window.location.href
        })
      }).catch(e => console.log('Fallback track failed:', e));
    });
    
    // Show success message
    const popup = document.getElementById('smartpop-' + popupId);
    popup.innerHTML = \`
      <div style="
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.7);
        z-index: 999999;
        display: flex;
        align-items: center;
        justify-content: center;
        font-family: -apple-system, BlinkMacSystemFont, sans-serif;
      ">
        <div style="
          background: white;
          border-radius: 12px;
          padding: 32px;
          max-width: 450px;
          width: 90%;
          text-align: center;
          box-shadow: 0 20px 40px rgba(0,0,0,0.3);
          position: relative;
        ">
          <div style="color: #28a745; font-size: 48px; margin-bottom: 16px;">✓</div>
          <h2 style="margin: 0 0 16px 0; color: #333; font-size: 24px;">Thank You!</h2>
          <p style="margin: 0 0 24px 0; color: #666; font-size: 16px;">
            Your email has been saved. \${discountCode ? 'Your discount code is: <strong>' + discountCode + '</strong>' : 'Check your email for special offers!'}
          </p>
          <button onclick="document.getElementById('smartpop-' + popupId).remove();" 
                  style="
                    background: #28a745;
                    color: white;
                    border: none;
                    padding: 14px 28px;
                    border-radius: 6px;
                    font-size: 16px;
                    cursor: pointer;
                    width: 100%;
                  ">
            Close
          </button>
        </div>
      </div>
    \`;
    
    // Auto-close after 5 seconds
    setTimeout(() => {
      const popupElement = document.getElementById('smartpop-' + popupId);
      if (popupElement) {
        popupElement.remove();
      }
    }, 5000);
  };

  // Initialize after DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadAndShowPopups);
  } else {
    loadAndShowPopups();
  }
  
  console.log('🎯 SmartPop Public Embed loaded for shop: ${shop}');
  
})();
`;
}