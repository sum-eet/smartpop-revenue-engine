const puppeteer = require('puppeteer');

(async () => {
  console.log('🔍 Testing Native Notification System...');
  
  const browser = await puppeteer.launch({ 
    headless: false, 
    defaultViewport: null,
    args: ['--start-maximized']
  });
  
  const platformStyles = [
    { name: 'iOS', url: '?popup_style=ios-notification' },
    { name: 'Android', url: '?popup_style=android-toast' },
    { name: 'macOS Safari', url: '?popup_style=macos-safari' },
    { name: 'macOS Chrome', url: '?popup_style=macos-chrome' },
    { name: 'Windows', url: '?popup_style=windows-toast' },
    { name: 'Auto-detect', url: '' }
  ];
  
  for (const style of platformStyles) {
    console.log(`\n🎯 Testing ${style.name} Style...`);
    
    const page = await browser.newPage();
    
    // Listen for console logs
    page.on('console', msg => {
      const text = msg.text();
      if (text.includes('SmartPop') || text.includes('Progressive') || text.includes('Platform')) {
        console.log(`  📄 ${style.name}:`, text);
      }
    });
    
    try {
      // Navigate to test store with style parameter
      await page.goto(`https://testingstoresumeet.myshopify.com/${style.url}`, {
        waitUntil: 'networkidle0',
        timeout: 30000
      });
      
      // Handle password if needed
      const hasPasswordForm = await page.$('form[action*="password"]');
      if (hasPasswordForm) {
        await page.type('input[name="password"]', 'eaneus');
        await page.click('button[type="submit"], input[type="submit"]');
        await page.waitForNavigation({ waitUntil: 'networkidle0' });
      }
      
      // Wait for script to initialize
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Trigger Level 1 popup
      console.log(`  🔵 Triggering Level 1 for ${style.name}...`);
      for (let i = 0; i < 3; i++) {
        await page.mouse.move(Math.random() * 800 + 100, Math.random() * 100 + 30);
        await page.mouse.move(Math.random() * 30, Math.random() * 30, { steps: 1 });
        await new Promise(resolve => setTimeout(resolve, 200));
      }
      
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Check if Level 1 popup appeared
      const level1Popup = await page.$('#smartpop-progressive-1');
      if (level1Popup) {
        console.log(`  ✅ ${style.name} Level 1 popup appeared!`);
        
        // Check styling and positioning
        const popupInfo = await page.evaluate(() => {
          const popup = document.getElementById('smartpop-progressive-1');
          if (!popup) return null;
          
          const rect = popup.getBoundingClientRect();
          const computedStyle = window.getComputedStyle(popup);
          
          return {
            position: computedStyle.position,
            top: computedStyle.top,
            left: computedStyle.left,
            right: computedStyle.right,
            bottom: computedStyle.bottom,
            width: rect.width,
            height: rect.height,
            background: computedStyle.background,
            borderRadius: computedStyle.borderRadius,
            fontFamily: computedStyle.fontFamily,
            className: popup.className
          };
        });
        
        console.log(`  📊 ${style.name} Popup Details:`, {
          position: popupInfo.position,
          placement: `top: ${popupInfo.top}, right: ${popupInfo.right}, bottom: ${popupInfo.bottom}`,
          size: `${Math.round(popupInfo.width)}x${Math.round(popupInfo.height)}`,
          borderRadius: popupInfo.borderRadius,
          hasBlur: popupInfo.background.includes('blur'),
          className: popupInfo.className
        });
        
        // Test email input and button
        await page.type('.smartpop-email', 'test@example.com');
        await page.click('.smartpop-btn');
        
        await new Promise(resolve => setTimeout(resolve, 1000));
        
      } else {
        console.log(`  ❌ ${style.name} Level 1 popup did not appear`);
      }
      
      // Take screenshot
      await page.screenshot({ 
        path: `test-${style.name.toLowerCase().replace(/\s+/g, '-')}-notification.png`,
        fullPage: true
      });
      
    } catch (error) {
      console.error(`  ❌ ${style.name} test failed:`, error.message);
    }
    
    await page.close();
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  console.log('\n🎉 Native Notification Testing Complete!');
  console.log('📸 Screenshots saved for each platform style');
  
  await browser.close();
})();