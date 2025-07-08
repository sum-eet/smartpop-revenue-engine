// GET SHOPIFY ACCESS TOKEN FROM BROWSER
// This extracts the token from your current Shopify session

console.log('🔍 Extracting Shopify access token from browser session...');

// Method 1: Check if we're in Shopify admin and can extract token
if (window.location.hostname.includes('shopify.com')) {
    console.log('✅ In Shopify admin - extracting token...');
    
    // Try to find token in various places
    const checks = [
        () => window.ShopifyAnalytics?.meta?.page?.customerId,
        () => window.Shopify?.shop,
        () => document.querySelector('meta[name="shopify-api-key"]')?.content,
        () => localStorage.getItem('shopify_access_token'),
        () => sessionStorage.getItem('shopify_access_token'),
    ];
    
    for (let i = 0; i < checks.length; i++) {
        try {
            const result = checks[i]();
            if (result) {
                console.log(`Found potential token via method ${i + 1}:`, result);
            }
        } catch (e) {
            // Silent fail
        }
    }
    
    // Try to extract from cookies
    const cookies = document.cookie.split(';');
    cookies.forEach(cookie => {
        if (cookie.includes('token') || cookie.includes('access') || cookie.includes('auth')) {
            console.log('Found relevant cookie:', cookie.trim());
        }
    });
    
} else {
    console.log('❌ Not in Shopify admin. Please run this in your Shopify admin console.');
    console.log('Go to: https://testingstoresumeet.myshopify.com/admin');
}

// Method 2: Generate instructions for manual token creation
console.log('');
console.log('🔧 TO GET ACCESS TOKEN MANUALLY:');
console.log('1. Go to: https://testingstoresumeet.myshopify.com/admin/settings/apps');
console.log('2. Click "Develop apps" or "Manage private apps"');
console.log('3. Create new private app with these permissions:');
console.log('   - read_script_tags, write_script_tags');
console.log('4. Copy the "Admin API access token"');
console.log('5. Export it: export SHOPIFY_ACCESS_TOKEN="your_token_here"');
console.log('6. Run: ./curl_fix.sh');