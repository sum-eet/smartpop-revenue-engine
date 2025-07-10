export interface ShopifyAppConfig {
  apiKey: string;
  host: string;
  forceRedirect?: boolean;
}

// Using ClientApplication from @shopify/app-bridge directly
// No need for custom ShopifyApp interface

export interface SessionTokenPayload {
  iss: string;
  dest: string;
  aud: string;
  sub: string;
  exp: number;
  nbf: number;
  iat: number;
  jti: string;
  sid: string;
}

export interface ShopifySession {
  shop: string;
  accessToken?: string;
  sessionToken?: string;
  isEmbedded: boolean;
  user?: {
    id: string;
    email: string;
    name: string;
  };
}

export interface AppBridgeError extends Error {
  code?: string;
  type?: string;
  details?: any;
}