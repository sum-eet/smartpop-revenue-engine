// Core tracking types for comprehensive data capture system

export interface ConsentPermissions {
  necessary: boolean;
  functional: boolean;
  analytics: boolean;
  marketing: boolean;
  personalization: boolean;
  deviceFingerprinting: boolean;
  locationTracking: boolean;
  behavioralTracking: boolean;
  thirdPartyIntegrations: boolean;
}

export interface ConsentRecord {
  id: string;
  sessionId: string;
  userId?: string;
  permissions: ConsentPermissions;
  consentString: string; // IAB TCF v2.0 compatible
  timestamp: Date;
  ipAddress: string;
  userAgent: string;
  source: 'banner' | 'preferences' | 'api';
  version: string; // consent version for GDPR compliance
}

export interface DeviceFingerprint {
  screenResolution: string;
  timezone: string;
  language: string;
  platform: string;
  vendor: string;
  cookiesEnabled: boolean;
  doNotTrack: boolean;
  fonts: string[];
  plugins: string[];
  webglVendor?: string;
  webglRenderer?: string;
  canvasFingerprint?: string;
  audioContextFingerprint?: string;
  hardwareConcurrency: number;
  deviceMemory?: number;
  connection?: {
    effectiveType: string;
    downlink: number;
    rtt: number;
  };
}

export interface BehavioralEvent {
  type: 'mouseMove' | 'scroll' | 'click' | 'hover' | 'focus' | 'blur' | 'resize' | 'visibility';
  element?: {
    tagName: string;
    id?: string;
    className?: string;
    text?: string;
    attributes?: Record<string, string>;
  };
  coordinates?: { x: number; y: number };
  scrollPosition?: { x: number; y: number };
  timestamp: number;
  viewport: { width: number; height: number };
}

export interface PageAnalytics {
  url: string;
  title: string;
  referrer: string;
  entryTime: Date;
  exitTime?: Date;
  timeOnPage?: number;
  scrollDepth: number;
  clickCount: number;
  bounced: boolean;
  loadTime: number;
  ttfb: number; // Time to First Byte
  fcp: number; // First Contentful Paint
  lcp: number; // Largest Contentful Paint
  cls: number; // Cumulative Layout Shift
  fid: number; // First Input Delay
}

export interface EcommerceEvent {
  type: 'product_view' | 'add_to_cart' | 'remove_from_cart' | 'begin_checkout' | 'purchase' | 'search' | 'category_view';
  productId?: string;
  productName?: string;
  category?: string;
  price?: number;
  currency?: string;
  quantity?: number;
  searchQuery?: string;
  transactionId?: string;
  revenue?: number;
  timestamp: Date;
}

export interface SessionData {
  sessionId: string;
  userId?: string;
  startTime: Date;
  endTime?: Date;
  duration?: number;
  pageViews: number;
  bounced: boolean;
  source: string;
  medium: string;
  campaign?: string;
  device: DeviceFingerprint;
  ipAddress: string;
  userAgent: string;
  country?: string;
  region?: string;
  city?: string;
}

export interface TrackingEvent {
  id: string;
  sessionId: string;
  userId?: string;
  type: 'page_view' | 'behavioral' | 'ecommerce' | 'performance' | 'error';
  data: PageAnalytics | BehavioralEvent | EcommerceEvent | PerformanceMetrics | ErrorEvent;
  timestamp: Date;
  batchId?: string;
}

export interface PerformanceMetrics {
  type: 'navigation' | 'resource' | 'measure' | 'paint';
  name: string;
  startTime: number;
  duration: number;
  transferSize?: number;
  encodedBodySize?: number;
  decodedBodySize?: number;
}

export interface ErrorEvent {
  message: string;
  source: string;
  lineno: number;
  colno: number;
  error?: string;
  stack?: string;
  userAgent: string;
  url: string;
}

export interface TrackingConfig {
  apiEndpoint: string;
  websocketEndpoint: string;
  batchSize: number;
  batchTimeout: number;
  enableDeviceFingerprinting: boolean;
  enableBehavioralTracking: boolean;
  enablePerformanceTracking: boolean;
  enableErrorTracking: boolean;
  enableRealTimeStreaming: boolean;
  privacyMode: 'strict' | 'balanced' | 'minimal';
  debug: boolean;
}

export interface DataSubject {
  id: string;
  email?: string;
  consentRecords: ConsentRecord[];
  dataRequests: DataRequest[];
  createdAt: Date;
  updatedAt: Date;
}

export interface DataRequest {
  id: string;
  subjectId: string;
  type: 'access' | 'portability' | 'deletion' | 'rectification';
  status: 'pending' | 'processing' | 'completed' | 'rejected';
  requestedAt: Date;
  completedAt?: Date;
  reason?: string;
}

// Real-time streaming types
export interface WebSocketMessage {
  type: 'event' | 'batch' | 'heartbeat' | 'error';
  data: TrackingEvent | TrackingEvent[] | string;
  timestamp: Date;
}

// Integration types
export interface ShopifyWebhook {
  id: string;
  topic: string;
  shop_domain: string;
  payload: any;
  created_at: Date;
  verified: boolean;
}

export interface CRMContact {
  email: string;
  firstName?: string;
  lastName?: string;
  tags: string[];
  customFields: Record<string, any>;
  sessionData: SessionData;
  behavioralProfile: BehavioralProfile;
}

export interface BehavioralProfile {
  totalSessions: number;
  totalPageViews: number;
  averageSessionDuration: number;
  bounceRate: number;
  preferredCategories: string[];
  purchaseHistory: EcommerceEvent[];
  engagementScore: number;
  riskScore: number; // fraud detection
  lastActive: Date;
}

// Analytics and insights
export interface AnalyticsQuery {
  metric: string;
  dimensions: string[];
  filters: Record<string, any>;
  dateRange: {
    start: Date;
    end: Date;
  };
  aggregation: 'sum' | 'avg' | 'count' | 'unique';
}

export interface InsightData {
  metric: string;
  value: number;
  change: number;
  trend: 'up' | 'down' | 'stable';
  significance: number;
  recommendations: string[];
}