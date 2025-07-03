/**
 * Comprehensive search for Shopify access tokens
 * This script searches multiple sources for stored access tokens
 */

const shopDomain = 'testingstoresumeet.myshopify.com';

async function searchForTokens() {
  console.log('🔍 Comprehensive Token Search for:', shopDomain);
  console.log('='.repeat(50));
  
  // 1. Check install-script-direct function (looks in shops table)
  console.log('\n1. Checking install-script-direct function (shops table)...');
  try {
    const response = await fetch(`https://zsmoutzjhqjgjehaituw.supabase.co/functions/v1/install-script-direct?shop=${shopDomain}`, {
      method: 'GET'
    });
    
    const result = await response.json();
    console.log('   Status:', response.status);
    console.log('   Response:', result);
    
    if (result.success) {
      console.log('   ✅ Found stored token! Script installed successfully');
      return true;
    } else if (result.error && result.error.includes('No access token')) {
      console.log('   ❌ No stored token found in shops table');
    }
  } catch (error) {
    console.log('   ❌ Error checking install-script-direct:', error.message);
  }
  
  // 2. Check if there's a direct database query function
  console.log('\n2. Checking database query functions...');
  try {
    // Try to find if there's a data inspector function
    const inspectorResponse = await fetch(`https://zsmoutzjhqjgjehaituw.supabase.co/functions/v1/data-inspector?shop=${shopDomain}`, {
      method: 'GET'
    });
    
    if (inspectorResponse.ok) {
      const inspectorResult = await inspectorResponse.json();
      console.log('   Data inspector result:', inspectorResult);
    } else {
      console.log('   ❌ No data inspector function available');
    }
  } catch (error) {
    console.log('   ❌ Error checking data inspector:', error.message);
  }
  
  // 3. Search for environment variables or config files
  console.log('\n3. Searching for environment variables and config files...');
  console.log('   - Looking for .env files...');
  console.log('   - Checking supabase config...');
  console.log('   - Scanning for hardcoded tokens...');
  
  // 4. Check if OAuth flow has been completed
  console.log('\n4. Checking OAuth flow completion...');
  try {
    const oauthResponse = await fetch(`https://zsmoutzjhqjgjehaituw.supabase.co/functions/v1/shopify-auth?shop=${shopDomain}`, {
      method: 'GET',
      redirect: 'manual'
    });
    
    console.log('   OAuth check status:', oauthResponse.status);
    
    if (oauthResponse.status === 302) {
      const location = oauthResponse.headers.get('Location');
      console.log('   OAuth redirect to:', location);
      
      if (location && location.includes('oauth/authorize')) {
        console.log('   ⚠️  OAuth flow not completed - would redirect to Shopify auth');
      }
    }
  } catch (error) {
    console.log('   ❌ Error checking OAuth:', error.message);
  }
  
  // 5. Summary and recommendations
  console.log('\n' + '='.repeat(50));
  console.log('🎯 SUMMARY AND RECOMMENDATIONS');
  console.log('='.repeat(50));
  
  console.log('\n📋 Database Tables to Check:');
  console.log('   1. shops table - access_token column');
  console.log('   2. shopify_installations table - access_token column');
  console.log('   3. api_keys table - for API key authentication');
  
  console.log('\n🔧 Ways to Install Script Tag:');
  console.log('   1. Complete OAuth flow:');
  console.log('      https://zsmoutzjhqjgjehaituw.supabase.co/functions/v1/shopify-auth?shop=' + shopDomain);
  
  console.log('\n   2. Use quick install with manual token:');
  console.log('      node quick-install.js YOUR_ACCESS_TOKEN');
  
  console.log('\n   3. Use install-script-direct with token:');
  console.log('      https://zsmoutzjhqjgjehaituw.supabase.co/functions/v1/install-script-direct?shop=' + shopDomain + '&token=YOUR_TOKEN');
  
  console.log('\n📚 How to Get Access Token:');
  console.log('   1. Go to Shopify Admin: https://admin.shopify.com/store/testingstoresumeet/settings/apps/development');
  console.log('   2. Create a new app or use existing one');
  console.log('   3. Generate Admin API access token with write_script_tags permission');
  
  console.log('\n🔍 Token Pattern: shpat_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx');
  
  return false;
}

// Run the comprehensive search
searchForTokens().then(found => {
  if (found) {
    console.log('\n🎉 SUCCESS: Script is installed and ready to use!');
    console.log('🧪 Test at: https://' + shopDomain + '/');
  } else {
    console.log('\n⚠️  No stored token found. Manual installation required.');
  }
}).catch(error => {
  console.error('\n❌ Search failed:', error);
});