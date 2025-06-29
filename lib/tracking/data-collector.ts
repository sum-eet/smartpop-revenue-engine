// Comprehensive data collection SDK with privacy-first approach

import { ConsentManager } from '@/lib/consent/consent-manager';
import { 
  TrackingEvent, 
  BehavioralEvent, 
  PageAnalytics, 
  EcommerceEvent,
  PerformanceMetrics,
  DeviceFingerprint,
  SessionData,
  TrackingConfig 
} from '@/types/tracking';

export class DataCollector {
  private static instance: DataCollector;
  private config: TrackingConfig;
  private consentManager: ConsentManager;
  private sessionId: string;
  private eventQueue: TrackingEvent[] = [];
  private batchTimer: number | null = null;
  private websocket: WebSocket | null = null;
  private deviceFingerprint: DeviceFingerprint | null = null;
  private currentSession: SessionData | null = null;

  private constructor(config: TrackingConfig) {
    this.config = config;
    this.consentManager = ConsentManager.getInstance();
    this.sessionId = this.generateSessionId();
    this.initializeTracking();
  }

  public static getInstance(config?: TrackingConfig): DataCollector {
    if (!DataCollector.instance && config) {
      DataCollector.instance = new DataCollector(config);
    }
    return DataCollector.instance;
  }

  /**
   * Initialize tracking system
   */
  private async initializeTracking(): Promise<void> {
    if (typeof window === 'undefined') return;

    // Wait for consent before initializing
    await this.consentManager.initialize();

    // Listen for consent changes
    this.consentManager.onConsentChange((consent) => {
      this.handleConsentChange(consent);
    });

    // Initialize if we have necessary permissions
    if (this.consentManager.hasPermission('necessary')) {
      await this.initializeSession();
      this.setupEventListeners();
      
      if (this.config.enableRealTimeStreaming && this.consentManager.hasPermission('analytics')) {
        this.initializeWebSocket();
      }
    }
  }

  /**
   * Handle consent changes
   */
  private handleConsentChange(consent: any): void {
    // Re-evaluate what tracking is allowed
    if (consent.permissions.necessary && !this.currentSession) {
      this.initializeSession();
      this.setupEventListeners();
    }

    if (consent.permissions.analytics && this.config.enableRealTimeStreaming && !this.websocket) {
      this.initializeWebSocket();
    }

    if (!consent.permissions.analytics && this.websocket) {
      this.websocket.close();
      this.websocket = null;
    }
  }

  /**
   * Initialize user session
   */
  private async initializeSession(): Promise<void> {
    try {
      // Collect device fingerprint if permitted
      if (this.config.enableDeviceFingerprinting && this.consentManager.hasPermission('deviceFingerprinting')) {
        this.deviceFingerprint = await this.collectDeviceFingerprint();
      }

      // Get URL parameters for attribution
      const urlParams = new URLSearchParams(window.location.search);
      
      this.currentSession = {
        sessionId: this.sessionId,
        startTime: new Date(),
        pageViews: 0,
        bounced: true, // Will be updated as user interacts
        source: urlParams.get('utm_source') || document.referrer || 'direct',
        medium: urlParams.get('utm_medium') || 'none',
        campaign: urlParams.get('utm_campaign') || undefined,
        device: this.deviceFingerprint || {} as DeviceFingerprint,
        ipAddress: 'unknown', // Will be determined server-side
        userAgent: navigator.userAgent
      };

      // Track session start
      await this.trackEvent({
        type: 'page_view',
        data: this.createPageAnalytics()
      });

    } catch (error) {
      this.logError('Failed to initialize session:', error);
    }
  }

  /**
   * Track custom event
   */
  public async trackEvent(event: Partial<TrackingEvent>): Promise<void> {
    if (!this.consentManager.hasPermission('analytics')) {
      if (this.config.debug) {
        console.log('Analytics tracking not permitted');
      }
      return;
    }

    const trackingEvent: TrackingEvent = {
      id: this.generateId(),
      sessionId: this.sessionId,
      type: event.type || 'behavioral',
      data: event.data || {},
      timestamp: new Date(),
      ...event
    };

    // Add to queue for batching
    this.eventQueue.push(trackingEvent);

    // Send via WebSocket if available and real-time is enabled
    if (this.websocket && this.websocket.readyState === WebSocket.OPEN) {
      this.sendWebSocketMessage({
        type: 'event',
        data: trackingEvent,
        timestamp: new Date()
      });
    }

    // Batch send if queue is full or timer expires
    if (this.eventQueue.length >= this.config.batchSize) {
      await this.flushEventQueue();
    } else if (!this.batchTimer) {
      this.batchTimer = window.setTimeout(() => {
        this.flushEventQueue();
      }, this.config.batchTimeout);
    }
  }

