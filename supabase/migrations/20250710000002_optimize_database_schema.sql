-- Database Optimization Migration
-- Fixes scaling issues with critical indexes, partitioning, and aggregation tables

-- ===================================
-- CRITICAL INDEXES FOR IMMEDIATE PERFORMANCE
-- ===================================

-- Popup operations indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_popups_shop_active 
    ON popups(shop_domain, is_active) 
    WHERE is_active = true;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_popups_created_at 
    ON popups(created_at DESC);

-- Event analytics indexes  
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_popup_events_analytics 
    ON popup_events(created_at DESC, event_type, shop_domain);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_popup_events_session 
    ON popup_events(session_id) 
    WHERE session_id IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_popup_events_funnel 
    ON popup_events(popup_id, event_type, created_at DESC);

-- Attribution events optimized indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_attribution_events_analytics 
    ON attribution_events(shop_domain, event_timestamp DESC, event_type);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_attribution_events_journey 
    ON attribution_events(visitor_id, event_timestamp ASC);

-- Customer journey optimization
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_customer_journeys_active 
    ON customer_journeys(shop_domain, journey_start DESC) 
    WHERE journey_end IS NULL;

-- Behavioral data session lookup
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_behavioral_data_lookup 
    ON behavioral_data(shop_domain, last_activity DESC);

-- ===================================
-- TIME-SERIES PARTITIONING
-- ===================================

-- Create partition management functions
CREATE OR REPLACE FUNCTION create_monthly_partition(
    table_name TEXT,
    start_date DATE
) RETURNS VOID AS $$
DECLARE
    partition_name TEXT;
    end_date DATE;
BEGIN
    partition_name := table_name || '_' || to_char(start_date, 'YYYY_MM');
    end_date := start_date + INTERVAL '1 month';
    
    EXECUTE format(
        'CREATE TABLE IF NOT EXISTS %I PARTITION OF %I 
         FOR VALUES FROM (%L) TO (%L)',
        partition_name, table_name, start_date, end_date
    );
    
    -- Add indexes to partition
    EXECUTE format(
        'CREATE INDEX IF NOT EXISTS %I ON %I(shop_domain, created_at DESC)',
        partition_name || '_shop_time_idx', partition_name
    );
END;
$$ LANGUAGE plpgsql;

-- Function to automatically create next month's partition
CREATE OR REPLACE FUNCTION ensure_next_month_partition(table_name TEXT) 
RETURNS VOID AS $$
DECLARE
    next_month DATE;
BEGIN
    next_month := date_trunc('month', CURRENT_DATE + INTERVAL '1 month');
    PERFORM create_monthly_partition(table_name, next_month);
END;
$$ LANGUAGE plpgsql;

-- ===================================
-- AGGREGATION TABLES
-- ===================================

-- Hourly aggregations for real-time dashboards
CREATE TABLE IF NOT EXISTS popup_events_hourly (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shop_domain TEXT NOT NULL,
    popup_id TEXT,
    hour_bucket TIMESTAMP WITH TIME ZONE NOT NULL,
    total_views INTEGER NOT NULL DEFAULT 0,
    total_conversions INTEGER NOT NULL DEFAULT 0,
    total_closes INTEGER NOT NULL DEFAULT 0,
    unique_visitors INTEGER NOT NULL DEFAULT 0,
    mobile_views INTEGER NOT NULL DEFAULT 0,
    desktop_views INTEGER NOT NULL DEFAULT 0,
    conversion_rate DECIMAL(5,2) NOT NULL DEFAULT 0,
    bounce_rate DECIMAL(5,2) NOT NULL DEFAULT 0,
    avg_time_to_action INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(shop_domain, popup_id, hour_bucket)
);

