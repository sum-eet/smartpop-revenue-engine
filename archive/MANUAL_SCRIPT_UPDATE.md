# MANUAL SCRIPT UPDATE - CRITICAL FIX

## Problem
Your Shopify store has OLD script tags pointing to broken functions. We need to replace them with the new working function.

## IMMEDIATE SOLUTION

### Step 1: Test the new working script
Copy this script and run it in browser console on **customer store page**:

```javascript
// Test new working script
const script = document.createElement('script');
script.src = 'https://zsmoutzjhqjgjehaituw.supabase.co/functions/v1/popup-embed-public?shop=testingstoresumeet.myshopify.com&debug=true';
script.async = true;
document.head.appendChild(script);
```

**Expected result**: Should see popups on customer store, blocked on admin.

### Step 2: Test admin blocking
Copy this script and run it in browser console on **admin page**:

```javascript
// Test admin blocking
const script = document.createElement('script');
script.src = 'https://zsmoutzjhqjgjehaituw.supabase.co/functions/v1/popup-embed-public?shop=testingstoresumeet.myshopify.com&debug=true';
script.async = true;
document.head.appendChild(script);
```

**Expected result**: Should see "🚫 SmartPop: Blocked admin.shopify.com domain" and NO popups.

### Step 3: Replace Shopify script tags (MANUAL)

1. **Get Access Token**:
   - Go to: https://testingstoresumeet.myshopify.com/admin/settings/apps
   - Click "Develop apps" → Create/Select app
   - Generate Admin API access token with `write_script_tags` permission

2. **Find existing script tags**:
```javascript
// Run this in browser console
fetch("https://testingstoresumeet.myshopify.com/admin/api/2023-10/script_tags.json", {
  headers: { "X-Shopify-Access-Token": "YOUR_TOKEN_HERE" }
}).then(r => r.json()).then(data => {
  console.log("All script tags:", data.script_tags);
  
  // Find SmartPop scripts
  const smartPopScripts = data.script_tags.filter(s => 
    s.src.includes('smartpop') || 
    s.src.includes('popup') || 
    s.src.includes('app-embed') ||
    s.src.includes('supabase')
  );
  
  console.log("SmartPop scripts to replace:", smartPopScripts);
});
```

3. **Remove old script tags**:
```javascript
// Replace SCRIPT_ID with actual ID from step 2
fetch("https://testingstoresumeet.myshopify.com/admin/api/2023-10/script_tags/SCRIPT_ID.json", {
  method: "DELETE",
  headers: { "X-Shopify-Access-Token": "YOUR_TOKEN_HERE" }
}).then(r => {
  if (r.ok) {
    console.log("✅ Old script removed");
  } else {
    console.log("❌ Failed to remove script");
  }
});
```

4. **Add new working script tag**:
```javascript
// Add the new working script
fetch("https://testingstoresumeet.myshopify.com/admin/api/2023-10/script_tags.json", {
  method: "POST",
  headers: { 
    "X-Shopify-Access-Token": "YOUR_TOKEN_HERE",
    "Content-Type": "application/json"
  },
  body: JSON.stringify({
    script_tag: {
      event: "onload",
      src: "https://zsmoutzjhqjgjehaituw.supabase.co/functions/v1/popup-embed-public?shop=testingstoresumeet.myshopify.com",
      display_scope: "all"
    }
  })
}).then(r => r.json()).then(data => {
  console.log("✅ New script added:", data);
});
```

## QUICK TEST (Alternative)

If you don't want to mess with Shopify Admin API, just inject the new script manually:

### On customer store page:
```html
<!-- Add this to your theme.liquid before </body> -->
<script src="https://zsmoutzjhqjgjehaituw.supabase.co/functions/v1/popup-embed-public?shop=testingstoresumeet.myshopify.com" async></script>
```

### Result:
- ✅ Customer store: Will show popups
- ✅ Admin pages: Will be blocked

## VERIFICATION

After updating, check:

1. **Customer store** (`https://testingstoresumeet.myshopify.com/`):
   - Should see console logs: "✅ SmartPop: Customer store page confirmed"
   - Should see popup after 2 seconds

2. **Admin page** (`https://admin.shopify.com/store/testingstoresumeet/apps/smart-popup2`):
   - Should see console logs: "🚫 SmartPop: Blocked admin.shopify.com domain"
   - Should see NO popups

## NEW WORKING ENDPOINT

The fix is now deployed at:
```
https://zsmoutzjhqjgjehaituw.supabase.co/functions/v1/popup-embed-public
```

This endpoint:
- ✅ Works without authentication  
- ✅ Has correct admin detection
- ✅ Loads popups from popup-config API
- ✅ Shows popups only on customer store
- ✅ Blocks popups on admin pages