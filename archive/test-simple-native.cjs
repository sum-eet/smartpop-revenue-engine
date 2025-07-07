const puppeteer = require('puppeteer');

(async () => {
  console.log('🔍 Simple Native Notification Test...');
  
  const browser = await puppeteer.launch({ 
    headless: false, 
    defaultViewport: null,
    args: ['--start-maximized']
  });
  
  const page = await browser.newPage();
  
  // Listen for console logs
  page.on('console', msg => {
    const text = msg.text();
    if (text.includes('SmartPop') || text.includes('Progressive') || text.includes('Platform')) {
      console.log('📄 Console:', text);
    }
  });
  
  try {
    console.log('🌐 Loading test store with iOS style...');
    await page.goto('https://testingstoresumeet.myshopify.com/?popup_style=ios-notification', {
      waitUntil: 'networkidle0',
      timeout: 30000
    });
    
    // Handle password
    const hasPasswordForm = await page.$('form[action*="password"]');
    if (hasPasswordForm) {
      console.log('🔒 Entering password...');
      await page.type('input[name="password"]', 'eaneus');
      await page.click('button[type="submit"], input[type="submit"]');
      await page.waitForNavigation({ waitUntil: 'networkidle0' });
    }
    
    console.log('⏱️ Waiting for script to initialize...');
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    console.log('🎯 Triggering exit intent...');
    // Simple trigger - rapid mouse movements
    for (let i = 0; i < 5; i++) {
      await page.mouse.move(Math.random() * 1000, Math.random() * 50);
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Check for any smartpop notifications
    const popups = await page.evaluate(() => {
      const smartpopElements = document.querySelectorAll('[id*="smartpop"], [class*="smartpop"]');
      return Array.from(smartpopElements).map(el => ({
        id: el.id,
        className: el.className,
        innerHTML: el.innerHTML.substring(0, 100) + '...',
        visible: el.offsetParent !== null,
        rect: el.getBoundingClientRect()
      }));
    });
    
    console.log('\n📊 Found SmartPop Elements:', popups.length);
    popups.forEach((popup, i) => {
      console.log(`  ${i+1}. ID: ${popup.id}, Class: ${popup.className}`);
      console.log(`     Visible: ${popup.visible}, Size: ${Math.round(popup.rect.width)}x${Math.round(popup.rect.height)}`);
    });
    
    // Check platform detection
    const platformInfo = await page.evaluate(() => {
      return {
        userAgent: navigator.userAgent,
        platform: navigator.platform,
        darkMode: window.matchMedia('(prefers-color-scheme: dark)').matches,
        reducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches
      };
    });
    
    console.log('\n🖥️ Platform Detection:', platformInfo);
    
    // Take screenshot
    await page.screenshot({ 
      path: 'native-notification-test.png',
      fullPage: true
    });
    console.log('📸 Screenshot saved: native-notification-test.png');
    
    // Keep browser open for manual inspection
    console.log('\n👀 Browser staying open for 10 seconds for manual inspection...');
    await new Promise(resolve => setTimeout(resolve, 10000));
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  } finally {
    await browser.close();
  }
})();