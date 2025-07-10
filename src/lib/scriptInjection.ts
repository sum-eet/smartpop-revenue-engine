/**
 * Multi-layered Script Injection System
 * Provides robust popup delivery with multiple fallback mechanisms
 * Features: Health monitoring, circuit breaker, graceful degradation
 */

import { globalCircuitBreaker, globalDegradationManager } from './circuitBreaker.ts';

export interface InjectionStrategy {
  primary: 'theme_app_extension' | 'app_blocks' | 'script_tags';
  fallbacks: Array<'web_pixels' | 'checkout_ui' | 'manual_theme' | 'cdn_fallback'>;
  detection: 'script_load_monitoring' | 'heartbeat' | 'dom_observer';
  recovery: 'retry_mechanism' | 'alternative_delivery' | 'graceful_degradation';
}

export interface ScriptInjectionConfig {
  shop: string;
  retryAttempts: number;
  heartbeatInterval: number;
  fallbackDelay: number;
  enableDebug: boolean;
}

export class ScriptLoadMonitor {
  private config: ScriptInjectionConfig;
  private heartbeatTimer: number | null = null;
  private loadAttempts: number = 0;
  private isLoaded: boolean = false;
  private fallbackIndex: number = 0;
  
  constructor(config: ScriptInjectionConfig) {
    this.config = config;
  }

  /**
   * Start monitoring script load with heartbeat
   */
  public startMonitoring(): void {
    this.log('🔍 Starting script load monitoring...');
    
    // Check if script already loaded
    if (this.detectScriptLoad()) {
      this.onScriptLoaded();
      return;
    }
    
    // Start heartbeat monitoring
    this.startHeartbeat();
    
    // Set up DOM observer for script injection
    this.setupDOMObserver();
    
    // Set up failure timeout
    setTimeout(() => {
      if (!this.isLoaded) {
        this.handleLoadFailure('Script load timeout');
      }
    }, 30000); // 30 second timeout
  }

  /**
   * Detect if SmartPop script is loaded and functional
   */
  private detectScriptLoad(): boolean {
    try {
      // Check for SmartPop globals
      if (typeof window !== 'undefined') {
        const hasSmartPop = 
          (window as any).smartPopInitialized === true ||
          (window as any).smartPopVersion ||
          document.querySelector('[id^="smartpop-"]');
        
        if (hasSmartPop) {
          this.log('✅ SmartPop script detected');
          return true;
        }
      }
      
      // Check for script tags
      const scriptTags = document.querySelectorAll('script[src*="popup-embed-public"]');
      if (scriptTags.length > 0) {
        this.log('📜 Script tag found, waiting for execution...');
        return false; // Tag exists but may not be loaded
      }
      
      return false;
    } catch (error) {
      this.log('❌ Error detecting script load:', error);
      return false;
    }
  }

  /**
   * Start heartbeat monitoring
   */
  private startHeartbeat(): void {
    this.heartbeatTimer = window.setInterval(() => {
      this.loadAttempts++;
      this.log(`💓 Heartbeat ${this.loadAttempts}: Checking script status...`);
      
      if (this.detectScriptLoad()) {
        this.onScriptLoaded();
      } else if (this.loadAttempts >= this.config.retryAttempts) {
        this.handleLoadFailure('Max retry attempts reached');
      }
    }, this.config.heartbeatInterval);
  }

