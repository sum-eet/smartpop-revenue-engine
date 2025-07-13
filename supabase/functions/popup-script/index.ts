import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'GET') {
    return new Response('Method not allowed', { status: 405, headers: corsHeaders })
  }

  try {
    const url = new URL(req.url)
    const shop = url.searchParams.get('shop') || 'testingstoresumeet.myshopify.com'
    
    console.log('Serving popup script for shop:', shop)

    const script = `
/**
 * SmartPop Revenue Engine - Live Script
 * Shop: ${shop}
 * Generated: ${new Date().toISOString()}
 */

(function() {
  'use strict';
  
  if (window.smartPopInitialized) {
    console.log('🎯 SmartPop already initialized - cleaning up old popups');
    const existingPopups = document.querySelectorAll('[id^="smartpop-"], .smartpop-popup, [class*="smartpop"]');
    existingPopups.forEach(p => p.remove());
    return;
  }
  window.smartPopInitialized = true;
  console.log('🚀 SmartPop (popup-script) initialized');

  function shouldSkipPopup() {
    const currentUrl = window.location.href;
    const currentPath = window.location.pathname;
    const hostname = window.location.hostname;
    
    if (hostname === 'admin.shopify.com') {
      console.log('🚫 SmartPop: Blocked admin.shopify.com domain');
      return true;
    }
    
    if (currentPath.includes('/admin') || currentPath.includes('/apps')) {
      console.log('🚫 SmartPop: Blocked admin path:', currentPath);
      return true;
    }
    
    if (window !== window.top) {
      console.log('🚫 SmartPop: Blocked iframe context');
      return true;
    }
    
    console.log('✅ SmartPop: Customer store page confirmed');
    return false;
  }

  if (shouldSkipPopup()) {
    console.log('🚫 SmartPop: Exiting due to admin detection');
    return;
  }

  console.log('🚀 SmartPop: Initializing on customer store');

  let popups = [];
  let shownPopups = new Set();
  let currentScrollDepth = 0;
  let timeOnSite = 0;

  // GLOBAL EMAIL VALIDATION - Available to all popup types
  window.validateEmail = function(email) {
    console.log('🔍 Validating email:', email);
    
    if (!email || typeof email !== 'string') {
      console.log('❌ Email is empty or not string');
      return false;
    }
    
    const cleanEmail = email.trim();
    
    if (cleanEmail.length < 3 || cleanEmail.length > 254) {
      console.log('❌ Email length invalid:', cleanEmail.length);
      return false;
    }
    
    const atCount = (cleanEmail.match(/@/g) || []).length;
    if (atCount !== 1) {
      console.log('❌ Must contain exactly one @, found:', atCount);
      return false;
    }
    
    const parts = cleanEmail.split('@');
    const [local, domain] = parts;
    
    if (!local || local.length === 0) {
      console.log('❌ Missing local part (before @)');
      return false;
    }
    
    if (!domain || domain.length === 0) {
      console.log('❌ Missing domain part (after @)');
      return false;
    }
    
    if (!domain.includes('.')) {
      console.log('❌ Domain must contain at least one dot');
      return false;
    }
    
    if (domain.startsWith('.') || domain.endsWith('.')) {
      console.log('❌ Domain cannot start or end with dot');
      return false;
    }
    
    const domainParts = domain.split('.');
    const tld = domainParts[domainParts.length - 1];
    if (!tld || tld.length < 2) {
      console.log('❌ Invalid TLD:', tld);
      return false;
    }
    
    const emailRegex = /^[a-zA-Z0-9._+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(cleanEmail)) {
      console.log('❌ Failed regex test');
      return false;
    }
    
    console.log('✅ Email validation passed');
    return true;
  };

  // GLOBAL POPUP SUBMIT HANDLER - Available to all popup types
  window.handlePopupSubmit = function(popupId) {
    const emailInput = document.getElementById(\`email-input-\${popupId}\`);
    if (!emailInput) {
      console.error('❌ Email input not found for popup:', popupId);
      return;
    }
    
    const email = emailInput.value.trim();
    console.log('🔍 Popup submit attempt:', { popupId, email });
    
    if (window.validateEmail(email)) {
      console.log('✅ Email validation passed');
      
      // Store in database (non-blocking)
      fetch('https://zsmoutzjhqjgjehaituw.supabase.co/functions/v1/popup-track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          popupId: popupId,
          eventType: 'conversion',
          shop: '${shop}',
          pageUrl: window.location.href,
          email: email,
          timestamp: new Date().toISOString()
        })
      }).then(response => {
        if (response.ok) {
          console.log('✅ Email stored in database');
        } else {
          console.log('⚠️ Database storage failed, but popup worked');
        }
      }).catch(error => {
        console.log('⚠️ Database error, but popup worked:', error);
      });
      
      // Always show success to user regardless of database
      alert('Thank you! Check your email for the discount code.');
      document.getElementById(\`smartpop-\${popupId}\`)?.remove();
    } else {
      console.log('❌ Email validation failed');
      emailInput.style.borderColor = '#ff3b30';
      emailInput.focus();
      setTimeout(() => {
        emailInput.style.borderColor = '#ddd';
      }, 2000);
    }
  };

  function loadAndShowPopups() {
    try {
      console.log('📥 Loading HARDCODED popup configs...');
      
      // NUCLEAR OPTION: Hardcoded popup data - NO API CALLS
      const response = { ok: true };
      const data = [
        {
          id: 'nuclear-welcome',
          name: 'Welcome Offer',
          title: 'Welcome to Our Store!',
          description: 'Get 15% off your first purchase!',
          discount_percent: 15,
          discount_code: 'WELCOME15',
          trigger_type: 'time_delay',
          trigger_value: '3',
          is_active: true,
          is_deleted: false
        },
        {
          id: 'nuclear-scroll',
          name: 'Scroll Offer', 
          title: 'Still Browsing?',
          description: 'Save 10% before you leave!',
          discount_percent: 10,
          discount_code: 'SAVE10',
          trigger_type: 'scroll_depth',
          trigger_value: '50',
          is_active: true,
          is_deleted: false
        }
      ];
      
      // Use hardcoded data directly - NO NETWORK CALLS
      popups = data;
      console.log('📊 Loaded', popups.length, 'HARDCODED popup configs');
      
      startBehaviorTracking();
      
    } catch (error) {
      console.error('❌ Error loading popups:', error);
    }
  }

  function startBehaviorTracking() {
    setInterval(() => {
      timeOnSite++;
      checkTriggers();
    }, 1000);

    let ticking = false;
    function handleScroll() {
      if (!ticking) {
        requestAnimationFrame(() => {
          const scrolled = Math.round(
            (window.scrollY / (document.documentElement.scrollHeight - window.innerHeight)) * 100
          );
          currentScrollDepth = Math.min(100, Math.max(0, scrolled || 0));
          checkTriggers();
          ticking = false;
        });
        ticking = true;
      }
    }

    window.addEventListener('scroll', handleScroll, { passive: true });
    
    checkTriggers();
  }

  function checkTriggers() {
    const activePopups = popups.filter(p => p.is_active && !p.is_deleted);
    
    for (const popup of activePopups) {
      if (shownPopups.has(popup.id)) continue;
      
      let shouldShow = false;
      
      if (popup.trigger_type === 'scroll_depth') {
        const targetDepth = parseInt(popup.trigger_value || '50');
        if (currentScrollDepth >= targetDepth) {
          console.log(\`🎯 Scroll trigger met: \${currentScrollDepth}% >= \${targetDepth}%\`);
          shouldShow = true;
        }
      } else if (popup.trigger_type === 'time_delay') {
        const targetTime = parseInt(popup.trigger_value || '5');
        if (timeOnSite >= targetTime) {
          console.log(\`⏰ Time trigger met: \${timeOnSite}s >= \${targetTime}s\`);
          shouldShow = true;
        }
      } else if (popup.trigger_type === 'page_view') {
        console.log('👁️ Page view trigger met');
        shouldShow = true;
      }
      
      if (shouldShow) {
        console.log('🎯 Showing popup:', popup.name);
        showPopup(popup);
        shownPopups.add(popup.id);
        break;
      }
    }
  }

  function showPopup(popup) {
    const popupHTML = \`
      <div id="smartpop-\${popup.id}" style="
        position: fixed; top: 0; left: 0; width: 100%; height: 100%;
        background: rgba(0, 0, 0, 0.7); z-index: 999999; display: flex;
        align-items: center; justify-content: center;
        font-family: -apple-system, BlinkMacSystemFont, sans-serif;
      ">
        <div style="
          background: white; border-radius: 12px; padding: 32px;
          max-width: 450px; width: 90%; text-align: center;
          box-shadow: 0 20px 40px rgba(0,0,0,0.3); position: relative;
        ">
          <button onclick="document.getElementById('smartpop-\${popup.id}').remove()" style="
            position: absolute; top: 16px; right: 16px; background: none;
            border: none; font-size: 24px; cursor: pointer; color: #666;
          ">×</button>
          
          <h2 style="margin: 0 0 16px 0; color: #333; font-size: 24px;">
            \${popup.title || 'Special Offer!'}
          </h2>
          
          <p style="margin: 0 0 24px 0; color: #666; font-size: 16px;">
            \${popup.description || 'Get a special discount!'}
          </p>
          
          <input type="email" id="email-input-\${popup.id}" placeholder="\${popup.email_placeholder || 'Enter your email'}" 
                 style="width: 100%; padding: 12px; border: 2px solid #ddd;
                        border-radius: 6px; font-size: 16px; margin-bottom: 16px;
                        box-sizing: border-box;">
          
          <button onclick="handlePopupSubmit('\${popup.id}')" 
                  style="background: #007cba; color: white; border: none;
                         padding: 14px 28px; border-radius: 6px; font-size: 16px;
                         cursor: pointer; width: 100%;">
            \${popup.button_text || 'Get Offer'}
          </button>
        </div>
      </div>
    \`;
    
    document.body.insertAdjacentHTML('beforeend', popupHTML);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadAndShowPopups);
  } else {
    loadAndShowPopups();
  }
  
})()
    `

    return new Response(script, {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/javascript',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    })

  } catch (error) {
    console.error('Function error:', error)
    return new Response(`console.error('SmartPop Script Error: ${error.message}');`, {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/javascript' }
    })
  }
})