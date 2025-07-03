#!/bin/bash

# CURL-based deployment script for Supabase functions
# This script attempts deployment using curl commands

PROJECT_ID="zsmoutzjhqjgjehaituw"
FUNCTION_NAME="app-embed"
PROJECT_DIR="$(pwd)"

echo "🚀 CURL DEPLOYMENT SCRIPT"
echo "========================="
echo "📍 Project: $PROJECT_ID"
echo "📍 Function: $FUNCTION_NAME"
echo "📍 Directory: $PROJECT_DIR"
echo ""

# Test if function is already deployed
echo "🧪 Testing current deployment status..."
TEST_URL="https://$PROJECT_ID.supabase.co/functions/v1/$FUNCTION_NAME?shop=testingstoresumeet.myshopify.com"

if curl -s --max-time 10 "$TEST_URL" | grep -q "SmartPop\|Installing\|OAuth"; then
    echo "✅ Function is already deployed and working!"
    echo "🔗 Function URL: https://$PROJECT_ID.supabase.co/functions/v1/$FUNCTION_NAME"
    exit 0
fi

echo "❌ Function not deployed or not working. Attempting deployment..."
echo ""

# Try deployment using various methods
echo "🔄 Attempting deployment with npx supabase..."

if command -v npx &> /dev/null; then
    echo "✅ npx found, attempting deployment..."
    
    cd "$PROJECT_DIR"
    
    # Try with project ref
    if npx supabase functions deploy "$FUNCTION_NAME" --project-ref "$PROJECT_ID" --no-verify-jwt; then
        echo "✅ Deployment successful with npx (project ref)!"
        DEPLOYED=true
    elif npx supabase functions deploy "$FUNCTION_NAME" --no-verify-jwt; then
        echo "✅ Deployment successful with npx (no project ref)!"
        DEPLOYED=true
    else
        echo "❌ npx deployment failed"
        DEPLOYED=false
    fi
else
    echo "❌ npx not found"
    DEPLOYED=false
fi

# Try with yarn if npx failed
if [ "$DEPLOYED" != "true" ] && command -v yarn &> /dev/null; then
    echo "🔄 Trying with yarn dlx..."
    if yarn dlx supabase functions deploy "$FUNCTION_NAME" --project-ref "$PROJECT_ID" --no-verify-jwt; then
        echo "✅ Deployment successful with yarn!"
        DEPLOYED=true
    else
        echo "❌ yarn deployment failed"
    fi
fi

# Try with bun if others failed
if [ "$DEPLOYED" != "true" ] && command -v bun &> /dev/null; then
    echo "🔄 Trying with bunx..."
    if bunx supabase functions deploy "$FUNCTION_NAME" --project-ref "$PROJECT_ID" --no-verify-jwt; then
        echo "✅ Deployment successful with bun!"
        DEPLOYED=true
    else
        echo "❌ bun deployment failed"
    fi
fi

# Test deployment if it succeeded
if [ "$DEPLOYED" = "true" ]; then
    echo ""
    echo "⏳ Waiting for deployment to propagate..."
    sleep 5
    
    echo "🧪 Testing deployed function..."
    if curl -s --max-time 10 "$TEST_URL" | grep -q "SmartPop\|Installing\|OAuth"; then
        echo "✅ DEPLOYMENT SUCCESSFUL AND VERIFIED!"
        echo ""
        echo "🔗 Function URLs:"
        echo "   Main: https://$PROJECT_ID.supabase.co/functions/v1/$FUNCTION_NAME"
        echo "   Test: $TEST_URL"
        echo ""
        echo "🎉 Function is ready to use!"
    else
        echo "⚠️  Deployment completed but verification failed"
        echo "Function may still be starting up. Try again in a few minutes."
    fi
else
    echo ""
    echo "❌ All deployment methods failed"
    echo ""
    echo "🔧 Manual deployment steps:"
    echo "1. npm install -g supabase"
    echo "2. supabase login"
    echo "3. cd '$PROJECT_DIR'"
    echo "4. supabase functions deploy $FUNCTION_NAME --project-ref $PROJECT_ID --no-verify-jwt"
    echo ""
    echo "📄 See DEPLOY_NOW.md for detailed instructions"
fi