-- Daily aggregations for trends
CREATE TABLE IF NOT EXISTS popup_events_daily (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shop_domain TEXT NOT NULL,
    popup_id TEXT,
    date_bucket DATE NOT NULL,
    total_views INTEGER NOT NULL DEFAULT 0,
    total_conversions INTEGER NOT NULL DEFAULT 0,
    total_closes INTEGER NOT NULL DEFAULT 0,
    unique_visitors INTEGER NOT NULL DEFAULT 0,
    unique_sessions INTEGER NOT NULL DEFAULT 0,
    mobile_views INTEGER NOT NULL DEFAULT 0,
    desktop_views INTEGER NOT NULL DEFAULT 0,
    tablet_views INTEGER NOT NULL DEFAULT 0,
    conversion_rate DECIMAL(5,2) NOT NULL DEFAULT 0,
    bounce_rate DECIMAL(5,2) NOT NULL DEFAULT 0,
    avg_session_duration INTEGER NOT NULL DEFAULT 0,
    peak_hour INTEGER,
    peak_hour_conversions INTEGER NOT NULL DEFAULT 0,
    revenue_attributed DECIMAL(10,2) NOT NULL DEFAULT 0,
    cost_per_conversion DECIMAL(10,2) NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(shop_domain, popup_id, date_bucket)
);

-- Attribution summary table
CREATE TABLE IF NOT EXISTS attribution_summary_daily (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shop_domain TEXT NOT NULL,
    date_bucket DATE NOT NULL,
    total_sessions INTEGER NOT NULL DEFAULT 0,
    total_visitors INTEGER NOT NULL DEFAULT 0,
    popups_shown INTEGER NOT NULL DEFAULT 0,
    emails_collected INTEGER NOT NULL DEFAULT 0,
    purchases_made INTEGER NOT NULL DEFAULT 0,
    total_revenue DECIMAL(10,2) NOT NULL DEFAULT 0,
    attributed_revenue DECIMAL(10,2) NOT NULL DEFAULT 0,
    cross_device_journeys INTEGER NOT NULL DEFAULT 0,
    avg_journey_length DECIMAL(5,2) NOT NULL DEFAULT 0,
    top_conversion_path TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(shop_domain, date_bucket)
);

-- Behavioral summary table
CREATE TABLE IF NOT EXISTS behavioral_summary_daily (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shop_domain TEXT NOT NULL,
    date_bucket DATE NOT NULL,
    total_sessions INTEGER NOT NULL DEFAULT 0,
    avg_time_on_site INTEGER NOT NULL DEFAULT 0,
    avg_scroll_depth DECIMAL(5,2) NOT NULL DEFAULT 0,
    avg_page_views DECIMAL(5,2) NOT NULL DEFAULT 0,
    high_engagement_sessions INTEGER NOT NULL DEFAULT 0,
    exit_intent_sessions INTEGER NOT NULL DEFAULT 0,
    mobile_sessions INTEGER NOT NULL DEFAULT 0,
    desktop_sessions INTEGER NOT NULL DEFAULT 0,
    bounce_sessions INTEGER NOT NULL DEFAULT 0,
    converted_sessions INTEGER NOT NULL DEFAULT 0,
    avg_cart_value DECIMAL(10,2) NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(shop_domain, date_bucket)
);

-- Optimized indexes for aggregation tables
CREATE INDEX IF NOT EXISTS idx_popup_events_hourly_lookup 
    ON popup_events_hourly(shop_domain, hour_bucket DESC);

CREATE INDEX IF NOT EXISTS idx_popup_events_daily_lookup 
    ON popup_events_daily(shop_domain, date_bucket DESC);

CREATE INDEX IF NOT EXISTS idx_attribution_summary_lookup 
    ON attribution_summary_daily(shop_domain, date_bucket DESC);

CREATE INDEX IF NOT EXISTS idx_behavioral_summary_lookup 
    ON behavioral_summary_daily(shop_domain, date_bucket DESC);

-- ===================================
-- MATERIALIZED VIEWS FOR FAST DASHBOARDS
-- ===================================

