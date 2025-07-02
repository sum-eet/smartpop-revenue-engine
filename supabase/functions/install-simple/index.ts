// Simple Shopify installation without authentication requirements

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Handler function
export default async function handler(req: Request) {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const url = new URL(req.url)
    const shop = url.searchParams.get('shop') || 'testingstoresumeet.myshopify.com'
    const code = url.searchParams.get('code')

    console.log(`🚀 Installing SmartPop for shop: ${shop}`)

    // If no code, redirect to OAuth
    if (!code) {
      const clientId = 'd7bfdbad9277b52215d6e9dcf936f068'
      const redirectUri = `https://zsmoutzjhqjgjehaituw.supabase.co/functions/v1/install-simple`
      const scopes = 'write_script_tags,read_script_tags'
      
      console.log(`🔄 Redirecting to OAuth for shop: ${shop}`)
      
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
    const clientSecret = Deno.env.get('SHOPIFY_CLIENT_SECRET') || 'temp_secret'
    
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

    // The SmartPop script to inject
    const smartPopScript = `
/**
 * SmartPop - SIMPLE AUTO-INJECTED
 */
(function() {
  'use strict';
  
  if (window.smartPopInitialized) {
    console.log('🎯 SmartPop already initialized');
    return;
  }
  window.smartPopInitialized = true;

  // ENHANCED ADMIN DETECTION - Block ALL admin/app contexts
  function shouldSkipPopup() {
    const currentUrl = window.location.href;
    const currentPath = window.location.pathname;
    const hostname = window.location.hostname;
    
    // Admin URL patterns to block
    const adminPatterns = ['/admin', '/apps', '/account', '/oauth', '/login', '/checkout'];
    const adminDomains = ['shopifyapp.com', 'claude.ai', 'partners.shopify.com', 'admin.shopify.com', 'accounts.shopify.com', 'app.shopify.com'];
    
    // Check URL paths
    for (const pattern of adminPatterns) {
      if (currentPath.includes(pattern)) {
        console.log('🚫 SmartPop: Blocked admin path:', currentPath);
        return true;
      }
    }
    
    // Check domains  
    for (const domain of adminDomains) {
      if (hostname.includes(domain) || currentUrl.includes(domain)) {
        console.log('🚫 SmartPop: Blocked admin domain:', hostname);
        return true;
      }
    }
    
    // Check for admin elements
    if (document.querySelector('meta[name="shopify-checkout-api-token"]') ||
        document.querySelector('[data-shopify-app]') ||
        document.querySelector('body[data-env="development"]') ||
        document.querySelector('#shopify-app') ||
        document.querySelector('.shopify-admin') ||
        document.querySelector('[data-shopify-admin]')) {
      console.log('🚫 SmartPop: Blocked admin element detected');
      return true;
    }
    
    // Check iframe context
    if (window !== window.top) {
      console.log('🚫 SmartPop: Blocked iframe context');
      return true;
    }
    
    console.log('✅ SmartPop: Customer store page confirmed:', currentPath);
    return false;
  }

  if (shouldSkipPopup()) {
    return;
  }

  console.log('🚀 SmartPop SIMPLE AUTO-INJECTED - initializing...');

  const ACTIVE_POPUPS = [
    {
      id: 'simple-50-popup',
      name: 'Simple 50% Popup',
      title: "🎉 You Made It Halfway!",
      description: 'Get 15% off your order for scrolling through our products!',
      trigger_type: 'scroll_depth',
      trigger_value: '50',
      page_target: 'homepage',
      button_text: 'Claim 15% Off',
      discount_code: 'SCROLL15',
      discount_percent: '15',
      is_active: true
    }
  ];

  class SimpleSmartPop {
    constructor() {
      this.popups = ACTIVE_POPUPS;
      this.shownPopups = new Set();
      this.currentScrollPercent = 0;
      
      console.log('🚀 SIMPLE SmartPop initializing...');
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
        box-shadow: 0 6px 20px rgba(0,0,0,0.4);
        border: 2px solid #1e7e34;
      \`;
      indicator.innerHTML = \`
        <div><strong>✅ SmartPop SIMPLE AUTO-INJECTED</strong></div>
        <div id="scroll-info">Scroll: 0%</div>
        <div>Working! Scroll to 50% to test popup</div>
        <button onclick="window.smartPop.forceShow()" style="background:#007cba;color:white;border:none;padding:6px 10px;border-radius:4px;font-size:11px;margin-top:8px;cursor:pointer;">🎯 Test Popup</button>
      \`;
      document.body.appendChild(indicator);
      
      console.log('✅ SIMPLE debug indicator added');
    }

    startTracking() {
      console.log('📈 Starting SIMPLE tracking...');
      
      setInterval(() => this.trackScroll(), 1000);
      window.addEventListener('scroll', () => this.trackScroll(), { passive: true });
    }

    trackScroll() {
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
      const documentHeight = Math.max(
        document.body.scrollHeight,
        document.documentElement.scrollHeight
      );
      const viewportHeight = window.innerHeight;
      const scrollableHeight = documentHeight - viewportHeight;
      const scrollPercent = scrollableHeight > 0 ? Math.round((scrollTop / scrollableHeight) * 100) : 0;
      
      this.currentScrollPercent = Math.min(scrollPercent, 100);
      
      // Update debug indicator
      const scrollInfo = document.getElementById('scroll-info');
      if (scrollInfo) {
        scrollInfo.textContent = \`Scroll: \${this.currentScrollPercent}%\`;
      }
      
      // Log every 10%
      if (this.currentScrollPercent % 10 === 0 && this.currentScrollPercent !== this.lastLoggedPercent) {
        console.log(\`📊 SIMPLE SCROLL: \${this.currentScrollPercent}%\`);
        this.lastLoggedPercent = this.currentScrollPercent;
      }
      
      // Check for popup trigger
      const path = window.location.pathname;
      const isHomepage = path === '/' || path === '';
      
      if (this.currentScrollPercent >= 50 && !this.shownPopups.has('simple-50-popup') && isHomepage) {
        console.log('🎯 SIMPLE POPUP TRIGGERED at 50%!');
        this.showPopup(this.popups[0]);
        this.shownPopups.add('simple-50-popup');
      }
    }

    showPopup(popup) {
      console.log(\`🎯 SIMPLE Showing popup: \${popup.name}\`);
      
      const popupHtml = \`
        <div id="simple-popup" style="position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.8);z-index:999999;display:flex;justify-content:center;align-items:center;">
          <div style="background:white;border-radius:12px;padding:32px;max-width:500px;margin:20px;text-align:center;border:3px solid #28a745;">
            <button onclick="this.closest('#simple-popup').remove(); console.log('✅ SIMPLE popup closed');" style="position:absolute;top:16px;right:16px;background:none;border:none;font-size:24px;cursor:pointer;color:#666;">×</button>
            <h2 style="margin:0 0 16px 0;color:#28a745;font-size:24px;">\${popup.title}</h2>
            <p style="margin:0 0 24px 0;color:#666;font-size:16px;">\${popup.description}</p>
            <input type="email" placeholder="Enter your email" style="width:100%;padding:12px;border:2px solid #ddd;border-radius:6px;font-size:16px;margin-bottom:16px;box-sizing:border-box;">
            <button onclick="alert('✅ Thank you! Your code: \${popup.discount_code}'); this.closest('#simple-popup').remove();" style="background:#28a745;color:white;border:none;padding:14px 28px;border-radius:6px;font-size:16px;cursor:pointer;font-weight:bold;width:100%;">\${popup.button_text}</button>
            <div style="margin-top:16px;padding:12px;background:#d4edda;border-radius:6px;border:1px solid #28a745;"><strong>Code: \${popup.discount_code}</strong><br><small>Save \${popup.discount_percent}%!</small></div>
          </div>
        </div>
      \`;
      
      document.body.insertAdjacentHTML('beforeend', popupHtml);
    }

    forceShow() {
      console.log('🎯 SIMPLE Force showing popup');
      this.showPopup(this.popups[0]);
    }
  }

  window.smartPop = new SimpleSmartPop();
  console.log('🎯 SIMPLE SmartPop loaded!');
  
})();
`;

    // Inject script via Script Tags API
    console.log(`📤 Injecting script for ${shop}...`)
    
    const scriptTagResponse = await fetch(`https://${shop}/admin/api/2023-04/script_tags.json`, {
      method: 'POST',
      headers: {
        'X-Shopify-Access-Token': accessToken,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        script_tag: {
          event: 'onload',
          src: `data:text/javascript;charset=utf-8,${encodeURIComponent(smartPopScript)}`
        }
      })
    })

    if (!scriptTagResponse.ok) {
      const errorText = await scriptTagResponse.text()
      console.error('Script tag creation failed:', errorText)
      throw new Error(`Script injection failed: ${scriptTagResponse.status}`)
    }

    const scriptTagData = await scriptTagResponse.json()
    console.log(`🎯 SIMPLE Script injected! Script tag ID: ${scriptTagData.script_tag.id}`)

    // Return success page
    const successHtml = `
<!DOCTYPE html>
<html>
<head>
    <title>SmartPop Installed!</title>
    <style>
        body { font-family: Arial, sans-serif; max-width: 600px; margin: 50px auto; padding: 20px; text-align: center; }
        .success { background: #d4edda; color: #155724; padding: 20px; border-radius: 8px; margin: 20px 0; }
        .button { background: #28a745; color: white; padding: 15px 30px; border: none; border-radius: 5px; text-decoration: none; display: inline-block; }
    </style>
</head>
<body>
    <h1>🎉 SmartPop Installed Successfully!</h1>
    
    <div class="success">
        <h2>✅ SIMPLE Installation Complete</h2>
        <p>SmartPop is now active on: <strong>${shop}</strong></p>
        <p>Script Tag ID: <code>${scriptTagData.script_tag.id}</code></p>
    </div>
    
    <h3>🧪 Test Your Installation</h3>
    <p>1. Visit your store: <a href="https://${shop}/" target="_blank">https://${shop}/</a></p>
    <p>2. Look for the GREEN debug panel in the top-right corner</p>
    <p>3. Scroll down to 50% to trigger the popup</p>
    
    <p><a href="https://${shop}/" class="button">🌐 Visit Store</a></p>
    
    <hr style="margin: 40px 0;">
    <small>SmartPop SIMPLE • Installed on ${new Date().toLocaleString()}</small>
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
    console.error('SIMPLE Installation error:', error)
    
    const errorHtml = `
<!DOCTYPE html>
<html>
<head>
    <title>Installation Error</title>
    <style>
        body { font-family: Arial, sans-serif; max-width: 600px; margin: 50px auto; padding: 20px; text-align: center; }
        .error { background: #f8d7da; color: #721c24; padding: 20px; border-radius: 8px; margin: 20px 0; }
    </style>
</head>
<body>
    <h1>❌ Installation Error</h1>
    <div class="error">
        <p><strong>Error:</strong> ${error.message}</p>
        <p>Check the console logs for more details.</p>
    </div>
    <p><a href="javascript:history.back()">← Try Again</a></p>
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
}

// Deno serve handler
if (typeof Deno !== 'undefined') {
  Deno.serve(handler);
}