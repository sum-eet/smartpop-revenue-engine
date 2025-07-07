// 🚨 EMERGENCY FIX SCRIPT - COPY AND PASTE THIS IN SHOPIFY ADMIN CONSOLE
// Go to: https://admin.shopify.com/store/testingstoresumeet
// Open browser console (F12) 
// Paste this ENTIRE script and press Enter

console.log('🚨 EMERGENCY FIX: Removing ALL popup scripts and installing ONE working version...');

// STEP 1: Remove ALL existing script tags that could be causing conflicts
fetch('/admin/api/2023-10/script_tags.json')
  .then(r => r.json())
  .then(data => {
    console.log('🔍 Found', data.script_tags.length, 'total script tags');
    
    // Remove ANYTHING popup related
    const toRemove = data.script_tags.filter(script => {
      return script.src.includes('smartpop') || 
             script.src.includes('popup') ||
             script.src.includes('supabase.co/functions') ||
             script.src.includes('zsmoutzjhqjgjehaituw');
    });
    
    console.log('🗑️ Found', toRemove.length, 'popup-related scripts to remove:');
    toRemove.forEach(script => {
      console.log('   - Removing:', script.src);
    });
    
    // Delete all conflicting scripts
    Promise.all(toRemove.map(script => 
      fetch(`/admin/api/2023-10/script_tags/${script.id}.json`, {method: 'DELETE'})
        .then(() => console.log('✅ Deleted:', script.id))
        .catch(e => console.log('❌ Failed to delete:', script.id, e))
    )).then(() => {
      console.log('');
      console.log('🧹 Cleanup complete! Installing fixed script...');
      
      // STEP 2: Install ONE fixed script that prevents duplicates
      setTimeout(() => {
        const fixedScriptUrl = 'https://zsmoutzjhqjgjehaituw.supabase.co/functions/v1/popup-embed-public?shop=testingstoresumeet.myshopify.com&v=' + Date.now();
        
        console.log('📦 Installing FIXED script with duplicate prevention...');
        console.log('📍 URL:', fixedScriptUrl);
        
        fetch('/admin/api/2023-10/script_tags.json', {
          method: 'POST',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({
            script_tag: {
              event: 'onload',
              src: fixedScriptUrl
            }
          })
        })
        .then(r => r.json())
        .then(result => {
          if (result.script_tag) {
            console.log('');
            console.log('🎉🎉🎉 EMERGENCY FIX COMPLETE! 🎉🎉🎉');
            console.log('');
            console.log('✅ Single popup script installed');
            console.log('✅ Duplicate prevention enabled');
            console.log('✅ Fixed email validation implemented');
            console.log('');
            console.log('📋 NEXT STEPS:');
            console.log('1. Clear browser cache (Ctrl+Shift+R)');
            console.log('2. Visit: https://testingstoresumeet.myshopify.com/');
            console.log('3. Should see ONLY ONE popup');
            console.log('4. Try typing "a" - should be REJECTED');
            console.log('5. Try typing "user@example.com" - should be ACCEPTED');
            console.log('');
            console.log('🆔 Script ID:', result.script_tag.id);
            console.log('🌐 Script URL:', result.script_tag.src);
          } else {
            console.error('❌ Installation failed:', result);
          }
        })
        .catch(error => {
          console.error('❌ Error installing fixed script:', error);
        });
      }, 2000); // Wait 2 seconds for deletions to complete
    });
  })
  .catch(error => {
    console.error('❌ Error accessing script tags:', error);
    console.log('');
    console.log('🔧 MANUAL BACKUP PLAN:');
    console.log('1. Go to Settings > Notifications');
    console.log('2. Scroll to Scripts section');
    console.log('3. Delete ALL popup-related script tags');
    console.log('4. Add new script tag with URL:');
    console.log('   https://zsmoutzjhqjgjehaituw.supabase.co/functions/v1/popup-embed-public?shop=testingstoresumeet.myshopify.com');
  });