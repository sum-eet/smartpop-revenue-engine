# SmartPop Tests

Comprehensive test suite to verify all functionality works as expected.

## Test Categories

### 1. API Tests (`api/`)
- **popup-config.test.js** - CRUD operations for popup management
- **popup-embed-public.test.js** - Public script endpoint and admin detection
- **popup-track.test.js** - Analytics and event tracking
- **shopify-auth.test.js** - OAuth flow testing

### 2. Frontend Tests (`frontend/`)
- **popup-creation.test.js** - Popup creation modal functionality
- **dashboard.test.js** - Main dashboard interface
- **auth-flow.test.js** - Shopify authentication

### 3. Database Tests (`database/`)
- **migrations.test.js** - Database schema validation
- **data-integrity.test.js** - Data consistency checks
- **performance.test.js** - Query performance testing

### 4. Integration Tests (`integration/`)
- **end-to-end.test.js** - Complete user workflows
- **shopify-integration.test.js** - Script tag injection and removal
- **admin-detection.test.js** - Admin blocking functionality

### 5. Manual Tests (`manual/`)
- **test-pages/** - HTML files for browser testing
- **curl-scripts/** - Command-line API testing
- **shopify-scenarios/** - Real Shopify store testing

## Quick Start

```bash
# Install test dependencies
npm install --save-dev jest node-fetch jsdom

# Run all tests
npm test

# Run specific test category
npm run test:api
npm run test:frontend
npm run test:integration

# Run manual browser tests
cd tests/manual/test-pages
open popup-test.html
```

## Environment Setup

Create `tests/.env.test`:
```bash
SUPABASE_URL=https://zsmoutzjhqjgjehaituw.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_test_key
TEST_SHOP_DOMAIN=testingstoresumeet.myshopify.com
SHOPIFY_ACCESS_TOKEN=your_test_token
```

## Test Data

The `data/` folder contains:
- Sample popup configurations
- Mock Shopify responses  
- Test user data
- Expected API responses

## Coverage

Tests cover:
- ✅ Popup CRUD operations
- ✅ Admin detection logic
- ✅ Analytics tracking
- ✅ Database operations
- ✅ Frontend components
- ✅ Shopify integration
- ✅ Error handling
- ✅ Security validations