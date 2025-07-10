import React, { useEffect, useState } from 'react';
import { useAppBridge } from '@/hooks/useAppBridge';
import { webVitalsMonitor } from '@/lib/webVitals';

interface AppBridgeProviderProps {
  children: React.ReactNode;
}

export const AppBridgeProvider: React.FC<AppBridgeProviderProps> = ({ children }) => {
  const { isEmbedded, isInitialized, error } = useAppBridge();
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    // Initialize web vitals monitoring
    webVitalsMonitor;
    
    // Set ready state once App Bridge is initialized or determined not needed
    if (isInitialized) {
      setIsReady(true);
    }
  }, [isInitialized]);

  useEffect(() => {
    // Log App Bridge status for debugging
    if (isEmbedded) {
      console.log('🔧 App Bridge: Running in embedded mode');
    } else {
      console.log('🔧 App Bridge: Running in standalone mode');
    }

    if (error) {
      console.error('🔧 App Bridge: Initialization error:', error);
    }
  }, [isEmbedded, error]);

  // Show loading state while App Bridge initializes
  if (!isReady) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">
            {isEmbedded ? 'Initializing Shopify App...' : 'Loading...'}
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};