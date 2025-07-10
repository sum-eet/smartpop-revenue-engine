# Shopify Admin Embedding Implementation Guide

## Overview
This document outlines the implementation plan for enabling Shopify admin embedding with session token authentication and App Bridge integration, ensuring compliance with 2025 Shopify App Store requirements.

## Current State Analysis

### ✅ Already Implemented
- Basic OAuth flow working (`/supabase/functions/shopify-auth/index.ts`)
- Shopify app configuration in partner dashboard
- Basic iframe detection in Dashboard (`isInShopifyFrame`)
- App deployment pipeline working

### 🔄 Needs Implementation
- App Bridge integration on all pages
- Session token authentication
- Proper embedded app navigation
- CSRF protection for embedded context

## Implementation Plan

### 1. Enable App Embedding in Shopify Partner Dashboard

**Configuration Changes:**
```json
{
  "app_url": "https://smartpop-revenue-engine.vercel.app",
  "embedded": true,
  "app_bridge_version": "4.0",
  "scopes": ["read_products", "write_customers"],
  "redirect_urls": [
    "https://smartpop-revenue-engine.vercel.app/auth/callback"
  ]
}
```

**Files to Update:**
- Update `toml` configuration files
- Modify partner dashboard settings
- Update OAuth redirect URLs

### 2. App Bridge Integration

**New Files to Create:**
```
src/lib/shopify/
├── app-bridge.ts          # App Bridge initialization
├── session-token.ts       # Session token management
├── navigation.ts          # Embedded navigation helpers
└── types.ts              # Shopify-specific types
```

**Implementation Details:**

#### `src/lib/shopify/app-bridge.ts`
```typescript
import { createApp } from '@shopify/app-bridge';
import { getSessionToken } from '@shopify/app-bridge/utilities';
import { Redirect } from '@shopify/app-bridge/actions';

// Initialize App Bridge
export const initializeAppBridge = () => {
  const app = createApp({
    apiKey: process.env.VITE_SHOPIFY_API_KEY!,
    host: new URLSearchParams(window.location.search).get('host')!,
    forceRedirect: true,
  });
  
  return app;
};

// Get session token for API calls
export const getAppBridgeToken = async (app: any) => {
  return await getSessionToken(app);
};
```

#### `src/lib/shopify/session-token.ts`
```typescript
// Session token authentication middleware
export const authenticateWithSessionToken = async (token: string) => {
  // Verify token with Shopify
  // Return user/shop information
};

// API request wrapper with session token
export const apiRequestWithToken = async (url: string, options: RequestInit = {}) => {
  const token = await getAppBridgeToken(window.shopifyApp);
  
  return fetch(url, {
    ...options,
    headers: {
      ...options.headers,
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });
};
```

### 3. Update Existing Components

#### `src/App.tsx` Updates
```typescript
// Add App Bridge initialization
import { initializeAppBridge } from '@/lib/shopify/app-bridge';

// Initialize App Bridge on mount
useEffect(() => {
  if (isEmbedded) {
    window.shopifyApp = initializeAppBridge();
  }
}, []);

// Add embedded app routing
const isEmbedded = new URLSearchParams(window.location.search).has('embedded');
```

#### `src/pages/Dashboard.tsx` Updates
```typescript
// Replace manual iframe detection with App Bridge
const { isEmbedded, app } = useAppBridge();

// Update API calls to use session tokens
const { data: popups } = usePopups(app);
```

### 4. Update API Functions

#### `src/hooks/usePopups.ts` Updates
```typescript
// Replace direct fetch with session token authentication
const fetchPopups = async (app: any): Promise<Popup[]> => {
  const token = await getAppBridgeToken(app);
  
  const response = await fetch(`${SUPABASE_URL}/functions/v1/popup-config`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });
  
  return response.json();
};
```

#### `src/hooks/useAnalytics.ts` Updates
```typescript
// Update all analytics calls to use session tokens
const fetchAnalytics = async (app: any) => {
  const token = await getAppBridgeToken(app);
  // ... rest of implementation
};
```

### 5. Update Supabase Functions

#### `supabase/functions/shopify-auth/index.ts`
```typescript
// Update OAuth callback to support embedded apps
const handleEmbeddedAuth = async (code: string, shop: string) => {
  // Exchange code for access token
  // Store in secure session
  // Return session token
};

// Add session token validation
const validateSessionToken = async (token: string) => {
  // Verify with Shopify
  // Return shop/user data
};
```

#### `supabase/functions/popup-config/index.ts`
```typescript
// Add session token authentication middleware
const authenticateRequest = async (request: Request) => {
  const token = request.headers.get('Authorization')?.replace('Bearer ', '');
  
  if (!token) {
    throw new Error('No session token provided');
  }
  
  return await validateSessionToken(token);
};
```

