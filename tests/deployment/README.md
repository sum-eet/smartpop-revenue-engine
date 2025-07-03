# Deployment Tests

Comprehensive deployment verification tests to ensure both frontend and backend are properly deployed and functioning in production.

## Test Categories

### 1. Backend Deployment Tests (`backend/`)
- **Supabase Functions** - Verify all edge functions are deployed and accessible
- **Database** - Check database connectivity and schema
- **API Endpoints** - Validate all API endpoints respond correctly
- **Authentication** - Test auth middleware and permissions
- **CORS** - Verify cross-origin request handling

### 2. Frontend Deployment Tests (`frontend/`)
- **Vercel Deployment** - Check frontend app accessibility
- **Static Assets** - Verify all assets load correctly
- **API Integration** - Test frontend-to-backend communication
- **Authentication Flow** - Verify Shopify OAuth integration
- **Performance** - Check page load times and core web vitals

### 3. Health Checks (`health/`)
- **Service Status** - Overall system health monitoring
- **Dependencies** - External service connectivity
- **Monitoring** - Deployment status dashboards
- **Alerts** - Automated failure detection

### 4. Smoke Tests (`smoke/`)
- **Critical Paths** - End-to-end user journeys
- **Core Features** - Essential functionality verification
- **Integration Points** - Cross-service communication
- **Performance Baselines** - Response time validation

## Quick Deployment Verification

```bash
# Run all deployment tests
npm run test:deployment

# Check backend only
npm run test:deployment:backend

# Check frontend only  
npm run test:deployment:frontend

# Quick health check
npm run health-check

# Smoke tests
npm run smoke-test
```

## Production URLs

### Backend (Supabase):
- **Base**: `https://zsmoutzjhqjgjehaituw.supabase.co`
- **Functions**: `/functions/v1/`
- **Database**: PostgreSQL on Supabase

### Frontend (Vercel):
- **Production**: `https://smartpop-revenue-engine.vercel.app`
- **Preview**: Dynamic URLs for branches

## Environment Validation

Tests verify:
- ✅ All environment variables are set
- ✅ API keys and secrets are valid
- ✅ Database connections work
- ✅ External services are accessible
- ✅ CORS policies are configured
- ✅ SSL certificates are valid

## Monitoring Integration

- **Uptime Monitoring** - Continuous service availability
- **Performance Monitoring** - Response time tracking
- **Error Tracking** - Automatic failure alerts
- **Log Aggregation** - Centralized logging