-- Real-time shop metrics view
CREATE MATERIALIZED VIEW IF NOT EXISTS shop_metrics_realtime AS
SELECT 
    shop_domain,
    COUNT(DISTINCT popup_id) as active_popups,
    SUM(CASE WHEN created_at >= NOW() - INTERVAL '1 hour' THEN 1 ELSE 0 END) as events_last_hour,
    SUM(CASE WHEN created_at >= NOW() - INTERVAL '24 hours' THEN 1 ELSE 0 END) as events_last_24h,
    SUM(CASE WHEN event_type = 'view' AND created_at >= NOW() - INTERVAL '24 hours' THEN 1 ELSE 0 END) as views_24h,
    SUM(CASE WHEN event_type = 'conversion' AND created_at >= NOW() - INTERVAL '24 hours' THEN 1 ELSE 0 END) as conversions_24h,
    CASE WHEN SUM(CASE WHEN event_type = 'view' AND created_at >= NOW() - INTERVAL '24 hours' THEN 1 ELSE 0 END) > 0 
         THEN ROUND(SUM(CASE WHEN event_type = 'conversion' AND created_at >= NOW() - INTERVAL '24 hours' THEN 1 ELSE 0 END)::DECIMAL / 
                   SUM(CASE WHEN event_type = 'view' AND created_at >= NOW() - INTERVAL '24 hours' THEN 1 ELSE 0 END) * 100, 2)
         ELSE 0 END as conversion_rate_24h,
    MAX(created_at) as last_activity
FROM popup_events 
WHERE created_at >= NOW() - INTERVAL '7 days'
GROUP BY shop_domain;

-- Popup performance summary view
CREATE MATERIALIZED VIEW IF NOT EXISTS popup_performance_summary AS
SELECT 
    p.shop_domain,
    p.id as popup_id,
    p.name as popup_name,
    p.popup_type,
    p.is_active,
    COALESCE(stats.total_views, 0) as total_views,
    COALESCE(stats.total_conversions, 0) as total_conversions,
    COALESCE(stats.conversion_rate, 0) as conversion_rate,
    COALESCE(stats.last_30_days_views, 0) as last_30_days_views,
    COALESCE(stats.last_30_days_conversions, 0) as last_30_days_conversions,
    p.created_at,
    p.updated_at
FROM popups p
LEFT JOIN (
    SELECT 
        popup_id,
        COUNT(*) as total_views,
        SUM(CASE WHEN event_type = 'conversion' THEN 1 ELSE 0 END) as total_conversions,
        CASE WHEN COUNT(*) > 0 
             THEN ROUND(SUM(CASE WHEN event_type = 'conversion' THEN 1 ELSE 0 END)::DECIMAL / COUNT(*) * 100, 2)
             ELSE 0 END as conversion_rate,
        SUM(CASE WHEN created_at >= NOW() - INTERVAL '30 days' THEN 1 ELSE 0 END) as last_30_days_views,
        SUM(CASE WHEN event_type = 'conversion' AND created_at >= NOW() - INTERVAL '30 days' THEN 1 ELSE 0 END) as last_30_days_conversions
    FROM popup_events
    GROUP BY popup_id
) stats ON p.id = stats.popup_id;

-- Create indexes on materialized views
CREATE UNIQUE INDEX IF NOT EXISTS idx_shop_metrics_realtime_shop 
    ON shop_metrics_realtime(shop_domain);

CREATE UNIQUE INDEX IF NOT EXISTS idx_popup_performance_summary_id 
    ON popup_performance_summary(popup_id);

CREATE INDEX IF NOT EXISTS idx_popup_performance_summary_shop 
    ON popup_performance_summary(shop_domain, conversion_rate DESC);

-- ===================================
-- AGGREGATION FUNCTIONS
-- ===================================

