/**
 * Uptime Monitoring Script
 * Continuous monitoring of deployment health
 */

const fetch = require('node-fetch');

const ENDPOINTS = {
  'popup-config': 'https://zsmoutzjhqjgjehaituw.supabase.co/functions/v1/popup-config?action=list&shop_domain=uptime-check.myshopify.com',
  'popup-embed-public': 'https://zsmoutzjhqjgjehaituw.supabase.co/functions/v1/popup-embed-public?shop=uptime-check.myshopify.com',
  'frontend': 'https://smartpop-revenue-engine.vercel.app'
};

class UptimeMonitor {
  constructor() {
    this.results = {};
    this.startTime = Date.now();
  }

  async checkEndpoint(name, url) {
    const start = Date.now();
    
    try {
      const response = await fetch(url, { 
        timeout: 10000,
        headers: {
          'User-Agent': 'SmartPop-Uptime-Monitor/1.0'
        }
      });
      
      const responseTime = Date.now() - start;
      const status = response.status;
      
      return {
        name,
        url,
        status,
        responseTime,
        success: status >= 200 && status < 400,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        name,
        url, 
        status: 0,
        responseTime: Date.now() - start,
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  async runCheck() {
    console.log(`🔍 Running uptime check at ${new Date().toISOString()}`);
    
    const promises = Object.entries(ENDPOINTS).map(([name, url]) => 
      this.checkEndpoint(name, url)
    );
    
    const results = await Promise.all(promises);
    
    // Display results
    console.log('\n📊 Uptime Check Results:');
    console.log('========================');
    
    let allHealthy = true;
    
    results.forEach(result => {
      const status = result.success ? '✅' : '❌';
      const responseTime = result.responseTime;
      
      console.log(`${status} ${result.name}: ${result.status} (${responseTime}ms)`);
      
      if (!result.success) {
        allHealthy = false;
        if (result.error) {
          console.log(`   Error: ${result.error}`);
        }
      }
      
      // Warn on slow responses
      if (result.success && responseTime > 5000) {
        console.log(`   ⚠️ Slow response: ${responseTime}ms`);
      }
    });
    
    // Overall status
    console.log('\n' + '='.repeat(24));
    if (allHealthy) {
      console.log('🎉 All services healthy');
    } else {
      console.log('⚠️ Some services have issues');
    }
    
    return {
      timestamp: new Date().toISOString(),
      allHealthy,
      results
    };
  }

  async startMonitoring(intervalMinutes = 5) {
    console.log(`🚀 Starting uptime monitoring (checking every ${intervalMinutes} minutes)`);
    
    // Initial check
    await this.runCheck();
    
    // Set up interval
    const intervalMs = intervalMinutes * 60 * 1000;
    setInterval(async () => {
      try {
        await this.runCheck();
      } catch (error) {
        console.error('❌ Monitoring check failed:', error.message);
      }
    }, intervalMs);
    
    console.log('\n⏰ Monitoring started. Press Ctrl+C to stop.');
  }

  async healthCheck() {
    const result = await this.runCheck();
    
    // Exit with appropriate code for CI/CD
    if (result.allHealthy) {
      process.exit(0);
    } else {
      process.exit(1);
    }
  }
}

// CLI usage
if (require.main === module) {
  const monitor = new UptimeMonitor();
  
  const command = process.argv[2];
  
  switch (command) {
    case 'check':
      monitor.healthCheck();
      break;
    case 'monitor':
      const interval = parseInt(process.argv[3]) || 5;
      monitor.startMonitoring(interval);
      break;
    default:
      console.log('Usage:');
      console.log('  node uptime-check.js check     - Single health check');
      console.log('  node uptime-check.js monitor [minutes] - Continuous monitoring');
      console.log('');
      console.log('Examples:');
      console.log('  node uptime-check.js check');
      console.log('  node uptime-check.js monitor 10');
  }
}

module.exports = UptimeMonitor;