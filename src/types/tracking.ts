
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
  permissions: ConsentPermissions;
  timestamp: Date;
  source: string;
  version?: string;
  userAgent?: string;
  ipAddress?: string;
}

export interface TrackingEvent {
  id: string;
  type: string;
  timestamp: Date;
  sessionId: string;
  userId?: string;
  data: any;
}
