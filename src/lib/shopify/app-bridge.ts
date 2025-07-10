import { createApp, type ClientApplication } from '@shopify/app-bridge';
import { getSessionToken as getBridgeSessionToken } from '@shopify/app-bridge/utilities';
import { Redirect } from '@shopify/app-bridge/actions';
import type { ShopifyAppConfig, AppBridgeError } from './types';

class AppBridgeManager {
  private app: ClientApplication | null = null;
  private initialized = false;
  private sessionToken: string | null = null;
  private tokenExpiry: number | null = null;

  /**
   * Initialize App Bridge - only call in embedded context
   */
  public async initialize(): Promise<ClientApplication | null> {
    if (this.initialized) {
      return this.app;
    }

    try {
      // Check if we're in embedded context
      if (!this.isEmbedded()) {
        console.log('🔧 App Bridge: Not in embedded context, skipping initialization');
        return null;
      }

      // Get required parameters
      const config = this.getAppBridgeConfig();
      if (!config) {
        console.warn('🔧 App Bridge: Missing configuration, skipping initialization');
        return null;
      }

      // Initialize App Bridge
      this.app = createApp(config);
      this.initialized = true;

      // Set up error handling
      this.setupErrorHandling();

      console.log('🔧 App Bridge: Successfully initialized');
      return this.app;
    } catch (error) {
      console.error('🔧 App Bridge: Initialization failed:', error);
      return null;
    }
  }

  /**
   * Get session token for API authentication
   */
  public async getSessionToken(): Promise<string | null> {
    if (!this.app) {
      return null;
    }

    try {
      // Check if current token is still valid
      if (this.sessionToken && this.tokenExpiry && Date.now() < this.tokenExpiry - 30000) {
        return this.sessionToken;
      }

      // Get new session token
      this.sessionToken = await getBridgeSessionToken(this.app);
      
      // Parse token to get expiry
      if (this.sessionToken) {
        const payload = this.parseJWT(this.sessionToken);
        this.tokenExpiry = payload.exp * 1000; // Convert to milliseconds
      }

      return this.sessionToken;
    } catch (error) {
      console.error('🔧 App Bridge: Failed to get session token:', error);
      return null;
    }
  }

  /**
   * Navigate within embedded app
   */
  public navigate(path: string): void {
    if (!this.app) {
      // Fallback to regular navigation
      window.location.href = path;
      return;
    }

    try {
      const redirect = Redirect.create(this.app);
      redirect.dispatch(Redirect.Action.APP, path);
    } catch (error) {
      console.error('🔧 App Bridge: Navigation failed:', error);
      // Fallback to regular navigation
      window.location.href = path;
    }
  }

  /**
   * Check if app is running in embedded context
   */
  public isEmbedded(): boolean {
    return new URLSearchParams(window.location.search).has('embedded') || 
           new URLSearchParams(window.location.search).has('hmac') ||
           window.top !== window.self;
  }

  /**
   * Get shop domain from URL parameters
   */
  public getShopDomain(): string | null {
    const params = new URLSearchParams(window.location.search);
    return params.get('shop');
  }

  /**
   * Get host parameter for App Bridge
   */
  public getHost(): string | null {
    const params = new URLSearchParams(window.location.search);
    return params.get('host');
  }

  /**
   * Clean up App Bridge instance
   */
  public destroy(): void {
    if (this.app) {
      try {
        // App Bridge doesn't have explicit destroy method, just clear references
        this.app = null;
        this.initialized = false;
        this.sessionToken = null;
        this.tokenExpiry = null;
      } catch (error) {
        console.error('🔧 App Bridge: Cleanup failed:', error);
      }
    }
  }

  private getAppBridgeConfig(): ShopifyAppConfig | null {
    const apiKey = import.meta.env.VITE_SHOPIFY_API_KEY;
    const host = this.getHost();

    if (!apiKey || !host) {
      return null;
    }

    return {
      apiKey,
      host,
      forceRedirect: true,
    };
  }

  private setupErrorHandling(): void {
    if (!this.app) return;

    // App Bridge error handling - the newer version doesn't have an error method
    // We'll handle errors in the calling code instead
    console.log('🔧 App Bridge: Error handling setup (no error handler in v4)');
  }

  private parseJWT(token: string): any {
    try {
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split('')
          .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      );
      return JSON.parse(jsonPayload);
    } catch (error) {
      console.error('🔧 App Bridge: Failed to parse JWT:', error);
      return {};
    }
  }
}

// Create singleton instance
export const appBridgeManager = new AppBridgeManager();

// Export convenience functions
export const initializeAppBridge = () => appBridgeManager.initialize();
export const getSessionToken = () => appBridgeManager.getSessionToken();
export const navigateApp = (path: string) => appBridgeManager.navigate(path);
export const isEmbedded = () => appBridgeManager.isEmbedded();
export const getShopDomain = () => appBridgeManager.getShopDomain();
export const getHost = () => appBridgeManager.getHost();
export const destroyAppBridge = () => appBridgeManager.destroy();