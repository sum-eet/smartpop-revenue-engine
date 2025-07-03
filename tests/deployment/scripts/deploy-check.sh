#!/bin/bash

# Deployment Verification Script
# Quick script to verify deployment status across all services

set -e

# Configuration
API_BASE="https://zsmoutzjhqjgjehaituw.supabase.co/functions/v1"
FRONTEND_URL="https://smartpop-revenue-engine.vercel.app"
TEST_SHOP="deploy-check.myshopify.com"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Helper functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[✅]${NC} $1"
}

log_error() {
    echo -e "${RED}[❌]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[⚠️]${NC} $1"
}

echo "🚀 SmartPop Deployment Verification"
echo "=================================="
echo "Checking deployment status across all services..."
echo ""

# Track overall status
BACKEND_STATUS="❌"
FRONTEND_STATUS="❌"
DATABASE_STATUS="❌"
FUNCTIONS_STATUS="❌"

# 1. Backend API Check
log_info "Checking backend API..."
if curl -s --max-time 10 "$API_BASE/popup-config?action=list&shop_domain=$TEST_SHOP" > /dev/null; then
    log_success "Backend API accessible"
    BACKEND_STATUS="✅"
else
    log_error "Backend API not accessible"
fi

# 2. Database Connectivity Check
log_info "Checking database connectivity..."
DB_RESPONSE=$(curl -s --max-time 10 "$API_BASE/popup-config?action=list&shop_domain=$TEST_SHOP")
if echo "$DB_RESPONSE" | grep -q '"success":true'; then
    log_success "Database connectivity working"
    DATABASE_STATUS="✅"
else
    log_error "Database connectivity issues"
fi

# 3. Supabase Functions Check
log_info "Checking Supabase functions..."
FUNCTIONS=(
    "popup-config"
    "popup-embed-public"
    "popup-track"
)

FUNCTIONS_WORKING=0
for func in "${FUNCTIONS[@]}"; do
    if curl -s --max-time 5 "$API_BASE/$func" | head -1 | grep -v "Function not found" > /dev/null; then
        log_success "Function $func: deployed"
        ((FUNCTIONS_WORKING++))
    else
        log_error "Function $func: not deployed"
    fi
done

if [ $FUNCTIONS_WORKING -eq ${#FUNCTIONS[@]} ]; then
    FUNCTIONS_STATUS="✅"
fi

# 4. Frontend Check
log_info "Checking frontend deployment..."
if curl -s --max-time 10 "$FRONTEND_URL" | grep -q "<title>"; then
    log_success "Frontend accessible"
    FRONTEND_STATUS="✅"
else
    log_warning "Frontend not accessible (may still be deploying)"
fi

# 5. Critical Path Test
log_info "Running critical path test..."
TEST_POPUP_DATA='{"action":"save","title":"Deploy Check Popup","content":"Deployment verification","shop_domain":"'$TEST_SHOP'","trigger_type":"time_delay","trigger_value":"3000"}'

CREATE_RESPONSE=$(curl -s --max-time 10 -X POST \
    -H "Content-Type: application/json" \
    -d "$TEST_POPUP_DATA" \
    "$API_BASE/popup-config")

if echo "$CREATE_RESPONSE" | grep -q '"success":true'; then
    log_success "Critical path test: popup creation working"
    
    # Extract popup ID for cleanup
    POPUP_ID=$(echo "$CREATE_RESPONSE" | grep -o '"id":"[^"]*"' | cut -d'"' -f4)
    
    # Test embed script
    if curl -s --max-time 5 "$API_BASE/popup-embed-public?shop=$TEST_SHOP" | grep -q "SmartPop"; then
        log_success "Critical path test: embed script working"
    else
        log_error "Critical path test: embed script failed"
    fi
    
    # Cleanup
    if [ ! -z "$POPUP_ID" ]; then
        DELETE_DATA='{"action":"delete","id":"'$POPUP_ID'","shop_domain":"'$TEST_SHOP'"}'
        curl -s -X POST \
            -H "Content-Type: application/json" \
            -d "$DELETE_DATA" \
            "$API_BASE/popup-config" > /dev/null
        log_info "Test popup cleaned up"
    fi
else
    log_error "Critical path test: popup creation failed"
fi

# 6. Performance Check
log_info "Checking API performance..."
START_TIME=$(date +%s%N)
curl -s --max-time 5 "$API_BASE/popup-config?action=list&shop_domain=$TEST_SHOP" > /dev/null
END_TIME=$(date +%s%N)
RESPONSE_TIME=$(( (END_TIME - START_TIME) / 1000000 ))

if [ $RESPONSE_TIME -lt 3000 ]; then
    log_success "API performance: ${RESPONSE_TIME}ms (good)"
else
    log_warning "API performance: ${RESPONSE_TIME}ms (slow)"
fi

# 7. Admin Detection Test
log_info "Checking admin detection logic..."
EMBED_SCRIPT=$(curl -s --max-time 5 "$API_BASE/popup-embed-public?shop=$TEST_SHOP")
if echo "$EMBED_SCRIPT" | grep -q "admin.shopify.com" && echo "$EMBED_SCRIPT" | grep -q "shouldSkipPopup"; then
    log_success "Admin detection logic present in script"
else
    log_error "Admin detection logic missing"
fi

echo ""
echo "📊 Deployment Status Summary"
echo "============================"
echo -e "Backend API:       $BACKEND_STATUS"
echo -e "Database:          $DATABASE_STATUS" 
echo -e "Functions:         $FUNCTIONS_STATUS"
echo -e "Frontend:          $FRONTEND_STATUS"
echo ""

# Overall status
if [ "$BACKEND_STATUS" = "✅" ] && [ "$DATABASE_STATUS" = "✅" ] && [ "$FUNCTIONS_STATUS" = "✅" ]; then
    echo -e "${GREEN}🎉 DEPLOYMENT SUCCESSFUL${NC}"
    echo "All critical services are operational!"
    exit 0
else
    echo -e "${RED}❌ DEPLOYMENT ISSUES DETECTED${NC}"
    echo "Some services may need attention."
    exit 1
fi