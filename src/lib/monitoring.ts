// Performance and Error Monitoring for SmartPop
// Implements CLAUDE.md monitoring requirements

interface ErrorEvent {
  message: string;
  stack?: string;
  filename?: string;
  lineno?: number;
  colno?: number;
  timestamp: number;
  userAgent: string;
  url: string;
  userId?: string;
  shop?: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  context?: Record<string, any>;
}

interface PerformanceMetric {
  name: string;
  value: number;
  timestamp: number;
  url: string;
  shop?: string;
  context?: Record<string, any>;
}

class SmartPopMonitoring {
  private apiEndpoint = 'https://zsmoutzjhqjgjehaituw.supabase.co/functions/v1/error-track';
  private enabled = true;
  private shop: string | null = null;
  private errorQueue: ErrorEvent[] = [];
  private metricsQueue: PerformanceMetric[] = [];
  private flushInterval = 5000; // 5 seconds

  constructor() {
    this.init();
  }

  private init() {
    // Skip in development unless explicitly enabled
    if (process.env.NODE_ENV === 'development' && !process.env.VITE_ENABLE_MONITORING) {
      this.enabled = false;
      return;
    }

    // Detect shop from URL
    this.detectShop();

    // Set up global error handling
    this.setupGlobalErrorHandler();

    // Set up performance monitoring
    this.setupPerformanceMonitoring();

    // Set up periodic flushing
    this.setupPeriodicFlush();

    // Set up unload handler
    this.setupUnloadHandler();
  }

  private detectShop() {
    try {
      const hostname = window.location.hostname;
      if (hostname.endsWith('.myshopify.com')) {
        this.shop = hostname;
      }
    } catch (error) {
      // Silent fail
    }
  }

