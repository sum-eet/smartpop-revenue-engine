/**
 * COMPREHENSIVE SHOPIFY ADMIN DETECTION
 * Use this exact code block in ALL popup scripts
 */

function shouldSkipPopup() {
  const currentUrl = window.location.href;
  const currentPath = window.location.pathname;
  const hostname = window.location.hostname;
  
  // Admin URL patterns to block
  const adminPatterns = [
    '/admin',
    '/apps',
    '/account',
    '/oauth',
    '/login',
    '/checkout'
  ];
  
  // Admin domains to block
  const adminDomains = [
    'shopifyapp.com',
    'claude.ai',
    'partners.shopify.com',
    'admin.shopify.com',
    'accounts.shopify.com',
    'app.shopify.com'
  ];
  
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
  
  // Check for Shopify admin elements
  if (document.querySelector('meta[name="shopify-checkout-api-token"]') ||
      document.querySelector('[data-shopify-app]') ||
      document.querySelector('body[data-env="development"]') ||
      document.querySelector('#shopify-app') ||
      document.querySelector('.shopify-admin') ||
      document.querySelector('[data-shopify-admin]')) {
    console.log('🚫 SmartPop: Blocked admin element detected');
    return true;
  }
  
  // Check for iframe context (many admin pages load in iframes)
  if (window !== window.top) {
    console.log('🚫 SmartPop: Blocked iframe context');
    return true;
  }
  
  console.log('✅ SmartPop: Customer store page confirmed:', currentPath);
  return false;
}

// Usage in all scripts:
if (shouldSkipPopup()) {
  return;
}