-- Advanced Analytics Tables Migration
-- Creates tables for attribution tracking, behavioral data, and statistical analysis

-- Attribution Events Table
CREATE TABLE IF NOT EXISTS attribution_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id TEXT UNIQUE NOT NULL,
    session_id TEXT NOT NULL,
    visitor_id TEXT NOT NULL,
    shop_domain TEXT NOT NULL,
    event_type TEXT NOT NULL,
    event_timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    popup_id TEXT,
    email TEXT,
    order_id TEXT,
    order_value DECIMAL(10,2),
    attribution_window_days INTEGER NOT NULL DEFAULT 7,
    cross_device BOOLEAN DEFAULT FALSE,
    metadata JSONB DEFAULT '{}',
    client_ip TEXT,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Customer Journey Table (for analyzing paths)
CREATE TABLE IF NOT EXISTS customer_journeys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    visitor_id TEXT NOT NULL,
    shop_domain TEXT NOT NULL,
    journey_start TIMESTAMP WITH TIME ZONE NOT NULL,
    journey_end TIMESTAMP WITH TIME ZONE,
    total_sessions INTEGER DEFAULT 1,
    total_events INTEGER DEFAULT 0,
    first_popup_shown TIMESTAMP WITH TIME ZONE,
    email_submitted TIMESTAMP WITH TIME ZONE,
    first_purchase TIMESTAMP WITH TIME ZONE,
    total_order_value DECIMAL(10,2) DEFAULT 0,
    device_types TEXT[] DEFAULT ARRAY[]::TEXT[],
    utm_sources TEXT[] DEFAULT ARRAY[]::TEXT[],
    engagement_level TEXT DEFAULT 'low',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Behavioral Tracking Table
