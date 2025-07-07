// COPY AND PASTE THIS IN SHOPIFY ADMIN CONSOLE
// Go to: https://admin.shopify.com/store/testingstoresumeet
// Open browser console (F12)
// Paste this entire script and press Enter

console.log('🚀 Installing SmartPop script tag...');

// Remove any existing SmartPop scripts first
fetch('/admin/api/2023-10/script_tags.json')
  .then(r => r.json())
  .then(data => {
    console.log('Found', data.script_tags.length, 'existing script tags');
    
    // Remove old SmartPop scripts
    data.script_tags.forEach(script => {
      if (script.src.includes('smartpop') || script.src.includes('popup')) {
        console.log('🗑️ Removing old script:', script.src);
        fetch(`/admin/api/2023-10/script_tags/${script.id}.json`, {method: 'DELETE'});
      }
    });
    
    // Wait a moment then install new script
    setTimeout(() => {
      const scriptUrl = 'https://zsmoutzjhqjgjehaituw.supabase.co/functions/v1/popup-script?shop=testingstoresumeet.myshopify.com';
      
      console.log('📦 Installing new script:', scriptUrl);
      
      fetch('/admin/api/2023-10/script_tags.json', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
          script_tag: {
            event: 'onload',
            src: scriptUrl
          }
        })
      })
      .then(r => r.json())
      .then(result => {
        if (result.script_tag) {
          console.log('');
          console.log('🎉 SUCCESS! Script tag installed successfully!');
          console.log('📍 Script ID:', result.script_tag.id);
          console.log('🌐 Script URL:', result.script_tag.src);
          console.log('');
          console.log('🧪 NOW TEST:');
          console.log('1. Visit: https://testingstoresumeet.myshopify.com/');
          console.log('2. Wait 2 seconds for popup to appear');
          console.log('3. Check console for SmartPop logs');
          console.log('4. You should see your 8 configured popups!');
        } else {
          console.error('❌ Installation failed:', result);
        }
      })
      .catch(error => console.error('❌ Error installing script:', error));
    }, 1500);
  })
  .catch(error => console.error('❌ Error checking existing scripts:', error));