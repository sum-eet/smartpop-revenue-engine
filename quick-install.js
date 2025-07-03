/**
 * QUICK SCRIPT TAG INSTALLER
 * Run this with: node quick-install.js YOUR_ACCESS_TOKEN
 */

const accessToken = process.argv[2];

if (!accessToken) {
  console.log('❌ Usage: node quick-install.js YOUR_ACCESS_TOKEN');
  console.log('');
  console.log('Get access token from:');
  console.log('https://admin.shopify.com/store/testingstoresumeet/settings/apps/development');
  console.log('Create app → Admin API → write_script_tags permission');
  process.exit(1);
}

async function installScript() {
  const shopDomain = 'testingstoresumeet.myshopify.com';
  const scriptUrl = `https://zsmoutzjhqjgjehaituw.supabase.co/functions/v1/popup-embed-public?shop=${shopDomain}`;
  
  try {
    console.log('🚀 Installing script tag...');
    
    const response = await fetch(`https://${shopDomain}/admin/api/2023-10/script_tags.json`, {
      method: 'POST',
      headers: {
        'X-Shopify-Access-Token': accessToken,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        script_tag: {
          event: 'onload',
          src: scriptUrl,
        },
      }),
    });
    
    if (!response.ok) {
      const error = await response.text();
      throw new Error(`${response.status}: ${error}`);
    }
    
    const result = await response.json();
    console.log('✅ Script installed!');
    console.log('📍 Script URL:', result.script_tag.src);
    console.log('🆔 Script ID:', result.script_tag.id);
    console.log('');
    console.log('🎯 Test now: https://testingstoresumeet.myshopify.com/');
    console.log('⏱️ Wait 5 seconds or scroll 50% for popups');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

installScript();