/**
 * CORRECT SHOPIFY ADMIN DETECTION
 * Based on actual URL: https://admin.shopify.com/store/testingstoresumeet/apps/smart-popup2
 */

function shouldSkipPopup() {
  const currentUrl = window.location.href;
  const currentPath = window.location.pathname;
  const hostname = window.location.hostname;
  
  console.log('🔍 SmartPop URL Check:', {
    url: currentUrl,
    hostname: hostname,
    path: currentPath
  });
  
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
  
  // Iframe detection (admin pages often load in iframes)
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

// Usage: if (shouldSkipPopup()) return;