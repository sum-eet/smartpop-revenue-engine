/**
 * CONSOLE VERSION: Remove SmartPop scripts from Shopify Admin
 * Run this in browser console while logged into Shopify admin
 */

// Get shop domain from current URL
function getShopFromURL() {
  const url = window.location.href;
  const match = url.match(/\/store\/([^\/]+)/);
  return match ? `${match[1]}.myshopify.com` : 'testingstoresumeet.myshopify.com';
}

// Function to get access token from localStorage or sessionStorage
function findAccessToken() {
  console.log('🔍 Looking for access token...');
  
  // Check localStorage
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    const value = localStorage.getItem(key);
    if (key.includes('token') || value.includes('shpat_') || value.includes('access_token')) {
      console.log('Found potential token in localStorage:', key);
    }
  }
  
  // Check sessionStorage
  for (let i = 0; i < sessionStorage.length; i++) {
    const key = sessionStorage.key(i);
    const value = sessionStorage.getItem(key);
    if (key.includes('token') || value.includes('shpat_') || value.includes('access_token')) {
      console.log('Found potential token in sessionStorage:', key);
    }
  }
  
  // Check for tokens in page
  const scripts = document.querySelectorAll('script');
  scripts.forEach(script => {
    if (script.textContent.includes('access_token') || script.textContent.includes('shpat_')) {
      console.log('Found token reference in script tag');
    }
  });
  
  console.log('❌ No automatic token found. You need to get it manually from:');
  console.log('Admin → Settings → Apps → Develop apps → Create app → Admin API access token');
  return null;
}

// Manual script removal using Shopify Admin API
async function removeScriptsWithToken(accessToken) {
  const shopDomain = getShopFromURL();
  console.log('🏪 Shop domain:', shopDomain);
  console.log('🔑 Using access token:', accessToken.substring(0, 10) + '...');
  
  try {
    // Get all script tags
    const response = await fetch(`https://${shopDomain}/admin/api/2023-10/script_tags.json`, {
      headers: {
        'X-Shopify-Access-Token': accessToken,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch scripts: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const scripts = data.script_tags || [];
    
    console.log(`📋 Found ${scripts.length} total script tags`);
    
    // Filter SmartPop scripts
    const smartPopScripts = scripts.filter(script => {
      const src = script.src || '';
      return src.includes('smartpop') || 
             src.includes('popup') || 
             src.includes('SmartPop') ||
             src.includes('zsmoutzjhqjgjehaituw.supabase.co') ||
             src.startsWith('data:text/javascript');
    });
    
    console.log(`🎯 Found ${smartPopScripts.length} SmartPop scripts to remove:`);
    smartPopScripts.forEach(script => {
      console.log(`  - ID: ${script.id}, Event: ${script.event}, Created: ${script.created_at}`);
      console.log(`    Source: ${script.src.substring(0, 100)}...`);
    });
    
    if (smartPopScripts.length === 0) {
      console.log('✅ No SmartPop scripts found in Shopify');
      return;
    }
    
    // Remove scripts
    let removed = 0;
    for (const script of smartPopScripts) {
      try {
        const deleteResponse = await fetch(`https://${shopDomain}/admin/api/2023-10/script_tags/${script.id}.json`, {
          method: 'DELETE',
          headers: {
            'X-Shopify-Access-Token': accessToken,
            'Content-Type': 'application/json'
          }
        });
        
        if (deleteResponse.ok) {
          console.log(`✅ Removed script ${script.id}`);
          removed++;
        } else {
          console.log(`❌ Failed to remove script ${script.id}: ${deleteResponse.status}`);
        }
        
        // Delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 500));
        
      } catch (error) {
        console.log(`❌ Error removing script ${script.id}:`, error.message);
      }
    }
    
    console.log(`🎉 Removed ${removed} out of ${smartPopScripts.length} SmartPop scripts`);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.log('💡 Make sure your access token has write_script_tags permission');
  }
}

// Main function
function startScriptRemoval() {
  console.log('🚀 SmartPop Script Removal Tool');
  console.log('================================');
  
  const token = findAccessToken();
  
  if (!token) {
    console.log('📝 MANUAL STEPS:');
    console.log('1. Go to: https://testingstoresumeet.myshopify.com/admin/settings/apps');
    console.log('2. Click "Develop apps"');
    console.log('3. Create or select your app');
    console.log('4. Generate Admin API access token with write_script_tags permission');
    console.log('5. Run: removeScriptsWithToken("your_access_token_here")');
    console.log('');
    console.log('Or try running this if you have a token:');
    console.log('removeScriptsWithToken("shpat_your_token_here")');
  }
}

// Export functions to global scope
window.removeScriptsWithToken = removeScriptsWithToken;
window.findAccessToken = findAccessToken;
window.getShopFromURL = getShopFromURL;

// Auto-start
startScriptRemoval();