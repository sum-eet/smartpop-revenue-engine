# claude.md - SmartPop Revenue Engine Complete Guide

## 🎯 Project Goal

Build a Shopify app that increases merchant revenue by displaying intelligent, targeted popups to customers at the perfect moment. Think of it as "exit intent on steroids" - using behavioral analytics to maximize conversions without annoying customers.

**Success Metrics**:
- 10-30% increase in email capture rate
- 5-15% reduction in cart abandonment
- <50ms performance impact on store
- 4.8+ star rating on Shopify App Store

## 🏗️ Current Architecture vs Target Architecture

### Current (Broken) Architecture
```
Shopify Store → Script Tag → Unsecured API → Database
     ↓                          ↓
   Popup Shows          No Auth/Rate Limiting
     ↓                          ↓
Random Analytics        💸 Bankruptcy Risk
```

### Target Architecture
```
┌─────────────────────────────────────────────────────────────┐
│                      Shopify Store                          │
├─────────────────────────────────────────────────────────────┤
│  Script Tag API → Theme Extension → Checkout UI Extension  │
│       ↓                ↓                    ↓               │
│  [Fallback Chain - Always ensures popup loads]             │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                    CDN (Cloudflare)                         │
│  - Caches popup config (5 min)                             │
│  - Rate limiting (100 req/min/shop)                        │
│  - DDoS protection                                         │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                 Supabase Edge Functions                     │
│  - Shop validation                                         │
│  - JWT verification                                        │
│  - Business logic                                          │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                  PostgreSQL (Supabase)                      │
│  - Partitioned events table                                │
│  - Materialized views for analytics                        │
│  - Proper indexes                                          │
└─────────────────────────────────────────────────────────────┘
```

## 💻 Tech Stack

### Core Technologies
- **Frontend Framework**: Next.js 14 with App Router and TypeScript
- **Backend**: Supabase Edge Functions (Deno runtime)
- **Database**: PostgreSQL via Supabase
- **Frontend Hosting**: Vercel
- **CDN**: Cloudflare for script delivery and caching
- **Authentication**: Shopify OAuth 2.0

### Key Libraries & Tools
- **UI Components**: Shopify Polaris for admin dashboard
- **API Client**: @shopify/shopify-api for Shopify integration
- **Analytics**: PostHog for product analytics
- **Error Tracking**: Sentry for error monitoring
- **Testing**: Vitest for unit tests, Playwright for E2E tests
- **CI/CD**: GitHub Actions
- **Monitoring**: Datadog or New Relic
- **Logging**: Supabase built-in logs + external aggregator

## 📁 Proper Folder Structure

### Root Directory Organization
```
smartpop-revenue-engine/
├── .github/                   # GitHub specific files
├── apps/                      # Application code
├── packages/                  # Shared packages
├── supabase/                  # Supabase specific files
├── scripts/                   # Deployment and maintenance scripts
├── tests/                     # Test suites
├── docs/                      # Documentation
└── [config files]            # Root configuration
```

### Detailed Structure Explanation

