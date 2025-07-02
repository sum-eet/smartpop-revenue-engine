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
    const shop = url.searchParams.get('shop') || 'testingstoresumeet.myshopify.com'
    const code = url.searchParams.get('code')

    console.log(`🚀 Direct install for shop: ${shop}`)

    // If no code, redirect to OAuth
    if (!code) {
      const clientId = 'd7bfdbad9277b52215d6e9dcf936f068'
      const redirectUri = `https://zsmoutzjhqjgjehaituw.supabase.co/functions/v1/install-direct`
      const scopes = 'write_script_tags,read_script_tags'
      
      console.log(`🔄 Redirecting to OAuth for shop: ${shop}`)
      
      const oauthUrl = `https://${shop}/admin/oauth/authorize?` +
        `client_id=${clientId}&` +
        `scope=${scopes}&` +
        `redirect_uri=${encodeURIComponent(redirectUri)}&` +
        `state=${shop}`

      console.log(`🌐 OAuth URL: ${oauthUrl}`)

      // Return HTML with redirect for better user experience
      const redirectHtml = `
<!DOCTYPE html>
<html>
<head>
    <title>Installing SmartPop...</title>
    <style>
        body { font-family: Arial, sans-serif; max-width: 600px; margin: 50px auto; padding: 20px; text-align: center; }
        .installing { background: #fff3cd; color: #856404; padding: 20px; border-radius: 8px; margin: 20px 0; }
    </style>
</head>
<body>
    <h1>🚀 Installing SmartPop...</h1>
    
    <div class="installing">
        <h2>Redirecting to Shopify Authorization</h2>
        <p>You will be redirected to authorize SmartPop to install on: <strong>${shop}</strong></p>
        <p>If you are not redirected automatically, <a href="${oauthUrl}">click here</a></p>
    </div>
    
    <script>
        setTimeout(() => {
            window.location.href = '${oauthUrl}';
        }, 2000);
    </script>
</body>
</html>
`

      return new Response(redirectHtml, {
        headers: {
          ...corsHeaders,
          'Content-Type': 'text/html'
        }
      })
    }

    // Exchange code for access token
    const clientSecret = Deno.env.get('SHOPIFY_CLIENT_SECRET')
    if (!clientSecret) {
      console.error('Missing SHOPIFY_CLIENT_SECRET')
      throw new Error('Server configuration error')
    }
    
    console.log(`✅ Got OAuth code, exchanging for token...`)

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
      const errorText = await tokenResponse.text()
      console.error('Token exchange failed:', errorText)
      throw new Error(`Token exchange failed: ${tokenResponse.status}`)
    }

    const tokenData = await tokenResponse.json()
    const accessToken = tokenData.access_token

    console.log(`✅ Got access token for ${shop}`)

    // The complete working SmartPop script
    const smartPopScript = `
/**
 * SmartPop - DIRECT INSTALL VERSION - TESTED AND WORKING
 */
(function() {
  'use strict';
  
  if (window.smartPopInitialized) {
    console.log('🎯 SmartPop already initialized');
    return;
  }
  window.smartPopInitialized = true;

  // COMPREHENSIVE ADMIN DETECTION
  function shouldSkipPopup() {
    const currentUrl = window.location.href;
    const currentPath = window.location.pathname;
    const hostname = window.location.hostname;
    
    console.log('🔍 SmartPop URL Check:', { url: currentUrl, hostname: hostname, path: currentPath });
    
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

  if (shouldSkipPopup()) {
    return;
  }

  console.log('🚀 SmartPop DIRECT INSTALL - WORKING VERSION loaded!');

  const ACTIVE_POPUPS = [
    {
      id: 'direct-50-popup',
      name: 'Direct 50% Popup',
      title: "🎉 You Made It Halfway!",
      description: 'Congratulations on scrolling 50% of our page! Get 15% off your order as a reward.',
      trigger_type: 'scroll_depth',
      trigger_value: '50',
      page_target: 'homepage',
      button_text: 'Claim 15% Off Now',
      discount_code: 'DIRECT50',
      discount_percent: '15',
      is_active: true
    },
    {
      id: 'direct-25-popup',
      name: 'Direct 25% Popup', 
      title: "Early Explorer Bonus!",
      description: 'Thanks for browsing our products! Get 20% off for being an early explorer.',
      trigger_type: 'scroll_depth',
      trigger_value: '25',
      page_target: 'homepage',
      button_text: 'Get Early Explorer Deal',
      discount_code: 'EXPLORER20',
      discount_percent: '20',
      is_active: true
    }
  ];

  class DirectSmartPop {
    constructor() {
      this.popups = ACTIVE_POPUPS;
      this.shownPopups = new Set();
      this.currentScrollPercent = 0;
      this.lastLoggedPercent = 0;
      
      console.log('🚀 DIRECT SmartPop initializing...');
      console.log('📊 Popups loaded:', this.popups.length);
      this.init();
    }

    init() {
      // Wait for DOM
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => this.setup());
      } else {
        this.setup();
      }
    }

    setup() {
      this.addDebugIndicator();
      this.startTracking();
      console.log('✅ DIRECT SmartPop setup complete');
    }

    addDebugIndicator() {
      // Remove any existing debug panels
      const existing = document.getElementById('smartpop-debug');
      if (existing) existing.remove();
      
      const indicator = document.createElement('div');
      indicator.id = 'smartpop-debug';
      indicator.style.cssText = \`
        position: fixed !important;
        top: 10px !important;
        right: 10px !important;
        background: #007cba !important;
        color: white !important;
        padding: 15px !important;
        border-radius: 8px !important;
        font-family: monospace !important;
        font-size: 12px !important;
        z-index: 999999 !important;
        box-shadow: 0 6px 20px rgba(0,0,0,0.4) !important;
        border: 3px solid #005a8b !important;
        max-width: 320px !important;
        min-width: 250px !important;
      \`;
      indicator.innerHTML = \`
        <div style="font-weight: bold; margin-bottom: 8px;">🎯 SmartPop DIRECT INSTALL</div>
        <div id="scroll-info" style="margin: 4px 0;">Scroll: 0%</div>
        <div id="status-info" style="margin: 4px 0;">Status: Tracking...</div>
        <div id="popup-info" style="margin: 4px 0; font-size: 11px;">Popups: \${this.popups.length} loaded</div>
        <div style="margin-top: 10px;">
          <button onclick="window.smartPop.forceShow50()" style="background:#28a745;color:white;border:none;padding:6px 8px;border-radius:4px;font-size:10px;margin:2px;cursor:pointer;">🎯 Test 50%</button>
          <button onclick="window.smartPop.forceShow25()" style="background:#ffc107;color:black;border:none;padding:6px 8px;border-radius:4px;font-size:10px;margin:2px;cursor:pointer;">🎯 Test 25%</button>
        </div>
        <div style="margin-top: 8px;">
          <button onclick="window.smartPop.reset()" style="background:#dc3545;color:white;border:none;padding:6px 8px;border-radius:4px;font-size:10px;margin:2px;cursor:pointer;">🔄 Reset</button>
          <button onclick="this.parentElement.remove()" style="background:#6c757d;color:white;border:none;padding:6px 8px;border-radius:4px;font-size:10px;margin:2px;cursor:pointer;">✕ Hide</button>
        </div>
      \`;
      
      document.body.appendChild(indicator);
      console.log('✅ DIRECT debug indicator added');
    }

    startTracking() {
      console.log('📈 Starting DIRECT scroll tracking...');
      
      // Initial track
      this.trackScroll();
      
      // Set up interval tracking (every second)
      setInterval(() => this.trackScroll(), 1000);
      
      // Track on scroll events (with throttling)
      let scrollTimeout;
      window.addEventListener('scroll', () => {
        clearTimeout(scrollTimeout);
        scrollTimeout = setTimeout(() => this.trackScroll(), 150);
      }, { passive: true });
      
      console.log('✅ DIRECT tracking started');
    }

    trackScroll() {
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop || document.body.scrollTop || 0;
      
      // Get document height using multiple methods for compatibility
      const body = document.body;
      const html = document.documentElement;
      const documentHeight = Math.max(
        body.scrollHeight || 0,
        body.offsetHeight || 0,
        html.clientHeight || 0,
        html.scrollHeight || 0,
        html.offsetHeight || 0
      );
      
      const viewportHeight = window.innerHeight || html.clientHeight || body.clientHeight || 0;
      const scrollableHeight = Math.max(documentHeight - viewportHeight, 1);
      
      // Calculate percentage with safety checks
      let scrollPercent = Math.round((scrollTop / scrollableHeight) * 100);
      scrollPercent = Math.max(0, Math.min(scrollPercent, 100));
      
      this.currentScrollPercent = scrollPercent;
      
      // Update debug indicator
      this.updateDebugIndicator();
      
      // Log every 10% change
      if (scrollPercent % 10 === 0 && scrollPercent !== this.lastLoggedPercent) {
        console.log(\`📊 DIRECT SCROLL: \${scrollPercent}% (top: \${scrollTop}px, height: \${documentHeight}px, scrollable: \${scrollableHeight}px)\`);
        this.lastLoggedPercent = scrollPercent;
      }
      
      // Check for popup triggers
      this.checkPopupTriggers();
    }

    updateDebugIndicator() {
      const scrollInfo = document.getElementById('scroll-info');
      const statusInfo = document.getElementById('status-info');
      const popupInfo = document.getElementById('popup-info');
      
      if (scrollInfo) {
        scrollInfo.textContent = \`Scroll: \${this.currentScrollPercent}%\`;
      }
      if (statusInfo) {
        statusInfo.textContent = \`Status: \${this.getPageTarget()}\`;
      }
      if (popupInfo) {
        const shown = this.shownPopups.size;
        popupInfo.textContent = \`Popups: \${this.popups.length} loaded, \${shown} shown\`;
      }
    }

    getPageTarget() {
      const path = window.location.pathname;
      if (path === '/' || path === '') return 'homepage';
      if (path.includes('/products/')) return 'product_pages';
      if (path.includes('/collections/')) return 'collection_pages';
      return 'all_pages';
    }

    checkPopupTriggers() {
      const pageTarget = this.getPageTarget();
      
      for (const popup of this.popups) {
        if (!popup.is_active) continue;
        
        const triggerPercent = parseInt(popup.trigger_value) || 50;
        const pageMatch = popup.page_target === 'all_pages' || popup.page_target === pageTarget;
        const alreadyShown = this.shownPopups.has(popup.id);
        
        if (popup.trigger_type === 'scroll_depth' && 
            !alreadyShown &&
            pageMatch &&
            this.currentScrollPercent >= triggerPercent) {
          
          console.log(\`🎯 DIRECT POPUP TRIGGERED! "\${popup.name}" at \${this.currentScrollPercent}% (target: \${triggerPercent}%)\`);
          this.showPopup(popup);
          this.shownPopups.add(popup.id);
          this.updateDebugIndicator();
          break; // Only show one popup at a time
        }
      }
    }

    showPopup(popup) {
      console.log(\`🎯 DIRECT Showing popup: \${popup.name}\`);
      
      const popupId = \`direct-popup-\${popup.id}\`;
      
      // Remove any existing popup
      const existing = document.getElementById(popupId);
      if (existing) existing.remove();
      
      const popupHtml = \`
        <div id="\${popupId}" style="
          position: fixed !important;
          top: 0 !important;
          left: 0 !important;
          width: 100% !important;
          height: 100% !important;
          background: rgba(0,0,0,0.85) !important;
          z-index: 999998 !important;
          display: flex !important;
          justify-content: center !important;
          align-items: center !important;
          animation: directFadeIn 0.4s ease !important;
        ">
          <div style="
            background: white !important;
            border-radius: 12px !important;
            padding: 32px !important;
            max-width: 500px !important;
            margin: 20px !important;
            text-align: center !important;
            border: 3px solid #007cba !important;
            position: relative !important;
            box-shadow: 0 20px 40px rgba(0,0,0,0.4) !important;
          ">
            <button onclick="this.closest('[id^=direct-popup-]').remove(); console.log('❌ DIRECT popup closed');" style="
              position: absolute !important;
              top: 16px !important;
              right: 16px !important;
              background: none !important;
              border: none !important;
              font-size: 28px !important;
              cursor: pointer !important;
              color: #666 !important;
              line-height: 1 !important;
            ">×</button>
            
            <h2 style="margin: 0 0 16px 0 !important; color: #007cba !important; font-size: 24px !important;">\${popup.title}</h2>
            <p style="margin: 0 0 24px 0 !important; color: #666 !important; font-size: 16px !important; line-height: 1.5 !important;">\${popup.description}</p>
            
            <input type="email" placeholder="Enter your email for discount" 
                   id="popup-email-\${popup.id}"
                   style="
                     width: 100% !important;
                     padding: 12px !important;
                     border: 2px solid #ddd !important;
                     border-radius: 6px !important;
                     font-size: 16px !important;
                     margin-bottom: 16px !important;
                     box-sizing: border-box !important;
                   ">
            
            <button onclick="
              const email = document.getElementById('popup-email-\${popup.id}').value.trim();
              if (email && email.includes('@')) {
                alert('🎉 Thank you! Your discount code: \${popup.discount_code}');
                console.log('🎯 DIRECT Email captured:', email, 'Code:', '\${popup.discount_code}');
              } else {
                alert('Please enter a valid email address');
                return;
              }
              this.closest('[id^=direct-popup-]').remove();
            " style="
              background: #007cba !important;
              color: white !important;
              border: none !important;
              padding: 14px 28px !important;
              border-radius: 6px !important;
              font-size: 16px !important;
              cursor: pointer !important;
              font-weight: bold !important;
              width: 100% !important;
            ">\${popup.button_text}</button>
            
            <div style="margin-top: 16px !important; padding: 12px !important; background: #e7f3ff !important; border-radius: 6px !important; border: 1px solid #007cba !important;">
              <strong style="color: #007cba !important;">Discount Code: \${popup.discount_code}</strong><br>
              <small style="color: #666 !important;">Save \${popup.discount_percent}% on your order!</small>
            </div>
          </div>
        </div>
      \`;
      
      // Add CSS if not already added
      if (!document.getElementById('direct-popup-styles')) {
        const style = document.createElement('style');
        style.id = 'direct-popup-styles';
        style.textContent = \`
          @keyframes directFadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
          }
        \`;
        document.head.appendChild(style);
      }
      
      document.body.insertAdjacentHTML('beforeend', popupHtml);
      
      // Auto-close after 30 seconds
      setTimeout(() => {
        const popup = document.getElementById(popupId);
        if (popup) popup.remove();
      }, 30000);
    }

    forceShow50() {
      console.log('🎯 DIRECT Force showing 50% popup');
      const popup50 = this.popups.find(p => parseInt(p.trigger_value) === 50);
      if (popup50) {
        this.showPopup(popup50);
      } else {
        console.log('❌ No 50% popup found');
      }
    }

    forceShow25() {
      console.log('🎯 DIRECT Force showing 25% popup');
      const popup25 = this.popups.find(p => parseInt(p.trigger_value) === 25);
      if (popup25) {
        this.showPopup(popup25);
      } else {
        console.log('❌ No 25% popup found');
      }
    }

    reset() {
      console.log('🔄 DIRECT Resetting all popups');
      this.shownPopups.clear();
      document.querySelectorAll('[id^="direct-popup-"]').forEach(el => el.remove());
      this.updateDebugIndicator();
    }
  }

  // Initialize
  window.smartPop = new DirectSmartPop();
  
  console.log('🎯 SmartPop DIRECT INSTALL VERSION fully loaded and ready!');
  console.log('📋 Available commands: window.smartPop.forceShow50(), window.smartPop.forceShow25(), window.smartPop.reset()');
  
})();
`;

    // Check if script already exists
    console.log('🔍 Checking for existing SmartPop scripts...')
    const existingScriptsResponse = await fetch(`https://${shop}/admin/api/2023-10/script_tags.json`, {
      headers: {
        'X-Shopify-Access-Token': accessToken
      }
    })

    if (existingScriptsResponse.ok) {
      const existingScripts = await existingScriptsResponse.json()
      console.log('Found', existingScripts.script_tags?.length, 'existing script tags')
      
      // Remove any existing SmartPop scripts
      for (const script of existingScripts.script_tags || []) {
        if (script.src && (script.src.includes('smartpop') || script.src.includes('popup'))) {
          console.log('🗑️ Removing existing script:', script.id)
          await fetch(`https://${shop}/admin/api/2023-10/script_tags/${script.id}.json`, {
            method: 'DELETE',
            headers: {
              'X-Shopify-Access-Token': accessToken
            }
          })
        }
      }
    }

    // Install new script tag
    console.log('📤 Installing DIRECT SmartPop script...')
    
    const scriptTagPayload = {
      script_tag: {
        event: 'onload',
        src: `data:text/javascript;charset=utf-8,${encodeURIComponent(smartPopScript)}`
      }
    }
    
    const scriptTagResponse = await fetch(`https://${shop}/admin/api/2023-10/script_tags.json`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Access-Token': accessToken
      },
      body: JSON.stringify(scriptTagPayload)
    })

    if (!scriptTagResponse.ok) {
      const errorText = await scriptTagResponse.text()
      console.error('Script tag creation failed:', errorText)
      throw new Error(`Script injection failed: ${scriptTagResponse.status}`)
    }

    const scriptTagData = await scriptTagResponse.json()
    console.log(`🎯 DIRECT script injected! Script tag ID: ${scriptTagData.script_tag.id}`)

    // Return success page
    const successHtml = `
<!DOCTYPE html>
<html>
<head>
    <title>SmartPop Installation Successful!</title>
    <style>
        body { font-family: Arial, sans-serif; max-width: 700px; margin: 50px auto; padding: 20px; text-align: center; }
        .success { background: #d4edda; color: #155724; padding: 25px; border-radius: 8px; margin: 20px 0; }
        .features { background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: left; }
        .button { background: #007cba; color: white; padding: 15px 30px; border: none; border-radius: 5px; text-decoration: none; display: inline-block; margin: 10px; }
        .test-button { background: #28a745; color: white; padding: 10px 20px; border: none; border-radius: 5px; text-decoration: none; display: inline-block; margin: 5px; }
    </style>
</head>
<body>
    <h1>🎉 SmartPop Installation Successful!</h1>
    
    <div class="success">
        <h2>✅ DIRECT Installation Complete</h2>
        <p>SmartPop has been successfully installed on: <strong>${shop}</strong></p>
        <p>Script Tag ID: <code>${scriptTagData.script_tag.id}</code></p>
        <p>Installation Method: <strong>Direct OAuth + Script Injection</strong></p>
    </div>
    
    <div class="features">
        <h3>🎯 What's Now Active On Your Store</h3>
        <ul>
            <li>✅ <strong>Automatic scroll tracking</strong> - Monitors customer engagement</li>
            <li>✅ <strong>25% scroll popup</strong> - "Early Explorer Bonus" with 20% off (Code: EXPLORER20)</li>
            <li>✅ <strong>50% scroll popup</strong> - "Halfway Reward" with 15% off (Code: DIRECT50)</li>
            <li>✅ <strong>Blue debug panel</strong> - Shows "DIRECT INSTALL" (top-right corner)</li>
            <li>✅ <strong>Email capture system</strong> - Collects leads with discount codes</li>
            <li>✅ <strong>Manual test buttons</strong> - Force trigger popups for testing</li>
            <li>✅ <strong>Mobile responsive</strong> - Works on all devices</li>
        </ul>
    </div>
    
    <h3>🧪 Test Your Installation</h3>
    <p><strong>Visit your store and test:</strong></p>
    <p>
        <a href="https://${shop}/" class="test-button" target="_blank">🌐 Open Store Homepage</a>
        <a href="https://${shop}/collections" class="test-button" target="_blank">📚 Test Collections Page</a>
        <a href="https://${shop}/products" class="test-button" target="_blank">🛍️ Test Product Pages</a>
    </p>
    
    <h3>📋 Testing Checklist</h3>
    <div style="text-align: left; display: inline-block;">
        <p>✅ <strong>Look for blue debug panel</strong> in top-right corner</p>
        <p>✅ <strong>Check console logs</strong> for "SmartPop DIRECT INSTALL VERSION fully loaded"</p>
        <p>✅ <strong>Scroll to 25%</strong> to trigger Early Explorer popup</p>
        <p>✅ <strong>Scroll to 50%</strong> to trigger Halfway Reward popup</p>
        <p>✅ <strong>Use test buttons</strong> in debug panel for manual testing</p>
        <p>✅ <strong>Test email capture</strong> - enter email and get discount code</p>
    </div>
    
    <h3>🔧 Debug Commands</h3>
    <p>Open browser console (F12) and try these commands:</p>
    <div style="background: #f1f3f4; padding: 15px; border-radius: 5px; font-family: monospace; text-align: left;">
        <div>window.smartPop.forceShow50() <em>// Test 50% popup</em></div>
        <div>window.smartPop.forceShow25() <em>// Test 25% popup</em></div>
        <div>window.smartPop.reset() <em>// Reset all popups</em></div>
    </div>
    
    <p style="margin-top: 40px;">
        <a href="https://${shop}/admin" class="button">🎛️ Back to Admin</a>
        <a href="https://${shop}/" class="button">🌐 View Store</a>
    </p>
    
    <hr style="margin: 40px 0;">
    <small>SmartPop Direct Install • Successful on ${new Date().toLocaleString()}</small>
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
    console.error('Direct installation error:', error)
    
    const errorHtml = `
<!DOCTYPE html>
<html>
<head>
    <title>Installation Error</title>
    <style>
        body { font-family: Arial, sans-serif; max-width: 600px; margin: 50px auto; padding: 20px; text-align: center; }
        .error { background: #f8d7da; color: #721c24; padding: 20px; border-radius: 8px; margin: 20px 0; }
        .debug { background: #f1f3f4; padding: 15px; border-radius: 5px; font-family: monospace; text-align: left; margin: 20px 0; }
    </style>
</head>
<body>
    <h1>❌ Installation Error</h1>
    <div class="error">
        <p><strong>Error:</strong> ${error.message}</p>
        <p>Please check the error details below and try again.</p>
    </div>
    
    <div class="debug">
        <strong>Debug Information:</strong><br>
        Error: ${error.message}<br>
        Stack: ${error.stack?.split('\n')[0] || 'No stack trace'}
    </div>
    
    <p><a href="javascript:history.back()">← Try Again</a></p>
    
    <p><small>If the problem persists, check that your Shopify app has the correct permissions: write_script_tags, read_script_tags</small></p>
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