import { onCLS, onFCP, onLCP, onTTFB, onINP, type Metric } from 'web-vitals';

interface WebVitalsMetric {
  name: string;
  value: number;
  rating: 'good' | 'needs-improvement' | 'poor';
  timestamp: number;
}

class WebVitalsMonitor {
  private metrics: WebVitalsMetric[] = [];
  private listeners: ((metric: WebVitalsMetric) => void)[] = [];

  constructor() {
    this.initializeMonitoring();
  }

  private initializeMonitoring() {
    // Only monitor in production or when explicitly enabled
    if (process.env.NODE_ENV !== 'production' && !process.env.VITE_ENABLE_WEB_VITALS) {
      return;
    }

    onCLS(this.handleMetric.bind(this));
    onFCP(this.handleMetric.bind(this));
    onLCP(this.handleMetric.bind(this));
    onTTFB(this.handleMetric.bind(this));
    onINP(this.handleMetric.bind(this));
  }

  private handleMetric(metric: Metric) {
    const webVitalsMetric: WebVitalsMetric = {
      name: metric.name,
      value: metric.value,
      rating: this.getRating(metric.name, metric.value),
      timestamp: Date.now()
    };

    this.metrics.push(webVitalsMetric);
    this.notifyListeners(webVitalsMetric);

    // Log for debugging (only in development)
    if (process.env.NODE_ENV === 'development') {
      console.log(`🔍 ${metric.name}:`, {
        value: metric.value,
        rating: webVitalsMetric.rating,
        target: this.getTarget(metric.name)
      });
    }

    // Send to analytics if configured
    this.sendToAnalytics(webVitalsMetric);
  }

  private getRating(name: string, value: number): 'good' | 'needs-improvement' | 'poor' {
    const thresholds = {
      CLS: { good: 0.1, poor: 0.25 },
      FCP: { good: 1800, poor: 3000 },
      LCP: { good: 2500, poor: 4000 },
      TTFB: { good: 800, poor: 1800 },
      INP: { good: 200, poor: 500 }
    };

    const threshold = thresholds[name as keyof typeof thresholds];
    if (!threshold) return 'good';

    if (value <= threshold.good) return 'good';
    if (value <= threshold.poor) return 'needs-improvement';
    return 'poor';
  }

  private getTarget(name: string): string {
    const targets = {
      CLS: '< 0.1',
      FCP: '< 1.8s',
      LCP: '< 2.5s',
      TTFB: '< 800ms',
      INP: '< 200ms'
    };
    return targets[name as keyof typeof targets] || '';
  }

  private sendToAnalytics(metric: WebVitalsMetric) {
    // Only send critical metrics that don't meet requirements
    if (metric.rating === 'poor') {
      try {
        // Send to your analytics endpoint
        fetch('/api/web-vitals', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...metric,
            url: window.location.href,
            userAgent: navigator.userAgent
          })
        }).catch(() => {
          // Silently fail - don't break app for analytics
        });
      } catch (error) {
        // Silently fail
      }
    }
  }

  public getMetrics(): WebVitalsMetric[] {
    return [...this.metrics];
  }

  public getLatestMetrics(): Record<string, WebVitalsMetric> {
    const latest: Record<string, WebVitalsMetric> = {};
    
    this.metrics.forEach(metric => {
      if (!latest[metric.name] || metric.timestamp > latest[metric.name].timestamp) {
        latest[metric.name] = metric;
      }
    });

    return latest;
  }

  public subscribe(listener: (metric: WebVitalsMetric) => void): () => void {
    this.listeners.push(listener);
    
    // Return unsubscribe function
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  private notifyListeners(metric: WebVitalsMetric) {
    this.listeners.forEach(listener => {
      try {
        listener(metric);
      } catch (error) {
        // Don't let listener errors break monitoring
      }
    });
  }

  public getHealthScore(): number {
    const latest = this.getLatestMetrics();
    const criticalMetrics = ['LCP', 'CLS', 'INP'];
    
    let score = 100;
    let metricsCount = 0;

    criticalMetrics.forEach(metricName => {
      const metric = latest[metricName];
      if (metric) {
        metricsCount++;
        if (metric.rating === 'poor') {
          score -= 30;
        } else if (metric.rating === 'needs-improvement') {
          score -= 15;
        }
      }
    });

    return metricsCount > 0 ? Math.max(0, score) : 100;
  }
}

// Create singleton instance
export const webVitalsMonitor = new WebVitalsMonitor();

// Export types
export type { WebVitalsMetric };