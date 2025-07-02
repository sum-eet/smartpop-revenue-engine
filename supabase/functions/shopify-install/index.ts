import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const url = new URL(req.url)
    const shop = url.searchParams.get('shop')
    const code = url.searchParams.get('code')

    if (!shop) {
      return new Response('Missing shop parameter', { 
        status: 400, 
        headers: corsHeaders 
      })
    }

    console.log(`🚀 Installing SmartPop for shop: ${shop}`)

    // If no code, redirect to OAuth
    if (!code) {
      const clientId = 'd7bfdbad9277b52215d6e9dcf936f068'
      const redirectUri = `https://zsmoutzjhqjgjehaituw.supabase.co/functions/v1/shopify-install`
      const scopes = 'write_script_tags,read_script_tags'
      
      console.log(`🔄 Redirecting to OAuth for shop: ${shop}`)
      console.log(`📍 Redirect URI: ${redirectUri}`)
      
      const oauthUrl = `https://${shop}/admin/oauth/authorize?` +
        `client_id=${clientId}&` +
        `scope=${scopes}&` +
        `redirect_uri=${encodeURIComponent(redirectUri)}&` +
        `state=${shop}`

      console.log(`🌐 OAuth URL: ${oauthUrl}`)

      return new Response('', {
        status: 302,
        headers: {
          ...corsHeaders,
          'Location': oauthUrl
        }
      })
    }

    // Exchange code for access token
    const clientSecret = Deno.env.get('SHOPIFY_CLIENT_SECRET')
    if (!clientSecret) {
      throw new Error('Missing SHOPIFY_CLIENT_SECRET environment variable')
    }

    const tokenResponse = await fetch(`https://${shop}/admin/oauth/access_token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        client_id: 'd7bfdbad9277b52215d6e9dcf936f068',
        client_secret: clientSecret,
        code: code
      })
    })

    if (!tokenResponse.ok) {
      throw new Error(`Token exchange failed: ${tokenResponse.status}`)
    }

    const tokenData = await tokenResponse.json()
    const accessToken = tokenData.access_token

    console.log(`✅ Got access token for ${shop}`)

    // Read the SmartPop script
    const scriptContent = await getSmartPopScript()

    // Inject script via Script Tags API
    const scriptTagResponse = await fetch(`https://${shop}/admin/api/2023-04/script_tags.json`, {
      method: 'POST',
      headers: {
        'X-Shopify-Access-Token': accessToken,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        script_tag: {
          event: 'onload',
          src: `data:text/javascript;charset=utf-8,${encodeURIComponent(scriptContent)}`
        }
      })
    })

    if (!scriptTagResponse.ok) {
      const errorText = await scriptTagResponse.text()
      console.error('Script tag creation failed:', errorText)
      throw new Error(`Script injection failed: ${scriptTagResponse.status}`)
    }

    const scriptTagData = await scriptTagResponse.json()
    console.log(`🎯 Script injected! Script tag ID: ${scriptTagData.script_tag.id}`)

    // Store installation data (optional - skip if not needed for now)
    console.log(`💾 Installation data: shop=${shop}, script_tag_id=${scriptTagData.script_tag.id}`)

    // Return success page
    const successHtml = `
<!DOCTYPE html>
<html>
<head>
    <title>SmartPop Installed Successfully!</title>
    <style>
        body { font-family: Arial, sans-serif; max-width: 600px; margin: 50px auto; padding: 20px; text-align: center; }
        .success { background: #d4edda; color: #155724; padding: 20px; border-radius: 8px; margin: 20px 0; }
        .button { background: #007cba; color: white; padding: 15px 30px; border: none; border-radius: 5px; text-decoration: none; display: inline-block; }
    </style>
</head>
<body>
    <h1>🎉 SmartPop Installed Successfully!</h1>
    
    <div class="success">
        <h2>✅ Installation Complete</h2>
        <p>SmartPop has been automatically installed on your store: <strong>${shop}</strong></p>
        <p>Script Tag ID: <code>${scriptTagData.script_tag.id}</code></p>
    </div>
    
    <h3>🧪 Test Your Installation</h3>
    <p>1. Visit your store homepage: <a href="https://${shop}/" target="_blank">https://${shop}/</a></p>
    <p>2. Look for the SmartPop debug panel in the top-right corner</p>
    <p>3. Scroll down to 50% to trigger the popup</p>
    
    <h3>📊 What's Now Active</h3>
    <ul style="text-align: left; display: inline-block;">
        <li>✅ Scroll tracking (every 1 second)</li>
        <li>✅ 25% scroll popup (Early Bird 20% off)</li>
        <li>✅ 50% scroll popup (Exit Intent 15% off)</li>
        <li>✅ Debug panel with test buttons</li>
        <li>✅ Email capture and discount codes</li>
    </ul>
    
    <p><a href="https://${shop}/admin" class="button">Back to Admin</a></p>
    
    <hr style="margin: 40px 0;">
    <small>SmartPop Revenue Engine • Installed on ${new Date().toLocaleString()}</small>
</body>
</html>
`

    return new Response(successHtml, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/html'
      }
    })

  } catch (error) {
    console.error('Installation error:', error)
    
    const errorHtml = `
<!DOCTYPE html>
<html>
<head>
    <title>SmartPop Installation Error</title>
    <style>
        body { font-family: Arial, sans-serif; max-width: 600px; margin: 50px auto; padding: 20px; text-align: center; }
        .error { background: #f8d7da; color: #721c24; padding: 20px; border-radius: 8px; margin: 20px 0; }
    </style>
</head>
<body>
    <h1>❌ Installation Error</h1>
    <div class="error">
        <p><strong>Error:</strong> ${error.message}</p>
        <p>Please try the installation again or contact support.</p>
    </div>
    <p><a href="javascript:history.back()">← Go Back</a></p>
</body>
</html>
`

    return new Response(errorHtml, {
      status: 500,
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/html'
      }
    })
  }
})

