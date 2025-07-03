# 🚀 SmartPop Deployment Pipeline

## AUTOMATED CI/CD PIPELINE

This pipeline **ENFORCES** that every major change is properly deployed and tested.

### 📋 Pipeline Components

1. **GitHub Actions** (`.github/workflows/deploy.yml`)
   - Triggers on every push to main
   - Builds frontend
   - Deploys to Supabase
   - Deploys to Vercel  
   - Runs comprehensive tests
   - **FAILS if any step fails**

2. **Deployment Script** (`scripts/deploy.sh`)
   - Manual deployment option
   - Same verification as CI/CD
   - Use: `npm run deploy`

3. **Post-Deployment Tests** (`tests/deployment/automated/`)
   - **CRITICAL**: Admin detection verification
   - **CRITICAL**: Popup CRUD functionality
   - **CRITICAL**: All functions deployed
   - **CRITICAL**: Database connectivity
   - **CRITICAL**: CORS configuration

### 🔥 ENFORCEMENT RULES

**EVERY DEPLOYMENT MUST:**

1. ✅ **Deploy all 4 Supabase functions**
   - `popup-config`
   - `popup-embed-public` (with admin detection)
   - `popup-track`
   - `shopify-auth`

2. ✅ **Verify admin detection is active**
   - Script contains `hostname === 'admin.shopify.com'`
   - Script contains `shouldSkipPopup` function
   - Script contains blocking messages

3. ✅ **Test popup CRUD operations**
   - Create, read, delete test popups
   - Verify database connectivity

4. ✅ **Deploy frontend to Vercel**
   - Build succeeds
   - Deployment completes

5. ✅ **Pass all verification tests**
   - No failures allowed
   - Must complete within time limits

### 🚨 FAILURE HANDLING

If ANY step fails:
- **Deployment stops immediately**
- **Error is reported**
- **Must fix before continuing**

### 📝 USAGE

#### Automatic (Recommended):
```bash
git add -A
git commit -m "Your changes"
git push  # Triggers automatic deployment
```

#### Manual:
```bash
npm run deploy  # Runs full pipeline locally
```

#### Test Only:
```bash
npm run verify:deployment  # Just runs tests
```

### 🛡️ CURRENT ISSUE DIAGNOSIS

**Problem**: You can still see popups on dashboard
**Script Status**: ✅ Admin detection IS deployed correctly

**Possible Causes**:
1. **Shopify Script Tag**: Wrong URL in Shopify admin
2. **Browser Cache**: Old script cached
3. **Script Loading**: Script not being executed
4. **Logic Bug**: Edge case in detection

### ✅ VERIFICATION COMMANDS

```bash
# Test admin detection
curl "https://zsmoutzjhqjgjehaituw.supabase.co/functions/v1/popup-embed-public?shop=testingstoresumeet.myshopify.com" | grep "admin.shopify.com"

# Test popup creation
curl -X POST -H "Content-Type: application/json" \
  -d '{"action":"save","title":"Test","shop_domain":"testingstoresumeet.myshopify.com"}' \
  "https://zsmoutzjhqjgjehaituw.supabase.co/functions/v1/popup-config"

# Run full verification
npm run verify:deployment
```

### 🔧 TROUBLESHOOTING

1. **Check Shopify Script Tag**:
   - Go to Shopify admin → Settings → Script tags
   - Verify URL is: `https://zsmoutzjhqjgjehaituw.supabase.co/functions/v1/popup-embed-public?shop=testingstoresumeet.myshopify.com`

2. **Clear Browser Cache**:
   - Hard refresh (Ctrl+Shift+R)
   - Clear cache for admin.shopify.com

3. **Check Console**:
   - Open browser dev tools on admin page
   - Look for SmartPop messages
   - Should see: `🚫 SmartPop: Blocked admin.shopify.com domain`

### 📊 SUCCESS CRITERIA

**Deployment is successful when**:
- ✅ All GitHub Actions pass
- ✅ All verification tests pass  
- ✅ Admin detection is active
- ✅ No popups on admin.shopify.com
- ✅ Popups work on testingstoresumeet.myshopify.com

**THIS PIPELINE IS NOW ENFORCED FOR ALL CHANGES**