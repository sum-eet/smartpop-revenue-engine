/**
 * Advanced Attribution Tracking System
 * Tracks complete customer journey from popup to purchase
 */

export interface SessionData {
  sessionId: string;
  shopDomain: string;
  visitorId: string;
  startTime: number;
  lastActivity: number;
  isFirstVisit: boolean;
  deviceType: 'mobile' | 'desktop' | 'tablet';
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  referrer?: string;
  landingPage: string;
  userAgent: string;
  ipAddress?: string;
  geolocation?: {
    country?: string;
    region?: string;
    city?: string;
    timezone?: string;
  };
}

export interface BehavioralData {
  sessionId: string;
  timeOnSite: number;
  pagesViewed: number;
  scrollDepth: number;
  mouseMovements: number;
  clickCount: number;
  cartValue?: number;
  productViews: string[];
  searchQueries: string[];
  exitIntent: boolean;
  engagement: 'low' | 'medium' | 'high';
}

export interface PopupInteraction {
  sessionId: string;
  popupId: string;
  eventType: 'viewed' | 'interacted' | 'submitted' | 'closed' | 'ignored';
  timestamp: number;
  popupVariant?: string;
  experimentId?: string;
  timeToInteraction?: number;
  formData?: Record<string, any>;
  behavioralContext: BehavioralData;
}

export interface AttributionEvent {
  id: string;
  sessionId: string;
  visitorId: string;
  shopDomain: string;
  eventType: 'popup_shown' | 'email_submitted' | 'purchase_made' | 'cart_abandoned';
  timestamp: number;
  popupId?: string;
  email?: string;
  orderId?: string;
  orderValue?: number;
  attributionWindow: number; // days
  crossDevice: boolean;
  metadata: Record<string, any>;
}

/**
 * Session Manager for tracking visitor sessions
 */
export class SessionManager {
  private static SESSION_KEY = 'smartpop_session';
  private static VISITOR_KEY = 'smartpop_visitor';
  private static SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes
  
  private currentSession: SessionData | null = null;
  private behavioralData: BehavioralData;
  private trackingEnabled = true;

  constructor(shopDomain: string) {
    this.initializeSession(shopDomain);
    this.behavioralData = this.initializeBehavioralTracking();
    this.setupEventListeners();
  }

  /**
   * Initialize or resume session
   */
  private initializeSession(shopDomain: string): void {
    try {
      const existingSession = this.getStoredSession();
      const now = Date.now();

      if (existingSession && 
          existingSession.shopDomain === shopDomain &&
          (now - existingSession.lastActivity) < SessionManager.SESSION_TIMEOUT) {
        // Resume existing session
        this.currentSession = existingSession;
        this.currentSession.lastActivity = now;
        this.updateStoredSession();
      } else {
        // Create new session
        this.currentSession = this.createNewSession(shopDomain);
        this.storeSession();
      }
    } catch (error) {
      console.warn('Failed to initialize session:', error);
      this.currentSession = this.createNewSession(shopDomain);
    }
  }

  /**
   * Create new session
   */
  private createNewSession(shopDomain: string): SessionData {
    const visitorId = this.getOrCreateVisitorId();
    const isFirstVisit = !this.hasVisitedBefore();
    
    return {
      sessionId: this.generateSessionId(),
      shopDomain,
      visitorId,
      startTime: Date.now(),
      lastActivity: Date.now(),
      isFirstVisit,
      deviceType: this.detectDeviceType(),
      ...this.extractUTMParameters(),
      referrer: document.referrer || undefined,
      landingPage: window.location.href,
      userAgent: navigator.userAgent,
      geolocation: this.getGeolocation()
    };
  }

