#!/bin/bash

# SmartPop API Testing Script
# Tests all API endpoints with curl commands

set -e

# Configuration
API_BASE="https://zsmoutzjhqjgjehaituw.supabase.co/functions/v1"
TEST_SHOP="testingstoresumeet.myshopify.com"
TIMESTAMP=$(date +%s)

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Helper functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

log_test() {
    echo -e "${YELLOW}[TEST]${NC} $1"
}

# Test variables
POPUP_ID=""

echo "🧪 SmartPop API Test Suite"
echo "=========================="
echo "API Base: $API_BASE"
echo "Test Shop: $TEST_SHOP"
echo ""

# Test 1: Create Popup
log_test "Creating popup..."
CREATE_RESPONSE=$(curl -s -w "HTTPSTATUS:%{http_code}" -X POST \
  "$API_BASE/popup-config" \
  -H "Content-Type: application/json" \
  -d "{
    \"action\": \"save\",
    \"title\": \"Curl Test Popup $TIMESTAMP\",
    \"content\": \"Get 25% off your first order!\",
    \"trigger_type\": \"time_delay\",
    \"trigger_value\": \"3000\",
    \"position\": \"center\",
    \"shop_domain\": \"$TEST_SHOP\"
  }")

HTTP_STATUS=$(echo $CREATE_RESPONSE | tr -d '\n' | sed -e 's/.*HTTPSTATUS://')
RESPONSE_BODY=$(echo $CREATE_RESPONSE | sed -e 's/HTTPSTATUS\:.*//g')

if [ $HTTP_STATUS -eq 200 ]; then
    log_success "Popup created successfully"
    POPUP_ID=$(echo $RESPONSE_BODY | grep -o '"id":"[^"]*"' | cut -d'"' -f4)
    log_info "Popup ID: $POPUP_ID"
    echo "Response: $RESPONSE_BODY"
else
    log_error "Failed to create popup (HTTP $HTTP_STATUS)"
    echo "Response: $RESPONSE_BODY"
    exit 1
fi

echo ""

# Test 2: List Popups
log_test "Listing popups..."
LIST_RESPONSE=$(curl -s -w "HTTPSTATUS:%{http_code}" \
  "$API_BASE/popup-config?action=list&shop_domain=$TEST_SHOP")

HTTP_STATUS=$(echo $LIST_RESPONSE | tr -d '\n' | sed -e 's/.*HTTPSTATUS://')
RESPONSE_BODY=$(echo $LIST_RESPONSE | sed -e 's/HTTPSTATUS\:.*//g')

if [ $HTTP_STATUS -eq 200 ]; then
    log_success "Popups listed successfully"
    POPUP_COUNT=$(echo $RESPONSE_BODY | grep -o '"id":"[^"]*"' | wc -l)
    log_info "Found $POPUP_COUNT popups"
    echo "Response: $RESPONSE_BODY"
else
    log_error "Failed to list popups (HTTP $HTTP_STATUS)"
    echo "Response: $RESPONSE_BODY"
fi

echo ""

# Test 3: Update Popup
if [ ! -z "$POPUP_ID" ]; then
    log_test "Updating popup..."
    UPDATE_RESPONSE=$(curl -s -w "HTTPSTATUS:%{http_code}" -X POST \
      "$API_BASE/popup-config" \
      -H "Content-Type: application/json" \
      -d "{
        \"action\": \"save\",
        \"id\": \"$POPUP_ID\",
        \"title\": \"Updated Curl Test Popup $TIMESTAMP\",
        \"content\": \"Get 30% off your first order!\",
        \"shop_domain\": \"$TEST_SHOP\"
      }")

    HTTP_STATUS=$(echo $UPDATE_RESPONSE | tr -d '\n' | sed -e 's/.*HTTPSTATUS://')
    RESPONSE_BODY=$(echo $UPDATE_RESPONSE | sed -e 's/HTTPSTATUS\:.*//g')

    if [ $HTTP_STATUS -eq 200 ]; then
        log_success "Popup updated successfully"
        echo "Response: $RESPONSE_BODY"
    else
        log_error "Failed to update popup (HTTP $HTTP_STATUS)"
        echo "Response: $RESPONSE_BODY"
    fi
else
    log_error "Skipping update test - no popup ID"
fi

echo ""

# Test 4: Get Embed Script
log_test "Getting embed script..."
EMBED_RESPONSE=$(curl -s -w "HTTPSTATUS:%{http_code}" \
  "$API_BASE/popup-embed-public?shop=$TEST_SHOP&debug=true")

HTTP_STATUS=$(echo $EMBED_RESPONSE | tr -d '\n' | sed -e 's/.*HTTPSTATUS://')
RESPONSE_BODY=$(echo $EMBED_RESPONSE | sed -e 's/HTTPSTATUS\:.*//g')

if [ $HTTP_STATUS -eq 200 ]; then
    log_success "Embed script retrieved successfully"
    SCRIPT_SIZE=$(echo "$RESPONSE_BODY" | wc -c)
    log_info "Script size: $SCRIPT_SIZE bytes"
    
    # Check for key content
    if echo "$RESPONSE_BODY" | grep -q "SmartPop"; then
        log_success "Script contains SmartPop identifier"
    else
        log_error "Script missing SmartPop identifier"
    fi
    
    if echo "$RESPONSE_BODY" | grep -q "admin.shopify.com"; then
        log_success "Script contains admin detection"
    else
        log_error "Script missing admin detection"
    fi
