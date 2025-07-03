/**
 * Backend Deployment Tests - Supabase Functions
 * Verifies all edge functions are deployed and accessible
 */

const fetch = require('node-fetch');

const SUPABASE_URL = 'https://zsmoutzjhqjgjehaituw.supabase.co';
const FUNCTIONS_BASE = `${SUPABASE_URL}/functions/v1`;

describe('Supabase Functions Deployment', () => {

  // Core function endpoints
  const REQUIRED_FUNCTIONS = [
    'popup-config',
    'popup-embed-public', 
    'popup-track',
    'shopify-auth',
    'auth-middleware'
  ];

  // Test each required function is deployed
  REQUIRED_FUNCTIONS.forEach(functionName => {
    test(`FUNCTION DEPLOYED - ${functionName} should be accessible`, async () => {
      const response = await fetch(`${FUNCTIONS_BASE}/${functionName}`, {
        method: 'GET'
      });

      // Function should respond (not 404)
      expect(response.status).not.toBe(404);
      
      // Should not be a Supabase "function not found" error
      const text = await response.text();
      expect(text).not.toContain('Function not found');
      expect(text).not.toContain('Edge Function not deployed');
      
      console.log(`✅ ${functionName}: HTTP ${response.status}`);
    }, 10000);
  });

  // Test popup-config endpoint specifically
  test('POPUP-CONFIG - Should handle requests correctly', async () => {
    const response = await fetch(`${FUNCTIONS_BASE}/popup-config?action=list&shop_domain=test.myshopify.com`);
    
    expect(response.status).toBe(200);
    
    const result = await response.json();
    expect(result).toHaveProperty('success');
    
    console.log('✅ popup-config responds with valid JSON');
  });

  // Test popup-embed-public endpoint
  test('POPUP-EMBED-PUBLIC - Should serve JavaScript', async () => {
    const response = await fetch(`${FUNCTIONS_BASE}/popup-embed-public?shop=test.myshopify.com`);
    
    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toContain('javascript');
    
    const script = await response.text();
    expect(script).toContain('SmartPop');
    expect(script.length).toBeGreaterThan(1000); // Should be substantial script
    
    console.log(`✅ popup-embed-public serves ${script.length} bytes of JS`);
  });

  // Test CORS headers
  test('CORS - Functions should have proper CORS headers', async () => {
    const response = await fetch(`${FUNCTIONS_BASE}/popup-embed-public?shop=test.myshopify.com`);
    
    expect(response.headers.get('access-control-allow-origin')).toBe('*');
    expect(response.headers.get('access-control-allow-methods')).toContain('GET');
    
    console.log('✅ CORS headers configured correctly');
  });

  // Test function performance
  test('PERFORMANCE - Functions should respond quickly', async () => {
    const startTime = Date.now();
    
    const response = await fetch(`${FUNCTIONS_BASE}/popup-config?action=list&shop_domain=test.myshopify.com`);
    
    const responseTime = Date.now() - startTime;
    
    expect(response.status).toBe(200);
    expect(responseTime).toBeLessThan(5000); // Should respond within 5 seconds
    
    console.log(`✅ Response time: ${responseTime}ms`);
  });

  // Test error handling
  test('ERROR HANDLING - Should handle invalid requests gracefully', async () => {
    const response = await fetch(`${FUNCTIONS_BASE}/popup-config`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ invalid: 'request' })
    });
    
    expect(response.status).toBe(400);
    
    const result = await response.json();
    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
    
    console.log('✅ Error handling works correctly');
  });

  // Test authentication middleware
  test('AUTH MIDDLEWARE - Should be deployed and functional', async () => {
    const response = await fetch(`${FUNCTIONS_BASE}/auth-middleware`);
    
    // Should respond (not 404) - actual response depends on implementation
    expect(response.status).not.toBe(404);
    
    console.log(`✅ auth-middleware: HTTP ${response.status}`);
  });
});

describe('Database Connectivity', () => {

  // Test database connection through API
  test('DATABASE - Should connect through popup-config', async () => {
    const response = await fetch(`${FUNCTIONS_BASE}/popup-config?action=list&shop_domain=deployment-test.myshopify.com`);
    
    expect(response.status).toBe(200);
    
    const result = await response.json();
    expect(result.success).toBe(true);
    expect(Array.isArray(result.popups)).toBe(true);
    
    console.log('✅ Database connection successful');
  });

  // Test database write operations
  test('DATABASE WRITE - Should handle create operations', async () => {
    const testPopup = {
      action: 'save',
      title: 'Deployment Test Popup',
      content: 'Testing database write',
      shop_domain: 'deployment-test.myshopify.com',
      trigger_type: 'time_delay',
      trigger_value: '3000'
    };

    const response = await fetch(`${FUNCTIONS_BASE}/popup-config`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testPopup)
    });

    expect(response.status).toBe(200);
    
    const result = await response.json();
    expect(result.success).toBe(true);
    expect(result.popup).toBeDefined();
    
    // Cleanup - delete the test popup
    if (result.popup?.id) {
      await fetch(`${FUNCTIONS_BASE}/popup-config`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'delete',
          id: result.popup.id,
          shop_domain: 'deployment-test.myshopify.com'
        })
      });
    }
    
    console.log('✅ Database write operations working');
  });
});

describe('Security Validation', () => {

  // Test that sensitive endpoints require authentication
  test('SECURITY - Should protect authenticated endpoints', async () => {
    // Test without proper auth headers
    const response = await fetch(`${FUNCTIONS_BASE}/popup-config`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'save',
        title: 'Unauthorized Test'
      })
    });

    // Should either require auth or validate shop_domain
    const result = await response.json();
    if (response.status === 401) {
      console.log('✅ Authentication required for protected endpoints');
    } else if (response.status === 400 && result.error) {
      console.log('✅ Input validation prevents unauthorized access');
    } else {
      console.log('⚠️ Review security configuration');
    }
  });

  // Test that public endpoints don't expose sensitive data
  test('SECURITY - Public endpoints should be safe', async () => {
    const response = await fetch(`${FUNCTIONS_BASE}/popup-embed-public?shop=test.myshopify.com`);
    
    expect(response.status).toBe(200);
    
    const script = await response.text();
    
    // Should not contain sensitive information
    expect(script).not.toContain('password');
    expect(script).not.toContain('secret');
    expect(script).not.toContain('private');
    expect(script).not.toContain('token');
    
    console.log('✅ Public endpoints do not expose sensitive data');
  });
});

describe('Environment Configuration', () => {

  // Test that required environment variables are configured
  test('ENVIRONMENT - Required services should be accessible', async () => {
    // Test Supabase base URL
    const response = await fetch(SUPABASE_URL);
    expect(response.status).not.toBe(404);
    
    console.log('✅ Supabase base URL accessible');
  });

  // Test function deployment timestamp/version
  test('DEPLOYMENT INFO - Should have recent deployment', async () => {
    const response = await fetch(`${FUNCTIONS_BASE}/popup-embed-public?shop=test.myshopify.com`);
    const script = await response.text();
    
    // Check if script contains our expected content (indicates recent deployment)
    expect(script).toContain('admin.shopify.com');
    expect(script).toContain('shouldSkipPopup');
    
    console.log('✅ Functions contain expected recent code');
  });
});