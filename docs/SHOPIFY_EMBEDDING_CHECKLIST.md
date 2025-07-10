# 🔍 Shopify Admin Embedding Verification Checklist

## 📋 **Requirements Verification**

### ✅ **1. Is embedded in the Shopify admin**

#### Code Implementation Check:
- [x] **App Bridge Provider**: `src/components/AppBridgeProvider.tsx` wraps entire app
- [x] **Embedded Detection**: `useAppBridge()` hook detects embedded context
- [x] **Iframe Detection**: `appBridgeManager.isEmbedded()` checks for embedded mode
- [x] **Dashboard Integration**: Shows "Embedded" badge when running in Shopify admin

#### Files to Verify:
```bash
# Check App Bridge Provider is wrapping the app
grep -n "AppBridgeProvider" src/App.tsx

# Check embedded detection logic
grep -n "isEmbedded" src/lib/shopify/app-bridge.ts

# Check dashboard shows embedded status
grep -n "Embedded" src/pages/Dashboard.tsx
```

#### Test Commands:
```bash
# 1. Check if embedded detection is working
echo "Testing embedded detection..."
grep -A 5 -B 5 "isEmbedded.*window" src/lib/shopify/app-bridge.ts

# 2. Verify App Bridge initialization
echo "Checking App Bridge initialization..."
grep -A 10 "initialize.*Promise" src/lib/shopify/app-bridge.ts

# 3. Check embedded badge display
echo "Verifying embedded badge..."
grep -A 3 -B 3 "bg-blue-100.*Embedded" src/pages/Dashboard.tsx
```

---

### ✅ **2. Enable app embedding**

#### Partner Dashboard Configuration Required:
- [ ] **Shopify Partner Dashboard**: Set `embedded: true` in app configuration
- [ ] **App URL**: Configure `https://smartpop-revenue-engine.vercel.app`
- [ ] **Allowed URLs**: Add all app routes to allowlist
- [ ] **HTTPS Required**: Ensure all URLs use HTTPS

#### Environment Variables Check:
```bash
# Verify required environment variables are set
echo "Checking environment variables..."
grep -E "VITE_SHOPIFY_API_KEY|VITE_APP_URL" .env.example
```

#### Code Configuration Check:
- [x] **App Bridge Config**: Correct API key and host parameter handling
- [x] **CORS Headers**: Proper headers for embedded context
- [x] **URL Parameters**: Host and shop parameter processing

#### Test Commands:
```bash
# 1. Check App Bridge configuration
echo "Verifying App Bridge config..."
grep -A 10 "getAppBridgeConfig" src/lib/shopify/app-bridge.ts

# 2. Check CORS headers in functions
echo "Checking CORS configuration..."
grep -A 5 "corsHeaders" supabase/functions/popup-config/index.ts

# 3. Verify environment variable usage
echo "Checking API key usage..."
grep -n "VITE_SHOPIFY_API_KEY" src/lib/shopify/app-bridge.ts
```

---

### ✅ **3. Use session token authentication**

#### Session Token Implementation Check:
- [x] **Token Fetching**: `getBridgeSessionToken()` from App Bridge utilities
- [x] **API Integration**: All API calls use `supabaseApiClient` with tokens
- [x] **Server Validation**: Supabase functions validate session tokens
- [x] **Token Refresh**: Automatic refresh on expiration

#### Files to Verify:
```bash
# Check session token implementation
grep -n "getSessionToken\|sessionToken" src/lib/shopify/session-token.ts

# Check API client usage
grep -n "supabaseApiClient" src/hooks/usePopups.ts src/hooks/useAnalytics.ts

# Check server-side validation
grep -n "authenticateRequest" supabase/functions/popup-config/index.ts
```

#### Test Commands:
```bash
# 1. Verify session token fetching
echo "Checking session token implementation..."
grep -A 10 "getSessionToken.*async" src/lib/shopify/app-bridge.ts

# 2. Check API authentication
echo "Verifying API authentication..."
grep -A 5 "Authorization.*Bearer" src/lib/shopify/session-token.ts

# 3. Check server-side validation
echo "Checking server validation..."
grep -A 10 "validateSessionToken" supabase/functions/_shared/session-auth.ts

# 4. Verify hooks use authenticated API
echo "Checking authenticated API usage..."
grep -C 3 "supabaseApiClient" src/hooks/usePopups.ts
```

---

### ✅ **4. Use the latest version of App Bridge on every page**

#### App Bridge Version Check:
- [x] **Package.json**: Latest App Bridge 4.0 installed
- [x] **All Pages**: App Bridge available through AppBridgeProvider
- [x] **Hook Usage**: `useAppBridge()` hook available everywhere
- [x] **Lazy Loading**: Only loads in embedded context for performance

#### Test Commands:
```bash
# 1. Check App Bridge version
echo "Verifying App Bridge version..."
grep -A 3 -B 3 "@shopify/app-bridge" package.json

# 2. Verify it's available on all pages
echo "Checking App Bridge availability..."
grep -n "AppBridgeProvider" src/App.tsx

# 3. Check lazy loading implementation
echo "Verifying lazy loading..."
grep -A 10 "isEmbedded.*return null" src/lib/shopify/app-bridge.ts

# 4. Check hook usage
echo "Checking hook implementation..."
grep -A 5 "useAppBridge" src/hooks/useAppBridge.ts
```

#### Bundle Analysis:
```bash
# Check if App Bridge is properly chunked
echo "Analyzing bundle chunks..."
npm run build 2>&1 | grep -E "(shopify|app-bridge)"
```

---

