import { useState, useEffect, useCallback } from 'react';
import { appBridgeManager } from '@/lib/shopify/app-bridge';
import type { ClientApplication } from '@shopify/app-bridge';

interface UseAppBridgeReturn {
  app: ClientApplication | null;
  isEmbedded: boolean;
  isInitialized: boolean;
  sessionToken: string | null;
  shopDomain: string | null;
  host: string | null;
  getSessionToken: () => Promise<string | null>;
  navigate: (path: string) => void;
  error: Error | null;
}

export const useAppBridge = (): UseAppBridgeReturn => {
  const [app, setApp] = useState<ClientApplication | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [error, setError] = useState<Error | null>(null);

  const isEmbedded = appBridgeManager.isEmbedded();
  const shopDomain = appBridgeManager.getShopDomain();
  const host = appBridgeManager.getHost();

  // Initialize App Bridge on mount
  useEffect(() => {
    let mounted = true;

    const initialize = async () => {
      try {
        setError(null);
        
        if (!isEmbedded) {
          setIsInitialized(true);
          return;
        }

        const appInstance = await appBridgeManager.initialize();
        
        if (mounted) {
          setApp(appInstance);
          setIsInitialized(true);
        }
      } catch (err) {
        if (mounted) {
          setError(err instanceof Error ? err : new Error('Failed to initialize App Bridge'));
          setIsInitialized(true);
        }
      }
    };

    initialize();

    // Cleanup on unmount
    return () => {
      mounted = false;
    };
  }, [isEmbedded]);

  // Get session token
  const getSessionToken = useCallback(async (): Promise<string | null> => {
    try {
      const token = await appBridgeManager.getSessionToken();
      setSessionToken(token);
      return token;
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to get session token'));
      return null;
    }
  }, []);

  // Navigate within app
  const navigate = useCallback((path: string) => {
    try {
      appBridgeManager.navigate(path);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Navigation failed'));
    }
  }, []);

  // Preload session token for embedded apps
  useEffect(() => {
    if (isEmbedded && app && !sessionToken) {
      getSessionToken();
    }
  }, [isEmbedded, app, sessionToken, getSessionToken]);

  return {
    app,
    isEmbedded,
    isInitialized,
    sessionToken,
    shopDomain,
    host,
    getSessionToken,
    navigate,
    error,
  };
};