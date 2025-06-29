import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { X, Settings, Shield } from 'lucide-react';
import { ConsentManager } from '@/lib/consent/consent-manager';
import { ConsentPermissions } from '@/types/tracking';

export interface ConsentBannerProps {
  onAcceptAll: () => void;
  onRejectAll: () => void;
  onCustomize: () => void;
  className?: string;
}

export const ConsentBanner: React.FC<ConsentBannerProps> = ({
  onAcceptAll,
  onRejectAll,
  onCustomize,
  className = ''
}) => {
  const [visible, setVisible] = useState(false);
  const [showPreferences, setShowPreferences] = useState(false);
  const [permissions, setPermissions] = useState<ConsentPermissions>({
    necessary: true,
    functional: false,
    analytics: false,
    marketing: false,
    personalization: false,
    deviceFingerprinting: false,
    locationTracking: false,
    behavioralTracking: false,
    thirdPartyIntegrations: false
  });

  const consentManager = ConsentManager.getInstance();

  useEffect(() => {
    const handleShowBanner = () => setVisible(true);
    const handleShowUpdate = () => {
      setVisible(true);
      setShowPreferences(true);
    };

    window.addEventListener('showConsentBanner', handleShowBanner);
    window.addEventListener('showConsentUpdate', handleShowUpdate);

    // Initialize consent manager
    consentManager.initialize();

    return () => {
      window.removeEventListener('showConsentBanner', handleShowBanner);
      window.removeEventListener('showConsentUpdate', handleShowUpdate);
    };
  }, []);

  const handleAcceptAll = async () => {
    const allPermissions: ConsentPermissions = {
      necessary: true,
      functional: true,
      analytics: true,
      marketing: true,
      personalization: true,
      deviceFingerprinting: true,
      locationTracking: true,
      behavioralTracking: true,
      thirdPartyIntegrations: true
    };

    await consentManager.setConsent(allPermissions, 'banner');
    setVisible(false);
    onAcceptAll();
  };

  const handleRejectAll = async () => {
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

    await consentManager.setConsent(minimalPermissions, 'banner');
    setVisible(false);
    onRejectAll();
  };

  const handleSavePreferences = async () => {
    await consentManager.setConsent(permissions, 'preferences');
    setVisible(false);
    setShowPreferences(false);
    onCustomize();
  };

  const handlePermissionChange = (key: keyof ConsentPermissions, value: boolean) => {
    if (key === 'necessary') return; // Necessary cookies cannot be disabled
    
    setPermissions(prev => ({
      ...prev,
      [key]: value
    }));
  };

  if (!visible) return null;

  const permissionLabels = {
    necessary: {
      title: 'Necessary',
      description: 'Essential for basic website functionality'
    },
    functional: {
      title: 'Functional',
      description: 'Remember your preferences and settings'
    },
    analytics: {
      title: 'Analytics',
      description: 'Help us understand how you use our site'
    },
    marketing: {
      title: 'Marketing',
      description: 'Show you relevant advertisements'
    },
    personalization: {
      title: 'Personalization',
      description: 'Customize content based on your behavior'
    },
    deviceFingerprinting: {
      title: 'Device Fingerprinting',
      description: 'Collect device information for security'
    },
    locationTracking: {
      title: 'Location Tracking',
      description: 'Access your location for location-based features'
    },
    behavioralTracking: {
      title: 'Behavioral Tracking',
      description: 'Track your interactions with our website'
    },
    thirdPartyIntegrations: {
      title: 'Third-party Integrations',
      description: 'Share data with trusted partners'
    }
  };

  return (
    <div className={`fixed inset-0 z-50 bg-black/50 flex items-end md:items-center justify-center p-4 ${className}`}>
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <CardContent className="p-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-blue-600" />
              <h3 className="text-lg font-semibold">Privacy Settings</h3>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setVisible(false)}
              className="h-8 w-8 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {!showPreferences ? (
            <>
              <p className="text-sm text-gray-600 mb-6">
                We use cookies and similar technologies to enhance your experience, analyze usage, 
                and provide personalized content. You can manage your preferences below.
              </p>

              <div className="flex flex-col sm:flex-row gap-3">
                <Button onClick={handleAcceptAll} className="flex-1">
                  Accept All
                </Button>
                <Button onClick={handleRejectAll} variant="outline" className="flex-1">
                  Reject All
                </Button>
                <Button
                  onClick={() => setShowPreferences(true)}
                  variant="outline"
                  className="flex-1"
                >
                  <Settings className="h-4 w-4 mr-2" />
                  Customize
                </Button>
              </div>
            </>
          ) : (
            <>
              <p className="text-sm text-gray-600 mb-6">
                Choose which types of data collection you're comfortable with. 
                Necessary cookies are required for basic functionality.
              </p>

              <div className="space-y-4 mb-6">
                {Object.entries(permissionLabels).map(([key, label]) => (
                  <div key={key} className="flex items-center justify-between p-3 rounded-lg border">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium">{label.title}</h4>
                        {key === 'necessary' && (
                          <span className="text-xs bg-gray-100 px-2 py-1 rounded">Required</span>
                        )}
                      </div>
                      <p className="text-sm text-gray-600">{label.description}</p>
                    </div>
                    <Switch
                      checked={permissions[key as keyof ConsentPermissions]}
                      onCheckedChange={(checked) => 
                        handlePermissionChange(key as keyof ConsentPermissions, checked)
                      }
                      disabled={key === 'necessary'}
                    />
                  </div>
                ))}
              </div>

              <div className="flex gap-3">
                <Button onClick={handleSavePreferences} className="flex-1">
                  Save Preferences
                </Button>
                <Button
                  onClick={() => setShowPreferences(false)}
                  variant="outline"
                  className="flex-1"
                >
                  Back
                </Button>
              </div>
            </>
          )}

          <div className="mt-4 pt-4 border-t">
            <p className="text-xs text-gray-500">
              You can change these settings at any time in your privacy preferences. 
              For more information, see our{' '}
              <a href="/privacy" className="underline hover:no-underline">
                Privacy Policy
              </a>
              .
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};