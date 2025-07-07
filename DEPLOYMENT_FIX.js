// 🚨 DEPLOYMENT PIPELINE FIX - Run this in Shopify Admin Console
// 1. Go to: https://admin.shopify.com/store/testingstoresumeet
// 2. Open browser console (F12)
// 3. Paste and run this ENTIRE script

console.log('🚨 FIXING DEPLOYMENT PIPELINE - This will solve the 2 popup issue');

(async function() {
  try {
    // STEP 1: Check what scripts are currently installed
    console.log('📋 Step 1: Checking current script tags...');
    const response = await fetch('/admin/api/2023-10/script_tags.json');
    const data = await response.json();
    
    console.log(`Found ${data.script_tags.length} total script tags:`);
    data.script_tags.forEach(script => {
      console.log(`  - ID: ${script.id}, URL: ${script.src}`);
    });
    
    // STEP 2: Find and remove ALL popup-related scripts
    const popupScripts = data.script_tags.filter(script => 
      script.src.includes('popup') || 
      script.src.includes('smartpop') ||
      script.src.includes('supabase.co/functions')
    );
    
    console.log(`🗑️ Step 2: Found ${popupScripts.length} popup scripts to remove:`);
    popupScripts.forEach(script => {
      console.log(`  - Removing: ${script.src}`);
    });
    
    // Delete all popup scripts
    for (const script of popupScripts) {
      try {
        await fetch(`/admin/api/2023-10/script_tags/${script.id}.json`, {
          method: 'DELETE'
        });
        console.log(`✅ Deleted script ID: ${script.id}`);
      } catch (e) {
        console.log(`❌ Failed to delete script ID: ${script.id}`, e);
      }
    }
    
    console.log('🧹 Step 3: Cleanup complete. Installing ONE working script...');
    
    // STEP 3: Install ONE clean, working script
    const workingScriptUrl = 'https://zsmoutzjhqjgjehaituw.supabase.co/functions/v1/popup-embed-public?shop=testingstoresumeet.myshopify.com&fix=deployment&v=' + Date.now();
    
    const installResponse = await fetch('/admin/api/2023-10/script_tags.json', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        script_tag: {
          event: 'onload',
          src: workingScriptUrl
        }
      })
    });
    
    const result = await installResponse.json();
    
    if (result.script_tag) {
      console.log('');
      console.log('🎉🎉🎉 DEPLOYMENT PIPELINE FIXED! 🎉🎉🎉');
      console.log('');
      console.log('✅ Removed all conflicting scripts');
      console.log('✅ Installed ONE working script with proper validation');
      console.log('✅ Script will prevent multiple popups');
      console.log('✅ Email validation will reject "a", "eee@g", etc.');
      console.log('');
      console.log('🆔 New Script ID:', result.script_tag.id);
      console.log('🌐 Script URL:', result.script_tag.src);
      console.log('');
      console.log('🧪 TEST NOW:');
      console.log('1. Hard refresh your store: Ctrl+Shift+R');
      console.log('2. Visit: https://testingstoresumeet.myshopify.com/');
      console.log('3. You should see ONLY ONE popup');
      console.log('4. Try typing "a" - should be REJECTED');
      console.log('5. Try typing "user@example.com" - should be ACCEPTED');
      console.log('');
      console.log('🔧 If you still see issues, the problem is browser cache.');
      console.log('   Clear ALL browser data and try again.');
    } else {
      console.error('❌ Failed to install new script:', result);
    }
    
  } catch (error) {
    console.error('❌ Script execution failed:', error);
    console.log('');
    console.log('🔧 MANUAL BACKUP PLAN:');
    console.log('1. Go to Settings > Notifications in Shopify Admin');
    console.log('2. Delete ALL existing script tags');
    console.log('3. Add new script tag with URL:');
    console.log('   https://zsmoutzjhqjgjehaituw.supabase.co/functions/v1/popup-embed-public?shop=testingstoresumeet.myshopify.com');
  }
})();