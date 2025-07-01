
import { ConsentRecord, ConsentPermissions } from '@/types/tracking';

export class ConsentManager {
  private static instance: ConsentManager;
  private listeners: ((consent: ConsentRecord) => void)[] = [];
  private currentConsent: ConsentRecord | null = null;

  private constructor() {}

  static getInstance(): ConsentManager {
    if (!ConsentManager.instance) {
      ConsentManager.instance = new ConsentManager();
    }
    return ConsentManager.instance;
  }

  async initialize(): Promise<void> {
    const stored = localStorage.getItem('consent_record');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        this.currentConsent = {
          ...parsed,
          timestamp: new Date(parsed.timestamp)
        };
      } catch (error) {
        console.error('Failed to parse stored consent:', error);
      }
    }
  }

  async isConsentRequired(): Promise<boolean> {
    // Simple check - in production, this would check user's jurisdiction
    return true;
  }

  getConsent(): ConsentRecord | null {
    return this.currentConsent;
  }

  hasPermission(permission: keyof ConsentPermissions): boolean {
    if (!this.currentConsent) return false;
    return this.currentConsent.permissions[permission];
  }

  async setConsent(permissions: ConsentPermissions, source: string): Promise<void> {
    const consent: ConsentRecord = {
      id: crypto.randomUUID(),
      sessionId: this.getSessionId(),
      permissions,
      timestamp: new Date(),
      source,
      version: '1.0'
    };

    this.currentConsent = consent;
    localStorage.setItem('consent_record', JSON.stringify(consent));
    
    this.notifyListeners(consent);
  }

  async updateConsent(permissions: Partial<ConsentPermissions>): Promise<void> {
    if (!this.currentConsent) return;
    
    const updatedPermissions = { ...this.currentConsent.permissions, ...permissions };
    await this.setConsent(updatedPermissions, 'update');
  }

  async withdrawConsent(): Promise<void> {
    const minimalPermissions: ConsentPermissions = {
      necessary: true,
      functional: false,
      analytics: false,
      marketing: false,
      personalization: false,
      deviceFingerprinting: false,
      locationTracking: false,
      behavioralTracking: false,
      thirdPartyIntegrations: false
    };

    await this.setConsent(minimalPermissions, 'withdrawal');
  }

  onConsentChange(callback: (consent: ConsentRecord) => void): () => void {
    this.listeners.push(callback);
    return () => {
      const index = this.listeners.indexOf(callback);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  private notifyListeners(consent: ConsentRecord): void {
    this.listeners.forEach(listener => listener(consent));
  }

  private getSessionId(): string {
    let sessionId = sessionStorage.getItem('consent_session_id');
    if (!sessionId) {
      sessionId = crypto.randomUUID();
      sessionStorage.setItem('consent_session_id', sessionId);
    }
    return sessionId;
  }
}
