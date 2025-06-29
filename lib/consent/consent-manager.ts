// Privacy-first consent management system

import { ConsentPermissions, ConsentRecord } from '@/types/tracking';

export class ConsentManager {
  private static instance: ConsentManager;
  private consentData: ConsentRecord | null = null;
  private listeners: Array<(consent: ConsentRecord) => void> = [];
  private readonly CONSENT_COOKIE = 'smartpop_consent';
  private readonly CONSENT_VERSION = '1.0.0';

  private constructor() {
    this.loadStoredConsent();
  }

  public static getInstance(): ConsentManager {
    if (!ConsentManager.instance) {
      ConsentManager.instance = new ConsentManager();
    }
    return ConsentManager.instance;
  }

  /**
   * Initialize consent manager with default permissions
   */
  public async initialize(): Promise<void> {
    if (typeof window === 'undefined') return;

    // Check if user has existing consent
    const existingConsent = this.getStoredConsent();
    
    if (!existingConsent) {
      // Show consent banner for new users
      this.showConsentBanner();
    } else {
      // Validate existing consent version
      if (this.isConsentOutdated(existingConsent)) {
        this.showConsentUpdate();
      } else {
        this.consentData = existingConsent;
        this.notifyListeners();
      }
    }
  }

  /**
   * Set user consent with granular permissions
   */
  public async setConsent(
    permissions: ConsentPermissions,
    source: 'banner' | 'preferences' | 'api' = 'banner'
  ): Promise<ConsentRecord> {
    const sessionId = this.getSessionId();
    const consentRecord: ConsentRecord = {
      id: this.generateId(),
      sessionId,
      permissions,
      consentString: this.generateConsentString(permissions),
      timestamp: new Date(),
      ipAddress: await this.getClientIP(),
      userAgent: navigator.userAgent,
      source,
      version: this.CONSENT_VERSION
    };

    // Store consent
    this.consentData = consentRecord;
    this.storeConsent(consentRecord);
    
    // Send to backend for compliance records
    await this.persistConsent(consentRecord);
    
    // Notify all listeners
    this.notifyListeners();
    
    return consentRecord;
  }

  /**
   * Update existing consent permissions
   */
  public async updateConsent(permissions: Partial<ConsentPermissions>): Promise<ConsentRecord> {
    if (!this.consentData) {
      throw new Error('No existing consent to update');
    }

    const updatedPermissions = {
      ...this.consentData.permissions,
      ...permissions
    };

    return this.setConsent(updatedPermissions, 'preferences');
  }

  /**
   * Withdraw all consent (GDPR right to withdraw)
   */
  public async withdrawConsent(): Promise<void> {
    const minimalPermissions: ConsentPermissions = {
      necessary: true, // Required for basic functionality
      functional: false,
      analytics: false,
      marketing: false,
      personalization: false,
      deviceFingerprinting: false,
      locationTracking: false,
      behavioralTracking: false,
      thirdPartyIntegrations: false
    };

    await this.setConsent(minimalPermissions, 'preferences');
    
    // Clear all stored tracking data
    await this.clearUserData();
  }

  /**
   * Check if specific permission is granted
   */
  public hasPermission(permission: keyof ConsentPermissions): boolean {
    return this.consentData?.permissions[permission] ?? false;
  }

  /**
   * Get current consent status
   */
  public getConsent(): ConsentRecord | null {
    return this.consentData;
  }

