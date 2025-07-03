/**
 * NUCLEAR OPTION: Remove ALL SmartPop script tags from Shopify store
 * This will help us debug what's actually deployed
 */

const SHOP_DOMAIN = 'testingstoresumeet.myshopify.com';
const ACCESS_TOKEN = 'YOUR_ACCESS_TOKEN_HERE'; // You need to provide this

async function removeAllSmartPopScripts() {
  console.log('🗑️ Starting nuclear script removal...');
  
  if (ACCESS_TOKEN === 'YOUR_ACCESS_TOKEN_HERE') {
    console.error('❌ Please set your ACCESS_TOKEN first!');
    console.log('📝 Get it from: https://testingstoresumeet.myshopify.com/admin/settings/apps');
    return;
  }

  try {
    // Get all script tags
    console.log('📋 Fetching all script tags...');
    const response = await fetch(`https://${SHOP_DOMAIN}/admin/api/2023-10/script_tags.json`, {
      headers: {
        'X-Shopify-Access-Token': ACCESS_TOKEN
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch script tags: ${response.status}`);
    }

    const data = await response.json();
    const scriptTags = data.script_tags || [];
    
    console.log(`📊 Found ${scriptTags.length} total script tags`);
    
    // Filter SmartPop related scripts
    const smartPopScripts = scriptTags.filter(script => {
      const src = script.src || '';
      return src.includes('smartpop') || 
             src.includes('popup') || 
             src.includes('SmartPop') ||
             src.startsWith('data:text/javascript') ||
             src.includes('zsmoutzjhqjgjehaituw.supabase.co');
    });
    
    console.log(`🎯 Found ${smartPopScripts.length} SmartPop-related scripts:`);
    smartPopScripts.forEach(script => {
      console.log(`  - ID: ${script.id}, Event: ${script.event}, Src: ${script.src.substring(0, 100)}...`);
    });
    
    if (smartPopScripts.length === 0) {
      console.log('✅ No SmartPop scripts found to remove');
      return;
    }
    
    // Remove all SmartPop scripts
    let removedCount = 0;
    for (const script of smartPopScripts) {
      try {
        console.log(`🗑️ Removing script ${script.id}...`);
        const deleteResponse = await fetch(`https://${SHOP_DOMAIN}/admin/api/2023-10/script_tags/${script.id}.json`, {
          method: 'DELETE',
          headers: {
            'X-Shopify-Access-Token': ACCESS_TOKEN
          }
        });
        
        if (deleteResponse.ok) {
          console.log(`✅ Removed script ${script.id}`);
          removedCount++;
        } else {
          console.log(`❌ Failed to remove script ${script.id}: ${deleteResponse.status}`);
        }
        
        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 500));
        
      } catch (error) {
        console.error(`❌ Error removing script ${script.id}:`, error.message);
      }
    }
    
    console.log(`🎉 Removal complete! Removed ${removedCount} out of ${smartPopScripts.length} scripts`);
    console.log('🔄 Please refresh your admin page to see if popups are gone');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

// Instructions
console.log('🔧 SmartPop Script Removal Tool');
console.log('📝 Steps:');
console.log('1. Set ACCESS_TOKEN variable above');
console.log('2. Run: removeAllSmartPopScripts()');
console.log('3. Check if popups are gone from admin');

// Export for Node.js or browser
if (typeof module !== 'undefined') {
  module.exports = { removeAllSmartPopScripts };
} else {
  window.removeAllSmartPopScripts = removeAllSmartPopScripts;
}