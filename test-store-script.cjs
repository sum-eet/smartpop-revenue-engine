const puppeteer = require('puppeteer');

(async () => {
  console.log('🔍 Testing if SmartPop script is actually running on store...');
  
  const browser = await puppeteer.launch({headless: false});
  const page = await browser.newPage();
  
  // Listen for console logs from the page
  page.on('console', msg => {
    const text = msg.text();
    if (text.includes('SmartPop') || text.includes('popup')) {
      console.log('📄 Store Console:', text);
    }
  });
  
  // Listen for script loading
  page.on('response', response => {
    const url = response.url();
    if (url.includes('popup-script') || url.includes('smartpop')) {
      console.log('📥 Script Request:', url, 'Status:', response.status());
    }
  });
  
  try {
    console.log('🌐 Loading store page...');
    await page.goto('https://testingstoresumeet.myshopify.com/', {
      waitUntil: 'networkidle0',
      timeout: 30000
    });
    
    // Check if password page exists
    const hasPasswordForm = await page.$('form[action*="password"]');
    if (hasPasswordForm) {
      console.log('🔒 Store is password protected, entering password...');
      await page.type('input[name="password"]', 'eaneus');
      await page.click('button[type="submit"], input[type="submit"]');
      await page.waitForNavigation({ waitUntil: 'networkidle0' });
      console.log('✅ Password entered, now on store page');
    }
    
    console.log('⏱️ Waiting 3 seconds for script to initialize...');
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Test exit intent by moving mouse to top
    console.log('🖱️ Simulating exit intent...');
    await page.mouse.move(0, 0); // Move to top-left corner
    await page.evaluate(() => {
      // Simulate mouse leave event
      const event = new MouseEvent('mouseleave', {
        clientX: 0,
        clientY: -10, // Above the page
        bubbles: true
      });
      document.dispatchEvent(event);
    });
    
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Check if SmartPop variables exist
    const scriptStatus = await page.evaluate(() => {
      return {
        smartPopInitialized: typeof window.smartPopInitialized !== 'undefined',
        smartPopInitializedValue: window.smartPopInitialized,
        hasSmartPopElements: document.querySelectorAll('[id*="smartpop"]').length,
        exitIntentDetected: window.hasExitIntent || false,
        scriptTags: Array.from(document.querySelectorAll('script')).filter(s => 
          s.src && (s.src.includes('popup-script') || s.src.includes('smartpop'))
        ).map(s => s.src),
        consoleErrors: []
      };
    });
    
    console.log('');
    console.log('📊 ACTUAL TEST RESULTS:');
    console.log('========================');
    console.log('SmartPop Initialized:', scriptStatus.smartPopInitialized);
    console.log('Initialization Value:', scriptStatus.smartPopInitializedValue);
    console.log('SmartPop Elements:', scriptStatus.hasSmartPopElements);
    console.log('Exit Intent Detected:', scriptStatus.exitIntentDetected);
    console.log('Script Tags Found:', scriptStatus.scriptTags);
    console.log('');
    
    if (scriptStatus.scriptTags.length === 0) {
      console.log('❌ NO SCRIPT TAGS FOUND IN PAGE HTML');
      console.log('The script tag is not being loaded by Shopify');
    } else if (!scriptStatus.smartPopInitialized) {
      console.log('❌ SCRIPT LOADED BUT NOT EXECUTING');
      console.log('Script is present but failing to initialize');
    } else {
      console.log('✅ SCRIPT IS WORKING');
      console.log('SmartPop is initialized and running');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  } finally {
    await browser.close();
  }
})();