else
    log_error "Failed to get embed script (HTTP $HTTP_STATUS)"
    echo "Response: $RESPONSE_BODY"
fi

echo ""

# Test 5: Error Handling - Invalid Action
log_test "Testing error handling..."
ERROR_RESPONSE=$(curl -s -w "HTTPSTATUS:%{http_code}" -X POST \
  "$API_BASE/popup-config" \
  -H "Content-Type: application/json" \
  -d "{
    \"action\": \"invalid_action\",
    \"shop_domain\": \"$TEST_SHOP\"
  }")

HTTP_STATUS=$(echo $ERROR_RESPONSE | tr -d '\n' | sed -e 's/.*HTTPSTATUS://')
RESPONSE_BODY=$(echo $ERROR_RESPONSE | sed -e 's/HTTPSTATUS\:.*//g')

if [ $HTTP_STATUS -eq 400 ]; then
    log_success "Error handling works correctly (HTTP 400)"
    echo "Response: $RESPONSE_BODY"
else
    log_error "Unexpected response to invalid action (HTTP $HTTP_STATUS)"
    echo "Response: $RESPONSE_BODY"
fi

echo ""

# Test 6: Missing Shop Domain
log_test "Testing missing shop domain..."
MISSING_SHOP_RESPONSE=$(curl -s -w "HTTPSTATUS:%{http_code}" -X POST \
  "$API_BASE/popup-config" \
  -H "Content-Type: application/json" \
  -d "{
    \"action\": \"save\",
    \"title\": \"Test Popup\"
  }")

HTTP_STATUS=$(echo $MISSING_SHOP_RESPONSE | tr -d '\n' | sed -e 's/.*HTTPSTATUS://')
RESPONSE_BODY=$(echo $MISSING_SHOP_RESPONSE | sed -e 's/HTTPSTATUS\:.*//g')

if [ $HTTP_STATUS -eq 400 ]; then
    log_success "Missing shop domain handled correctly (HTTP 400)"
    echo "Response: $RESPONSE_BODY"
else
    log_error "Unexpected response to missing shop domain (HTTP $HTTP_STATUS)"
    echo "Response: $RESPONSE_BODY"
fi

echo ""

# Test 7: Performance Test
log_test "Testing response times..."
START_TIME=$(date +%s%N)
PERF_RESPONSE=$(curl -s -w "HTTPSTATUS:%{http_code}" \
  "$API_BASE/popup-config?action=list&shop_domain=$TEST_SHOP")
END_TIME=$(date +%s%N)

RESPONSE_TIME_MS=$(( (END_TIME - START_TIME) / 1000000 ))
HTTP_STATUS=$(echo $PERF_RESPONSE | tr -d '\n' | sed -e 's/.*HTTPSTATUS://')

if [ $HTTP_STATUS -eq 200 ]; then
    log_success "Performance test completed"
    log_info "Response time: ${RESPONSE_TIME_MS}ms"
    
    if [ $RESPONSE_TIME_MS -lt 2000 ]; then
        log_success "Response time within acceptable range (<2s)"
    else
        log_error "Response time too slow (>2s)"
    fi
else
    log_error "Performance test failed (HTTP $HTTP_STATUS)"
fi

echo ""

# Cleanup - Delete Test Popup
if [ ! -z "$POPUP_ID" ]; then
    log_test "Cleaning up test popup..."
    DELETE_RESPONSE=$(curl -s -w "HTTPSTATUS:%{http_code}" -X POST \
      "$API_BASE/popup-config" \
      -H "Content-Type: application/json" \
      -d "{
        \"action\": \"delete\",
        \"id\": \"$POPUP_ID\",
        \"shop_domain\": \"$TEST_SHOP\"
      }")

    HTTP_STATUS=$(echo $DELETE_RESPONSE | tr -d '\n' | sed -e 's/.*HTTPSTATUS://')
    RESPONSE_BODY=$(echo $DELETE_RESPONSE | sed -e 's/HTTPSTATUS\:.*//g')

    if [ $HTTP_STATUS -eq 200 ]; then
        log_success "Test popup deleted successfully"
        echo "Response: $RESPONSE_BODY"
    else
        log_error "Failed to delete test popup (HTTP $HTTP_STATUS)"
        echo "Response: $RESPONSE_BODY"
    fi
else
    log_error "Skipping cleanup - no popup ID"
fi

echo ""
echo "🎉 API Test Suite Completed!"
echo "============================"

# Additional utility tests
echo ""
log_info "Additional utility commands:"
echo "# Test embed script directly:"
echo "curl '$API_BASE/popup-embed-public?shop=$TEST_SHOP'"
echo ""
echo "# Test with debug mode:"
echo "curl '$API_BASE/popup-embed-public?shop=$TEST_SHOP&debug=true'"
echo ""
echo "# Check CORS headers:"
echo "curl -I '$API_BASE/popup-embed-public?shop=$TEST_SHOP'"
echo ""
echo "# Load test (run multiple times):"
echo "for i in {1..10}; do curl -s '$API_BASE/popup-config?action=list&shop_domain=$TEST_SHOP' > /dev/null && echo \"Request \$i: OK\" || echo \"Request \$i: FAILED\"; done"