  private setupGlobalErrorHandler() {
    // Handle JavaScript errors
    window.addEventListener('error', (event) => {
      this.trackError({
        message: event.message || 'Unknown error',
        stack: event.error?.stack,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        timestamp: Date.now(),
        userAgent: navigator.userAgent,
        url: window.location.href,
        shop: this.shop || undefined,
        severity: 'high'
      });
    });

    // Handle unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      this.trackError({
        message: `Unhandled Promise Rejection: ${event.reason}`,
        stack: event.reason?.stack,
        timestamp: Date.now(),
        userAgent: navigator.userAgent,
        url: window.location.href,
        shop: this.shop || undefined,
        severity: 'high',
        context: { reason: event.reason }
      });
    });
  }

  private setupPerformanceMonitoring() {
    // Monitor Web Vitals
    if ('web-vitals' in window) {
      const vitals = (window as any)['web-vitals'];
      if (vitals) {
        vitals.onCLS(this.handleWebVital.bind(this));
        vitals.onFCP(this.handleWebVital.bind(this));
        vitals.onLCP(this.handleWebVital.bind(this));
        vitals.onTTFB(this.handleWebVital.bind(this));
        vitals.onINP(this.handleWebVital.bind(this));
      }
    }

    // Monitor API response times
    this.setupAPIMonitoring();

    // Monitor bundle load times
    this.setupBundleMonitoring();
  }

  private handleWebVital(metric: any) {
    // Only track poor metrics to reduce noise
    const thresholds = {
      CLS: 0.25,
      FCP: 3000,
      LCP: 4000,
      TTFB: 1800,
      INP: 500
    };

    const threshold = thresholds[metric.name as keyof typeof thresholds];
    if (threshold && metric.value > threshold) {
      this.trackMetric({
        name: `web_vital_${metric.name.toLowerCase()}`,
        value: metric.value,
        timestamp: Date.now(),
        url: window.location.href,
        shop: this.shop || undefined,
        context: {
          rating: 'poor',
          threshold,
          delta: metric.delta
        }
      });
    }
  }

  private setupAPIMonitoring() {
    // Monkey patch fetch to monitor API calls
    const originalFetch = window.fetch;
    window.fetch = async (...args) => {
      const startTime = performance.now();
      const url = args[0] instanceof Request ? args[0].url : args[0];
      
      try {
        const response = await originalFetch(...args);
        const endTime = performance.now();
        const duration = endTime - startTime;

        // Track slow API calls (>2 seconds)
        if (duration > 2000) {
          this.trackMetric({
            name: 'api_slow_response',
            value: duration,
            timestamp: Date.now(),
            url: window.location.href,
            shop: this.shop || undefined,
            context: {
              apiUrl: url,
              status: response.status,
              statusText: response.statusText
            }
          });
        }

        // Track API errors
        if (!response.ok) {
          this.trackError({
            message: `API Error: ${response.status} ${response.statusText}`,
            timestamp: Date.now(),
            userAgent: navigator.userAgent,
            url: window.location.href,
            shop: this.shop || undefined,
            severity: response.status >= 500 ? 'critical' : 'medium',
            context: {
              apiUrl: url,
              status: response.status,
              statusText: response.statusText,
              duration
            }
          });
        }

        return response;
      } catch (error) {
        const endTime = performance.now();
        const duration = endTime - startTime;

        this.trackError({
          message: `Fetch Error: ${error}`,
          stack: error instanceof Error ? error.stack : undefined,
          timestamp: Date.now(),
          userAgent: navigator.userAgent,
          url: window.location.href,
          shop: this.shop || undefined,
          severity: 'critical',
          context: {
            apiUrl: url,
            duration
          }
        });

        throw error;
      }
    };
  }

  private setupBundleMonitoring() {
    // Monitor resource loading
    window.addEventListener('load', () => {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      
      if (navigation.loadEventEnd - navigation.fetchStart > 5000) {
        this.trackMetric({
          name: 'page_load_slow',
          value: navigation.loadEventEnd - navigation.fetchStart,
          timestamp: Date.now(),
          url: window.location.href,
          shop: this.shop || undefined,
          context: {
            domContentLoaded: navigation.domContentLoadedEventEnd - navigation.fetchStart,
            firstContentfulPaint: navigation.loadEventEnd - navigation.fetchStart
          }
        });
      }
    });
  }

  private setupPeriodicFlush() {
    setInterval(() => {
      this.flush();
    }, this.flushInterval);
  }

  private setupUnloadHandler() {
    window.addEventListener('beforeunload', () => {
      this.flush();
    });

    // Use Page Visibility API for better mobile support
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') {
        this.flush();
      }
    });
  }

  public trackError(error: Partial<ErrorEvent>) {
    if (!this.enabled) return;

    const fullError: ErrorEvent = {
      message: error.message || 'Unknown error',
      stack: error.stack,
      filename: error.filename,
      lineno: error.lineno,
      colno: error.colno,
      timestamp: error.timestamp || Date.now(),
      userAgent: error.userAgent || navigator.userAgent,
      url: error.url || window.location.href,
      userId: error.userId,
      shop: error.shop || this.shop || undefined,
      severity: error.severity || 'medium',
      context: error.context
    };

    this.errorQueue.push(fullError);

    // Flush immediately for critical errors
    if (fullError.severity === 'critical') {
      this.flush();
    }
  }

  public trackMetric(metric: Partial<PerformanceMetric>) {
    if (!this.enabled) return;

    const fullMetric: PerformanceMetric = {
      name: metric.name || 'unknown',
      value: metric.value || 0,
      timestamp: metric.timestamp || Date.now(),
      url: metric.url || window.location.href,
      shop: metric.shop || this.shop || undefined,
      context: metric.context
    };

    this.metricsQueue.push(fullMetric);
  }

  public trackCustomEvent(eventName: string, data?: Record<string, any>) {
    this.trackMetric({
      name: `custom_${eventName}`,
      value: 1,
      timestamp: Date.now(),
      url: window.location.href,
      shop: this.shop || undefined,
      context: data
    });
  }

  private async flush() {
    if (!this.enabled || (this.errorQueue.length === 0 && this.metricsQueue.length === 0)) {
      return;
    }

    const payload = {
      errors: [...this.errorQueue],
      metrics: [...this.metricsQueue],
      timestamp: Date.now(),
      shop: this.shop,
      url: window.location.href,
      userAgent: navigator.userAgent
    };

    // Clear queues
    this.errorQueue = [];
    this.metricsQueue = [];

    try {
      await fetch(this.apiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });
    } catch (error) {
      // Silent fail - don't break the app for monitoring
      console.warn('Failed to send monitoring data:', error);
    }
  }

  public enable() {
    this.enabled = true;
  }

  public disable() {
    this.enabled = false;
  }

  public setShop(shop: string) {
    this.shop = shop;
  }
}

// Create singleton instance
export const monitoring = new SmartPopMonitoring();

// Export convenience functions
export const trackError = (error: Partial<ErrorEvent>) => monitoring.trackError(error);
export const trackMetric = (metric: Partial<PerformanceMetric>) => monitoring.trackMetric(metric);
export const trackCustomEvent = (eventName: string, data?: Record<string, any>) => monitoring.trackCustomEvent(eventName, data);

// Export types
export type { ErrorEvent, PerformanceMetric };