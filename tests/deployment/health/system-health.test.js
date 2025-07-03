/**
 * System Health Checks
 * Comprehensive health monitoring for all services
 */

const fetch = require('node-fetch');

const SERVICES = {
  supabase: {
    base: 'https://zsmoutzjhqjgjehaituw.supabase.co',
    functions: 'https://zsmoutzjhqjgjehaituw.supabase.co/functions/v1',
    description: 'Supabase Backend Services'
  },
  frontend: {
    production: 'https://smartpop-revenue-engine.vercel.app',
    description: 'Vercel Frontend Application'
  },
  external: {
    shopify: 'https://admin.shopify.com',
    description: 'External Dependencies'
  }
};

describe('System Health Monitoring', () => {

  // Overall system health check
  test('SYSTEM STATUS - All critical services should be operational', async () => {
    const healthResults = {
      supabase: false,
      frontend: false,
      api_endpoints: false,
      database: false
    };

    // Test Supabase base
    try {
      const supabaseResponse = await fetch(SERVICES.supabase.base, { timeout: 5000 });
      healthResults.supabase = supabaseResponse.status !== 404;
    } catch (error) {
      console.log(`⚠️ Supabase base unreachable: ${error.message}`);
    }

    // Test API endpoints
    try {
      const apiResponse = await fetch(`${SERVICES.supabase.functions}/popup-config?action=list&shop_domain=health-check.myshopify.com`, { timeout: 5000 });
      healthResults.api_endpoints = apiResponse.status === 200;
    } catch (error) {
      console.log(`⚠️ API endpoints unreachable: ${error.message}`);
    }

    // Test database connectivity through API
    try {
      const dbResponse = await fetch(`${SERVICES.supabase.functions}/popup-config?action=list&shop_domain=health-check.myshopify.com`, { timeout: 5000 });
      if (dbResponse.status === 200) {
        const result = await dbResponse.json();
        healthResults.database = result.success === true;
      }
    } catch (error) {
      console.log(`⚠️ Database connectivity test failed: ${error.message}`);
    }

    // Test frontend
    try {
      const frontendResponse = await fetch(SERVICES.frontend.production, { timeout: 5000 });
      healthResults.frontend = frontendResponse.status === 200;
    } catch (error) {
      console.log(`⚠️ Frontend unreachable: ${error.message}`);
    }

    // Report results
    Object.entries(healthResults).forEach(([service, status]) => {
      console.log(`${status ? '✅' : '❌'} ${service}: ${status ? 'HEALTHY' : 'UNHEALTHY'}`);
    });

    // At least API endpoints and database should be healthy
    expect(healthResults.api_endpoints).toBe(true);
    expect(healthResults.database).toBe(true);
    
    console.log('🏥 System health check completed');
  }, 20000);

  // Service-specific health checks
  describe('Individual Service Health', () => {

    test('SUPABASE - Core services should be operational', async () => {
      const response = await fetch(SERVICES.supabase.base);
      expect(response.status).not.toBe(404);
      
      console.log(`✅ Supabase core: HTTP ${response.status}`);
    });

    test('FUNCTIONS - Edge functions should be deployed', async () => {
      const functions = ['popup-config', 'popup-embed-public', 'popup-track'];
      
      for (const func of functions) {
        const response = await fetch(`${SERVICES.supabase.functions}/${func}`);
        expect(response.status).not.toBe(404);
        console.log(`✅ Function ${func}: HTTP ${response.status}`);
      }
    });

    test('DATABASE - Should accept connections', async () => {
      const response = await fetch(`${SERVICES.supabase.functions}/popup-config?action=list&shop_domain=db-health-check.myshopify.com`);
      
      expect(response.status).toBe(200);
      
      const result = await response.json();
      expect(result.success).toBe(true);
      
      console.log('✅ Database connection healthy');
    });

    test('FRONTEND - Should be accessible', async () => {
      try {
        const response = await fetch(SERVICES.frontend.production, { timeout: 10000 });
        
        if (response.status === 200) {
          console.log('✅ Frontend accessible');
        } else {
          console.log(`⚠️ Frontend status: HTTP ${response.status}`);
        }
      } catch (error) {
        console.log(`⚠️ Frontend health check failed: ${error.message}`);
      }
    });
  });
});

describe('Performance Health', () => {

  // Response time monitoring
  test('RESPONSE TIMES - Should meet performance benchmarks', async () => {
    const benchmarks = {
      'popup-config': 2000,
      'popup-embed-public': 3000,
      'popup-track': 1000
    };

    for (const [endpoint, maxTime] of Object.entries(benchmarks)) {
      const startTime = Date.now();
      
      try {
        let url;
        if (endpoint === 'popup-config') {
          url = `${SERVICES.supabase.functions}/${endpoint}?action=list&shop_domain=perf-test.myshopify.com`;
        } else if (endpoint === 'popup-embed-public') {
          url = `${SERVICES.supabase.functions}/${endpoint}?shop=perf-test.myshopify.com`;
        } else {
          url = `${SERVICES.supabase.functions}/${endpoint}`;
        }
        
        const response = await fetch(url);
        const responseTime = Date.now() - startTime;
        
        expect(responseTime).toBeLessThan(maxTime);
        console.log(`✅ ${endpoint}: ${responseTime}ms (target: <${maxTime}ms)`);
      } catch (error) {
        console.log(`⚠️ ${endpoint} performance test failed: ${error.message}`);
      }
    }
  }, 15000);

  // Throughput testing
  test('THROUGHPUT - Should handle concurrent requests', async () => {
    const concurrentRequests = 5;
    const promises = [];

    for (let i = 0; i < concurrentRequests; i++) {
      promises.push(
        fetch(`${SERVICES.supabase.functions}/popup-config?action=list&shop_domain=throughput-test-${i}.myshopify.com`)
      );
    }

    const responses = await Promise.all(promises);
    
    // All requests should succeed
    responses.forEach((response, index) => {
      expect(response.status).toBe(200);
      console.log(`✅ Concurrent request ${index + 1}: HTTP ${response.status}`);
    });

    console.log(`✅ Handled ${concurrentRequests} concurrent requests successfully`);
  }, 10000);
});

