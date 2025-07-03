#!/bin/bash

echo "🚀 Deploying SmartPop Shopify Installation Function..."

# Deploy the database migration
echo "📊 Deploying database migration..."
npx supabase db push

# Deploy the shopify-install function
echo "🔧 Deploying shopify-install function..."
npx supabase functions deploy shopify-install --no-verify-jwt

echo "✅ Deployment complete!"
echo ""
echo "🔗 Installation URL: https://zsmoutzjhqjgjehaituw.supabase.co/functions/v1/shopify-install?shop=testingstoresumeet.myshopify.com"
echo ""
echo "📋 To test:"
echo "1. Visit the installation URL above"
echo "2. Complete OAuth flow"
echo "3. Check your store for the SmartPop script"
echo ""
echo "🔍 Debug: Check Supabase logs for function execution details"