### 6. Navigation Updates

#### `src/components/Navigation.tsx` (New)
```typescript
import { useAppBridge } from '@/lib/shopify/app-bridge';
import { useNavigate } from 'react-router-dom';

export const EmbeddedNavigation = () => {
  const { app } = useAppBridge();
  const navigate = useNavigate();
  
  // Handle embedded navigation
  const handleNavigation = (path: string) => {
    if (app) {
      // Use App Bridge navigation
      const redirect = Redirect.create(app);
      redirect.dispatch(Redirect.Action.APP, path);
    } else {
      // Fallback to regular navigation
      navigate(path);
    }
  };
  
  return (
    // Navigation component
  );
};
```

### 7. Security Considerations

**CSRF Protection:**
- Validate all session tokens server-side
- Implement nonce validation for embedded requests
- Add origin validation for iframe requests

**Session Management:**
- Store session tokens securely (httpOnly cookies where possible)
- Implement token refresh mechanism
- Add session expiration handling

### 8. Testing Strategy

**Embedded App Testing:**
1. Test in Shopify admin development store
2. Verify App Bridge actions work correctly
3. Test session token authentication
4. Validate navigation flows
5. Test performance with Core Web Vitals

**Non-Embedded Fallback:**
1. Ensure app works without embedding
2. Test direct URL access
3. Verify OAuth flow still works

### 9. Performance Considerations

**App Bridge Loading:**
- Lazy load App Bridge only in embedded context
- Minimize App Bridge bundle size impact
- Cache session tokens appropriately

**Core Web Vitals Compliance:**
- Ensure App Bridge doesn't affect LCP
- Maintain CLS scores with proper loading states
- Keep INP under 200ms for embedded interactions

### 10. Deployment Steps

1. **Phase 1: Infrastructure**
   - Update environment variables
   - Configure Shopify app settings
   - Deploy updated OAuth flow

2. **Phase 2: App Bridge Integration**
   - Add App Bridge to all pages
   - Update API authentication
   - Test embedded functionality

3. **Phase 3: Full Migration**
   - Enable embedding in partner dashboard
   - Update all API calls to use session tokens
   - Deploy to production

### 11. Rollback Plan

**If Issues Occur:**
1. Disable embedding in partner dashboard
2. Revert to OAuth-only authentication
3. Remove App Bridge initialization
4. Restore direct API calls

**Monitoring:**
- Track App Bridge initialization errors
- Monitor session token validation failures
- Watch for iframe-related issues

### 12. Files That Need Updates

#### New Files:
- `src/lib/shopify/app-bridge.ts`
- `src/lib/shopify/session-token.ts`
- `src/lib/shopify/navigation.ts`
- `src/lib/shopify/types.ts`
- `src/hooks/useAppBridge.ts`
- `src/components/EmbeddedNavigation.tsx`

#### Updated Files:
- `src/App.tsx`
- `src/pages/Dashboard.tsx`
- `src/hooks/usePopups.ts`
- `src/hooks/useAnalytics.ts`
- `supabase/functions/shopify-auth/index.ts`
- `supabase/functions/popup-config/index.ts`
- `supabase/functions/popup-track/index.ts`
- `package.json` (add @shopify/app-bridge dependency)

### 13. Dependencies to Add

```json
{
  "dependencies": {
    "@shopify/app-bridge": "^4.0.0",
    "@shopify/app-bridge-react": "^4.0.0"
  }
}
```

### 14. Environment Variables

```env
VITE_SHOPIFY_API_KEY=your_api_key
VITE_SHOPIFY_API_SECRET=your_api_secret
VITE_SHOPIFY_SCOPES=read_products,write_customers
VITE_APP_URL=https://smartpop-revenue-engine.vercel.app
```

## Success Criteria

✅ **Functional Requirements:**
- App loads correctly in Shopify admin iframe
- Session token authentication works for all API calls
- Navigation works properly within embedded context
- All existing functionality preserved

✅ **Performance Requirements:**
- Core Web Vitals scores maintained
- App Bridge loading doesn't impact LCP
- Session token requests are efficient

✅ **Security Requirements:**
- All API requests authenticated with session tokens
- CSRF protection implemented
- Origin validation for embedded requests

## Risk Mitigation

**High Risk:**
- App Bridge integration breaking existing functionality
- Session token authentication failures
- Performance degradation

**Mitigation:**
- Gradual rollout with feature flags
- Comprehensive testing in development store
- Performance monitoring with Web Vitals
- Rollback plan ready

**Low Risk:**
- UI/UX changes in embedded context
- Navigation flow adjustments

**Mitigation:**
- User testing in embedded environment
- Documentation for users
- Support for both embedded and non-embedded modes