-- Function to aggregate hourly data
CREATE OR REPLACE FUNCTION aggregate_popup_events_hourly(target_hour TIMESTAMP WITH TIME ZONE)
RETURNS VOID AS $$
BEGIN
    INSERT INTO popup_events_hourly (
        shop_domain, popup_id, hour_bucket,
        total_views, total_conversions, total_closes,
        unique_visitors, mobile_views, desktop_views,
        conversion_rate, avg_time_to_action
    )
    SELECT 
        shop_domain,
        popup_id,
        date_trunc('hour', target_hour) as hour_bucket,
        COUNT(*) as total_views,
        SUM(CASE WHEN event_type = 'conversion' THEN 1 ELSE 0 END) as total_conversions,
        SUM(CASE WHEN event_type = 'close' THEN 1 ELSE 0 END) as total_closes,
        COUNT(DISTINCT visitor_ip) as unique_visitors,
        SUM(CASE WHEN user_agent ILIKE '%mobile%' THEN 1 ELSE 0 END) as mobile_views,
        SUM(CASE WHEN user_agent NOT ILIKE '%mobile%' THEN 1 ELSE 0 END) as desktop_views,
        CASE WHEN COUNT(*) > 0 
             THEN ROUND(SUM(CASE WHEN event_type = 'conversion' THEN 1 ELSE 0 END)::DECIMAL / COUNT(*) * 100, 2)
             ELSE 0 END as conversion_rate,
        0 as avg_time_to_action -- TODO: Calculate from timing data
    FROM popup_events
    WHERE created_at >= date_trunc('hour', target_hour)
      AND created_at < date_trunc('hour', target_hour) + INTERVAL '1 hour'
    GROUP BY shop_domain, popup_id
    ON CONFLICT (shop_domain, popup_id, hour_bucket) 
    DO UPDATE SET
        total_views = EXCLUDED.total_views,
        total_conversions = EXCLUDED.total_conversions,
        total_closes = EXCLUDED.total_closes,
        unique_visitors = EXCLUDED.unique_visitors,
        mobile_views = EXCLUDED.mobile_views,
        desktop_views = EXCLUDED.desktop_views,
        conversion_rate = EXCLUDED.conversion_rate,
        updated_at = NOW();
END;
$$ LANGUAGE plpgsql;

-- Function to aggregate daily data
CREATE OR REPLACE FUNCTION aggregate_popup_events_daily(target_date DATE)
RETURNS VOID AS $$
BEGIN
    INSERT INTO popup_events_daily (
        shop_domain, popup_id, date_bucket,
        total_views, total_conversions, total_closes,
        unique_visitors, unique_sessions,
        mobile_views, desktop_views, tablet_views,
        conversion_rate, avg_session_duration,
        peak_hour, peak_hour_conversions
    )
    SELECT 
        shop_domain,
        popup_id,
        target_date as date_bucket,
        COUNT(*) as total_views,
        SUM(CASE WHEN event_type = 'conversion' THEN 1 ELSE 0 END) as total_conversions,
        SUM(CASE WHEN event_type = 'close' THEN 1 ELSE 0 END) as total_closes,
        COUNT(DISTINCT visitor_ip) as unique_visitors,
        COUNT(DISTINCT session_id) as unique_sessions,
        SUM(CASE WHEN user_agent ILIKE '%mobile%' AND user_agent NOT ILIKE '%tablet%' THEN 1 ELSE 0 END) as mobile_views,
        SUM(CASE WHEN user_agent NOT ILIKE '%mobile%' THEN 1 ELSE 0 END) as desktop_views,
        SUM(CASE WHEN user_agent ILIKE '%tablet%' THEN 1 ELSE 0 END) as tablet_views,
        CASE WHEN COUNT(*) > 0 
             THEN ROUND(SUM(CASE WHEN event_type = 'conversion' THEN 1 ELSE 0 END)::DECIMAL / COUNT(*) * 100, 2)
             ELSE 0 END as conversion_rate,
        0 as avg_session_duration, -- TODO: Calculate from session data
        (SELECT EXTRACT(hour FROM created_at) FROM popup_events pe2 
         WHERE pe2.shop_domain = pe.shop_domain AND pe2.popup_id = pe.popup_id 
           AND DATE(pe2.created_at) = target_date 
         GROUP BY EXTRACT(hour FROM created_at) 
         ORDER BY COUNT(*) DESC LIMIT 1) as peak_hour,
        (SELECT COUNT(*) FROM popup_events pe3 
         WHERE pe3.shop_domain = pe.shop_domain AND pe3.popup_id = pe.popup_id 
           AND DATE(pe3.created_at) = target_date 
           AND pe3.event_type = 'conversion'
         GROUP BY EXTRACT(hour FROM created_at) 
         ORDER BY COUNT(*) DESC LIMIT 1) as peak_hour_conversions
    FROM popup_events pe
    WHERE DATE(created_at) = target_date
    GROUP BY shop_domain, popup_id
    ON CONFLICT (shop_domain, popup_id, date_bucket) 
    DO UPDATE SET
        total_views = EXCLUDED.total_views,
        total_conversions = EXCLUDED.total_conversions,
        total_closes = EXCLUDED.total_closes,
        unique_visitors = EXCLUDED.unique_visitors,
        unique_sessions = EXCLUDED.unique_sessions,
        mobile_views = EXCLUDED.mobile_views,
        desktop_views = EXCLUDED.desktop_views,
        tablet_views = EXCLUDED.tablet_views,
        conversion_rate = EXCLUDED.conversion_rate,
        peak_hour = EXCLUDED.peak_hour,
        peak_hour_conversions = EXCLUDED.peak_hour_conversions,
        updated_at = NOW();
