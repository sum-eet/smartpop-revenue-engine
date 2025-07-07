/**
 * Install SmartPop Script on testingstoresumeet.myshopify.com
 * This script will install the popup script via Shopify's Script Tags API
 */

const SHOP_DOMAIN = 'testingstoresumeet.myshopify.com';
const SCRIPT_URL = 'https://zsmoutzjhqjgjehaituw.supabase.co/functions/v1/popup-embed-public?shop=testingstoresumeet.myshopify.com';

async function installScript() {
    console.log('🚀 Installing SmartPop Script for', SHOP_DOMAIN);
    console.log('📄 Script URL:', SCRIPT_URL);
    
    // You need to provide your Shopify access token
    const accessToken = prompt('Enter your Shopify access token for ' + SHOP_DOMAIN + ':');
    
    if (!accessToken) {
        console.log('❌ Access token required');
        return;
    }

    try {
        // First, check if script already exists
        console.log('🔍 Checking for existing scripts...');
        
        const listResponse = await fetch(`https://${SHOP_DOMAIN}/admin/api/2023-10/script_tags.json`, {
            headers: {
                'X-Shopify-Access-Token': accessToken
            }
        });

        if (!listResponse.ok) {
            throw new Error(`Failed to list scripts: ${listResponse.status}`);
        }

        const existingScripts = await listResponse.json();
        console.log('📋 Found', existingScripts.script_tags.length, 'existing scripts');

        // Remove any existing SmartPop scripts
        const smartPopScripts = existingScripts.script_tags.filter(script => 
            script.src && (
                script.src.includes('smartpop') || 
                script.src.includes('popup-embed-public') ||
                script.src.includes('popup-script')
            )
        );

        if (smartPopScripts.length > 0) {
            console.log('🗑️ Removing', smartPopScripts.length, 'existing SmartPop scripts...');
            
            for (const script of smartPopScripts) {
                try {
                    const deleteResponse = await fetch(`https://${SHOP_DOMAIN}/admin/api/2023-10/script_tags/${script.id}.json`, {
                        method: 'DELETE',
                        headers: {
                            'X-Shopify-Access-Token': accessToken
                        }
                    });
                    
                    if (deleteResponse.ok) {
                        console.log('✅ Removed script ID:', script.id);
                    } else {
                        console.log('⚠️ Failed to remove script ID:', script.id);
                    }
                } catch (error) {
                    console.log('❌ Error removing script:', error.message);
                }
            }
        }

        // Install new script
        console.log('📦 Installing new SmartPop script...');
        
        const scriptTag = {
            script_tag: {
                event: 'onload',
                src: SCRIPT_URL,
                display_scope: 'online_store'
            }
        };

        const installResponse = await fetch(`https://${SHOP_DOMAIN}/admin/api/2023-10/script_tags.json`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Shopify-Access-Token': accessToken
            },
            body: JSON.stringify(scriptTag)
        });

        if (!installResponse.ok) {
            const errorText = await installResponse.text();
            throw new Error(`Script installation failed: ${installResponse.status} - ${errorText}`);
        }

        const result = await installResponse.json();
        console.log('✅ Script installed successfully!');
        console.log('📋 Script Tag Details:');
        console.log('   ID:', result.script_tag.id);
        console.log('   Source:', result.script_tag.src);
        console.log('   Event:', result.script_tag.event);
        console.log('   Created:', result.script_tag.created_at);
        
        console.log('');
        console.log('🧪 Testing Instructions:');
        console.log('1. Visit https://' + SHOP_DOMAIN + '/');
        console.log('2. Open browser console (F12)');
        console.log('3. Look for SmartPop initialization messages');
        console.log('4. Scroll down to trigger popups or wait for time-based popups');
        console.log('');
        console.log('📊 Active Popups Configured:');
        console.log('- Scroll 50% Popup: "Wait! Don\'t Leave Empty Handed!" (SCROLL15 - 15% off)');
        console.log('- Time-based popups: Various test popups with 5-second delays');
        console.log('');
        console.log('🎯 The script should now be active on your store!');

    } catch (error) {
        console.error('❌ Installation failed:', error.message);
        console.log('');
        console.log('🔧 Troubleshooting:');
        console.log('1. Verify your access token has "write_script_tags" permission');
        console.log('2. Check that you have admin access to the store');
        console.log('3. Try refreshing the page and running again');
    }
}

// Auto-run the installation
installScript();

console.log('');
console.log('📋 Manual Installation Steps (if needed):');
console.log('1. Go to Shopify Admin → Apps → Develop apps');
console.log('2. Create/select an app with script_tags permissions');
console.log('3. Copy the access token and run this script');
console.log('4. Or manually create a script tag with source:', SCRIPT_URL);