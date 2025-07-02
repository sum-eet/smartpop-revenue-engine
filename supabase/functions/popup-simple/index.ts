import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method === 'GET') {
    try {
    const url = new URL(req.url)
    const shop = url.searchParams.get('shop') || 'testingstoresumeet.myshopify.com'
    const code = url.searchParams.get('code')
    
    console.log(`🚀 SmartPop install request: shop=${shop}, code=${code ? 'present' : 'missing'}`)
    
    // If no code, redirect to OAuth
    if (!code) {
      const clientId = 'd7bfdbad9277b52215d6e9dcf936f068'
      const redirectUri = `https://zsmoutzjhqjgjehaituw.supabase.co/functions/v1/popup-simple`
      const scopes = 'write_script_tags,read_script_tags'
      
      console.log(`🔄 Redirecting to OAuth for shop: ${shop}`)
      
      const oauthUrl = `https://${shop}/admin/oauth/authorize?` +
        `client_id=${clientId}&` +
        `scope=${scopes}&` +
        `redirect_uri=${encodeURIComponent(redirectUri)}&` +
        `state=${shop}`

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
        <p>Installing on: <strong>${shop}</strong></p>
        <p>If not redirected: <a href="${oauthUrl}">Click here</a></p>
    </div>
    <script>setTimeout(() => window.location.href = '${oauthUrl}', 2000);</script>
</body>
</html>`

      return new Response(redirectHtml, {
        headers: { ...corsHeaders, 'Content-Type': 'text/html' }
      })
    }

    // Exchange code for access token
    const clientSecret = Deno.env.get('SHOPIFY_CLIENT_SECRET') || 'temp_secret'
    
    console.log(`✅ Exchanging OAuth code for access token...`)

    const tokenResponse = await fetch(`https://${shop}/admin/oauth/access_token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: 'd7bfdbad9277b52215d6e9dcf936f068',
        client_secret: clientSecret,
        code: code
      })
    })

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text()
      console.error('Token exchange failed:', errorText)
      throw new Error(`OAuth failed: ${tokenResponse.status}`)
    }

    const tokenData = await tokenResponse.json()
    const accessToken = tokenData.access_token

    console.log(`✅ Got access token for ${shop}`)

    // The working SmartPop script - NO MORE FUCKING AROUND
    const smartPopScript = `
(function() {
  'use strict';
  if (window.smartPopInitialized) return;
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
  
  console.log('🚀 SmartPop WORKING VERSION - Customer Store Page Detected:', currentPath);

  const POPUPS = [
    {
      id: 'popup-simple-50',
      name: '50% Scroll Popup',
      title: "🎉 You're Halfway There!",
      description: 'Get 15% off for exploring our products!',
      trigger_type: 'scroll_depth',
      trigger_value: '50',
      page_target: 'homepage',
      button_text: 'Claim 15% Off',
      discount_code: 'POPUP50',
      discount_percent: '15',
      is_active: true
    }
  ];

  class PopupSimpleTracker {
    constructor() {
      this.popups = POPUPS;
      this.shownPopups = new Set();
      this.currentScrollPercent = 0;
      this.init();
    }

    init() {
      this.addDebugIndicator();
      this.startTracking();
    }

    addDebugIndicator() {
      const indicator = document.createElement('div');
      indicator.id = 'smartpop-debug';
      indicator.style.cssText = \`
        position: fixed !important;
        top: 10px !important;
        right: 10px !important;
        background: #dc3545 !important;
        color: white !important;
        padding: 15px !important;
        border-radius: 8px !important;
        font-family: monospace !important;
        font-size: 12px !important;
        z-index: 999999 !important;
        box-shadow: 0 6px 20px rgba(0,0,0,0.4) !important;
        border: 2px solid #bd2130 !important;
      \`;
      indicator.innerHTML = \`
        <div><strong>🔥 SmartPop DEPLOYED!</strong></div>
        <div id="scroll-info">Scroll: 0%</div>
        <div>Status: Tracking...</div>
        <button onclick="window.smartPop.forceShow50()" style="background:#ffc107;color:black;border:none;padding:6px 10px;border-radius:4px;font-size:11px;margin-top:8px;cursor:pointer;">🎯 Test 50%</button>
      \`;
      document.body.appendChild(indicator);
    }

    startTracking() {
      setInterval(() => this.trackScroll(), 1000);
      window.addEventListener('scroll', () => this.trackScroll(), { passive: true });
    }

    trackScroll() {
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
      const documentHeight = Math.max(document.body.scrollHeight, document.documentElement.scrollHeight);
      const viewportHeight = window.innerHeight;
      const scrollableHeight = Math.max(documentHeight - viewportHeight, 1);
      const scrollPercent = Math.round((scrollTop / scrollableHeight) * 100);
      
      this.currentScrollPercent = Math.min(Math.max(scrollPercent, 0), 100);
      
      const scrollInfo = document.getElementById('scroll-info');
      if (scrollInfo) scrollInfo.textContent = \`Scroll: \${this.currentScrollPercent}%\`;
      
      // Check for popup trigger
      const path = window.location.pathname;
      const isHomepage = path === '/' || path === '';
      
      if (this.currentScrollPercent >= 50 && !this.shownPopups.has('popup-simple-50') && isHomepage) {
        console.log('🎯 POPUP-SIMPLE 50% TRIGGERED!');
        this.showPopup(this.popups[0]);
        this.shownPopups.add('popup-simple-50');
      }
    }

    showPopup(popup) {
      const popupHtml = \`
        <div id="popup-simple-overlay" style="position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.8);z-index:999999;display:flex;justify-content:center;align-items:center;">
          <div style="background:white;border-radius:12px;padding:32px;max-width:500px;margin:20px;text-align:center;border:3px solid #dc3545;">
            <button onclick="this.closest('#popup-simple-overlay').remove()" style="position:absolute;top:16px;right:16px;background:none;border:none;font-size:24px;cursor:pointer;">×</button>
            <h2 style="margin:0 0 16px 0;color:#dc3545;">\${popup.title}</h2>
            <p style="margin:0 0 24px 0;color:#666;">\${popup.description}</p>
            <input type="email" placeholder="Enter your email" style="width:100%;padding:12px;border:2px solid #ddd;border-radius:6px;margin-bottom:16px;box-sizing:border-box;">
            <button onclick="alert('Thank you! Code: \${popup.discount_code}'); this.closest('#popup-simple-overlay').remove();" style="background:#dc3545;color:white;border:none;padding:14px 28px;border-radius:6px;font-size:16px;cursor:pointer;font-weight:bold;width:100%;">\${popup.button_text}</button>
            <div style="margin-top:16px;padding:12px;background:#f8d7da;border-radius:6px;"><strong>Code: \${popup.discount_code}</strong><br><small>Save \${popup.discount_percent}%!</small></div>
          </div>
        </div>
      \`;
      document.body.insertAdjacentHTML('beforeend', popupHtml);
    }

    forceShow50() {
      this.showPopup(this.popups[0]);
    }
  }

  window.smartPop = new PopupSimpleTracker();
  console.log('🎯 SmartPop DEPLOYED AND READY!');
})();
`;

    // Install script
    console.log('📤 Installing SmartPop script...')
    
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
      console.error('Script injection failed:', errorText)
      throw new Error(`Script injection failed: ${scriptTagResponse.status}`)
    }

    const scriptTagData = await scriptTagResponse.json()
    console.log(`🎯 Script injected! ID: ${scriptTagData.script_tag.id}`)

    const successHtml = `
<!DOCTYPE html>
<html>
<head>
    <title>SmartPop Installed!</title>
    <style>
        body { font-family: Arial, sans-serif; max-width: 600px; margin: 50px auto; padding: 20px; text-align: center; }
        .success { background: #d4edda; color: #155724; padding: 20px; border-radius: 8px; margin: 20px 0; }
    </style>
</head>
<body>
    <h1>🎉 SmartPop FINALLY DEPLOYED!</h1>
    <div class="success">
        <h2>✅ NO MORE BULLSHIT - IT'S WORKING!</h2>
        <p>SmartPop is now active on: <strong>${shop}</strong></p>
        <p>Script Tag ID: <code>${scriptTagData.script_tag.id}</code></p>
    </div>
    <h3>🧪 Test Your Installation</h3>
    <p>1. Visit: <a href="https://${shop}/" target="_blank">https://${shop}/</a></p>
    <p>2. Look for RED debug panel (top-right)</p>
    <p>3. Scroll to 50% or click "Test 50%" button</p>
    <p><a href="https://${shop}/" style="background:#dc3545;color:white;padding:15px 30px;border:none;border-radius:5px;text-decoration:none;">🌐 Visit Store</a></p>
</body>
</html>`

    return new Response(successHtml, {
      headers: { ...corsHeaders, 'Content-Type': 'text/html' }
    })

    } catch (error) {
      console.error('Error:', error)
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }
  }

  return new Response(JSON.stringify({ error: 'Method not allowed', allowed: ['GET', 'OPTIONS'] }), {
    status: 405,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  })
})