  /**
   * Generate unique session ID
   */
  private generateSessionId(): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2);
    return `ss_${timestamp}_${random}`;
  }

  /**
   * Get or create visitor ID
   */
  private getOrCreateVisitorId(): string {
    try {
      let visitorId = localStorage.getItem(SessionManager.VISITOR_KEY);
      if (!visitorId) {
        visitorId = `visitor_${Date.now()}_${Math.random().toString(36).substring(2)}`;
        localStorage.setItem(SessionManager.VISITOR_KEY, visitorId);
      }
      return visitorId;
    } catch (error) {
      // Fallback if localStorage is not available
      return `visitor_${Date.now()}_${Math.random().toString(36).substring(2)}`;
    }
  }

  /**
   * Check if visitor has been here before
   */
  private hasVisitedBefore(): boolean {
    try {
      return localStorage.getItem(SessionManager.VISITOR_KEY) !== null;
    } catch (error) {
      return false;
    }
  }

  /**
   * Detect device type
   */
  private detectDeviceType(): 'mobile' | 'desktop' | 'tablet' {
    const userAgent = navigator.userAgent.toLowerCase();
    
    if (/tablet|ipad|playbook|silk/.test(userAgent)) {
      return 'tablet';
    }
    
    if (/mobile|iphone|ipod|android|blackberry|opera|mini|windows\sce|palm|smartphone|iemobile/.test(userAgent)) {
      return 'mobile';
    }
    
    return 'desktop';
  }

  /**
   * Extract UTM parameters from URL
   */
  private extractUTMParameters(): Partial<SessionData> {
    const params = new URLSearchParams(window.location.search);
    
    return {
      utmSource: params.get('utm_source') || undefined,
      utmMedium: params.get('utm_medium') || undefined,
      utmCampaign: params.get('utm_campaign') || undefined
    };
  }

  /**
   * Get geolocation information (if available)
   */
  private getGeolocation(): SessionData['geolocation'] {
    try {
      // Try to get timezone
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      
      return {
        timezone
        // Note: Country/region would need to be determined server-side via IP
      };
    } catch (error) {
      return undefined;
    }
  }

  /**
   * Initialize behavioral tracking
   */
  private initializeBehavioralTracking(): BehavioralData {
    return {
      sessionId: this.currentSession!.sessionId,
      timeOnSite: 0,
      pagesViewed: 1,
      scrollDepth: 0,
      mouseMovements: 0,
      clickCount: 0,
      productViews: [],
      searchQueries: [],
      exitIntent: false,
      engagement: 'low'
    };
  }

  /**
   * Setup event listeners for behavioral tracking
   */
  private setupEventListeners(): void {
    if (!this.trackingEnabled) return;

    // Time tracking
    setInterval(() => {
      this.behavioralData.timeOnSite = Date.now() - this.currentSession!.startTime;
      this.updateEngagementLevel();
      this.updateActivity();
    }, 1000);

    // Scroll tracking
    let maxScroll = 0;
    window.addEventListener('scroll', () => {
      const scrollPercent = Math.round(
        (window.scrollY / (document.documentElement.scrollHeight - window.innerHeight)) * 100
      );
      maxScroll = Math.max(maxScroll, scrollPercent);
      this.behavioralData.scrollDepth = maxScroll;
      this.updateActivity();
    }, { passive: true });

    // Mouse movement tracking
    let mouseMovements = 0;
    document.addEventListener('mousemove', () => {
      mouseMovements++;
      if (mouseMovements % 10 === 0) { // Throttle updates
        this.behavioralData.mouseMovements = mouseMovements;
        this.updateActivity();
      }
    }, { passive: true });

    // Click tracking
    document.addEventListener('click', () => {
      this.behavioralData.clickCount++;
      this.updateActivity();
    }, { passive: true });

    // Exit intent detection
    document.addEventListener('mouseout', (e) => {
      if (e.clientY <= 0) {
        this.behavioralData.exitIntent = true;
      }
    });

    // Page visibility for accurate time tracking
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.updateStoredSession();
      } else {
        this.updateActivity();
      }
    });

    // Before unload - save session data
    window.addEventListener('beforeunload', () => {
      this.updateStoredSession();
    });
  }

  /**
   * Update engagement level based on behavioral data
   */
  private updateEngagementLevel(): void {
    const { timeOnSite, scrollDepth, mouseMovements, clickCount } = this.behavioralData;
    
    let score = 0;
    
    // Time on site scoring
    if (timeOnSite > 30000) score += 1; // 30 seconds
    if (timeOnSite > 60000) score += 1; // 1 minute
    if (timeOnSite > 180000) score += 1; // 3 minutes
    
    // Scroll depth scoring
    if (scrollDepth > 25) score += 1;
    if (scrollDepth > 50) score += 1;
    if (scrollDepth > 75) score += 1;
    
    // Interaction scoring
    if (mouseMovements > 50) score += 1;
    if (clickCount > 2) score += 1;
    if (clickCount > 5) score += 1;
    
    if (score >= 7) {
      this.behavioralData.engagement = 'high';
    } else if (score >= 4) {
      this.behavioralData.engagement = 'medium';
    } else {
      this.behavioralData.engagement = 'low';
    }
  }

  /**
   * Update last activity timestamp
   */
  private updateActivity(): void {
    if (this.currentSession) {
      this.currentSession.lastActivity = Date.now();
    }
  }

  /**
   * Store session data
   */
  private storeSession(): void {
    try {
      sessionStorage.setItem(SessionManager.SESSION_KEY, JSON.stringify(this.currentSession));
    } catch (error) {
      console.warn('Failed to store session:', error);
    }
  }

  /**
   * Update stored session
   */
  private updateStoredSession(): void {
    this.storeSession();
  }

  /**
   * Get stored session
   */
  private getStoredSession(): SessionData | null {
    try {
      const stored = sessionStorage.getItem(SessionManager.SESSION_KEY);
      return stored ? JSON.parse(stored) : null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Get current session data
   */
  public getSession(): SessionData | null {
    return this.currentSession;
  }

  /**
   * Get current behavioral data
   */
  public getBehavioralData(): BehavioralData {
    return { ...this.behavioralData };
  }

  /**
   * Track product view
   */
  public trackProductView(productId: string): void {
    if (!this.behavioralData.productViews.includes(productId)) {
      this.behavioralData.productViews.push(productId);
    }
    this.updateActivity();
  }

  /**
   * Track search query
   */
  public trackSearch(query: string): void {
    if (!this.behavioralData.searchQueries.includes(query)) {
      this.behavioralData.searchQueries.push(query);
    }
    this.updateActivity();
  }

  /**
   * Update cart value
   */
  public updateCartValue(value: number): void {
    this.behavioralData.cartValue = value;
    this.updateActivity();
  }

  /**
   * End session
   */
  public endSession(): void {
    try {
      sessionStorage.removeItem(SessionManager.SESSION_KEY);
    } catch (error) {
      console.warn('Failed to clear session:', error);
    }
    this.currentSession = null;
  }

  /**
   * Disable tracking (for privacy compliance)
   */
  public disableTracking(): void {
    this.trackingEnabled = false;
  }

  /**
   * Enable tracking
   */
  public enableTracking(): void {
    this.trackingEnabled = true;
  }
}

/**
 * Attribution Tracker for connecting events across the customer journey
 */
export class AttributionTracker {
  private static ATTRIBUTION_WINDOW = 7 * 24 * 60 * 60 * 1000; // 7 days
  private sessionManager: SessionManager;
  private apiBaseUrl: string;

  constructor(sessionManager: SessionManager, apiBaseUrl: string) {
    this.sessionManager = sessionManager;
    this.apiBaseUrl = apiBaseUrl;
  }

  /**
   * Track popup shown event
   */
  public async trackPopupShown(popupId: string, variant?: string, experimentId?: string): Promise<void> {
    const session = this.sessionManager.getSession();
    const behavioral = this.sessionManager.getBehavioralData();
    
    if (!session) return;

    const event: AttributionEvent = {
      id: this.generateEventId(),
      sessionId: session.sessionId,
      visitorId: session.visitorId,
      shopDomain: session.shopDomain,
      eventType: 'popup_shown',
      timestamp: Date.now(),
      popupId,
      attributionWindow: AttributionTracker.ATTRIBUTION_WINDOW,
      crossDevice: false,
      metadata: {
        variant,
        experimentId,
        deviceType: session.deviceType,
        isFirstVisit: session.isFirstVisit,
        timeOnSiteWhenShown: behavioral.timeOnSite,
        scrollDepthWhenShown: behavioral.scrollDepth,
        engagementLevel: behavioral.engagement,
        utmSource: session.utmSource,
        utmMedium: session.utmMedium,
        utmCampaign: session.utmCampaign,
        behavioralData: behavioral
      }
    };

    await this.sendAttributionEvent(event);
  }

  /**
   * Track email submission
   */
  public async trackEmailSubmission(
    popupId: string, 
    email: string, 
    formData?: Record<string, any>
  ): Promise<void> {
    const session = this.sessionManager.getSession();
    const behavioral = this.sessionManager.getBehavioralData();
    
    if (!session) return;

    const event: AttributionEvent = {
      id: this.generateEventId(),
      sessionId: session.sessionId,
      visitorId: session.visitorId,
      shopDomain: session.shopDomain,
      eventType: 'email_submitted',
      timestamp: Date.now(),
      popupId,
      email,
      attributionWindow: AttributionTracker.ATTRIBUTION_WINDOW,
      crossDevice: false,
      metadata: {
        formData,
        timeToSubmission: behavioral.timeOnSite,
        deviceType: session.deviceType,
        engagementAtSubmission: behavioral.engagement,
        cartValueAtSubmission: behavioral.cartValue,
        behavioralData: behavioral
      }
    };

    await this.sendAttributionEvent(event);
  }

  /**
   * Track purchase event
   */
  public async trackPurchase(
    orderId: string, 
    orderValue: number, 
    email?: string
  ): Promise<void> {
    const session = this.sessionManager.getSession();
    
    if (!session) return;

    const event: AttributionEvent = {
      id: this.generateEventId(),
      sessionId: session.sessionId,
      visitorId: session.visitorId,
      shopDomain: session.shopDomain,
      eventType: 'purchase_made',
      timestamp: Date.now(),
      orderId,
      orderValue,
      email,
      attributionWindow: AttributionTracker.ATTRIBUTION_WINDOW,
      crossDevice: this.detectCrossDevice(email),
      metadata: {
        deviceType: session.deviceType,
        sessionDuration: Date.now() - session.startTime,
        isFirstVisit: session.isFirstVisit
      }
    };

    await this.sendAttributionEvent(event);
  }

  /**
   * Detect cross-device journey
   */
  private detectCrossDevice(email?: string): boolean {
    // This would be enhanced with server-side logic
    // For now, we'll use a simple heuristic
    const session = this.sessionManager.getSession();
    if (!session || !email) return false;

    // Check if email was submitted in a different session
    // This would require server-side matching
    return false; // Placeholder
  }

  /**
   * Generate unique event ID
   */
  private generateEventId(): string {
    return `evt_${Date.now()}_${Math.random().toString(36).substring(2)}`;
  }

  /**
   * Send attribution event to server
   */
  private async sendAttributionEvent(event: AttributionEvent): Promise<void> {
    try {
      await fetch(`${this.apiBaseUrl}/attribution-track`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(event)
      });
    } catch (error) {
      console.warn('Failed to send attribution event:', error);
      // Store locally for retry
      this.storeFailedEvent(event);
    }
  }

  /**
   * Store failed events for retry
   */
  private storeFailedEvent(event: AttributionEvent): void {
    try {
      const failed = JSON.parse(localStorage.getItem('smartpop_failed_events') || '[]');
      failed.push(event);
      // Keep only last 50 failed events
      const recent = failed.slice(-50);
      localStorage.setItem('smartpop_failed_events', JSON.stringify(recent));
    } catch (error) {
      console.warn('Failed to store failed event:', error);
    }
  }

  /**
   * Retry failed events
   */
  public async retryFailedEvents(): Promise<void> {
    try {
      const failed = JSON.parse(localStorage.getItem('smartpop_failed_events') || '[]');
      if (failed.length === 0) return;

      const retryPromises = failed.map((event: AttributionEvent) => 
        this.sendAttributionEvent(event)
      );

      await Promise.allSettled(retryPromises);
      
      // Clear failed events after retry
      localStorage.removeItem('smartpop_failed_events');
    } catch (error) {
      console.warn('Failed to retry events:', error);
    }
  }
}

/**
 * Global instances
 */
let globalSessionManager: SessionManager | null = null;
let globalAttributionTracker: AttributionTracker | null = null;

/**
 * Initialize tracking for a shop
 */
export function initializeTracking(shopDomain: string, apiBaseUrl: string): {
  sessionManager: SessionManager;
  attributionTracker: AttributionTracker;
} {
  if (!globalSessionManager || globalSessionManager.getSession()?.shopDomain !== shopDomain) {
    globalSessionManager = new SessionManager(shopDomain);
    globalAttributionTracker = new AttributionTracker(globalSessionManager, apiBaseUrl);
    
    // Retry any failed events on initialization
    globalAttributionTracker.retryFailedEvents();
  }

  return {
    sessionManager: globalSessionManager,
    attributionTracker: globalAttributionTracker!
  };
}

/**
 * Get current tracking instances
 */
export function getTrackingInstances(): {
  sessionManager: SessionManager | null;
  attributionTracker: AttributionTracker | null;
} {
  return {
    sessionManager: globalSessionManager,
    attributionTracker: globalAttributionTracker
  };
}