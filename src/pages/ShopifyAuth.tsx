import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle, AlertCircle, Loader2 } from 'lucide-react';

const ShopifyAuth = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const shop = searchParams.get('shop');
    const code = searchParams.get('code');
    
    if (code && shop) {
      // OAuth callback - redirect to Supabase Edge Function
      window.location.href = `https://zsmoutzjhqjgjehaituw.supabase.co/functions/v1/shopify-auth?${searchParams.toString()}`;
    } else if (shop) {
      setStatus('success');
      setMessage(`App successfully installed on ${shop}!`);
      
      // After successful installation, close popup and redirect parent to dashboard
      setTimeout(() => {
        if (window.opener) {
          // If opened in popup, redirect parent window and close popup
          window.opener.location.href = `https://smartpop-revenue-engine.vercel.app/dashboard?shop=${shop}`;
          window.close();
        } else {
          // If not in popup, redirect current window
          navigate('/dashboard');
        }
      }, 2000);
    } else {
      setStatus('error');
      setMessage('Invalid installation. Please try again from your Shopify admin.');
    }
  }, [searchParams, navigate]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="flex items-center justify-center gap-2">
            {status === 'loading' && <Loader2 className="w-5 h-5 animate-spin" />}
            {status === 'success' && <CheckCircle className="w-5 h-5 text-green-600" />}
            {status === 'error' && <AlertCircle className="w-5 h-5 text-red-600" />}
            SmartPop Installation
          </CardTitle>
          <CardDescription>
            {status === 'loading' && 'Processing installation...'}
            {status === 'success' && 'Installation Complete'}
            {status === 'error' && 'Installation Failed'}
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <p className="text-sm text-gray-600">{message}</p>
          
          {status === 'success' && (
            <div className="space-y-4">
              <div className="bg-green-50 p-4 rounded-lg">
                <h4 className="font-semibold text-green-800 mb-2">What's Next?</h4>
                <ul className="text-sm text-green-700 space-y-1 text-left">
                  <li>• Your popups are now active on your store</li>
                  <li>• Default campaigns have been created</li>
                  <li>• Customize your popups in the Shopify admin</li>
                </ul>
              </div>
              
              <Button onClick={() => navigate('/dashboard')} className="w-full">
                Go to Dashboard
              </Button>
            </div>
          )}
          
          {status === 'error' && (
            <Button onClick={() => window.close()} variant="outline" className="w-full">
              Close Window
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ShopifyAuth;
