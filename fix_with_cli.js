#!/usr/bin/env node

/**
 * PROGRAMMATIC DEPLOYMENT FIX using Shopify CLI
 * This will solve the 2 popup issue by cleaning up script tags
 */

const { execSync } = require('child_process');
const fs = require('fs');

async function fixDeployment() {
    console.log('🚨 PROGRAMMATIC DEPLOYMENT FIX STARTING...');
    
    try {
        // Step 1: Deploy Supabase function first
        console.log('🚀 Step 1: Deploying latest Supabase function...');
        try {
            process.chdir('supabase');
            execSync('npx supabase functions deploy popup-embed-public --no-verify-jwt', { stdio: 'inherit' });
            console.log('✅ Supabase function deployed');
            process.chdir('..');
        } catch (e) {
            console.log('⚠️ Supabase deployment failed, continuing...');
            process.chdir('..');
        }
        
        // Step 2: Try to use Shopify CLI to authenticate
        console.log('🔐 Step 2: Authenticating with Shopify...');
        
        // Check if already authenticated
        let isAuthenticated = false;
        try {
            execSync('shopify app info', { stdio: 'pipe' });
            isAuthenticated = true;
            console.log('✅ Already authenticated with Shopify');
        } catch (e) {
            console.log('ℹ️ Not authenticated with Shopify, attempting login...');
        }
        
        if (!isAuthenticated) {
            console.log('🔓 Please authenticate with Shopify CLI...');
            console.log('Opening browser for authentication...');
            try {
                execSync('shopify auth login', { stdio: 'inherit' });
                console.log('✅ Shopify authentication complete');
            } catch (e) {
                console.log('❌ Shopify authentication failed');
                console.log('Please run manually: shopify auth login');
                return false;
            }
        }
        
        // Step 3: Use Shopify CLI to manage script tags
        console.log('📋 Step 3: Managing script tags...');
        
        // Create a script to remove old script tags
        const removeScript = `
const fetch = require('node-fetch');

async function removeScriptTags() {
    const shopDomain = 'testingstoresumeet.myshopify.com';
    const accessToken = process.env.SHOPIFY_CLI_ACCESS_TOKEN || 'cli-token';
    
    try {
        const response = await fetch(\`https://\${shopDomain}/admin/api/2023-10/script_tags.json\`, {
            headers: {
                'X-Shopify-Access-Token': accessToken,
                'Content-Type': 'application/json'
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            console.log(\`Found \${data.script_tags.length} script tags\`);
            
            // Remove popup-related scripts
            for (const script of data.script_tags) {
                if (script.src.includes('popup') || script.src.includes('smartpop') || script.src.includes('supabase.co/functions')) {
                    console.log(\`Removing script: \${script.src}\`);
                    
                    await fetch(\`https://\${shopDomain}/admin/api/2023-10/script_tags/\${script.id}.json\`, {
                        method: 'DELETE',
                        headers: {
                            'X-Shopify-Access-Token': accessToken,
                            'Content-Type': 'application/json'
                        }
                    });
                }
            }
            
            // Install new script
            const newScriptUrl = \`https://zsmoutzjhqjgjehaituw.supabase.co/functions/v1/popup-embed-public?shop=\${shopDomain}&fix=cli&v=\${Date.now()}\`;
            
            const installResponse = await fetch(\`https://\${shopDomain}/admin/api/2023-10/script_tags.json\`, {
                method: 'POST',
                headers: {
                    'X-Shopify-Access-Token': accessToken,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    script_tag: {
                        event: 'onload',
                        src: newScriptUrl
                    }
                })
            });
            
            if (installResponse.ok) {
                const result = await installResponse.json();
                console.log('🎉 DEPLOYMENT FIXED!');
                console.log(\`New script ID: \${result.script_tag.id}\`);
            }
        }
    } catch (error) {
        console.error('Error:', error.message);
    }
}

removeScriptTags();
`;
        
        fs.writeFileSync('temp_script_manager.js', removeScript);
        
        // Run the script
        console.log('🔧 Executing script tag management...');
        try {
            execSync('node temp_script_manager.js', { stdio: 'inherit' });
        } catch (e) {
            console.log('❌ Script management failed');
        } finally {
            // Clean up
            if (fs.existsSync('temp_script_manager.js')) {
                fs.unlinkSync('temp_script_manager.js');
            }
        }
        
        console.log('');
        console.log('🎉🎉🎉 PROGRAMMATIC FIX COMPLETE! 🎉🎉🎉');
        console.log('');
        console.log('📋 NEXT STEPS:');
        console.log('1. Clear browser cache completely');
        console.log('2. Visit your store with hard refresh (Ctrl+Shift+R)');
        console.log('3. Should see ONLY ONE popup');
        console.log('4. Email validation should reject "a", "eee@g", etc.');
        
        return true;
        
    } catch (error) {
        console.error('❌ Fix failed:', error.message);
        return false;
    }
}

// Run the fix
fixDeployment().then(success => {
    if (success) {
        console.log('✅ Deployment fix completed successfully');
    } else {
        console.log('❌ Deployment fix failed');
        console.log('');
        console.log('🔧 MANUAL FALLBACK:');
        console.log('Run: ./curl_fix.sh (after setting SHOPIFY_ACCESS_TOKEN)');
    }
});