async function getSmartPopScript(): Promise<string> {
  // Return the complete SmartPop script with extensive logging
  return `
/**
 * SmartPop Scroll Tracker for Shopify Store - AUTO INJECTED
 * This script was automatically injected during app installation
 */

(function() {
  'use strict';
  
  // Prevent multiple initializations
  if (window.smartPopInitialized) {
    console.log('🎯 SmartPop already initialized');
    return;
  }
  window.smartPopInitialized = true;

  console.log('🚀 SmartPop AUTO-INJECTED - initializing for Shopify store...');

  // Configuration
  const SMARTPOP_CONFIG = {
    shop: window.location.hostname,
    debug: true,
    trackingInterval: 1000,
    sessionId: 'auto_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9)
  };

  // Active popups
  const ACTIVE_POPUPS = [
    {
      id: '4fae0cd6-7601-4aff-8eca-0601bedff71d',
      name: 'Scroll 50% Popup',
      title: "Wait! Don't Leave Empty Handed!",
      description: 'Get 15% off your first order when you scroll down and discover our products',
      trigger_type: 'scroll_depth',
      trigger_value: '50',
      page_target: 'homepage',
      popup_type: 'discount_offer',
      button_text: 'Claim 15% Off',
      email_placeholder: 'Enter email for discount',
      discount_code: 'SCROLL15',
      discount_percent: '15',
      is_active: true
    },
    {
      id: 'test-25-percent',
      name: 'Test 25% Popup',
      title: "Early Shopper Special!",
      description: 'Get 20% off for being an early browser - limited time offer!',
      trigger_type: 'scroll_depth',
      trigger_value: '25',
      page_target: 'homepage',
      popup_type: 'discount_offer',
      button_text: 'Get 20% Off Now',
      email_placeholder: 'Enter your email',
      discount_code: 'EARLY20',
      discount_percent: '20',
      is_active: true
    }
  ];

  class ShopifyScrollTracker {
    constructor() {
      this.config = SMARTPOP_CONFIG;
      this.popups = ACTIVE_POPUPS;
      this.maxScrollReached = 0;
      this.isTracking = false;
      this.trackingTimer = null;
      this.shownPopups = new Set();
      this.currentScrollPercent = 0;
      this.lastLoggedPercent = 0;
      
      this.log('🚀 AUTO-INJECTED SmartPop initializing...');
      this.log('📊 Session ID:', this.config.sessionId);
      this.log('🎯 Active popups:', this.popups.length);
      
      this.init();
    }

    log(...args) {
      if (this.config.debug) {
        console.log('[SmartPop-AUTO]', ...args);
      }
    }

    init() {
      // Wait for DOM to be ready
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => this.startTracking());
      } else {
        this.startTracking();
      }
      
      // Add debug indicator
      setTimeout(() => this.addDebugIndicator(), 1000);
    }

    addDebugIndicator() {
      if (!this.config.debug) return;
      
      const indicator = document.createElement('div');
      indicator.id = 'smartpop-debug';
      indicator.style.cssText = \`
        position: fixed;
        top: 10px;
        right: 10px;
        background: #28a745;
        color: white;
        padding: 15px;
        border-radius: 8px;
        font-family: monospace;
        font-size: 12px;
        z-index: 999999;
        max-width: 350px;
        box-shadow: 0 6px 20px rgba(0,0,0,0.4);
        border: 2px solid #1e7e34;
      \`;
      indicator.innerHTML = \`
        <div><strong>🎯 SmartPop AUTO-INJECTED</strong></div>
        <div id="smartpop-scroll-info">Scroll: 0%</div>
        <div id="smartpop-status">Initializing...</div>
        <div id="smartpop-popup-info">Popups: Loading...</div>
        <div style="margin-top: 8px;">
          <button onclick="window.smartPop.testPopup()" style="background:#007cba;color:white;border:none;padding:6px 10px;border-radius:4px;font-size:11px;margin:2px;cursor:pointer;">🧪 Test Popup</button>
          <button onclick="window.smartPop.reset()" style="background:#dc3545;color:white;border:none;padding:6px 10px;border-radius:4px;font-size:11px;margin:2px;cursor:pointer;">🔄 Reset</button>
        </div>
        <div style="margin-top: 8px;">
          <button onclick="window.smartPop.forceShow50()" style="background:#ff6b35;color:white;border:none;padding:6px 10px;border-radius:4px;font-size:11px;margin:2px;cursor:pointer;">🎯 Force 50%</button>
          <button onclick="window.smartPop.debugInfo()" style="background:#6f42c1;color:white;border:none;padding:6px 10px;border-radius:4px;font-size:11px;margin:2px;cursor:pointer;">🔍 Debug</button>
        </div>
      \`;
      document.body.appendChild(indicator);
      
      this.log('✅ AUTO-INJECTED Debug indicator added');
    }

    updateDebugIndicator(scrollPercent, status) {
      const scrollInfo = document.getElementById('smartpop-scroll-info');
      const statusInfo = document.getElementById('smartpop-status');
      const popupInfo = document.getElementById('smartpop-popup-info');
      
      if (scrollInfo) {
        scrollInfo.textContent = \`Scroll: \${scrollPercent}% (Max: \${this.maxScrollReached}%)\`;
      }
      if (statusInfo) {
        statusInfo.textContent = status || 'Tracking...';
      }
      if (popupInfo) {
        const activePopups = this.popups.filter(p => p.is_active).length;
        const shownCount = this.shownPopups.size;
        popupInfo.textContent = \`Popups: \${activePopups} active, \${shownCount} shown\`;
      }
    }

    startTracking() {
      this.log('📈 Starting AUTO-INJECTED Shopify tracking...');
      this.isTracking = true;
      
      // Initial track
      this.trackScroll();
      
      // Set up interval tracking
      this.trackingTimer = setInterval(() => {
        if (this.isTracking) {
          this.trackScroll();
        }
      }, this.config.trackingInterval);

      // Track on scroll events
      let scrollTimeout;
      window.addEventListener('scroll', () => {
        clearTimeout(scrollTimeout);
        scrollTimeout = setTimeout(() => {
          this.trackScroll();
        }, 200);
      }, { passive: true });

      this.updateDebugIndicator(0, 'AUTO-INJECTED Tracking active ✅');
    }

    getScrollData() {
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
      const body = document.body;
      const docElement = document.documentElement;
      
      const documentHeight = Math.max(
        body.scrollHeight || 0,
        body.offsetHeight || 0,
        body.clientHeight || 0,
        docElement.scrollHeight || 0,
        docElement.offsetHeight || 0,
        docElement.clientHeight || 0
      );
      
      const viewportHeight = window.innerHeight || docElement.clientHeight || body.clientHeight;
      const scrollableHeight = Math.max(documentHeight - viewportHeight, 1);
      
      let scrollPercent = Math.round((scrollTop / scrollableHeight) * 100);
      scrollPercent = Math.max(0, Math.min(scrollPercent, 100));
      
      this.currentScrollPercent = scrollPercent;
      this.maxScrollReached = Math.max(this.maxScrollReached, this.currentScrollPercent);
      
      // Log every 5%
      if (!this.lastLoggedPercent || Math.abs(scrollPercent - this.lastLoggedPercent) >= 5) {
        this.log(\`🔍 AUTO-INJECTED SCROLL: \${scrollPercent}% (scrollTop: \${scrollTop}px, height: \${documentHeight}px)\`);
        this.lastLoggedPercent = scrollPercent;
      }
      
      return {
        sessionId: this.config.sessionId,
        scrollPercent: this.currentScrollPercent,
        maxScrollReached: this.maxScrollReached,
        pageUrl: window.location.href,
        pageTarget: this.getPageTarget(),
        shop: this.config.shop
      };
    }

    getPageTarget() {
      const path = window.location.pathname;
      if (path === '/' || path === '') return 'homepage';
      if (path.includes('/products/')) return 'product_pages';
      if (path.includes('/collections/')) return 'collection_pages';
      return 'all_pages';
    }

    trackScroll() {
      const scrollData = this.getScrollData();
      this.updateDebugIndicator(scrollData.scrollPercent, \`Page: \${scrollData.pageTarget}\`);
      this.checkScrollTriggeredPopups(scrollData.scrollPercent, scrollData.pageTarget);
    }

    checkScrollTriggeredPopups(scrollPercent, pageTarget) {
      this.log(\`🔍 AUTO-INJECTED POPUP CHECK: \${scrollPercent}% on \${pageTarget}\`);
      
      for (const popup of this.popups) {
        const triggerPercent = parseInt(popup.trigger_value) || 50;
        const pageMatch = popup.page_target === 'all_pages' || popup.page_target === pageTarget;
        const alreadyShown = this.shownPopups.has(popup.id);
        
        this.log(\`📋 "\${popup.name}": trigger=\${triggerPercent}%, match=\${pageMatch}, shown=\${alreadyShown}\`);
        
        if (popup.trigger_type === 'scroll_depth' && 
            popup.is_active && 
            !alreadyShown &&
            pageMatch &&
            scrollPercent >= triggerPercent) {
          
          this.log(\`🎯 AUTO-INJECTED POPUP TRIGGERED! "\${popup.name}" at \${scrollPercent}%\`);
          this.showPopup(popup);
          this.shownPopups.add(popup.id);
          break;
        }
      }
    }

    showPopup(popup) {
      this.log(\`🎯 AUTO-INJECTED Showing popup: \${popup.name}\`);
      
      // Create popup (same as before but with AUTO-INJECTED logging)
      const popupHtml = \`
        <div id="smartpop-overlay-\${popup.id}" style="position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.7);z-index:999999;display:flex;justify-content:center;align-items:center;">
          <div style="background:white;border-radius:12px;padding:32px;max-width:500px;margin:20px;box-shadow:0 20px 40px rgba(0,0,0,0.3);text-align:center;position:relative;">
            <button onclick="this.closest('[id^=smartpop-overlay-]').remove()" style="position:absolute;top:16px;right:16px;background:none;border:none;font-size:24px;cursor:pointer;color:#666;">×</button>
            <h2 style="margin:0 0 16px 0;color:#333;font-size:24px;">\${popup.title}</h2>
            <p style="margin:0 0 24px 0;color:#666;font-size:16px;">\${popup.description}</p>
            <input type="email" placeholder="\${popup.email_placeholder}" style="width:100%;padding:12px;border:2px solid #ddd;border-radius:6px;font-size:16px;margin-bottom:16px;box-sizing:border-box;">
            <button onclick="alert('Thank you! Code: \${popup.discount_code}'); this.closest('[id^=smartpop-overlay-]').remove();" style="background:#007cba;color:white;border:none;padding:14px 28px;border-radius:6px;font-size:16px;cursor:pointer;font-weight:bold;width:100%;">\${popup.button_text}</button>
            <div style="margin-top:16px;padding:12px;background:#f0f8f0;border-radius:6px;"><strong>Code: \${popup.discount_code}</strong><br><small>Save \${popup.discount_percent}%!</small></div>
          </div>
        </div>
      \`;
      
      document.body.insertAdjacentHTML('beforeend', popupHtml);
    }

    // Test methods
    testPopup() {
      this.log('🧪 AUTO-INJECTED Manual popup test');
      const popup = this.popups[0];
      if (popup) this.showPopup(popup);
    }

    reset() {
      this.log('🔄 AUTO-INJECTED Resetting popups');
      this.shownPopups.clear();
      this.maxScrollReached = 0;
      document.querySelectorAll('[id^="smartpop-overlay-"]').forEach(el => el.remove());
    }

    forceShow50() {
      this.log('🎯 AUTO-INJECTED Force showing 50% popup');
      const popup50 = this.popups.find(p => parseInt(p.trigger_value) === 50);
      if (popup50) {
        this.showPopup(popup50);
        this.shownPopups.add(popup50.id);
      }
    }

    debugInfo() {
      this.log('🔍 AUTO-INJECTED DEBUG INFO:');
      console.table(this.popups.map(p => ({
        name: p.name,
        trigger: p.trigger_value + '%',
        active: p.is_active,
        page_target: p.page_target,
        shown: this.shownPopups.has(p.id)
      })));
    }
  }

  // Initialize
  window.smartPop = new ShopifyScrollTracker();
  window.testSmartPop = () => window.smartPop.testPopup();
  window.resetSmartPop = () => window.smartPop.reset();
  
  console.log('🎯 SmartPop AUTO-INJECTED and loaded!');
  
})();
`
}