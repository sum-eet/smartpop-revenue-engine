/**
 * Check for stored Shopify access tokens in the database
 * This script queries the shopify_installations table to find stored tokens
 */

async function checkStoredTokens() {
  const shopDomain = 'testingstoresumeet.myshopify.com';
  
  try {
    console.log('🔍 Checking for stored access tokens...');
    
    // Try to call the supabase function that checks for stored tokens
    const response = await fetch('https://zsmoutzjhqjgjehaituw.supabase.co/functions/v1/install-script-direct?shop=' + shopDomain, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    const result = await response.json();
    
    if (result.error) {
      console.log('❌ Error checking stored tokens:', result.error);
      if (result.error.includes('No access token')) {
        console.log('💡 No stored access token found for', shopDomain);
        console.log('');
        console.log('🔧 Options:');
        console.log('1. Complete OAuth flow via: https://zsmoutzjhqjgjehaituw.supabase.co/functions/v1/shopify-auth?shop=' + shopDomain);
        console.log('2. Manually provide token via: https://zsmoutzjhqjgjehaituw.supabase.co/functions/v1/install-script-direct?shop=' + shopDomain + '&token=YOUR_TOKEN');
        console.log('3. Use the quick install script: node quick-install.js YOUR_TOKEN');
      }
    } else {
      console.log('✅ Success! Found stored token and installed script');
      console.log('📋 Details:', result);
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.log('');
    console.log('🔧 Alternative ways to check for stored tokens:');
    console.log('1. Check the shops table in Supabase dashboard');
    console.log('2. Check the shopify_installations table');
    console.log('3. Look for access_token column in database');
  }
}

// Run the check
checkStoredTokens();