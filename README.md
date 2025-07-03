# SmartPop Revenue Engine

A Shopify app that displays targeted popups on customer store pages to increase conversions, with intelligent admin detection to prevent popups on Shopify admin pages.

## Quick Start

### Prerequisites
- Node.js 18+
- Supabase CLI
- Vercel CLI
- Shopify Partner Account

### Installation

1. **Clone and setup**:
```bash
git clone <repository>
cd smartpop-revenue-engine
npm install
```

2. **Configure environment**:
```bash
cp .env.example .env.local
# Edit .env.local with your credentials
```

3. **Deploy backend**:
```bash
npx supabase functions deploy popup-config --project-ref YOUR_PROJECT_ID
npx supabase functions deploy popup-embed-public --project-ref YOUR_PROJECT_ID --no-verify-jwt
npx supabase db push --project-ref YOUR_PROJECT_ID
```

4. **Deploy frontend**:
```bash
npm run build
vercel deploy --prod
```

5. **Configure Shopify app**:
- Update `shopify.app.toml` with your app credentials
- Set redirect URLs in Shopify Partner Dashboard

## How It Works

### For Store Owners:
1. Install SmartPop app from Shopify App Store
2. Create popups using the dashboard
3. Popups automatically appear on customer store pages
4. View analytics and conversion metrics

### For Customers:
1. Visit Shopify store
2. Popup appears based on triggers (time, scroll, exit intent)
3. Enter email to get discount
4. Popup never appears on admin pages

### Technical Flow:
```
Store Owner → Creates Popup → Saves to Database → Script Updates → Customer Sees Popup
```

## Core Features

### ✅ Popup Management
- Create, edit, delete popups
- Multiple trigger types (time, scroll, exit intent)
- Customizable content and styling
- A/B testing capabilities

### ✅ Smart Targeting
- Page-specific targeting (homepage, product pages, etc.)
- Customer behavior triggers
- First-time visitor detection

### ✅ Admin Protection
- Intelligent detection of Shopify admin pages
- Domain-based blocking (`admin.shopify.com`)
- Path-based detection (`/admin`, `/apps`)
- Iframe and DOM-based detection

### ✅ Analytics
- Popup view tracking
- Conversion rate monitoring
- Email capture analytics
- Real-time dashboard

## API Endpoints

### Public Endpoints:
- `GET /functions/v1/popup-embed-public?shop=SHOP_DOMAIN` - Popup script for stores
- `POST /functions/v1/popup-track` - Event tracking

### Authenticated Endpoints:
- `POST /functions/v1/popup-config` - Popup CRUD operations
- `GET /functions/v1/shopify-auth` - OAuth handling

## Development

### Start development server:
```bash
npm run dev
```

### Deploy functions:
```bash
npx supabase functions deploy FUNCTION_NAME --project-ref PROJECT_ID
```

### Run tests:
```bash
npm test
```

### Database migrations:
```bash
npx supabase db push
```

## Architecture

See [ARCHITECTURE.md](./ARCHITECTURE.md) for detailed technical documentation.

### Key Components:
- **Frontend**: React dashboard hosted on Vercel
- **Backend**: Supabase Edge Functions
- **Database**: PostgreSQL on Supabase
- **Integration**: Shopify Script Tags API

## Configuration

### Shopify App Settings (`shopify.app.toml`):
```toml
client_id = "your_client_id"
application_url = "https://your-app.vercel.app"
scopes = "write_script_tags,read_script_tags"
```

### Environment Variables:
```bash
SHOPIFY_CLIENT_ID=your_client_id
SHOPIFY_CLIENT_SECRET=your_client_secret
SUPABASE_URL=https://project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

## Security

### Admin Detection:
- Primary: `hostname === 'admin.shopify.com'`
- Secondary: Path checking (`/admin`, `/apps`)
- Tertiary: DOM and iframe detection
- Fail-safe: Block if uncertain

### Data Protection:
- Encrypted database storage
- Minimal PII collection
- CORS properly configured
- Rate limiting enabled

## Troubleshooting

### Popups not showing:
1. Check script tag exists in Shopify admin
2. Verify popup-embed-public endpoint is accessible
3. Confirm active popups exist in database

### Popups on admin pages:
1. Check admin detection logic
2. Verify script URL points to popup-embed-public
3. Clear browser cache

### Authentication issues:
1. Verify Shopify OAuth configuration
2. Check redirect URLs match
3. Confirm app permissions

## Support

### Debug Tools:
- Add `&debug=true` to popup-embed-public URL for console logs
- Check Supabase function logs for errors
- Use browser dev tools for client-side debugging

### Common Commands:
```bash
# View function logs
npx supabase functions logs popup-embed-public --project-ref PROJECT_ID

# Check database
npx supabase db diff --project-ref PROJECT_ID

# Deploy specific function
npx supabase functions deploy popup-config --project-ref PROJECT_ID
```

## License

MIT License - see LICENSE file for details.