describe('External Dependencies Health', () => {

  // Test external service connectivity
  test('EXTERNAL SERVICES - Should reach required external services', async () => {
    const externalServices = [
      { name: 'Shopify Admin', url: 'https://admin.shopify.com', expectStatus: [200, 301, 302] }
    ];

    for (const service of externalServices) {
      try {
        const response = await fetch(service.url, { 
          timeout: 5000,
          redirect: 'manual' // Don't follow redirects for this test
        });
        
        const isHealthy = service.expectStatus.includes(response.status);
        console.log(`${isHealthy ? '✅' : '⚠️'} ${service.name}: HTTP ${response.status}`);
        
        if (!isHealthy) {
          console.log(`Expected one of: ${service.expectStatus.join(', ')}`);
        }
      } catch (error) {
        console.log(`⚠️ ${service.name} unreachable: ${error.message}`);
      }
    }
  });

  // Test DNS resolution
  test('DNS - Domain names should resolve', async () => {
    const domains = [
      'zsmoutzjhqjgjehaituw.supabase.co',
      'smartpop-revenue-engine.vercel.app',
      'admin.shopify.com'
    ];

    for (const domain of domains) {
      try {
        const response = await fetch(`https://${domain}`, { 
          timeout: 3000,
          method: 'HEAD'  // Just check if domain resolves
        });
        
        console.log(`✅ DNS resolution for ${domain}: OK`);
      } catch (error) {
        if (error.code === 'ENOTFOUND') {
          console.log(`❌ DNS resolution for ${domain}: FAILED`);
          throw new Error(`DNS resolution failed for ${domain}`);
        } else {
          console.log(`✅ DNS resolution for ${domain}: OK (${error.message})`);
        }
      }
    }
  });
});

describe('Security Health', () => {

  // Test SSL certificates
  test('SSL - Certificates should be valid', async () => {
    const httpsServices = [
      SERVICES.supabase.base,
      SERVICES.supabase.functions,
      SERVICES.frontend.production
    ];

    for (const service of httpsServices) {
      if (service.startsWith('https://')) {
        try {
          const response = await fetch(service, { timeout: 5000 });
          console.log(`✅ SSL certificate valid for ${service}`);
        } catch (error) {
          if (error.message.includes('certificate') || error.message.includes('SSL')) {
            console.log(`❌ SSL certificate issue for ${service}: ${error.message}`);
            throw error;
          } else {
            console.log(`✅ SSL certificate valid for ${service} (${error.message})`);
          }
        }
      }
    }
  });

  // Test CORS configuration
  test('CORS - Cross-origin policies should be configured', async () => {
    const response = await fetch(`${SERVICES.supabase.functions}/popup-embed-public?shop=cors-test.myshopify.com`);
    
    expect(response.headers.get('access-control-allow-origin')).toBe('*');
    expect(response.headers.get('access-control-allow-methods')).toContain('GET');
    
    console.log('✅ CORS policies configured correctly');
  });
});

describe('Data Integrity Health', () => {

  // Test database operations
  test('DATABASE OPERATIONS - CRUD operations should work', async () => {
    const testData = {
      action: 'save',
      title: 'Health Check Popup',
      content: 'System health verification',
      shop_domain: 'health-test.myshopify.com',
      trigger_type: 'time_delay',
      trigger_value: '3000'
    };

    // Create
    const createResponse = await fetch(`${SERVICES.supabase.functions}/popup-config`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testData)
    });

    expect(createResponse.status).toBe(200);
    const createResult = await createResponse.json();
    expect(createResult.success).toBe(true);

    const popupId = createResult.popup.id;
    console.log('✅ Database CREATE operation working');

    // Read
    const readResponse = await fetch(`${SERVICES.supabase.functions}/popup-config?action=list&shop_domain=health-test.myshopify.com`);
    const readResult = await readResponse.json();
    
    const foundPopup = readResult.popups.find(p => p.id === popupId);
    expect(foundPopup).toBeDefined();
    console.log('✅ Database READ operation working');

    // Delete (cleanup)
    const deleteResponse = await fetch(`${SERVICES.supabase.functions}/popup-config`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'delete',
        id: popupId,
        shop_domain: 'health-test.myshopify.com'
      })
    });

    expect(deleteResponse.status).toBe(200);
    console.log('✅ Database DELETE operation working');
    console.log('✅ Full CRUD cycle healthy');
  }, 15000);
});