  /**
   * Add listener for consent changes
   */
  public onConsentChange(callback: (consent: ConsentRecord) => void): () => void {
    this.listeners.push(callback);
    
    // Return unsubscribe function
    return () => {
      const index = this.listeners.indexOf(callback);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  /**
   * Check if consent is required (GDPR/CCPA regions)
   */
  public async isConsentRequired(): Promise<boolean> {
    try {
      // Check user's location for GDPR/CCPA compliance
      const response = await fetch('/api/privacy/check-jurisdiction');
      const { requiresConsent } = await response.json();
      return requiresConsent;
    } catch (error) {
      // Default to requiring consent for privacy-first approach
      return true;
    }
  }

  /**
   * Generate IAB TCF v2.0 compatible consent string
   */
  private generateConsentString(permissions: ConsentPermissions): string {
    // Simplified consent string - in production, use full IAB TCF v2.0 spec
    const binaryString = Object.values(permissions).map(p => p ? '1' : '0').join('');
    return btoa(binaryString + '_v' + this.CONSENT_VERSION);
  }

  /**
   * Store consent in localStorage and cookies
   */
  private storeConsent(consent: ConsentRecord): void {
    const consentData = JSON.stringify(consent);
    
    // Store in localStorage for persistence
    localStorage.setItem(this.CONSENT_COOKIE, consentData);
    
    // Store minimal data in cookie for server-side access
    const cookieValue = `${consent.consentString}|${consent.timestamp.getTime()}`;
    document.cookie = `${this.CONSENT_COOKIE}=${cookieValue}; path=/; max-age=${365 * 24 * 60 * 60}; SameSite=Strict; Secure`;
  }

  /**
   * Load stored consent from localStorage
   */
  private loadStoredConsent(): void {
    if (typeof window === 'undefined') return;
    
    try {
      const stored = localStorage.getItem(this.CONSENT_COOKIE);
      if (stored) {
        this.consentData = JSON.parse(stored);
        // Convert timestamp back to Date object
        if (this.consentData) {
          this.consentData.timestamp = new Date(this.consentData.timestamp);
        }
      }
    } catch (error) {
      console.warn('Failed to load stored consent:', error);
    }
  }

  /**
   * Get stored consent from localStorage
   */
  private getStoredConsent(): ConsentRecord | null {
    try {
      const stored = localStorage.getItem(this.CONSENT_COOKIE);
      if (stored) {
        const consent = JSON.parse(stored);
        consent.timestamp = new Date(consent.timestamp);
        return consent;
      }
    } catch (error) {
      console.warn('Failed to parse stored consent:', error);
    }
    return null;
  }

  /**
   * Check if consent is outdated and needs refresh
   */
  private isConsentOutdated(consent: ConsentRecord): boolean {
    // Check version
    if (consent.version !== this.CONSENT_VERSION) {
      return true;
    }
    
    // Check age (refresh consent every 13 months for GDPR compliance)
    const thirteenMonths = 13 * 30 * 24 * 60 * 60 * 1000;
    const age = Date.now() - consent.timestamp.getTime();
    
    return age > thirteenMonths;
  }

  /**
   * Show consent banner UI
   */
  private showConsentBanner(): void {
    // This will be handled by React component
    window.dispatchEvent(new CustomEvent('showConsentBanner'));
  }

  /**
   * Show consent update UI
   */
  private showConsentUpdate(): void {
    window.dispatchEvent(new CustomEvent('showConsentUpdate'));
  }

  /**
   * Notify all listeners of consent changes
   */
  private notifyListeners(): void {
    if (this.consentData) {
      this.listeners.forEach(callback => callback(this.consentData!));
    }
  }

  /**
   * Persist consent to backend for compliance
   */
  private async persistConsent(consent: ConsentRecord): Promise<void> {
    try {
      await fetch('/api/consent/record', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(consent)
      });
    } catch (error) {
      console.error('Failed to persist consent:', error);
    }
  }

  /**
   * Clear all user data (GDPR right to erasure)
   */
  private async clearUserData(): Promise<void> {
    try {
      await fetch('/api/privacy/delete-user-data', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          sessionId: this.getSessionId()
        })
      });
    } catch (error) {
      console.error('Failed to clear user data:', error);
    }
  }

  /**
   * Get or generate session ID
   */
  private getSessionId(): string {
    let sessionId = sessionStorage.getItem('smartpop_session_id');
    if (!sessionId) {
      sessionId = this.generateId();
      sessionStorage.setItem('smartpop_session_id', sessionId);
    }
    return sessionId;
  }

  /**
   * Generate unique ID
   */
  private generateId(): string {
    return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get client IP address (approximate)
   */
  private async getClientIP(): Promise<string> {
    try {
      const response = await fetch('/api/privacy/client-ip');
      const { ip } = await response.json();
      return ip;
    } catch (error) {
      return 'unknown';
    }
  }
}