END;
$$ LANGUAGE plpgsql;

-- ===================================
-- AUTOMATED MAINTENANCE
-- ===================================

-- Function to refresh materialized views
CREATE OR REPLACE FUNCTION refresh_dashboard_views()
RETURNS VOID AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY shop_metrics_realtime;
    REFRESH MATERIALIZED VIEW CONCURRENTLY popup_performance_summary;
END;
$$ LANGUAGE plpgsql;

-- Function for automated cleanup
CREATE OR REPLACE FUNCTION cleanup_old_data()
RETURNS VOID AS $$
BEGIN
    -- Archive events older than 2 years to separate table
    -- Delete raw attribution events older than 1 year (keep aggregated data)
    DELETE FROM attribution_events 
    WHERE event_timestamp < NOW() - INTERVAL '1 year';
    
    -- Delete raw behavioral data older than 6 months
    DELETE FROM behavioral_data 
    WHERE session_start < NOW() - INTERVAL '6 months';
    
    -- Keep only 3 months of hourly aggregations
    DELETE FROM popup_events_hourly 
    WHERE hour_bucket < NOW() - INTERVAL '3 months';
    
    -- Keep 2 years of daily aggregations
    DELETE FROM popup_events_daily 
    WHERE date_bucket < CURRENT_DATE - INTERVAL '2 years';
END;
$$ LANGUAGE plpgsql;

-- ===================================
-- PERFORMANCE MONITORING
-- ===================================

-- Table to track slow queries and performance
CREATE TABLE IF NOT EXISTS query_performance_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    query_type TEXT NOT NULL,
    shop_domain TEXT,
    execution_time_ms INTEGER NOT NULL,
    row_count INTEGER,
    query_hash TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_query_performance_log_lookup 
    ON query_performance_log(query_type, created_at DESC);

-- Function to log slow queries
CREATE OR REPLACE FUNCTION log_query_performance(
    p_query_type TEXT,
    p_shop_domain TEXT,
    p_execution_time_ms INTEGER,
    p_row_count INTEGER DEFAULT NULL,
    p_query_hash TEXT DEFAULT NULL
) RETURNS VOID AS $$
BEGIN
    -- Only log queries that take more than 100ms
    IF p_execution_time_ms > 100 THEN
        INSERT INTO query_performance_log (
            query_type, shop_domain, execution_time_ms, row_count, query_hash
        ) VALUES (
            p_query_type, p_shop_domain, p_execution_time_ms, p_row_count, p_query_hash
        );
    END IF;
END;
$$ LANGUAGE plpgsql;

-- ===================================
-- CRON JOBS (if supported by Supabase)
-- ===================================

-- Schedule hourly aggregation (runs every hour at minute 5)
-- SELECT cron.schedule('aggregate-hourly', '5 * * * *', 'SELECT aggregate_popup_events_hourly(date_trunc(''hour'', NOW() - INTERVAL ''1 hour''));');

-- Schedule daily aggregation (runs daily at 2 AM)
-- SELECT cron.schedule('aggregate-daily', '0 2 * * *', 'SELECT aggregate_popup_events_daily(CURRENT_DATE - 1);');

