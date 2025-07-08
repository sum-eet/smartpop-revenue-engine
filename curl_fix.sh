#!/bin/bash

# PROGRAMMATIC DEPLOYMENT FIX using curl
# This will solve the 2 popup issue by cleaning up conflicting scripts

echo "🚨 PROGRAMMATIC DEPLOYMENT FIX STARTING..."

SHOP_DOMAIN="testingstoresumeet.myshopify.com"
BASE_URL="https://${SHOP_DOMAIN}/admin/api/2023-10"

# Check if we have an access token
if [ -z "$SHOPIFY_ACCESS_TOKEN" ] || [ "$SHOPIFY_ACCESS_TOKEN" = "YOUR_ACCESS_TOKEN_HERE" ]; then
    echo "🔑 Shopify access token required!"
    echo "1. Go to: https://testingstoresumeet.myshopify.com/admin/settings/apps"
    echo "2. Create a private app or get existing token"
    echo "3. Export it: export SHOPIFY_ACCESS_TOKEN='your_token_here'"
    echo "4. Run this script again"
    exit 1
fi

echo "📋 Step 1: Fetching current script tags..."

# Get all script tags
SCRIPT_TAGS=$(curl -s -H "X-Shopify-Access-Token: $SHOPIFY_ACCESS_TOKEN" \
    -H "Content-Type: application/json" \
    "$BASE_URL/script_tags.json")

if echo "$SCRIPT_TAGS" | grep -q "script_tags"; then
    echo "✅ Successfully fetched script tags"
    
    # Extract popup-related script IDs
    POPUP_SCRIPT_IDS=$(echo "$SCRIPT_TAGS" | jq -r '.script_tags[] | select(.src | test("popup|smartpop|supabase.co/functions")) | .id')
    
    echo "🗑️ Step 2: Removing conflicting popup scripts..."
    
    for script_id in $POPUP_SCRIPT_IDS; do
        echo "Deleting script ID: $script_id"
        
        DELETE_RESULT=$(curl -s -X DELETE \
            -H "X-Shopify-Access-Token: $SHOPIFY_ACCESS_TOKEN" \
            -H "Content-Type: application/json" \
            "$BASE_URL/script_tags/${script_id}.json")
        
        echo "✅ Deleted script ID: $script_id"
    done
    
    echo "🧹 Step 3: Installing ONE clean script..."
    
    # Install new clean script
    NEW_SCRIPT_URL="https://zsmoutzjhqjgjehaituw.supabase.co/functions/v1/popup-embed-public?shop=${SHOP_DOMAIN}&fix=curl&v=$(date +%s)"
    
    INSTALL_RESULT=$(curl -s -X POST \
        -H "X-Shopify-Access-Token: $SHOPIFY_ACCESS_TOKEN" \
        -H "Content-Type: application/json" \
        -d "{
            \"script_tag\": {
                \"event\": \"onload\",
                \"src\": \"$NEW_SCRIPT_URL\"
            }
        }" \
        "$BASE_URL/script_tags.json")
    
    if echo "$INSTALL_RESULT" | grep -q "script_tag"; then
        SCRIPT_ID=$(echo "$INSTALL_RESULT" | jq -r '.script_tag.id')
        
        echo ""
        echo "🎉🎉🎉 DEPLOYMENT FIXED PROGRAMMATICALLY! 🎉🎉🎉"
        echo ""
        echo "✅ Removed all conflicting scripts"
        echo "✅ Installed ONE working script"
        echo "✅ New Script ID: $SCRIPT_ID"
        echo "✅ Script URL: $NEW_SCRIPT_URL"
        echo ""
        echo "📋 NEXT STEPS:"
        echo "1. Clear browser cache completely"
        echo "2. Visit your store with hard refresh (Ctrl+Shift+R)"
        echo "3. Should see ONLY ONE popup"
        echo "4. Email validation should reject 'a', 'eee@g', etc."
        echo ""
    else
        echo "❌ Failed to install new script"
        echo "Response: $INSTALL_RESULT"
    fi
    
else
    echo "❌ Failed to fetch script tags"
    echo "Response: $SCRIPT_TAGS"
fi