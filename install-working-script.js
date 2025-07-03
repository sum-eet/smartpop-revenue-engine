// INSTALL WORKING SCRIPT - Console paste this in Shopify admin

// Remove old scripts and install new working one
fetch('/admin/api/2023-10/script_tags.json')
  .then(r => r.json())
  .then(data => {
    console.log('Found script tags:', data.script_tags.length);
    
    // Remove old SmartPop scripts
    data.script_tags.forEach(script => {
      if (script.src.includes('smartpop') || script.src.includes('popup')) {
        console.log('Removing old script:', script.src);
        fetch(`/admin/api/2023-10/script_tags/${script.id}.json`, {method: 'DELETE'});
      }
    });
    
    // Install new working script
    setTimeout(() => {
      const newScriptUrl = 'https://zsmoutzjhqjgjehaituw.supabase.co/functions/v1/popup-script?shop=testingstoresumeet.myshopify.com';
      
      console.log('Installing new script:', newScriptUrl);
      
      fetch('/admin/api/2023-10/script_tags.json', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
          script_tag: {
            event: 'onload',
            src: newScriptUrl
          }
        })
      })
      .then(r => r.json())
      .then(result => {
        console.log('✅ SCRIPT INSTALLED SUCCESSFULLY!');
        console.log('Script ID:', result.script_tag.id);
        console.log('Script URL:', result.script_tag.src);
        console.log('');
        console.log('🎯 NOW TEST:');
        console.log('1. Visit: https://testingstoresumeet.myshopify.com/');
        console.log('2. Wait 2 seconds for popup to appear');
        console.log('3. Check console for SmartPop logs');
      })
      .catch(error => console.error('❌ Installation failed:', error));
    }, 1000);
  })
  .catch(error => console.error('❌ Error:', error));