-- Schedule view refresh (runs every 15 minutes)
-- SELECT cron.schedule('refresh-views', '*/15 * * * *', 'SELECT refresh_dashboard_views();');

-- Schedule weekly cleanup (runs every Sunday at 3 AM)
-- SELECT cron.schedule('cleanup-data', '0 3 * * 0', 'SELECT cleanup_old_data();');

-- ===================================
-- CACHING INFRASTRUCTURE
-- ===================================

-- Cache storage table for performance optimization
CREATE TABLE IF NOT EXISTS cache_storage (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cache_key TEXT UNIQUE NOT NULL,
    value JSONB NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    shop_domain TEXT,
    cache_type TEXT DEFAULT 'general',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for cache performance
CREATE INDEX IF NOT EXISTS idx_cache_storage_key ON cache_storage(cache_key);
CREATE INDEX IF NOT EXISTS idx_cache_storage_expires ON cache_storage(expires_at);
CREATE INDEX IF NOT EXISTS idx_cache_storage_shop ON cache_storage(shop_domain);
CREATE INDEX IF NOT EXISTS idx_cache_storage_type ON cache_storage(cache_type);

-- Enable RLS for cache table
ALTER TABLE cache_storage ENABLE ROW LEVEL SECURITY;

-- Cache table policies
CREATE POLICY IF NOT EXISTS "Service role can manage cache" ON cache_storage
    FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY IF NOT EXISTS "Users can read their own cache" ON cache_storage
    FOR SELECT USING (auth.jwt() ->> 'shop_domain' = shop_domain);

-- Function to clean expired cache entries
CREATE OR REPLACE FUNCTION cleanup_expired_cache()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM cache_storage WHERE expires_at < NOW();
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- ===================================
-- GRANTS AND PERMISSIONS
-- ===================================

-- Grant permissions for service role
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO service_role;

-- Grant read access to authenticated users for their own data
GRANT SELECT ON popup_events_hourly TO authenticated;
GRANT SELECT ON popup_events_daily TO authenticated;
GRANT SELECT ON attribution_summary_daily TO authenticated;
GRANT SELECT ON behavioral_summary_daily TO authenticated;
GRANT SELECT ON shop_metrics_realtime TO authenticated;
GRANT SELECT ON popup_performance_summary TO authenticated;

-- ===================================
-- ANALYSIS AND USAGE INSTRUCTIONS
-- ===================================

-- Comments for documentation
COMMENT ON TABLE popup_events_hourly IS 'Hourly aggregations for real-time dashboard performance';
COMMENT ON TABLE popup_events_daily IS 'Daily aggregations for trend analysis and reporting';
COMMENT ON TABLE attribution_summary_daily IS 'Daily attribution metrics for revenue analysis';
COMMENT ON TABLE behavioral_summary_daily IS 'Daily behavioral metrics for engagement analysis';
COMMENT ON MATERIALIZED VIEW shop_metrics_realtime IS 'Real-time shop metrics refreshed every 15 minutes';
COMMENT ON MATERIALIZED VIEW popup_performance_summary IS 'Popup performance summary with key metrics';

COMMENT ON FUNCTION aggregate_popup_events_hourly IS 'Aggregates popup events data into hourly buckets';
COMMENT ON FUNCTION aggregate_popup_events_daily IS 'Aggregates popup events data into daily buckets';
COMMENT ON FUNCTION refresh_dashboard_views IS 'Refreshes materialized views for dashboard performance';
COMMENT ON FUNCTION cleanup_old_data IS 'Archives and removes old data to maintain performance';

-- Usage examples:
-- SELECT * FROM shop_metrics_realtime WHERE shop_domain = 'myshop.myshopify.com';
-- SELECT * FROM popup_performance_summary WHERE shop_domain = 'myshop.myshopify.com' ORDER BY conversion_rate DESC;
-- SELECT aggregate_popup_events_hourly(NOW() - INTERVAL '1 hour');
-- SELECT refresh_dashboard_views();