const puppeteer = require('puppeteer');

const POPUP_STYLES = [
  {
    name: 'Native iOS/macOS',
    value: 'native',
    urlParam: '?popup_style=ios-notification',
    description: 'Platform-specific notifications'
  },
  {
    name: 'Traditional Modal',
    value: 'traditional',
    urlParam: '?popup_style=traditional-modal',
    description: 'Centered overlay popup'
  },
  {
    name: 'Minimal Banner',
    value: 'minimal', 
    urlParam: '?popup_style=minimal-banner',
    description: 'Subtle top bar notification'
  },
  {
    name: 'Corner Toast',
    value: 'corner',
    urlParam: '?popup_style=corner-toast',
    description: 'Bottom-right notification'
  }
];

async function createTestPopup(style) {
  const response = await fetch('https://zsmoutzjhqjgjehaituw.supabase.co/functions/v1/popup-config', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'save',
      name: `${style.name} Test`,
      trigger_type: 'exit_intent',
      page_target: 'all_pages',
      popup_type: 'discount_offer',
      popup_style: style.value,
      title: `${style.name} Notification`,
      description: `Testing ${style.description}`,
      button_text: 'Get Offer',
      email_placeholder: 'Enter your email',
      discount_code: `${style.value.toUpperCase()}20`,
      discount_percent: '20',
      shop_domain: 'testingstoresumeet.myshopify.com'
    })
  });
  
  return await response.json();
}

async function testPopupStyle(browser, style) {
  console.log(`\n🎨 Testing ${style.name} Style...`);
  
  const page = await browser.newPage();
  
  // Listen for console logs
  page.on('console', msg => {
    const text = msg.text();
    if (text.includes('Progressive') || text.includes('Style') || text.includes('Platform')) {
      console.log(`  📄 ${style.name}:`, text);
    }
  });
  
  try {
    // Create test popup for this style
    const createResult = await createTestPopup(style);
    if (createResult.success) {
      console.log(`  ✅ Created ${style.name} popup:`, createResult.data.id);
    } else {
      console.log(`  ❌ Failed to create ${style.name} popup:`, createResult.error);
      return;
    }
    
    // Navigate to test store
    await page.goto(`https://testingstoresumeet.myshopify.com/${style.urlParam}`, {
      waitUntil: 'networkidle0',
      timeout: 30000
    });
    
    // Handle password
    const hasPasswordForm = await page.$('form[action*="password"]');
    if (hasPasswordForm) {
      await page.type('input[name="password"]', 'eaneus');
      await page.click('button[type="submit"], input[type="submit"]');
      await page.waitForNavigation({ waitUntil: 'networkidle0' });
    }
    
    // Wait for script initialization
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Trigger exit intent
    console.log(`  🎯 Triggering exit intent for ${style.name}...`);
    for (let i = 0; i < 4; i++) {
      await page.mouse.move(Math.random() * 1000, Math.random() * 50);
      await new Promise(resolve => setTimeout(resolve, 150));
    }
    
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Check for notifications
    const notifications = await page.evaluate(() => {
      const elements = document.querySelectorAll('[class*="notification"], [class*="modal"], [class*="banner"], [class*="toast"], [id*="smartpop"]');
      return Array.from(elements).map(el => ({
        id: el.id,
        className: el.className,
        visible: el.offsetParent !== null,
        rect: el.getBoundingClientRect(),
        hasShowClass: el.classList.contains('show')
      }));
    });
    
    console.log(`  📊 Found ${notifications.length} notification elements:`);
    notifications.forEach((notif, i) => {
      console.log(`    ${i+1}. ${notif.className} - Visible: ${notif.visible}, Show: ${notif.hasShowClass}`);
    });
    
    // Take screenshot
    await page.screenshot({ 
      path: `test-${style.value}-style.png`,
      fullPage: true
    });
    console.log(`  📸 Screenshot saved: test-${style.value}-style.png`);
    
  } catch (error) {
    console.error(`  ❌ ${style.name} test failed:`, error.message);
  } finally {
    await page.close();
  }
}

(async () => {
  console.log('🎨 Testing All Popup Styles...');
  
  const browser = await puppeteer.launch({ 
    headless: false, 
    defaultViewport: null 
  });
  
  try {
    for (const style of POPUP_STYLES) {
      await testPopupStyle(browser, style);
      await new Promise(resolve => setTimeout(resolve, 1000)); // Brief pause between tests
    }
    
    console.log('\n✅ All popup style tests completed!');
    console.log('📊 Summary:');
    POPUP_STYLES.forEach(style => {
      console.log(`  • ${style.name}: ${style.description}`);
    });
    
  } catch (error) {
    console.error('❌ Test suite failed:', error);
  } finally {
    await browser.close();
  }
})();