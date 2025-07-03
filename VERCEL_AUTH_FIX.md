# VERCEL AUTHENTICATION FIX

## Problem
Your Vercel app is applying authentication to ALL routes, including the popup-script.js that needs to be publicly accessible to Shopify stores.

## IMMEDIATE SOLUTION

Since Vercel auth is blocking everything, **use the working Supabase endpoint instead**:

### Option 1: Replace in Shopify Admin (Recommended)

1. **Login to Shopify Admin**:
   ```
   https://testingstoresumeet.myshopify.com/admin
   ```

2. **Go to Script Tags** (one of these methods):
   - Method A: Settings → Apps → Script tags
   - Method B: Online Store → Themes → Edit code → Check theme.liquid
   - Method C: Use this URL: `https://testingstoresumeet.myshopify.com/admin/settings/apps`

3. **Find and Replace**:
   Look for any script src containing:
   ```
   smartpop-revenue-engine-...vercel.app
   ```
   
   Replace with:
   ```
   https://zsmoutzjhqjgjehaituw.supabase.co/functions/v1/popup-embed-public?shop=testingstoresumeet.myshopify.com
   ```

### Option 2: Quick Test (Immediate)

Run this script on your store pages to test:

**Customer Store Test:**
```javascript
// Remove old broken scripts
document.querySelectorAll('script[src*="vercel.app"]').forEach(s => s.remove());

// Add working script
const script = document.createElement('script');
script.src = 'https://zsmoutzjhqjgjehaituw.supabase.co/functions/v1/popup-embed-public?shop=testingstoresumeet.myshopify.com&debug=true';
script.async = true;
document.head.appendChild(script);

console.log('✅ Replaced with working Supabase script');
```

**Admin Page Test:**
```javascript
// Same replacement on admin page
document.querySelectorAll('script[src*="vercel.app"]').forEach(s => s.remove());

const script = document.createElement('script');
script.src = 'https://zsmoutzjhqjgjehaituw.supabase.co/functions/v1/popup-embed-public?shop=testingstoresumeet.myshopify.com&debug=true';
script.async = true;
document.head.appendChild(script);

console.log('✅ Testing admin blocking');
```

### Expected Results:

✅ **Customer Store**: 
- Console: "✅ SmartPop: Customer store page confirmed"
- Action: Popup appears after 2 seconds

✅ **Admin Page**:
- Console: "🚫 SmartPop: Blocked admin.shopify.com domain"  
- Action: NO popups appear

## VERCEL AUTH ISSUE

Your Vercel app has authentication enabled at the project level. To disable:

1. Go to: https://vercel.com/sumeets-projects-09b827d6/smartpop-revenue-engine/settings
2. Look for "Authentication" or "Security" settings
3. Disable authentication for public routes

OR use the working Supabase endpoint (easier solution).

## WORKING ENDPOINT

✅ **Confirmed working**:
```
https://zsmoutzjhqjgjehaituw.supabase.co/functions/v1/popup-embed-public
```

This endpoint:
- ✅ No authentication required
- ✅ Correct admin detection 
- ✅ Loads popups from database
- ✅ Shows popups on customer store only
- ✅ Blocks popups on admin pages

## TL;DR

**Replace the Vercel script URL with the Supabase one in your Shopify store configuration.**