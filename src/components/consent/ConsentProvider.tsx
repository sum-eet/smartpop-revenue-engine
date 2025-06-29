import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { ConsentManager } from '@/lib/consent/consent-manager';
import { ConsentRecord, ConsentPermissions } from '@/types/tracking';
import { ConsentBanner } from './ConsentBanner';

interface ConsentContextType {
  consent: ConsentRecord | null;
  hasPermission: (permission: keyof ConsentPermissions) => boolean;
  updateConsent: (permissions: Partial<ConsentPermissions>) => Promise<void>;
  withdrawConsent: () => Promise<void>;
  showPreferences: () => void;
  isConsentRequired: boolean;
}

const ConsentContext = createContext<ConsentContextType | undefined>(undefined);

export const useConsent = () => {
  const context = useContext(ConsentContext);
  if (!context) {
    throw new Error('useConsent must be used within ConsentProvider');
  }
  return context;
};

interface ConsentProviderProps {
  children: ReactNode;
  autoShow?: boolean;
  onConsentChange?: (consent: ConsentRecord) => void;
}

export const ConsentProvider: React.FC<ConsentProviderProps> = ({
  children,
  autoShow = true,
  onConsentChange
}) => {
  const [consent, setConsent] = useState<ConsentRecord | null>(null);
  const [isConsentRequired, setIsConsentRequired] = useState(false);
  const [showBanner, setShowBanner] = useState(false);

  const consentManager = ConsentManager.getInstance();

  useEffect(() => {
    const initializeConsent = async () => {
      // Check if consent is required based on jurisdiction
      const required = await consentManager.isConsentRequired();
      setIsConsentRequired(required);

      // Get existing consent
      const existingConsent = consentManager.getConsent();
      setConsent(existingConsent);

      // Auto-show banner if needed and enabled
      if (autoShow && required && !existingConsent) {
        setShowBanner(true);
      }

      // Initialize consent manager
      await consentManager.initialize();
    };

    initializeConsent();
  }, [autoShow]);

  useEffect(() => {
    // Listen for consent changes
    const unsubscribe = consentManager.onConsentChange((newConsent) => {
      setConsent(newConsent);
      onConsentChange?.(newConsent);
    });

    return unsubscribe;
  }, [onConsentChange]);

  const hasPermission = (permission: keyof ConsentPermissions): boolean => {
    return consentManager.hasPermission(permission);
  };

  const updateConsent = async (permissions: Partial<ConsentPermissions>): Promise<void> => {
    await consentManager.updateConsent(permissions);
  };

  const withdrawConsent = async (): Promise<void> => {
    await consentManager.withdrawConsent();
  };

  const showPreferences = (): void => {
    setShowBanner(true);
  };

  const handleBannerAcceptAll = () => {
    setShowBanner(false);
  };

  const handleBannerRejectAll = () => {
    setShowBanner(false);
  };

  const handleBannerCustomize = () => {
    setShowBanner(false);
  };

  const contextValue: ConsentContextType = {
    consent,
    hasPermission,
    updateConsent,
    withdrawConsent,
    showPreferences,
    isConsentRequired
  };

  return (
    <ConsentContext.Provider value={contextValue}>
      {children}
      {showBanner && (
        <ConsentBanner
          onAcceptAll={handleBannerAcceptAll}
          onRejectAll={handleBannerRejectAll}
          onCustomize={handleBannerCustomize}
        />
      )}
    </ConsentContext.Provider>
  );
};