  /**
   * Track page view
   */
  public async trackPageView(url?: string): Promise<void> {
    const pageAnalytics = this.createPageAnalytics(url);
    
    await this.trackEvent({
      type: 'page_view',
      data: pageAnalytics
    });

    // Update session
    if (this.currentSession) {
      this.currentSession.pageViews++;
      this.currentSession.bounced = this.currentSession.pageViews === 1; // Not bounced if more than 1 page
    }
  }

  /**
   * Track ecommerce event
   */
  public async trackEcommerce(event: EcommerceEvent): Promise<void> {
    if (!this.consentManager.hasPermission('analytics')) return;

    await this.trackEvent({
      type: 'ecommerce',
      data: event
    });
  }

  /**
   * Track behavioral event
   */
  public async trackBehavioral(event: BehavioralEvent): Promise<void> {
    if (!this.consentManager.hasPermission('behavioralTracking')) return;

    await this.trackEvent({
      type: 'behavioral',
      data: event
    });
  }

  /**
   * Set up automatic event listeners
   */
  private setupEventListeners(): void {
    if (!this.consentManager.hasPermission('behavioralTracking') || !this.config.enableBehavioralTracking) {
      return;
    }

    // Click tracking
    document.addEventListener('click', (e) => {
      this.trackBehavioral({
        type: 'click',
        element: this.getElementInfo(e.target as Element),
        coordinates: { x: e.clientX, y: e.clientY },
        timestamp: Date.now(),
        viewport: { width: window.innerWidth, height: window.innerHeight }
      });
    });

    // Scroll tracking
    let scrollTimeout: number;
    document.addEventListener('scroll', () => {
      clearTimeout(scrollTimeout);
      scrollTimeout = window.setTimeout(() => {
        this.trackBehavioral({
          type: 'scroll',
          scrollPosition: { x: window.scrollX, y: window.scrollY },
          timestamp: Date.now(),
          viewport: { width: window.innerWidth, height: window.innerHeight }
        });
      }, 100);
    });

    // Performance tracking
    if (this.config.enablePerformanceTracking && this.consentManager.hasPermission('analytics')) {
      this.trackPerformanceMetrics();
    }

    // Error tracking
    if (this.config.enableErrorTracking) {
      window.addEventListener('error', (e) => {
        this.trackEvent({
          type: 'error',
          data: {
            message: e.message,
            source: e.filename || '',
            lineno: e.lineno || 0,
            colno: e.colno || 0,
            error: e.error?.toString(),
            stack: e.error?.stack,
            userAgent: navigator.userAgent,
            url: window.location.href
          }
        });
      });
    }
  }

  /**
   * Track performance metrics
   */
  private trackPerformanceMetrics(): void {
    if (typeof window.performance === 'undefined') return;

    window.addEventListener('load', () => {
      setTimeout(() => {
        const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
        const paint = performance.getEntriesByType('paint');

        const metrics: PerformanceMetrics[] = [];

        if (navigation) {
          metrics.push({
            type: 'navigation',
            name: 'page_load',
            startTime: navigation.startTime,
            duration: navigation.loadEventEnd - navigation.startTime,
            transferSize: navigation.transferSize,
            encodedBodySize: navigation.encodedBodySize,
            decodedBodySize: navigation.decodedBodySize
          });
        }

        paint.forEach(entry => {
          metrics.push({
            type: 'paint',
            name: entry.name,
            startTime: entry.startTime,
            duration: entry.duration
          });
        });

        metrics.forEach(metric => {
          this.trackEvent({
            type: 'performance',
            data: metric
          });
        });
      }, 0);
    });
  }

  /**
   * Collect device fingerprint
   */
  private async collectDeviceFingerprint(): Promise<DeviceFingerprint> {
    const fingerprint: DeviceFingerprint = {
      screenResolution: `${screen.width}x${screen.height}`,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      language: navigator.language,
      platform: navigator.platform,
      vendor: navigator.vendor || '',
      cookiesEnabled: navigator.cookieEnabled,
      doNotTrack: navigator.doNotTrack === '1',
      fonts: [], // Would require more complex detection
      plugins: Array.from(navigator.plugins).map(p => p.name),
      hardwareConcurrency: navigator.hardwareConcurrency || 0
    };

    // Add device memory if available
    if ('deviceMemory' in navigator) {
      fingerprint.deviceMemory = (navigator as any).deviceMemory;
    }

    // Add connection info if available
    if ('connection' in navigator) {
      const connection = (navigator as any).connection;
      fingerprint.connection = {
        effectiveType: connection.effectiveType || '',
        downlink: connection.downlink || 0,
        rtt: connection.rtt || 0
      };
    }

    // Canvas fingerprinting (if permission granted)
    try {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.textBaseline = 'top';
        ctx.font = '14px Arial';
        ctx.fillText('Device fingerprint test', 2, 2);
        fingerprint.canvasFingerprint = canvas.toDataURL();
      }
    } catch (error) {
      // Canvas fingerprinting blocked or failed
    }

