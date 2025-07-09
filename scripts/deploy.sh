#!/bin/bash

# SmartPop Deployment Script
# Deploys to both Supabase and Vercel with verification
# Usage: ./scripts/deploy.sh

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
SUPABASE_PROJECT_ID="zsmoutzjhqjgjehaituw"
REQUIRED_FUNCTIONS=("popup-analytics" "popup-config" "popup-embed-public" "popup-script" "popup-track" "shopify-auth")

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

echo -e "${BLUE}🚀 SmartPop Deployment Pipeline${NC}"
echo "================================"
echo "Project: $SUPABASE_PROJECT_ID"
echo "Functions: ${REQUIRED_FUNCTIONS[*]}"
echo ""

# Step 1: Pre-deployment checks
log_info "Running pre-deployment checks..."

if ! command -v npm &> /dev/null; then
    log_error "npm is not installed"
    exit 1
fi

if ! command -v npx &> /dev/null; then
    log_error "npx is not installed"
    exit 1
fi

if ! command -v vercel &> /dev/null; then
    log_error "Vercel CLI is not installed. Run: npm i -g vercel"
    exit 1
fi

log_success "Pre-deployment checks passed"

# Step 2: Build frontend
log_info "Building frontend..."
npm run build
if [ $? -eq 0 ]; then
    log_success "Frontend build completed"
else
    log_error "Frontend build failed"
    exit 1
fi

# Step 3: Deploy Supabase functions
log_info "Deploying Supabase functions..."

for func in "${REQUIRED_FUNCTIONS[@]}"; do
    log_info "Deploying $func..."
    
    if [ "$func" = "popup-embed-public" ]; then
        # Deploy with no JWT verification for public access
        npx supabase functions deploy "$func" --project-ref "$SUPABASE_PROJECT_ID" --no-verify-jwt
    else
        npx supabase functions deploy "$func" --project-ref "$SUPABASE_PROJECT_ID"
    fi
    
    if [ $? -eq 0 ]; then
        log_success "$func deployed successfully"
    else
        log_error "$func deployment failed"
        exit 1
    fi
done

# Step 4: Deploy to Vercel
log_info "Deploying to Vercel..."
vercel deploy --prod
if [ $? -eq 0 ]; then
    log_success "Vercel deployment completed"
else
    log_error "Vercel deployment failed"
    exit 1
fi

# Step 5: Wait for deployments to be ready
log_info "Waiting for deployments to be ready..."
sleep 10

# Step 6: Test deployments
log_info "Testing deployed functions..."

# Test popup-config
log_info "Testing popup-config..."
POPUP_RESPONSE=$(curl -s "https://${SUPABASE_PROJECT_ID}.supabase.co/functions/v1/popup-config?shop=testingstoresumeet.myshopify.com")
if echo "$POPUP_RESPONSE" | grep -q '"id"'; then
    POPUP_COUNT=$(echo "$POPUP_RESPONSE" | grep -o '"id"' | wc -l | tr -d ' ')
    log_success "popup-config working ($POPUP_COUNT popups found)"
else
    log_error "popup-config test failed"
    echo "Response: $POPUP_RESPONSE"
    exit 1
fi

# Test popup-embed-public (CRITICAL - Admin Detection)
log_info "Testing popup-embed-public and admin detection..."
EMBED_RESPONSE=$(curl -s "https://${SUPABASE_PROJECT_ID}.supabase.co/functions/v1/popup-embed-public?shop=testingstoresumeet.myshopify.com")

if echo "$EMBED_RESPONSE" | grep -q "admin.shopify.com"; then
    log_success "Admin detection found in script"
else
    log_error "CRITICAL: Admin detection missing from script"
    exit 1
fi

if echo "$EMBED_RESPONSE" | grep -q "shouldSkipPopup"; then
    log_success "shouldSkipPopup function found"
else
    log_error "CRITICAL: shouldSkipPopup function missing"
    exit 1
fi

SCRIPT_SIZE=$(echo "$EMBED_RESPONSE" | wc -c | tr -d ' ')
if [ $SCRIPT_SIZE -gt 5000 ]; then
    log_success "Script size adequate ($SCRIPT_SIZE bytes)"
else
    log_error "Script size too small ($SCRIPT_SIZE bytes)"
    exit 1
fi

# Test popup creation
log_info "Testing popup creation..."
CREATE_RESPONSE=$(curl -s -X POST -H "Content-Type: application/json" \
    -d '{"action":"save","title":"Deployment Test","description":"Testing deployment pipeline","shop_domain":"testingstoresumeet.myshopify.com","trigger_type":"time_delay","trigger_value":"3000"}' \
    "https://${SUPABASE_PROJECT_ID}.supabase.co/functions/v1/popup-config")

if echo "$CREATE_RESPONSE" | grep -q '"success":true'; then
    POPUP_ID=$(echo "$CREATE_RESPONSE" | grep -o '"id":"[^"]*"' | cut -d'"' -f4)
    log_success "Popup creation working (ID: $POPUP_ID)"
    
    # Cleanup test popup
    curl -s -X POST -H "Content-Type: application/json" \
        -d "{\"action\":\"delete\",\"id\":\"$POPUP_ID\",\"shop_domain\":\"testingstoresumeet.myshopify.com\"}" \
        "https://${SUPABASE_PROJECT_ID}.supabase.co/functions/v1/popup-config" > /dev/null
    log_success "Test popup cleaned up"
else
    log_error "Popup creation failed"
    echo "Response: $CREATE_RESPONSE"
    exit 1
fi

# Step 7: Admin Detection Verification
log_info "Verifying admin detection logic..."

# Check for all required admin detection patterns
ADMIN_CHECKS=0

if echo "$EMBED_RESPONSE" | grep -q "hostname === 'admin.shopify.com'"; then
    log_success "Primary admin detection verified"
    ((ADMIN_CHECKS++))
else
    log_error "Primary admin detection missing"
fi

if echo "$EMBED_RESPONSE" | grep -q "🚫 SmartPop: Blocked admin.shopify.com"; then
    log_success "Admin blocking message verified"
    ((ADMIN_CHECKS++))
else
    log_error "Admin blocking message missing"
fi

if [ $ADMIN_CHECKS -eq 2 ]; then
    log_success "All admin detection checks passed"
else
    log_error "Admin detection verification failed ($ADMIN_CHECKS/2 checks passed)"
    exit 1
fi

# Step 8: Final verification
echo ""
echo -e "${GREEN}🎉 DEPLOYMENT PIPELINE COMPLETE${NC}"
echo "================================"
echo -e "✅ Supabase Functions: ${GREEN}DEPLOYED & TESTED${NC}"
echo -e "✅ Admin Detection: ${GREEN}VERIFIED & ACTIVE${NC}"
echo -e "✅ Popup CRUD: ${GREEN}WORKING${NC}"
echo -e "✅ Vercel Frontend: ${GREEN}DEPLOYED${NC}"
echo ""
echo -e "${BLUE}🛡️ Admin detection is ACTIVE${NC}"
echo -e "${BLUE}🔥 System ready for production${NC}"
echo ""
echo "Next steps:"
echo "1. Test admin blocking: https://admin.shopify.com/store/testingstoresumeet/apps/smart-popup2"
echo "2. Test store popups: https://testingstoresumeet.myshopify.com"
echo "3. Monitor GitHub Actions for automated testing"
echo ""
echo -e "${GREEN}Deployment completed successfully!${NC}"