#### `.github/` - GitHub Configuration
- **workflows/**: Automated CI/CD pipelines
  - `test.yml`: Runs on every PR
  - `deploy-staging.yml`: Deploys to staging on main branch
  - `deploy-production.yml`: Manual trigger for production
  - `rollback.yml`: Emergency rollback workflow
- **CODEOWNERS**: Defines who reviews what code
- **ISSUE_TEMPLATE/**: Bug report and feature request templates

#### `apps/` - Application Code
- **web/**: Next.js admin dashboard
  - `app/`: App Router pages and layouts
  - `components/`: Reusable React components
  - `lib/`: Business logic and utilities
  - `middleware.ts`: Auth and request middleware
- **embed/**: Customer-facing popup script
  - `src/`: Source TypeScript code
  - `build/`: Compiled and optimized JavaScript
  - `config/`: Build configuration

#### `packages/` - Shared Code
- **database/**: Database schema and types
  - `schema.prisma`: Database schema definition
  - `migrations/`: Database migration files
  - `seed.ts`: Development data seeding
- **shared/**: Code shared between apps
  - `constants/`: App-wide constants
  - `types/`: TypeScript type definitions
  - `utils/`: Utility functions
- **config/**: Shared configuration
  - `tsconfig/`: TypeScript configs
  - `eslint/`: ESLint configs

#### `supabase/` - Backend Functions
- **functions/**: Edge functions
  - `_shared/`: Code shared between functions
  - Individual function folders
- **migrations/**: SQL migration files
- **seed.sql**: Database seed data

## 🔄 Application Flow

### 1. Merchant Installation Flow
```
1. Merchant finds app in Shopify App Store
2. Clicks "Install"
3. Redirected to our OAuth endpoint
4. We request necessary permissions:
   - write_script_tags: To inject our script
   - read_products: To target product pages
   - read_customers: For customer segmentation
5. Merchant approves permissions
6. We receive access token
7. Store shop data in database
8. Install script tag via Shopify Admin API
9. Set up webhooks for app/uninstall
10. Redirect to onboarding flow
11. Merchant creates first popup
12. Success! Popup goes live
```

### 2. Customer Experience Flow
```
1. Customer lands on merchant's store
2. Our script loads asynchronously (non-blocking)
3. Script performs checks:
   - Is this an admin page? → Exit
   - Was popup shown recently? → Exit
   - Is user on mobile with slow connection? → Exit
4. Fetch popup configuration (with caching)
5. Initialize behavior tracking:
   - Time on page
   - Scroll depth
   - Mouse movement
   - Cart value
6. Evaluate trigger conditions continuously
7. When conditions met → Show popup
8. Track interaction:
   - Impression
   - Engagement time
   - Close method
   - Email submission
9. Update local storage to prevent spam
10. Send analytics to backend
```

### 3. Data Processing Flow
```
1. Customer interaction occurs
2. Client validates and batches events
3. Send to edge function every 5 seconds
4. Edge function validates request:
   - Check shop exists
   - Verify rate limits
   - Validate event schema
5. Write to events table
6. Trigger async processing:
   - Update real-time analytics
   - Check for conversion
   - Update customer profile
7. Aggregate hourly for dashboards
8. Clean up old data monthly
```

## 🚨 Critical Problems & Detailed Solutions

### Problem 1: Security Vulnerability - Open Endpoint

#### Why This Is Critical
- Anyone can call your API unlimited times
- Each call costs money (Supabase charges per invocation)
- Competitors can steal your customer data
- DDoS attacks will bankrupt you
- No audit trail for compliance

#### Solution Approach

**Step 1: Implement Request Validation**
- Check request origin matches *.myshopify.com
- Validate shop exists in your database
- Ensure shop has active subscription
- Block suspicious user agents
- Log all requests for audit trail

**Step 2: Add Rate Limiting**
- Per-shop limits: 100 requests/minute
- Global limits: 10,000 requests/minute
- IP-based limits for additional protection
- Exponential backoff for repeat offenders
- Whitelist for partners/high-volume customers

**Step 3: Implement Caching**
- Cache popup configs for 5 minutes
- Use ETags for efficient caching
- Implement stale-while-revalidate pattern
- Cache at edge (Cloudflare) and origin

**Step 4: Add Request Signing**
- Generate unique tokens per shop
- Include timestamp to prevent replay
- Rotate tokens every 24 hours
- Implement token refresh mechanism

### Problem 2: No Error Handling Strategy

#### Current Issues
- Single JavaScript error crashes entire popup system
- No visibility into client-side errors
- Silent failures frustrate merchants
- Can't debug customer-specific issues
- No graceful degradation

#### Solution Approach

**Client-Side Error Handling**
- Wrap all functions in try-catch blocks
- Implement global error handler
- Create error boundary pattern
- Log errors with context
- Fallback UI for critical failures

**Server-Side Error Handling**
- Consistent error response format
- Proper HTTP status codes
- Rate limit error responses
- Log errors with request context
- Alert on error spikes

**Error Recovery Strategy**
- Retry with exponential backoff
- Circuit breaker for failing services
- Fallback to cached data
- Graceful feature degradation
- User-friendly error messages

### Problem 3: Database Performance Issues

#### Current Problems
- No indexes on frequently queried columns
- Events table will grow to millions of rows
- Analytics queries timeout after 1000 shops
- No data archival strategy
- Missing query optimization

#### Solution Approach

**Immediate Optimizations**
- Add indexes for common queries
- Implement database connection pooling
- Optimize slow queries with EXPLAIN ANALYZE
- Add read replicas for analytics
- Implement query result caching

**Long-term Architecture**
- Partition events table by month
- Create materialized views for dashboards
- Implement data archival (>90 days)
- Add time-series database for metrics
- Consider OLAP for analytics

**Query Optimization**
- Batch insert events (don't insert one by one)
- Use prepared statements
- Implement cursor-based pagination
- Denormalize for read performance
- Pre-aggregate common metrics

### Problem 4: No Deployment Pipeline

#### Why Manual Deployment Fails
- Human error inevitable
- No rollback capability
- Inconsistent environments
- No audit trail
- Can't deploy outside business hours

#### Solution Approach

**Environment Setup**
- Local: Full stack on developer machine
- Staging: Exact copy of production
- Production: Live customer environment
- Preview: Temporary for PRs

**CI/CD Pipeline**
- Automated tests on every commit
- Deploy to preview on PR
- Deploy to staging on merge to main
- Manual approval for production
- Automated rollback on failures

**Deployment Safety**
- Blue-green deployments
- Feature flags for risky changes
- Canary releases (5% → 25% → 100%)
- Health checks after deploy
- Automatic rollback triggers

### Problem 5: Performance Impact on Stores

#### Current Issues
- Script blocks page rendering
- No performance budget
- Memory leaks over time
- Excessive network requests
- No performance monitoring

#### Solution Approach

**Script Optimization**
- Async loading only
- Lazy load non-critical code
- Tree-shake unused code
- Minify and compress
- Use CDN with edge locations

**Performance Budget**
- Initial load: <5KB
- Execution time: <50ms
- Memory usage: <5MB
- Network requests: <3 per page
- No impact on Core Web Vitals

**Performance Monitoring**
- Real User Monitoring (RUM)
- Synthetic monitoring
- A/B test performance impact
- Alert on regressions
- Weekly performance reports

### Problem 6: No Business Model Implementation

#### Missing Business Features
- Can't track usage for billing
- No plan enforcement
- No upgrade prompts
- Can't prevent abuse
- No revenue optimization

#### Solution Approach

**Usage Tracking**
- Track all billable events
- Real-time usage dashboards
- Usage alerts at 80%, 90%, 100%
- Historical usage reports
- Export for billing reconciliation

**Plan Management**
- Define plan limits clearly
- Soft limits with warnings
- Hard limits with feature disable
- Grace periods for overages
- Automatic upgrade prompts

**Billing Integration**
- Use Shopify Billing API
- Support multiple pricing models
- Handle payment failures gracefully
- Prorate plan changes
- Send billing notifications

## 🚫 How to Avoid Temporary Scripts

### The Problem with Temp Scripts
- No version control
- No rollback capability
- No testing
- Often break in production
- Create technical debt

### Proper Solutions

**For Data Fixes**: Use versioned migrations
- Write SQL migration files
- Test on staging first
- Include rollback statements
- Document why change needed
- Run through deployment pipeline

**For Feature Changes**: Use feature flags
- Toggle features without deploy
- Gradual rollout capability
- A/B testing built-in
- Easy rollback
- No code changes needed

**For Emergency Fixes**: Have a process
- Hotfix branch workflow
- Expedited review process
- Automated testing still runs
- Deploy to staging first
- Document in incident report

## 🚀 Deployment Strategy

### Development Workflow
1. Create feature branch from main
2. Write code with tests
3. Run local test suite
4. Push to GitHub
5. Automated tests run
6. Deploy to preview environment
7. Code review by team
8. Merge to main
9. Auto-deploy to staging
10. QA verification
11. Deploy to production
12. Monitor metrics

### Production Deployment Checklist
- [ ] All tests passing
- [ ] Code reviewed by 2 people
- [ ] Staging tested for 24 hours
- [ ] Database migrations ready
- [ ] Feature flags configured
- [ ] Rollback plan documented
- [ ] Team notified in Slack
- [ ] Monitoring dashboards open
- [ ] Customer support briefed

### Emergency Procedures

**If Production Breaks**:
1. Don't panic
2. Assess impact (how many affected?)
3. Rollback if >10% of shops affected
4. Otherwise, hotfix forward
5. Notify affected merchants
6. Post-mortem within 48 hours

**Rollback Process**:
1. Trigger rollback workflow
2. Revert to last known good version
3. Clear CDN caches
4. Verify functionality restored
5. Investigate root cause
6. Plan proper fix

## 📊 Monitoring & Observability

### Key Metrics to Track

**Technical Health**
- API response times (p50, p95, p99)
- Error rates by endpoint
- Script load performance
- Database query times
- Memory usage trends

**Business Health**
- Daily active shops
- Popup conversion rates
- Revenue per shop
- Churn rate
- Feature adoption

**Customer Health**
- Page load impact
- Customer complaints
- Uninstall reasons
- Support ticket volume
- App store reviews

### Alerting Strategy

**Critical Alerts** (Wake someone up):
- Site down
- Payment processing failed
- Data breach detected
- >10% error rate

**Warning Alerts** (Check in morning):
- Performance degradation
- High resource usage
- Unusual traffic patterns
- Failed background jobs

**Info Alerts** (Weekly review):
- New shop onboarding
- Feature usage stats
- Revenue milestones
- System updates needed

## 🔧 Development Guidelines

### Code Quality Standards
- TypeScript for type safety
- 80% test coverage minimum
- No console.logs in production
- All functions documented
- Consistent code formatting

### Git Workflow
- Feature branches from main
- Meaningful commit messages
- Squash commits before merge
- No direct pushes to main
- Tag releases semantically

### Testing Requirements
- Unit tests for logic
- Integration tests for APIs
- E2E tests for critical paths
- Performance tests for scripts
- Security tests for endpoints

## 📚 Documentation Requirements

### What Must Be Documented
- API endpoint contracts
- Database schema changes
- Deployment procedures
- Troubleshooting guides
- Business logic decisions

### Documentation Standards
- Write for future you
- Include examples
- Explain the why
- Keep it updated
- Review quarterly

## 🎯 Success Criteria

### Technical Success
- 99.9% uptime
- <200ms API response time
- <50ms script execution
- Zero security incidents
- 5-minute deployment time

### Business Success
- 1000+ active shops
- 4.8+ star rating
- <5% monthly churn
- $50+ revenue per shop
- 20% month-over-month growth

## 🚦 Getting Started

### For New Developers
1. Read this entire document
2. Set up local environment
3. Run test suite
4. Deploy to preview
5. Make small PR first
6. Pair with senior dev
7. Review monitoring dashboards
8. Join on-call rotation

### Daily Workflow
1. Check Slack for issues
2. Review monitoring dashboards
3. Work on assigned tasks
4. Write tests for new code
5. Submit PR before lunch
6. Review others' PRs
7. Update documentation
8. Plan tomorrow's work

## ⚠️ Common Pitfalls to Avoid

### Technical Pitfalls
- Assuming Shopify API always works
- Forgetting about mobile users
- Ignoring performance impact
- Skipping error handling
- Not considering rate limits

### Business Pitfalls
- Building features nobody wants
- Ignoring customer feedback
- Over-engineering solutions
- Under-pricing the product
- Not tracking key metrics

### Process Pitfalls
- Deploying on Fridays
- Skipping code review
- Ignoring failing tests
- Not documenting decisions
- Working in isolation

## 📞 Getting Help

### When Stuck
1. Check documentation first
2. Search Slack history
3. Ask in #dev-help channel
4. Pair with teammate
5. Schedule architecture review
6. Escalate if blocked >2 hours

### Useful Resources
- Shopify Developer Docs
- Supabase Documentation
- Internal Wiki
- Architecture Decision Records
- Post-mortem Reports

## 🔄 Maintenance Tasks

### Daily
- Check error logs
- Review performance metrics
- Respond to urgent tickets
- Update status page

### Weekly
- Review analytics
- Clean up old data
- Update dependencies
- Team sync meeting

### Monthly
- Security audit
- Performance review
- Cost optimization
- Documentation update

### Quarterly
- Architecture review
- Dependency updates
- Disaster recovery test
- Team retrospective

---

**Remember**: This is a living document. Update it when you learn something new or when processes change. The goal is to make it easy for anyone to understand and contribute to SmartPop.

**Last Updated**: January 2024
**Version**: 1.0.0
**Status**: Active Development