  /**
   * Set up DOM observer for script injection
   */
  private setupDOMObserver(): void {
    if (typeof MutationObserver === 'undefined') {
      this.log('⚠️ MutationObserver not available');
      return;
    }

    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'childList') {
          mutation.addedNodes.forEach((node) => {
            if (node.nodeType === Node.ELEMENT_NODE) {
              const element = node as Element;
              
              // Check for script tags
              if (element.tagName === 'SCRIPT' && 
                  element.getAttribute('src')?.includes('popup-embed-public')) {
                this.log('🔍 New script tag detected via DOM observer');
                
                // Monitor script load
                element.addEventListener('load', () => {
                  this.log('✅ Script tag loaded successfully');
                  setTimeout(() => this.detectScriptLoad(), 1000);
                });
                
                element.addEventListener('error', () => {
                  this.log('❌ Script tag failed to load');
                  this.handleLoadFailure('Script tag load error');
                });
              }
              
              // Check for SmartPop elements
              if (element.id?.startsWith('smartpop-') || 
                  element.classList?.contains('smartpop')) {
                this.log('✅ SmartPop element detected via DOM observer');
                this.onScriptLoaded();
              }
            }
          });
        }
      });
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });

    // Clean up observer after 60 seconds
    setTimeout(() => {
      observer.disconnect();
      this.log('🧹 DOM observer disconnected');
    }, 60000);
  }

  /**
   * Handle successful script load
   */
  private onScriptLoaded(): void {
    if (this.isLoaded) return;
    
    this.isLoaded = true;
    this.log('🎉 SmartPop script loaded successfully!');
    
    // Clear heartbeat
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
    
    // Report success
    this.reportStatus('success', {
      attempts: this.loadAttempts,
      method: 'script_tags',
      loadTime: Date.now()
    });
  }

  /**
   * Handle script load failure
   */
  private handleLoadFailure(reason: string): void {
    this.log(`❌ Script load failed: ${reason}`);
    
    // Clear heartbeat
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
    
    // Try fallback methods
    this.tryFallbackMethod();
  }

  /**
   * Try fallback injection methods
   */
  private tryFallbackMethod(): void {
    const fallbackMethods = [
      'cdn_fallback',
      'direct_injection',
      'theme_integration',
      'manual_trigger'
    ];
    
    if (this.fallbackIndex >= fallbackMethods.length) {
      this.log('💀 All fallback methods exhausted');
      this.reportStatus('failure', {
        attempts: this.loadAttempts,
        reason: 'All methods failed',
        fallbacksTriedCount: this.fallbackIndex
      });
      return;
    }
    
    const method = fallbackMethods[this.fallbackIndex];
    this.fallbackIndex++;
    
    this.log(`🔄 Trying fallback method: ${method}`);
    
    setTimeout(() => {
      this.executeFallbackMethod(method);
    }, this.config.fallbackDelay);
  }

  /**
   * Execute specific fallback method with circuit breaker protection
   */
  private async executeFallbackMethod(method: string): Promise<void> {
    try {
      await globalCircuitBreaker.executeInjection(
        method,
        async () => {
          switch (method) {
            case 'cdn_fallback':
              return this.injectCDNFallback();
            case 'direct_injection':
              return this.injectDirectScript();
            case 'theme_integration':
              return this.tryThemeIntegration();
            case 'manual_trigger':
              return this.triggerManualLoad();
            default:
              throw new Error(`Unknown fallback method: ${method}`);
          }
        },
        async () => {
          // Emergency fallback - try next method
          this.log(`🔄 Circuit breaker open for ${method}, trying next fallback`);
          this.tryFallbackMethod();
        }
      );
    } catch (error) {
      this.log(`❌ Fallback method ${method} failed:`, error);
      this.tryFallbackMethod();
    }
  }

  /**
   * Inject script via CDN fallback
   */
  private async injectCDNFallback(): Promise<void> {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = `https://cdn.jsdelivr.net/gh/smartpop/embed@latest/dist/smartpop.min.js?shop=${this.config.shop}`;
      script.async = true;
      script.onload = () => {
        this.log('✅ CDN fallback script loaded');
        setTimeout(() => {
          if (this.detectScriptLoad()) {
            resolve();
          } else {
            reject(new Error('CDN script loaded but SmartPop not initialized'));
          }
        }, 1000);
      };
      script.onerror = () => {
        this.log('❌ CDN fallback script failed');
        reject(new Error('CDN script failed to load'));
      };
      document.head.appendChild(script);
      
      // Timeout after 10 seconds
      setTimeout(() => reject(new Error('CDN script load timeout')), 10000);
    });
  }

  /**
   * Inject script directly
   */
  private async injectDirectScript(): Promise<void> {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = `https://zsmoutzjhqjgjehaituw.supabase.co/functions/v1/popup-embed-public?shop=${this.config.shop}&fallback=direct`;
      script.async = true;
      script.onload = () => {
        this.log('✅ Direct injection script loaded');
        setTimeout(() => {
          if (this.detectScriptLoad()) {
            resolve();
          } else {
            reject(new Error('Direct script loaded but SmartPop not initialized'));
          }
        }, 1000);
      };
      script.onerror = () => {
        this.log('❌ Direct injection script failed');
        reject(new Error('Direct script failed to load'));
      };
      document.head.appendChild(script);
      
      // Timeout after 10 seconds
      setTimeout(() => reject(new Error('Direct script load timeout')), 10000);
    });
  }

  /**
   * Try theme integration method
   */
  private async tryThemeIntegration(): Promise<void> {
    return new Promise((resolve, reject) => {
      // Check for theme app extension blocks
      const appBlocks = document.querySelectorAll('[data-smartpop-app-block]');
      if (appBlocks.length > 0) {
        this.log('✅ Theme app extension blocks found');
        try {
          this.initializeThemeBlocks();
          resolve();
        } catch (error) {
          reject(new Error(`Theme block initialization failed: ${error.message}`));
        }
      } else {
        reject(new Error('No theme app extension blocks found'));
      }
    });
  }

  /**
   * Initialize theme app extension blocks
   */
  private initializeThemeBlocks(): void {
    const blocks = document.querySelectorAll('[data-smartpop-app-block]');
    blocks.forEach((block) => {
      const config = block.getAttribute('data-smartpop-config');
      if (config) {
        try {
          const popupConfig = JSON.parse(config);
          this.log('🎯 Initializing theme block popup:', popupConfig);
          // Initialize popup directly
          this.initializePopupFromConfig(popupConfig);
        } catch (error) {
          this.log('❌ Invalid theme block config:', error);
        }
      }
    });
  }

  /**
   * Initialize popup from configuration
   */
  private initializePopupFromConfig(config: any): void {
    // Create minimal popup implementation
    const popup = document.createElement('div');
    popup.id = `smartpop-${config.id}`;
    popup.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.7);
      z-index: 999999;
      display: flex;
      align-items: center;
      justify-content: center;
      font-family: -apple-system, BlinkMacSystemFont, sans-serif;
    `;
    
    popup.innerHTML = `
      <div style="background: white; border-radius: 12px; padding: 32px; max-width: 450px; width: 90%; text-align: center;">
        <h2 style="margin: 0 0 16px 0; color: #333;">${config.title || 'Special Offer!'}</h2>
        <p style="margin: 0 0 24px 0; color: #666;">${config.description || 'Get a special discount!'}</p>
        <button onclick="this.closest('#smartpop-${config.id}').remove()" 
                style="background: #007cba; color: white; border: none; padding: 14px 28px; border-radius: 6px; cursor: pointer;">
          Close
        </button>
      </div>
    `;
    
    document.body.appendChild(popup);
    this.log('✅ Fallback popup created');
    this.onScriptLoaded();
  }

  /**
   * Trigger manual load
   */
  private async triggerManualLoad(): Promise<void> {
    return new Promise((resolve) => {
      this.log('🔄 Triggering manual load...');
      
      // Create a minimal popup system
      const style = document.createElement('style');
      style.textContent = `
        .smartpop-fallback {
          position: fixed;
          bottom: 20px;
          right: 20px;
          background: #007cba;
          color: white;
          padding: 12px 20px;
          border-radius: 6px;
          font-family: -apple-system, BlinkMacSystemFont, sans-serif;
          font-size: 14px;
          z-index: 999999;
          cursor: pointer;
          box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        }
      `;
      document.head.appendChild(style);
      
      const notification = document.createElement('div');
      notification.className = 'smartpop-fallback';
      notification.textContent = 'Special offer available! Click to learn more.';
      notification.onclick = () => {
        notification.remove();
        this.log('✅ Manual fallback triggered');
      };
      
      document.body.appendChild(notification);
      this.onScriptLoaded();
      resolve();
    });
  }

  /**
   * Report status to analytics and health check system
   */
  private reportStatus(status: 'success' | 'failure', data: any): void {
    try {
      // Report to analytics
      fetch('https://zsmoutzjhqjgjehaituw.supabase.co/functions/v1/popup-track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventType: 'script_load_status',
          status,
          shop: this.config.shop,
          data,
          timestamp: new Date().toISOString(),
          userAgent: navigator.userAgent,
          pageUrl: window.location.href
        })
      }).catch(error => {
        this.log('⚠️ Failed to report status:', error);
      });
      
      // Send health ping
      fetch('https://zsmoutzjhqjgjehaituw.supabase.co/functions/v1/health-check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shop: this.config.shop,
          scriptLoaded: status === 'success',
          method: data.method || 'unknown',
          lastSeen: new Date().toISOString(),
          performance: status === 'success' ? {
            loadTime: data.loadTime || 0,
            attempts: data.attempts || 1,
            fallbacksUsed: data.fallbacksUsed || []
          } : undefined,
          errors: status === 'failure' ? [data.reason || 'Unknown error'] : undefined
        })
      }).catch(error => {
        this.log('⚠️ Failed to send health ping:', error);
      });
    } catch (error) {
      this.log('⚠️ Error reporting status:', error);
    }
  }

  /**
   * Log with debug support
   */
  private log(...args: any[]): void {
    if (this.config.enableDebug) {
      console.log('[SmartPop Monitor]', ...args);
    }
  }
}

/**
 * Enhanced Script Injection Manager
 */
export class ScriptInjectionManager {
  private monitor: ScriptLoadMonitor;
  private config: ScriptInjectionConfig;
  
  constructor(config: Partial<ScriptInjectionConfig> = {}) {
    this.config = {
      shop: config.shop || 'testingstoresumeet.myshopify.com',
      retryAttempts: config.retryAttempts || 5,
      heartbeatInterval: config.heartbeatInterval || 3000,
      fallbackDelay: config.fallbackDelay || 5000,
      enableDebug: config.enableDebug || false
    };
    
    this.monitor = new ScriptLoadMonitor(this.config);
  }

  /**
   * Initialize enhanced script injection
   */
  public initialize(): void {
    console.log('🚀 SmartPop Enhanced Script Injection initialized');
    
    // Start monitoring immediately
    this.monitor.startMonitoring();
    
    // Set up global error handler
    window.addEventListener('error', (event) => {
      if (event.filename?.includes('popup-embed-public') || 
          event.message?.includes('SmartPop')) {
        console.error('🚨 SmartPop script error detected:', event);
        this.handleScriptError(event);
      }
    });
  }

  /**
   * Handle script errors
   */
  private handleScriptError(event: ErrorEvent): void {
    console.log('🔧 Attempting to recover from script error...');
    
    // Remove failed script tags
    const failedScripts = document.querySelectorAll('script[src*="popup-embed-public"]');
    failedScripts.forEach(script => {
      if (script.getAttribute('src') === event.filename) {
        script.remove();
        console.log('🧹 Removed failed script tag');
      }
    });
    
    // Restart monitoring after delay
    setTimeout(() => {
      this.monitor.startMonitoring();
    }, 5000);
  }
}

/**
 * Auto-initialize if running in browser
 */
if (typeof window !== 'undefined' && !window.location.href.includes('admin')) {
  // Extract shop from URL or use default
  const shop = window.location.hostname.includes('.myshopify.com') 
    ? window.location.hostname 
    : 'testingstoresumeet.myshopify.com';
  
  const manager = new ScriptInjectionManager({
    shop,
    enableDebug: window.location.search.includes('debug=true')
  });
  
  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => manager.initialize());
  } else {
    manager.initialize();
  }
}