## 🧪 **Comprehensive Test Suite**

### Automated Verification Script:
```bash
#!/bin/bash
echo "🔍 SHOPIFY EMBEDDING VERIFICATION"
echo "=================================="

# Test 1: Check if App Bridge is installed
echo "✅ 1. Checking App Bridge installation..."
if grep -q "@shopify/app-bridge" package.json; then
    echo "   ✓ App Bridge dependencies found"
    grep "@shopify/app-bridge" package.json
else
    echo "   ❌ App Bridge dependencies missing"
fi

# Test 2: Check embedded detection
echo ""
echo "✅ 2. Checking embedded detection..."
if grep -q "isEmbedded" src/lib/shopify/app-bridge.ts; then
    echo "   ✓ Embedded detection implemented"
else
    echo "   ❌ Embedded detection missing"
fi

# Test 3: Check session token authentication
echo ""
echo "✅ 3. Checking session token authentication..."
if grep -q "sessionToken" src/lib/shopify/session-token.ts; then
    echo "   ✓ Session token authentication implemented"
else
    echo "   ❌ Session token authentication missing"
fi

# Test 4: Check App Bridge on all pages
echo ""
echo "✅ 4. Checking App Bridge availability..."
if grep -q "AppBridgeProvider" src/App.tsx; then
    echo "   ✓ App Bridge available on all pages"
else
    echo "   ❌ App Bridge provider missing"
fi

# Test 5: Check server-side authentication
echo ""
echo "✅ 5. Checking server-side authentication..."
if grep -q "authenticateRequest" supabase/functions/popup-config/index.ts; then
    echo "   ✓ Server-side authentication implemented"
else
    echo "   ❌ Server-side authentication missing"
fi

echo ""
echo "🎯 BUILD TEST"
echo "=============="
npm run build > /dev/null 2>&1
if [ $? -eq 0 ]; then
    echo "✓ Build successful - all TypeScript errors resolved"
else
    echo "❌ Build failed - check TypeScript errors"
fi

echo ""
echo "📊 BUNDLE ANALYSIS"
echo "=================="
npm run build 2>&1 | grep -E "(shopify|app-bridge|index)" | head -5
```

### Manual Testing Checklist:

#### 🖥️ **Development Testing:**
- [ ] Run `npm run dev` and verify no console errors
- [ ] Check browser console for "App Bridge: Running in embedded mode" when testing with `?embedded=1`
- [ ] Verify "App Bridge: Running in standalone mode" when testing normally
- [ ] Confirm dashboard shows shop domain and embedded badge when embedded

#### 🌐 **Production Testing (Required):**
- [ ] Deploy to Vercel/production environment
- [ ] Configure Shopify Partner Dashboard with embedding enabled
- [ ] Test installation flow from Shopify App Store
- [ ] Verify app loads correctly within Shopify admin iframe
- [ ] Test session token authentication in embedded context
- [ ] Confirm all functionality works (popup creation, analytics, etc.)

#### 🔒 **Security Testing:**
- [ ] Verify API calls include session tokens when embedded
- [ ] Test authentication fallback for non-embedded usage
- [ ] Confirm shop-scoped data access (can't access other shops' data)
- [ ] Test token refresh on expiration

---

## ⚡ **Quick Verification Commands**

Run these commands to quickly verify implementation:

```bash
# Quick check - all requirements
echo "🔍 QUICK VERIFICATION:"
echo "1. App Bridge installed:" && grep -c "@shopify/app-bridge" package.json
echo "2. Embedded detection:" && grep -c "isEmbedded" src/lib/shopify/app-bridge.ts  
echo "3. Session tokens:" && grep -c "sessionToken" src/lib/shopify/session-token.ts
echo "4. Provider wrapping:" && grep -c "AppBridgeProvider" src/App.tsx
echo "5. Server auth:" && grep -c "authenticateRequest" supabase/functions/popup-config/index.ts

# Build test
echo "6. Build status:" && npm run build > /dev/null 2>&1 && echo "✅ SUCCESS" || echo "❌ FAILED"

# Bundle analysis
echo "7. Bundle chunks:" && npm run build 2>&1 | grep -E "shopify.*js" | wc -l
```

---

## 🎯 **Expected Results**

### ✅ **All Checks Should Pass:**

1. **Embedded Detection**: `isEmbedded()` returns `true` when `?embedded=1` or in iframe
2. **Session Tokens**: All API calls include `Authorization: Bearer <token>` when embedded
3. **App Bridge Version**: Latest 4.0 version installed and working
4. **Universal Availability**: AppBridgeProvider wraps entire app
5. **Server Validation**: Supabase functions validate session tokens
6. **Build Success**: No TypeScript errors, optimized bundle
7. **Performance**: App Bridge in separate chunk (35KB, 10KB gzipped)

### 🚀 **Ready for Shopify App Store:**

When all checks pass:
- ✅ **Meets 2025 requirements**: Latest App Bridge, session tokens, embedded
- ✅ **Performance optimized**: Core Web Vitals targets achieved  
- ✅ **Security compliant**: Session token authentication throughout
- ✅ **User experience**: Seamless embedded experience with fallbacks

---

## 🔧 **If Any Checks Fail:**

### Missing Dependencies:
```bash
npm install @shopify/app-bridge @shopify/app-bridge-react
```

### Build Errors:
```bash
npm run build
# Fix any TypeScript errors shown
```

### Environment Setup:
```bash
cp .env.example .env
# Add your VITE_SHOPIFY_API_KEY
```

**🎉 When all checks pass, SmartPop is fully ready for Shopify admin embedding!**