import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Shield, Info, Download, Trash2 } from 'lucide-react';
import { useConsent } from './ConsentProvider';
import { ConsentPermissions } from '@/types/tracking';

export const ConsentPreferences: React.FC = () => {
  const { consent, hasPermission, updateConsent, withdrawConsent } = useConsent();
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
  const [loading, setLoading] = useState(false);
  const [showWithdrawConfirm, setShowWithdrawConfirm] = useState(false);

  useEffect(() => {
    if (consent?.permissions) {
      setPermissions(consent.permissions);
    }
  }, [consent]);

  const handlePermissionChange = (key: keyof ConsentPermissions, value: boolean) => {
    if (key === 'necessary') return; // Cannot disable necessary permissions
    
    setPermissions(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handleSavePreferences = async () => {
    setLoading(true);
    try {
      await updateConsent(permissions);
    } catch (error) {
      console.error('Failed to update consent:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleWithdrawConsent = async () => {
    setLoading(true);
    try {
      await withdrawConsent();
      setShowWithdrawConfirm(false);
    } catch (error) {
      console.error('Failed to withdraw consent:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadData = async () => {
    try {
      const response = await fetch('/api/privacy/download-data', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          sessionId: consent?.sessionId
        })
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `user-data-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
    } catch (error) {
      console.error('Failed to download data:', error);
    }
  };

  const permissionCategories = [
    {
      key: 'necessary' as keyof ConsentPermissions,
      title: 'Necessary Cookies',
      description: 'Essential for basic website functionality. These cannot be disabled.',
      required: true,
      examples: ['Session management', 'Security features', 'Basic functionality']
    },
    {
      key: 'functional' as keyof ConsentPermissions,
      title: 'Functional Cookies',
      description: 'Remember your preferences and enhance your experience.',
      required: false,
      examples: ['Language preferences', 'Theme settings', 'Form data']
    },
    {
      key: 'analytics' as keyof ConsentPermissions,
      title: 'Analytics Cookies',
      description: 'Help us understand how visitors use our website.',
      required: false,
      examples: ['Page views', 'Traffic sources', 'User interactions']
    },
    {
      key: 'marketing' as keyof ConsentPermissions,
      title: 'Marketing Cookies',
      description: 'Used to show you relevant advertisements.',
      required: false,
      examples: ['Ad targeting', 'Campaign tracking', 'Social media pixels']
    },
    {
      key: 'personalization' as keyof ConsentPermissions,
      title: 'Personalization',
      description: 'Customize content and recommendations based on your behavior.',
      required: false,
      examples: ['Content recommendations', 'Product suggestions', 'User preferences']
    },
    {
      key: 'deviceFingerprinting' as keyof ConsentPermissions,
      title: 'Device Fingerprinting',
      description: 'Collect device information for security and fraud prevention.',
      required: false,
      examples: ['Browser fingerprint', 'Device characteristics', 'Screen resolution']
    },
    {
      key: 'locationTracking' as keyof ConsentPermissions,
      title: 'Location Tracking',
      description: 'Access your location for location-based features.',
      required: false,
      examples: ['Geographic targeting', 'Local services', 'Regional content']
    },
    {
      key: 'behavioralTracking' as keyof ConsentPermissions,
      title: 'Behavioral Tracking',
      description: 'Track detailed interactions with our website.',
      required: false,
      examples: ['Mouse movements', 'Scroll behavior', 'Click patterns']
    },
    {
      key: 'thirdPartyIntegrations' as keyof ConsentPermissions,
      title: 'Third-party Integrations',
      description: 'Share data with trusted partners for enhanced functionality.',
      required: false,
      examples: ['CRM integration', 'Email marketing', 'Customer support']
    }
  ];

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <Shield className="h-6 w-6 text-blue-600" />
        <div>
          <h1 className="text-2xl font-bold">Privacy Preferences</h1>
          <p className="text-gray-600">Manage your data and privacy settings</p>
        </div>
      </div>

      {consent && (
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            Last updated: {consent.timestamp.toLocaleDateString()} via {consent.source}
            {consent.version && ` (v${consent.version})`}
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Cookie and Data Collection Preferences</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {permissionCategories.map((category) => (
            <div key={String(category.key)} className="p-4 border rounded-lg">
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold">{category.title}</h3>
                    {category.required && (
                      <Badge variant="secondary" className="text-xs">Required</Badge>
                    )}
                  </div>
                  <p className="text-sm text-gray-600 mb-2">{category.description}</p>
                  <div className="text-xs text-gray-500">
                    Examples: {category.examples.join(', ')}
                  </div>
                </div>
                <Switch
                  checked={permissions[category.key]}
                  onCheckedChange={(checked) => handlePermissionChange(category.key, checked)}
                  disabled={category.required || loading}
                />
              </div>
            </div>
          ))}

          <div className="flex gap-3 pt-4 border-t">
            <Button 
              onClick={handleSavePreferences} 
              disabled={loading}
              className="flex-1"
            >
              {loading ? 'Saving...' : 'Save Preferences'}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Data Rights (GDPR/CCPA)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <Button
              onClick={handleDownloadData}
              variant="outline"
              className="flex-1"
              disabled={loading}
            >
              <Download className="h-4 w-4 mr-2" />
              Download My Data
            </Button>
            
            <Button
              onClick={() => setShowWithdrawConfirm(true)}
              variant="outline"
              className="flex-1 text-red-600 border-red-200 hover:bg-red-50"
              disabled={loading}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Withdraw All Consent
            </Button>
          </div>

          {showWithdrawConfirm && (
            <Alert className="border-red-200 bg-red-50">
              <AlertDescription>
                <div className="space-y-3">
                  <p className="font-medium text-red-800">
                    Are you sure you want to withdraw all consent?
                  </p>
                  <p className="text-sm text-red-700">
                    This will disable all non-essential tracking and delete your stored data. 
                    Some website features may not work properly.
                  </p>
                  <div className="flex gap-2">
                    <Button
                      onClick={handleWithdrawConsent}
                      variant="destructive"
                      size="sm"
                      disabled={loading}
                    >
                      {loading ? 'Processing...' : 'Yes, Withdraw Consent'}
                    </Button>
                    <Button
                      onClick={() => setShowWithdrawConfirm(false)}
                      variant="outline"
                      size="sm"
                      disabled={loading}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      <div className="text-sm text-gray-500 text-center">
        <p>
          For questions about our privacy practices, contact us at{' '}
          <a href="mailto:privacy@smartpop.com" className="underline">
            privacy@smartpop.com
          </a>
        </p>
      </div>
    </div>
  );
};
