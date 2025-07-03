# SmartPop Revenue Engine - Architecture

## Overview
SmartPop is a Shopify app that displays targeted popups on customer store pages to increase conversions. The system is built with proper admin detection to ensure popups never appear on Shopify admin pages.

## Architecture Components

### 1. Frontend (React + Vite)
**Location**: `src/`
- **Purpose**: Shopify app dashboard for managing popups
- **Key Files**:
  - `src/components/PopupCreationModal.tsx` - Create/edit popups
  - `src/pages/Dashboard.tsx` - Main app interface
- **Deployment**: Vercel
- **Access**: Requires Shopify OAuth

### 2. Backend Functions (Supabase Edge Functions)
**Location**: `supabase/functions/`

#### Core Functions:
- **`popup-config/`** - CRUD operations for popup management
- **`popup-embed-public/`** - Public script served to Shopify stores
- **`popup-track/`** - Analytics and event tracking
- **`shopify-auth/`** - OAuth authentication flow

#### Key Function: popup-embed-public
```typescript
// Serves JavaScript to Shopify stores
// URL: https://PROJECT.supabase.co/functions/v1/popup-embed-public?shop=SHOP_DOMAIN
// Features:
// - Admin detection (blocks admin.shopify.com)
// - Popup loading from database
// - Event tracking
// - No authentication required (public endpoint)
```

### 3. Database (Supabase PostgreSQL)
**Location**: `supabase/migrations/`

#### Core Tables:
- **`popups`** - Popup configurations and content
- **`popup_events`** - Analytics and conversion tracking
- **`shops`** - Shopify store information

### 4. Shopify Integration

#### Script Injection:
- **Method**: Shopify Script Tags API
- **Script URL**: `https://PROJECT.supabase.co/functions/v1/popup-embed-public?shop=SHOP_DOMAIN`
- **Scope**: `write_script_tags, read_script_tags`

#### OAuth Flow:
1. Store owner installs app
2. Shopify redirects to our auth endpoint
3. We create script tag pointing to popup-embed-public
4. Script loads on all store pages with admin detection

## Data Flow

### Popup Creation:
```
Dashboard → popup-config function → Database → popup-embed-public serves updated script
```

### Customer Experience:
```
Customer visits store → Script loads → Admin detection → Show/hide popup → Track events
```

### Admin Protection:
```
Admin visits admin.shopify.com → Script loads → Detects admin domain → Blocks popup → No popup shown
```

## Key Design Decisions

### 1. Admin Detection Strategy
**Challenge**: Prevent popups on Shopify admin pages
**Solution**: Domain-based detection in popup-embed-public function
```typescript
if (hostname === 'admin.shopify.com') {
  console.log('🚫 Admin domain detected - blocking popup');
  return; // Exit immediately
}
```

### 2. Public Script Endpoint
**Challenge**: Shopify stores need public access to popup script
**Solution**: popup-embed-public function with no authentication
- Deployed with `--no-verify-jwt` flag
- Returns JavaScript content type
- CORS headers for cross-origin access

### 3. Configuration API
**Challenge**: Secure popup management
**Solution**: popup-config function with action-based routing
```typescript
// Create popup
POST /popup-config { action: 'save', ...popupData }

// List popups  
GET /popup-config?action=list&shop_domain=SHOP_DOMAIN

// Delete popup
POST /popup-config { action: 'delete', id: 'popup-id' }
```

## Deployment Strategy

### Development:
```bash
# Start frontend
npm run dev

# Deploy functions
npx supabase functions deploy FUNCTION_NAME --project-ref PROJECT_ID

# Run migrations
npx supabase db push
```

### Production:
```bash
# Deploy frontend
vercel deploy --prod

# Deploy all functions
npx supabase functions deploy --project-ref PROJECT_ID

# Update database
npx supabase db push --project-ref PROJECT_ID
```

## Configuration Files

### Essential Files:
- `shopify.app.toml` - Shopify app configuration
- `supabase/config.toml` - Supabase project settings
- `vercel.json` - Deployment configuration
- `package.json` - Dependencies and scripts

### Environment Variables:
```bash
# Shopify
SHOPIFY_CLIENT_ID=your_client_id
SHOPIFY_CLIENT_SECRET=your_client_secret

# Supabase
SUPABASE_URL=https://PROJECT.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

## Security Considerations

### 1. Admin Detection
- Multiple layers: domain, path, DOM, iframe detection
- Fail-safe approach: if unsure, block popup

### 2. Data Protection
- Popup content stored securely in Supabase
- Event tracking with minimal PII
- CORS properly configured

### 3. Rate Limiting
- Supabase built-in rate limiting
- Function-level timeout protection

## Troubleshooting

### Common Issues:

1. **Popups not showing on store**:
   - Check script tag exists in Shopify admin
   - Verify popup-embed-public is accessible
   - Confirm popups exist in database

2. **Popups showing on admin pages**:
   - Check admin detection logic
   - Verify correct script URL is deployed

3. **Authentication errors**:
   - Ensure popup-embed-public has no auth
   - Check CORS headers
   - Verify Shopify OAuth configuration

## File Structure
```
smartpop-revenue-engine/
├── src/                          # Frontend React app
├── supabase/
│   ├── functions/               # Edge functions
│   └── migrations/              # Database schema
├── public/                      # Static assets
├── archive/                     # Deprecated scripts
├── ARCHITECTURE.md              # This file
├── README.md                    # Usage instructions
├── shopify.app.toml            # Shopify configuration
└── package.json                # Dependencies
```

## Next Steps for Scaling

1. **Add popup templates** for common use cases
2. **Implement A/B testing** for popup variations  
3. **Add advanced targeting** (geolocation, device type)
4. **Create analytics dashboard** with conversion metrics
5. **Add webhook handling** for real-time store updates