    return fingerprint;
  }

  /**
   * Create page analytics data
   */
  private createPageAnalytics(url?: string): PageAnalytics {
    const currentUrl = url || window.location.href;
    
    return {
      url: currentUrl,
      title: document.title,
      referrer: document.referrer,
      entryTime: new Date(),
      scrollDepth: 0,
      clickCount: 0,
      bounced: true,
      loadTime: performance.timing ? performance.timing.loadEventEnd - performance.timing.navigationStart : 0,
      ttfb: performance.timing ? performance.timing.responseStart - performance.timing.navigationStart : 0,
      fcp: 0, // Would need to be measured
      lcp: 0, // Would need to be measured
      cls: 0, // Would need to be measured
      fid: 0  // Would need to be measured
    };
  }

  /**
   * Get element information for tracking
   */
  private getElementInfo(element: Element) {
    return {
      tagName: element.tagName.toLowerCase(),
      id: element.id || undefined,
      className: element.className || undefined,
      text: element.textContent?.slice(0, 100) || undefined,
      attributes: this.getRelevantAttributes(element)
    };
  }

  /**
   * Get relevant element attributes
   */
  private getRelevantAttributes(element: Element): Record<string, string> {
    const relevant = ['data-track', 'data-event', 'href', 'src', 'type'];
    const attributes: Record<string, string> = {};
    
    relevant.forEach(attr => {
      const value = element.getAttribute(attr);
      if (value) {
        attributes[attr] = value;
      }
    });
    
    return attributes;
  }

  /**
   * Initialize WebSocket connection for real-time streaming
   */
  private initializeWebSocket(): void {
    if (!this.config.websocketEndpoint) return;

    try {
      this.websocket = new WebSocket(this.config.websocketEndpoint);
      
      this.websocket.onopen = () => {
        if (this.config.debug) {
          console.log('WebSocket connected');
        }
      };

      this.websocket.onerror = (error) => {
        this.logError('WebSocket error:', error);
      };

      this.websocket.onclose = () => {
        if (this.config.debug) {
          console.log('WebSocket disconnected');
        }
        // Attempt to reconnect after delay
        setTimeout(() => {
          if (this.consentManager.hasPermission('analytics')) {
            this.initializeWebSocket();
          }
        }, 5000);
      };
    } catch (error) {
      this.logError('Failed to initialize WebSocket:', error);
    }
  }

  /**
   * Send message via WebSocket
   */
  private sendWebSocketMessage(message: any): void {
    if (this.websocket && this.websocket.readyState === WebSocket.OPEN) {
      this.websocket.send(JSON.stringify(message));
    }
  }

  /**
   * Flush event queue to server
   */
  private async flushEventQueue(): Promise<void> {
    if (this.eventQueue.length === 0) return;

    const events = [...this.eventQueue];
    this.eventQueue = [];
    
    if (this.batchTimer) {
      clearTimeout(this.batchTimer);
      this.batchTimer = null;
    }

    try {
      await fetch(this.config.apiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          sessionId: this.sessionId,
          events,
          timestamp: new Date()
        })
      });

      if (this.config.debug) {
        console.log(`Sent ${events.length} events to server`);
      }
    } catch (error) {
      this.logError('Failed to send events:', error);
      // Re-queue events on failure
      this.eventQueue.unshift(...events);
    }
  }

  /**
   * Generate unique ID
   */
  private generateId(): string {
    return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Generate session ID
   */
  private generateSessionId(): string {
    let sessionId = sessionStorage.getItem('smartpop_session_id');
    if (!sessionId) {
      sessionId = this.generateId();
      sessionStorage.setItem('smartpop_session_id', sessionId);
    }
    return sessionId;
  }

  /**
   * Log errors
   */
  private logError(message: string, error: any): void {
    if (this.config.debug) {
      console.error(message, error);
    }
  }

  /**
   * Clean up and end session
   */
  public async endSession(): Promise<void> {
    if (this.currentSession) {
      this.currentSession.endTime = new Date();
      this.currentSession.duration = Math.floor(
        (this.currentSession.endTime.getTime() - this.currentSession.startTime.getTime()) / 1000
      );

      await this.trackEvent({
        type: 'page_view',
        data: {
          ...this.createPageAnalytics(),
          exitTime: this.currentSession.endTime,
          timeOnPage: this.currentSession.duration
        }
      });
    }

    // Flush remaining events
    await this.flushEventQueue();

    // Close WebSocket
    if (this.websocket) {
      this.websocket.close();
    }
  }
}