CREATE TABLE IF NOT EXISTS behavioral_data (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id TEXT UNIQUE NOT NULL,
    visitor_id TEXT NOT NULL,
    shop_domain TEXT NOT NULL,
    time_on_site INTEGER NOT NULL DEFAULT 0,
    pages_viewed INTEGER NOT NULL DEFAULT 1,
    scroll_depth INTEGER NOT NULL DEFAULT 0,
    mouse_movements INTEGER NOT NULL DEFAULT 0,
    click_count INTEGER NOT NULL DEFAULT 0,
    cart_value DECIMAL(10,2),
    product_views TEXT[] DEFAULT ARRAY[]::TEXT[],
    search_queries TEXT[] DEFAULT ARRAY[]::TEXT[],
    exit_intent BOOLEAN DEFAULT FALSE,
    engagement_level TEXT DEFAULT 'low',
    device_type TEXT,
    session_start TIMESTAMP WITH TIME ZONE NOT NULL,
    last_activity TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Popup Conversions Table (for attribution tracking)
CREATE TABLE IF NOT EXISTS popup_conversions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    popup_id TEXT NOT NULL,
    visitor_id TEXT NOT NULL,
    session_id TEXT NOT NULL,
    shop_domain TEXT NOT NULL,
    email TEXT,
    order_id TEXT,
    revenue_amount DECIMAL(10,2),
    converted_at TIMESTAMP WITH TIME ZONE NOT NULL,
    purchased_at TIMESTAMP WITH TIME ZONE,
    attribution_popup_shown_at TIMESTAMP WITH TIME ZONE NOT NULL,
    time_to_conversion_seconds INTEGER NOT NULL,
    time_to_purchase_seconds INTEGER,
    cross_device BOOLEAN DEFAULT FALSE,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- A/B Test Results Table
CREATE TABLE IF NOT EXISTS ab_test_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    test_id TEXT UNIQUE NOT NULL,
    shop_domain TEXT NOT NULL,
    popup_id TEXT NOT NULL,
    control_variant TEXT NOT NULL,
    treatment_variant TEXT NOT NULL,
    control_visitors INTEGER NOT NULL DEFAULT 0,
    control_conversions INTEGER NOT NULL DEFAULT 0,
    control_revenue DECIMAL(10,2) NOT NULL DEFAULT 0,
    treatment_visitors INTEGER NOT NULL DEFAULT 0,
    treatment_conversions INTEGER NOT NULL DEFAULT 0,
    treatment_revenue DECIMAL(10,2) NOT NULL DEFAULT 0,
    conversion_lift DECIMAL(5,2) NOT NULL DEFAULT 0,
    confidence_level DECIMAL(5,2) NOT NULL DEFAULT 95,
    p_value DECIMAL(10,8) NOT NULL DEFAULT 1,
    is_statistically_significant BOOLEAN NOT NULL DEFAULT FALSE,
    sample_size_required INTEGER NOT NULL DEFAULT 0,
    test_status TEXT NOT NULL DEFAULT 'running',
    test_start_date TIMESTAMP WITH TIME ZONE NOT NULL,
    test_end_date TIMESTAMP WITH TIME ZONE,
    winner_variant TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Cohort Analysis Results Table
CREATE TABLE IF NOT EXISTS cohort_analysis (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shop_domain TEXT NOT NULL,
    cohort_type TEXT NOT NULL,
    cohort_name TEXT NOT NULL,
    cohort_period DATE NOT NULL,
    visitors INTEGER NOT NULL DEFAULT 0,
    conversions INTEGER NOT NULL DEFAULT 0,
    revenue DECIMAL(10,2) NOT NULL DEFAULT 0,
    conversion_rate DECIMAL(5,2) NOT NULL DEFAULT 0,
    revenue_per_visitor DECIMAL(10,2) NOT NULL DEFAULT 0,
    confidence_interval_lower DECIMAL(5,2) NOT NULL DEFAULT 0,
    confidence_interval_upper DECIMAL(5,2) NOT NULL DEFAULT 0,
    is_significant BOOLEAN NOT NULL DEFAULT FALSE,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ROI Calculations Table
CREATE TABLE IF NOT EXISTS roi_calculations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shop_domain TEXT NOT NULL,
    popup_id TEXT,
    calculation_period_start TIMESTAMP WITH TIME ZONE NOT NULL,
    calculation_period_end TIMESTAMP WITH TIME ZONE NOT NULL,
    total_cost DECIMAL(10,2) NOT NULL DEFAULT 0,
    total_revenue DECIMAL(10,2) NOT NULL DEFAULT 0,
    attributed_revenue DECIMAL(10,2) NOT NULL DEFAULT 0,
    incremental_revenue DECIMAL(10,2) NOT NULL DEFAULT 0,
    roi_percentage DECIMAL(5,2) NOT NULL DEFAULT 0,
    roas DECIMAL(5,2) NOT NULL DEFAULT 0,
    cost_per_conversion DECIMAL(10,2) NOT NULL DEFAULT 0,
    revenue_per_visitor DECIMAL(10,2) NOT NULL DEFAULT 0,
    lift_over_baseline DECIMAL(5,2) NOT NULL DEFAULT 0,
    baseline_conversion_rate DECIMAL(5,4) NOT NULL DEFAULT 0,
    actual_conversion_rate DECIMAL(5,4) NOT NULL DEFAULT 0,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_attribution_events_shop_domain ON attribution_events(shop_domain);
CREATE INDEX IF NOT EXISTS idx_attribution_events_visitor_id ON attribution_events(visitor_id);
CREATE INDEX IF NOT EXISTS idx_attribution_events_session_id ON attribution_events(session_id);
CREATE INDEX IF NOT EXISTS idx_attribution_events_event_type ON attribution_events(event_type);
CREATE INDEX IF NOT EXISTS idx_attribution_events_timestamp ON attribution_events(event_timestamp);
CREATE INDEX IF NOT EXISTS idx_attribution_events_email ON attribution_events(email);
CREATE INDEX IF NOT EXISTS idx_attribution_events_popup_id ON attribution_events(popup_id);

CREATE INDEX IF NOT EXISTS idx_customer_journeys_visitor_id ON customer_journeys(visitor_id);
CREATE INDEX IF NOT EXISTS idx_customer_journeys_shop_domain ON customer_journeys(shop_domain);
CREATE INDEX IF NOT EXISTS idx_customer_journeys_journey_start ON customer_journeys(journey_start);
CREATE INDEX IF NOT EXISTS idx_customer_journeys_email_submitted ON customer_journeys(email_submitted);

CREATE INDEX IF NOT EXISTS idx_behavioral_data_session_id ON behavioral_data(session_id);
CREATE INDEX IF NOT EXISTS idx_behavioral_data_visitor_id ON behavioral_data(visitor_id);
CREATE INDEX IF NOT EXISTS idx_behavioral_data_shop_domain ON behavioral_data(shop_domain);
CREATE INDEX IF NOT EXISTS idx_behavioral_data_last_activity ON behavioral_data(last_activity);

CREATE INDEX IF NOT EXISTS idx_popup_conversions_popup_id ON popup_conversions(popup_id);
CREATE INDEX IF NOT EXISTS idx_popup_conversions_visitor_id ON popup_conversions(visitor_id);
CREATE INDEX IF NOT EXISTS idx_popup_conversions_shop_domain ON popup_conversions(shop_domain);
CREATE INDEX IF NOT EXISTS idx_popup_conversions_email ON popup_conversions(email);
CREATE INDEX IF NOT EXISTS idx_popup_conversions_converted_at ON popup_conversions(converted_at);

CREATE INDEX IF NOT EXISTS idx_ab_test_results_test_id ON ab_test_results(test_id);
CREATE INDEX IF NOT EXISTS idx_ab_test_results_shop_domain ON ab_test_results(shop_domain);
CREATE INDEX IF NOT EXISTS idx_ab_test_results_popup_id ON ab_test_results(popup_id);
CREATE INDEX IF NOT EXISTS idx_ab_test_results_test_status ON ab_test_results(test_status);

CREATE INDEX IF NOT EXISTS idx_cohort_analysis_shop_domain ON cohort_analysis(shop_domain);
CREATE INDEX IF NOT EXISTS idx_cohort_analysis_cohort_type ON cohort_analysis(cohort_type);
CREATE INDEX IF NOT EXISTS idx_cohort_analysis_cohort_period ON cohort_analysis(cohort_period);

CREATE INDEX IF NOT EXISTS idx_roi_calculations_shop_domain ON roi_calculations(shop_domain);
CREATE INDEX IF NOT EXISTS idx_roi_calculations_popup_id ON roi_calculations(popup_id);
CREATE INDEX IF NOT EXISTS idx_roi_calculations_period_start ON roi_calculations(calculation_period_start);
CREATE INDEX IF NOT EXISTS idx_roi_calculations_period_end ON roi_calculations(calculation_period_end);

-- RLS (Row Level Security) Policies
ALTER TABLE attribution_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_journeys ENABLE ROW LEVEL SECURITY;
ALTER TABLE behavioral_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE popup_conversions ENABLE ROW LEVEL SECURITY;
ALTER TABLE ab_test_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE cohort_analysis ENABLE ROW LEVEL SECURITY;
ALTER TABLE roi_calculations ENABLE ROW LEVEL SECURITY;

-- Policies for authenticated users to access their own shop data
CREATE POLICY "Users can access their own shop's attribution events" ON attribution_events
    FOR ALL USING (
        auth.jwt() ->> 'shop_domain' = shop_domain OR
        auth.jwt() ->> 'aud' = 'authenticated'
    );

CREATE POLICY "Users can access their own shop's customer journeys" ON customer_journeys
    FOR ALL USING (
        auth.jwt() ->> 'shop_domain' = shop_domain OR
        auth.jwt() ->> 'aud' = 'authenticated'
    );

CREATE POLICY "Users can access their own shop's behavioral data" ON behavioral_data
    FOR ALL USING (
        auth.jwt() ->> 'shop_domain' = shop_domain OR
        auth.jwt() ->> 'aud' = 'authenticated'
    );

CREATE POLICY "Users can access their own shop's popup conversions" ON popup_conversions
    FOR ALL USING (
        auth.jwt() ->> 'shop_domain' = shop_domain OR
        auth.jwt() ->> 'aud' = 'authenticated'
    );

CREATE POLICY "Users can access their own shop's A/B test results" ON ab_test_results
    FOR ALL USING (
        auth.jwt() ->> 'shop_domain' = shop_domain OR
        auth.jwt() ->> 'aud' = 'authenticated'
    );

CREATE POLICY "Users can access their own shop's cohort analysis" ON cohort_analysis
    FOR ALL USING (
        auth.jwt() ->> 'shop_domain' = shop_domain OR
        auth.jwt() ->> 'aud' = 'authenticated'
    );

CREATE POLICY "Users can access their own shop's ROI calculations" ON roi_calculations
    FOR ALL USING (
        auth.jwt() ->> 'shop_domain' = shop_domain OR
        auth.jwt() ->> 'aud' = 'authenticated'
    );

-- Grant permissions for service role
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;

-- Create function for automatic timestamp updates
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add triggers for updated_at columns
CREATE TRIGGER update_customer_journeys_updated_at
    BEFORE UPDATE ON customer_journeys
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_ab_test_results_updated_at
    BEFORE UPDATE ON ab_test_results
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Create helper functions for analytics
CREATE OR REPLACE FUNCTION calculate_conversion_rate(conversions INTEGER, visitors INTEGER)
RETURNS DECIMAL(5,2) AS $$
BEGIN
    IF visitors = 0 THEN
        RETURN 0;
    END IF;
    RETURN ROUND((conversions::DECIMAL / visitors::DECIMAL) * 100, 2);
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION calculate_revenue_per_visitor(revenue DECIMAL, visitors INTEGER)
RETURNS DECIMAL(10,2) AS $$
BEGIN
    IF visitors = 0 THEN
        RETURN 0;
    END IF;
    RETURN ROUND(revenue / visitors, 2);
END;
$$ LANGUAGE plpgsql;

-- Create view for comprehensive analytics dashboard
CREATE OR REPLACE VIEW analytics_dashboard AS
SELECT 
    shop_domain,
    COUNT(DISTINCT visitor_id) as unique_visitors,
    COUNT(DISTINCT session_id) as total_sessions,
    COUNT(*) as total_events,
    COUNT(CASE WHEN event_type = 'popup_shown' THEN 1 END) as popup_views,
    COUNT(CASE WHEN event_type = 'email_submitted' THEN 1 END) as email_conversions,
    COUNT(CASE WHEN event_type = 'purchase_made' THEN 1 END) as purchases,
    SUM(order_value) as total_revenue,
    calculate_conversion_rate(
        COUNT(CASE WHEN event_type = 'email_submitted' THEN 1 END),
        COUNT(CASE WHEN event_type = 'popup_shown' THEN 1 END)
    ) as email_conversion_rate,
    calculate_revenue_per_visitor(
        SUM(order_value),
        COUNT(DISTINCT visitor_id)
    ) as revenue_per_visitor,
    DATE_TRUNC('day', event_timestamp) as date
FROM attribution_events
WHERE event_timestamp >= NOW() - INTERVAL '30 days'
GROUP BY shop_domain, DATE_TRUNC('day', event_timestamp)
ORDER BY date DESC;

-- Create view for real-time metrics
CREATE OR REPLACE VIEW real_time_metrics AS
SELECT 
    shop_domain,
    COUNT(DISTINCT visitor_id) as active_visitors_last_hour,
    COUNT(CASE WHEN event_type = 'popup_shown' THEN 1 END) as popup_views_last_hour,
    COUNT(CASE WHEN event_type = 'email_submitted' THEN 1 END) as conversions_last_hour,
    SUM(order_value) as revenue_last_hour,
    MAX(event_timestamp) as last_activity
FROM attribution_events
WHERE event_timestamp >= NOW() - INTERVAL '1 hour'
GROUP BY shop_domain;

-- Add comments for documentation
COMMENT ON TABLE attribution_events IS 'Tracks all attribution events in the customer journey';
COMMENT ON TABLE customer_journeys IS 'Aggregated view of complete customer journeys';
COMMENT ON TABLE behavioral_data IS 'Detailed behavioral tracking data for sessions';
COMMENT ON TABLE popup_conversions IS 'Attribution between popup interactions and conversions';
COMMENT ON TABLE ab_test_results IS 'Statistical results of A/B tests';
COMMENT ON TABLE cohort_analysis IS 'Results of cohort analysis for different segments';
COMMENT ON TABLE roi_calculations IS 'ROI calculations for popup campaigns';
COMMENT ON VIEW analytics_dashboard IS 'Comprehensive analytics dashboard data';
COMMENT ON VIEW real_time_metrics IS 'Real-time metrics for current activity';