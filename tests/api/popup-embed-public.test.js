/**
 * Tests for popup-embed-public endpoint
 * Tests admin detection and public script serving
 */

const fetch = require('node-fetch');
const { JSDOM } = require('jsdom');

const BASE_URL = 'https://zsmoutzjhqjgjehaituw.supabase.co/functions/v1/popup-embed-public';
const TEST_SHOP = 'testingstoresumeet.myshopify.com';

describe('Popup Embed Public API', () => {

  // Test script delivery
  test('SCRIPT DELIVERY - Should return JavaScript content', async () => {
    const response = await fetch(`${BASE_URL}?shop=${TEST_SHOP}`);
    
    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toContain('application/javascript');
    
    const script = await response.text();
    expect(script).toContain('SmartPop');
    expect(script).toContain('admin.shopify.com');
    expect(script).toContain('shouldSkipPopup');
  });

  // Test CORS headers
  test('CORS - Should have proper CORS headers', async () => {
    const response = await fetch(`${BASE_URL}?shop=${TEST_SHOP}`);
    
    expect(response.headers.get('access-control-allow-origin')).toBe('*');
    expect(response.headers.get('access-control-allow-methods')).toContain('GET');
  });

  // Test admin detection in script content
  test('ADMIN DETECTION - Script should contain admin blocking logic', async () => {
    const response = await fetch(`${BASE_URL}?shop=${TEST_SHOP}`);
    const script = await response.text();
    
    // Check for admin detection patterns
    expect(script).toContain('admin.shopify.com');
    expect(script).toContain('hostname ===');
    expect(script).toContain('console.log(\'🚫');
    expect(script).toContain('return');
  });

  // Test script execution in simulated environments
  test('ADMIN BLOCKING - Should block on admin.shopify.com', async () => {
    const response = await fetch(`${BASE_URL}?shop=${TEST_SHOP}`);
    const script = await response.text();
    
    // Simulate admin environment
    const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>', {
      url: 'https://admin.shopify.com/store/test/apps/smart-popup2'
    });
    
    global.window = dom.window;
    global.document = dom.window.document;
    global.console = { log: jest.fn() };
    
    // Execute script
    eval(script);
    
    // Check that admin blocking message was logged
    expect(global.console.log).toHaveBeenCalledWith(
      expect.stringContaining('🚫')
    );
  });

  // Test script execution on customer store
  test('CUSTOMER STORE - Should allow on customer store pages', async () => {
    const response = await fetch(`${BASE_URL}?shop=${TEST_SHOP}`);
    const script = await response.text();
    
    // Simulate customer store environment
    const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>', {
      url: 'https://testingstoresumeet.myshopify.com/products/test-product'
    });
    
    global.window = dom.window;
    global.document = dom.window.document;
    global.console = { log: jest.fn() };
    
    // Mock fetch for popup data
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true, popups: [] })
    });
    
    // Execute script
    eval(script);
    
    // Check that customer store was confirmed
    expect(global.console.log).toHaveBeenCalledWith(
      expect.stringContaining('✅')
    );
  });

  // Test error handling - missing shop parameter
  test('ERROR - Should handle missing shop parameter', async () => {
    const response = await fetch(BASE_URL);
    
    expect(response.status).toBe(400);
    const result = await response.text();
    expect(result).toContain('error');
  });

  // Test debug mode
  test('DEBUG MODE - Should include debug logs when enabled', async () => {
    const response = await fetch(`${BASE_URL}?shop=${TEST_SHOP}&debug=true`);
    const script = await response.text();
    
    expect(script).toContain('DEBUG MODE ENABLED');
    expect(script).toContain('console.log');
  });

  // Test performance - response time
  test('PERFORMANCE - Should respond quickly', async () => {
    const startTime = Date.now();
    const response = await fetch(`${BASE_URL}?shop=${TEST_SHOP}`);
    const responseTime = Date.now() - startTime;
    
    expect(response.status).toBe(200);
    expect(responseTime).toBeLessThan(2000); // Should respond within 2 seconds
  });

  // Test caching headers
  test('CACHING - Should have appropriate cache headers', async () => {
    const response = await fetch(`${BASE_URL}?shop=${TEST_SHOP}`);
    
    // Should have cache control for performance
    const cacheControl = response.headers.get('cache-control');
    expect(cacheControl).toBeDefined();
  });
});

// Admin detection test scenarios
describe('Admin Detection Scenarios', () => {
  const adminTestCases = [
    {
      url: 'https://admin.shopify.com/store/test/apps/smart-popup2',
      shouldBlock: true,
      description: 'Main admin app page'
    },
    {
      url: 'https://admin.shopify.com/store/test/settings',
      shouldBlock: true,
      description: 'Admin settings page'
    },
    {
      url: 'https://testingstoresumeet.myshopify.com/',
      shouldBlock: false,
      description: 'Store homepage'
    },
    {
      url: 'https://testingstoresumeet.myshopify.com/products/test',
      shouldBlock: false,
      description: 'Product page'
    },
    {
      url: 'https://testingstoresumeet.myshopify.com/collections/all',
      shouldBlock: false,
      description: 'Collections page'
    }
  ];

  adminTestCases.forEach(testCase => {
    test(`${testCase.description} - ${testCase.shouldBlock ? 'BLOCK' : 'ALLOW'}`, async () => {
      const response = await fetch(`${BASE_URL}?shop=${TEST_SHOP}`);
      const script = await response.text();
      
      const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>', {
        url: testCase.url
      });
      
      global.window = dom.window;
      global.document = dom.window.document;
      global.console = { log: jest.fn() };
      
      eval(script);
      
      if (testCase.shouldBlock) {
        expect(global.console.log).toHaveBeenCalledWith(
          expect.stringContaining('🚫')
        );
      } else {
        expect(global.console.log).toHaveBeenCalledWith(
          expect.stringContaining('✅')
        );
      }
    });
  });
});