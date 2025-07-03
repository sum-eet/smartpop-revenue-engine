/**
 * EMERGENCY SCRIPT TAG INSTALLER
 * Run this in Node.js to install SmartPop script on the store
 */

const shopDomain = 'testingstoresumeet.myshopify.com';
const scriptUrl = `https://zsmoutzjhqjgjehaituw.supabase.co/functions/v1/popup-embed-public?shop=${shopDomain}`;

// You need to get this from Shopify admin > Apps > Private apps > Create private app
// OR from your existing app installation
const ACCESS_TOKEN = 'YOUR_SHOPIFY_ACCESS_TOKEN_HERE';

async function installScriptTag() {
  try {
    console.log('🚀 Installing SmartPop script tag...');
    
    // First, list existing script tags
    const listResponse = await fetch(`https://${shopDomain}/admin/api/2023-10/script_tags.json`, {
      headers: {
        'X-Shopify-Access-Token': ACCESS_TOKEN,
        'Content-Type': 'application/json',
      },
    });
    
    if (!listResponse.ok) {
      throw new Error(`Failed to list script tags: ${listResponse.status}`);
    }
    
    const existingScripts = await listResponse.json();
    console.log('📋 Existing script tags:', existingScripts.script_tags.length);
    
    // Remove old SmartPop scripts
    for (const script of existingScripts.script_tags) {
      if (script.src.includes('smartpop') || script.src.includes('popup')) {
        console.log('🗑️ Removing old script:', script.src);
        await fetch(`https://${shopDomain}/admin/api/2023-10/script_tags/${script.id}.json`, {
          method: 'DELETE',
          headers: {
            'X-Shopify-Access-Token': ACCESS_TOKEN,
          },
        });
      }
    }
    
    // Install new script tag
    const installResponse = await fetch(`https://${shopDomain}/admin/api/2023-10/script_tags.json`, {
      method: 'POST',
      headers: {
        'X-Shopify-Access-Token': ACCESS_TOKEN,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        script_tag: {
          event: 'onload',
          src: scriptUrl,
        },
      }),
    });
    
    if (!installResponse.ok) {
      throw new Error(`Failed to install script: ${installResponse.status}`);
    }
    
    const result = await installResponse.json();
    console.log('✅ Script tag installed successfully!');
    console.log('📍 Script URL:', result.script_tag.src);
    console.log('🆔 Script ID:', result.script_tag.id);
    
    console.log('\n🎯 Test the popups:');
    console.log('1. Visit: https://testingstoresumeet.myshopify.com/');
    console.log('2. Scroll down 50% to trigger scroll popup');
    console.log('3. Wait 5 seconds for time-based popups');
    
    return result;
    
  } catch (error) {
    console.error('❌ Error installing script:', error.message);
    console.log('\n💡 To get access token:');
    console.log('1. Go to Shopify admin > Apps > App and sales channel settings');
    console.log('2. Click "Develop apps" > "Create an app"');
    console.log('3. Configure Admin API access > Script tags: write_script_tags');
    console.log('4. Install app and copy the access token');
  }
}

// Run the installation
if (ACCESS_TOKEN === 'YOUR_SHOPIFY_ACCESS_TOKEN_HERE') {
  console.log('❌ Please set your Shopify access token first!');
  console.log('Edit this file and replace YOUR_SHOPIFY_ACCESS_TOKEN_HERE with your actual token');
} else {
  installScriptTag();
}