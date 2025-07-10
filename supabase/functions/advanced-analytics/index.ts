import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { authenticateRequest, createErrorResponse, createSuccessResponse } from '../_shared/session-auth.ts'
import { 
  getCachedDashboardMetrics, 
  getCachedAnalytics, 
  getCachedAttributionData,
  warmupCache,
  ensureCacheTable
} from '../_shared/performance-cache.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
}

interface AnalyticsRequest {
  type: 'roi' | 'attribution' | 'cohort' | 'ab_test' | 'behavioral' | 'dashboard';
  timeframe?: '1d' | '7d' | '30d' | '90d' | 'all';
  popupId?: string;
  testId?: string;
  cohortType?: 'device_type' | 'traffic_source' | 'geographic' | 'time_based';
  filters?: Record<string, any>;
}

serve(async (req) => {
  const timestamp = new Date().toISOString()
  
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Authenticate request
    const auth = await authenticateRequest(req);
    
    if (!auth.isAuthenticated) {
      return createErrorResponse(auth.error || 'Authentication required', 401, corsHeaders);
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const supabase = createClient(supabaseUrl!, supabaseKey!);

    // Ensure cache table exists
    await ensureCacheTable(supabase);

    if (req.method === 'GET') {
      const url = new URL(req.url);
      const type = url.searchParams.get('type') as AnalyticsRequest['type'];
      const timeframe = (url.searchParams.get('timeframe') as AnalyticsRequest['timeframe']) || '30d';
      const popupId = url.searchParams.get('popupId');
      const testId = url.searchParams.get('testId');
      const cohortType = url.searchParams.get('cohortType') as AnalyticsRequest['cohortType'];

      console.log(`[${timestamp}] Advanced analytics request: ${type} for shop: ${auth.shop}`);

      // Calculate date filter
      const now = new Date();
      let dateFilter = new Date(0);
      
      if (timeframe === '1d') {
        dateFilter = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      } else if (timeframe === '7d') {
        dateFilter = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      } else if (timeframe === '30d') {
        dateFilter = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      } else if (timeframe === '90d') {
        dateFilter = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
      }

      switch (type) {
        case 'dashboard':
          return await generateDashboardAnalytics(supabase, auth.shop!, dateFilter, timestamp);
        
        case 'roi':
          return await generateROIAnalytics(supabase, auth.shop!, dateFilter, popupId, timestamp);
        
        case 'attribution':
          return await generateAttributionAnalytics(supabase, auth.shop!, dateFilter, timestamp);
        
        case 'cohort':
          return await generateCohortAnalytics(supabase, auth.shop!, dateFilter, cohortType || 'device_type', timestamp);
        
        case 'ab_test':
          return await generateABTestAnalytics(supabase, auth.shop!, testId, timestamp);
        
        case 'behavioral':
          return await generateBehavioralAnalytics(supabase, auth.shop!, dateFilter, timestamp);
        
        default:
          return createErrorResponse('Invalid analytics type', 400, corsHeaders);
      }
    }

    if (req.method === 'POST') {
      const requestData: AnalyticsRequest = await req.json();
      
      // Handle POST requests for triggering analytics calculations
      switch (requestData.type) {
        case 'roi':
          return await calculateROI(supabase, auth.shop!, requestData, timestamp);
        
        case 'cohort':
          return await calculateCohortAnalysis(supabase, auth.shop!, requestData, timestamp);
        
        default:
          return createErrorResponse('Invalid POST analytics type', 400, corsHeaders);
      }
    }

    return createErrorResponse('Method not allowed', 405, corsHeaders);

  } catch (error) {
    console.error(`[${timestamp}] Advanced analytics error:`, error);
    return createErrorResponse(`Analytics error: ${error.message}`, 500, corsHeaders);
  }
});

async function generateDashboardAnalytics(supabase: any, shop: string, dateFilter: Date, timestamp: string) {
  try {
    // Try to get from cache first
    const cachedMetrics = await getCachedDashboardMetrics(shop, supabase);
    
    if (cachedMetrics) {
      console.log(`[${timestamp}] Using cached dashboard metrics for ${shop}`);
      return createSuccessResponse(cachedMetrics, corsHeaders);
    }

    // Fallback to database queries with optimized aggregated tables
    const timeframeDays = Math.floor((Date.now() - dateFilter.getTime()) / (24 * 60 * 60 * 1000));
    const timeframe = timeframeDays <= 1 ? '1d' : timeframeDays <= 7 ? '7d' : timeframeDays <= 30 ? '30d' : '90d';
    
    const analyticsData = await getCachedAnalytics(shop, timeframe, supabase);

    if (!analyticsData) {
      // Final fallback to materialized view
      const { data: dashboardData, error } = await supabase
        .from('analytics_dashboard')
        .select('*')
        .eq('shop_domain', shop)
        .gte('date', dateFilter.toISOString())
        .order('date', { ascending: false });

      if (error) throw error;

    // Get real-time metrics
    const { data: realTimeData, error: realTimeError } = await supabase
      .from('real_time_metrics')
      .select('*')
      .eq('shop_domain', shop)
      .single();

    if (realTimeError) console.warn('Real-time metrics not available:', realTimeError);

    // Get top performing popups
    const { data: topPopups, error: popupError } = await supabase
      .from('popup_conversions')
      .select(`
        popup_id,
        COUNT(*) as conversions,
        SUM(revenue_amount) as total_revenue,
        AVG(time_to_conversion_seconds) as avg_time_to_conversion
      `)
      .eq('shop_domain', shop)
      .gte('converted_at', dateFilter.toISOString())
      .groupBy('popup_id')
      .order('conversions', { ascending: false })
      .limit(10);

    if (popupError) console.warn('Popup performance not available:', popupError);

    // Calculate summary metrics
    const totalVisitors = dashboardData?.reduce((sum, d) => sum + (d.unique_visitors || 0), 0) || 0;
    const totalRevenue = dashboardData?.reduce((sum, d) => sum + (d.total_revenue || 0), 0) || 0;
    const totalConversions = dashboardData?.reduce((sum, d) => sum + (d.email_conversions || 0), 0) || 0;
    const avgConversionRate = dashboardData?.reduce((sum, d) => sum + (d.email_conversion_rate || 0), 0) / (dashboardData?.length || 1) || 0;

    const response = {
      summary: {
        totalVisitors,
        totalRevenue,
        totalConversions,
        avgConversionRate: Math.round(avgConversionRate * 100) / 100,
        revenuePerVisitor: totalVisitors > 0 ? Math.round((totalRevenue / totalVisitors) * 100) / 100 : 0,
        timeframe: dateFilter.toISOString(),
        lastUpdated: timestamp
      },
      dailyTrend: dashboardData || [],
      realTimeMetrics: realTimeData || null,
      topPerformingPopups: topPopups || [],
      shop: shop,
      generatedAt: timestamp
    };

    return createSuccessResponse(response, corsHeaders);

  } catch (error) {
    console.error(`[${timestamp}] Dashboard analytics error:`, error);
    return createErrorResponse(`Dashboard analytics failed: ${error.message}`, 500, corsHeaders);
  }
}

async function generateROIAnalytics(supabase: any, shop: string, dateFilter: Date, popupId: string | null, timestamp: string) {
  try {
    // Get ROI calculations
    let query = supabase
      .from('roi_calculations')
      .select('*')
      .eq('shop_domain', shop)
      .gte('calculation_period_start', dateFilter.toISOString());

    if (popupId) {
      query = query.eq('popup_id', popupId);
    }

    const { data: roiData, error } = await query.order('created_at', { ascending: false });

    if (error) throw error;

    // If no ROI data exists, calculate it
    if (!roiData || roiData.length === 0) {
      await calculateROI(supabase, shop, { 
        type: 'roi', 
        timeframe: '30d', 
        popupId: popupId || undefined 
      }, timestamp);
      
      // Retry query
      const { data: newRoiData, error: retryError } = await query.order('created_at', { ascending: false });
      if (retryError) throw retryError;
      
      return createSuccessResponse({
        roiCalculations: newRoiData || [],
        summary: calculateROISummary(newRoiData || []),
        shop,
        generatedAt: timestamp
      }, corsHeaders);
    }

    return createSuccessResponse({
      roiCalculations: roiData,
      summary: calculateROISummary(roiData),
      shop,
      generatedAt: timestamp
    }, corsHeaders);

  } catch (error) {
    console.error(`[${timestamp}] ROI analytics error:`, error);
    return createErrorResponse(`ROI analytics failed: ${error.message}`, 500, corsHeaders);
  }
}

async function generateAttributionAnalytics(supabase: any, shop: string, dateFilter: Date, timestamp: string) {
  try {
    // Get attribution events
    const { data: attributionData, error } = await supabase
      .from('attribution_events')
      .select('*')
      .eq('shop_domain', shop)
      .gte('event_timestamp', dateFilter.toISOString())
      .order('event_timestamp', { ascending: false });

    if (error) throw error;

    // Get customer journeys
    const { data: journeyData, error: journeyError } = await supabase
      .from('customer_journeys')
      .select('*')
      .eq('shop_domain', shop)
      .gte('journey_start', dateFilter.toISOString());

    if (journeyError) throw journeyError;

    // Analyze attribution paths
    const attributionPaths = analyzeAttributionPaths(attributionData || []);
    const journeyInsights = analyzeCustomerJourneys(journeyData || []);

    return createSuccessResponse({
      attributionEvents: attributionData || [],
      customerJourneys: journeyData || [],
      attributionPaths,
      journeyInsights,
      shop,
      generatedAt: timestamp
    }, corsHeaders);

  } catch (error) {
    console.error(`[${timestamp}] Attribution analytics error:`, error);
    return createErrorResponse(`Attribution analytics failed: ${error.message}`, 500, corsHeaders);
  }
}

async function generateCohortAnalytics(supabase: any, shop: string, dateFilter: Date, cohortType: string, timestamp: string) {
  try {
    // Get cohort analysis data
    const { data: cohortData, error } = await supabase
      .from('cohort_analysis')
      .select('*')
      .eq('shop_domain', shop)
      .eq('cohort_type', cohortType)
      .gte('cohort_period', dateFilter.toISOString().split('T')[0])
      .order('cohort_period', { ascending: false });

    if (error) throw error;

    // If no cohort data exists, calculate it
    if (!cohortData || cohortData.length === 0) {
      await calculateCohortAnalysis(supabase, shop, { 
        type: 'cohort', 
        cohortType: cohortType as any,
        timeframe: '30d'
      }, timestamp);
      
      // Retry query
      const { data: newCohortData, error: retryError } = await supabase
        .from('cohort_analysis')
        .select('*')
        .eq('shop_domain', shop)
        .eq('cohort_type', cohortType)
        .gte('cohort_period', dateFilter.toISOString().split('T')[0])
        .order('cohort_period', { ascending: false });
      
      if (retryError) throw retryError;
      
      return createSuccessResponse({
        cohortAnalysis: newCohortData || [],
        cohortType,
        summary: calculateCohortSummary(newCohortData || []),
        shop,
        generatedAt: timestamp
      }, corsHeaders);
    }

    return createSuccessResponse({
      cohortAnalysis: cohortData,
      cohortType,
      summary: calculateCohortSummary(cohortData),
      shop,
      generatedAt: timestamp
    }, corsHeaders);

  } catch (error) {
    console.error(`[${timestamp}] Cohort analytics error:`, error);
    return createErrorResponse(`Cohort analytics failed: ${error.message}`, 500, corsHeaders);
  }
}

async function generateABTestAnalytics(supabase: any, shop: string, testId: string | null, timestamp: string) {
  try {
    let query = supabase
      .from('ab_test_results')
      .select('*')
      .eq('shop_domain', shop);

    if (testId) {
      query = query.eq('test_id', testId);
    }

    const { data: testData, error } = await query.order('created_at', { ascending: false });

    if (error) throw error;

    return createSuccessResponse({
      abTestResults: testData || [],
      summary: calculateABTestSummary(testData || []),
      shop,
      generatedAt: timestamp
    }, corsHeaders);

  } catch (error) {
    console.error(`[${timestamp}] A/B test analytics error:`, error);
    return createErrorResponse(`A/B test analytics failed: ${error.message}`, 500, corsHeaders);
  }
}

async function generateBehavioralAnalytics(supabase: any, shop: string, dateFilter: Date, timestamp: string) {
  try {
    // Get behavioral data
    const { data: behavioralData, error } = await supabase
      .from('behavioral_data')
      .select('*')
      .eq('shop_domain', shop)
      .gte('session_start', dateFilter.toISOString())
      .order('session_start', { ascending: false });

    if (error) throw error;

    // Analyze behavioral patterns
    const behavioralInsights = analyzeBehavioralPatterns(behavioralData || []);

    return createSuccessResponse({
      behavioralData: behavioralData || [],
      insights: behavioralInsights,
      shop,
      generatedAt: timestamp
    }, corsHeaders);

  } catch (error) {
    console.error(`[${timestamp}] Behavioral analytics error:`, error);
    return createErrorResponse(`Behavioral analytics failed: ${error.message}`, 500, corsHeaders);
  }
}

async function calculateROI(supabase: any, shop: string, request: AnalyticsRequest, timestamp: string) {
  try {
    // Get attribution events for ROI calculation
    const { data: attributionEvents, error } = await supabase
      .from('attribution_events')
      .select('*')
      .eq('shop_domain', shop)
      .gte('event_timestamp', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

    if (error) throw error;

    // Calculate ROI metrics
    const totalRevenue = attributionEvents
      ?.filter(e => e.event_type === 'purchase_made')
      .reduce((sum, e) => sum + (e.order_value || 0), 0) || 0;

    const totalVisitors = new Set(attributionEvents?.map(e => e.visitor_id) || []).size;
    const totalConversions = attributionEvents?.filter(e => e.event_type === 'email_submitted').length || 0;

    // Estimate costs (this would be more sophisticated in production)
    const estimatedCost = totalVisitors * 0.10; // $0.10 per visitor
    const roi = estimatedCost > 0 ? ((totalRevenue - estimatedCost) / estimatedCost) * 100 : 0;
    const roas = estimatedCost > 0 ? totalRevenue / estimatedCost : 0;

    const roiCalculation = {
      shop_domain: shop,
      popup_id: request.popupId || null,
      calculation_period_start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
      calculation_period_end: new Date().toISOString(),
      total_cost: estimatedCost,
      total_revenue: totalRevenue,
      attributed_revenue: totalRevenue,
      incremental_revenue: totalRevenue * 0.8, // Assume 80% is incremental
      roi_percentage: roi,
      roas: roas,
      cost_per_conversion: totalConversions > 0 ? estimatedCost / totalConversions : 0,
      revenue_per_visitor: totalVisitors > 0 ? totalRevenue / totalVisitors : 0,
      lift_over_baseline: 25, // Placeholder
      baseline_conversion_rate: 0.02, // 2% baseline
      actual_conversion_rate: totalVisitors > 0 ? totalConversions / totalVisitors : 0,
      metadata: {
        totalEvents: attributionEvents?.length || 0,
        calculationMethod: 'attribution_based'
      }
    };

    const { data: insertedROI, error: insertError } = await supabase
      .from('roi_calculations')
      .insert([roiCalculation])
      .select()
      .single();

    if (insertError) throw insertError;

    return createSuccessResponse({
      roiCalculation: insertedROI,
      message: 'ROI calculation completed successfully',
      generatedAt: timestamp
    }, corsHeaders);

  } catch (error) {
    console.error(`[${timestamp}] ROI calculation error:`, error);
    return createErrorResponse(`ROI calculation failed: ${error.message}`, 500, corsHeaders);
  }
}

async function calculateCohortAnalysis(supabase: any, shop: string, request: AnalyticsRequest, timestamp: string) {
  try {
    // Get attribution events for cohort analysis
    const { data: attributionEvents, error } = await supabase
      .from('attribution_events')
      .select('*')
      .eq('shop_domain', shop)
      .gte('event_timestamp', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

    if (error) throw error;

    // Group by cohort type
    const cohorts = groupByCohort(attributionEvents || [], request.cohortType || 'device_type');
    
    const cohortAnalysisData = [];
    for (const [cohortName, events] of Object.entries(cohorts)) {
      const visitors = new Set(events.map(e => e.visitor_id)).size;
      const conversions = events.filter(e => e.event_type === 'email_submitted').length;
      const revenue = events
        .filter(e => e.event_type === 'purchase_made')
        .reduce((sum, e) => sum + (e.order_value || 0), 0);

      const conversionRate = visitors > 0 ? (conversions / visitors) * 100 : 0;
      const revenuePerVisitor = visitors > 0 ? revenue / visitors : 0;

      cohortAnalysisData.push({
        shop_domain: shop,
        cohort_type: request.cohortType || 'device_type',
        cohort_name: cohortName,
        cohort_period: new Date().toISOString().split('T')[0],
        visitors,
        conversions,
        revenue,
        conversion_rate: conversionRate,
        revenue_per_visitor: revenuePerVisitor,
        confidence_interval_lower: Math.max(0, conversionRate - 5),
        confidence_interval_upper: Math.min(100, conversionRate + 5),
        is_significant: visitors >= 30 && conversions >= 5,
        metadata: {
          sampleSize: visitors,
          totalEvents: events.length
        }
      });
    }

    const { data: insertedCohorts, error: insertError } = await supabase
      .from('cohort_analysis')
      .insert(cohortAnalysisData)
      .select();

    if (insertError) throw insertError;

    return createSuccessResponse({
      cohortAnalysis: insertedCohorts,
      message: 'Cohort analysis completed successfully',
      generatedAt: timestamp
    }, corsHeaders);

  } catch (error) {
    console.error(`[${timestamp}] Cohort analysis error:`, error);
    return createErrorResponse(`Cohort analysis failed: ${error.message}`, 500, corsHeaders);
  }
}

// Helper functions
function calculateROISummary(roiData: any[]) {
  if (!roiData || roiData.length === 0) return null;
  
  const avgROI = roiData.reduce((sum, r) => sum + r.roi_percentage, 0) / roiData.length;
  const totalRevenue = roiData.reduce((sum, r) => sum + r.total_revenue, 0);
  const totalCost = roiData.reduce((sum, r) => sum + r.total_cost, 0);
  
  return {
    avgROI: Math.round(avgROI * 100) / 100,
    totalRevenue,
    totalCost,
    totalROI: totalCost > 0 ? ((totalRevenue - totalCost) / totalCost) * 100 : 0,
    bestPerformingPeriod: roiData.sort((a, b) => b.roi_percentage - a.roi_percentage)[0]
  };
}

function calculateCohortSummary(cohortData: any[]) {
  if (!cohortData || cohortData.length === 0) return null;
  
  const totalVisitors = cohortData.reduce((sum, c) => sum + c.visitors, 0);
  const totalConversions = cohortData.reduce((sum, c) => sum + c.conversions, 0);
  const avgConversionRate = cohortData.reduce((sum, c) => sum + c.conversion_rate, 0) / cohortData.length;
  
  return {
    totalCohorts: cohortData.length,
    totalVisitors,
    totalConversions,
    avgConversionRate: Math.round(avgConversionRate * 100) / 100,
    bestPerformingCohort: cohortData.sort((a, b) => b.conversion_rate - a.conversion_rate)[0]?.cohort_name,
    worstPerformingCohort: cohortData.sort((a, b) => a.conversion_rate - b.conversion_rate)[0]?.cohort_name
  };
}

function calculateABTestSummary(testData: any[]) {
  if (!testData || testData.length === 0) return null;
  
  const activeTests = testData.filter(t => t.test_status === 'running').length;
  const completedTests = testData.filter(t => t.test_status === 'completed').length;
  const significantTests = testData.filter(t => t.is_statistically_significant).length;
  
  return {
    totalTests: testData.length,
    activeTests,
    completedTests,
    significantTests,
    significanceRate: testData.length > 0 ? (significantTests / testData.length) * 100 : 0
  };
}

function analyzeAttributionPaths(attributionData: any[]) {
  const paths = {};
  
  // Group events by visitor
  const visitorPaths = {};
  for (const event of attributionData) {
    if (!visitorPaths[event.visitor_id]) {
      visitorPaths[event.visitor_id] = [];
    }
    visitorPaths[event.visitor_id].push(event);
  }
  
  // Analyze common paths
  for (const [visitorId, events] of Object.entries(visitorPaths)) {
    const eventTypes = (events as any[])
      .sort((a, b) => new Date(a.event_timestamp).getTime() - new Date(b.event_timestamp).getTime())
      .map(e => e.event_type);
    
    const pathKey = eventTypes.join(' → ');
    paths[pathKey] = (paths[pathKey] || 0) + 1;
  }
  
  return Object.entries(paths)
    .map(([path, count]) => ({ path, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);
}

function analyzeCustomerJourneys(journeyData: any[]) {
  const avgSessionsPerJourney = journeyData.reduce((sum, j) => sum + j.total_sessions, 0) / journeyData.length;
  const avgEventsPerJourney = journeyData.reduce((sum, j) => sum + j.total_events, 0) / journeyData.length;
  const conversionRate = journeyData.filter(j => j.first_purchase).length / journeyData.length;
  
  return {
    totalJourneys: journeyData.length,
    avgSessionsPerJourney: Math.round(avgSessionsPerJourney * 100) / 100,
    avgEventsPerJourney: Math.round(avgEventsPerJourney * 100) / 100,
    conversionRate: Math.round(conversionRate * 100 * 100) / 100,
    crossDeviceJourneys: journeyData.filter(j => j.device_types.length > 1).length
  };
}

function analyzeBehavioralPatterns(behavioralData: any[]) {
  const avgTimeOnSite = behavioralData.reduce((sum, b) => sum + b.time_on_site, 0) / behavioralData.length;
  const avgScrollDepth = behavioralData.reduce((sum, b) => sum + b.scroll_depth, 0) / behavioralData.length;
  const highEngagementRate = behavioralData.filter(b => b.engagement_level === 'high').length / behavioralData.length;
  
  return {
    totalSessions: behavioralData.length,
    avgTimeOnSite: Math.round(avgTimeOnSite / 1000), // Convert to seconds
    avgScrollDepth: Math.round(avgScrollDepth * 100) / 100,
    highEngagementRate: Math.round(highEngagementRate * 100 * 100) / 100,
    exitIntentRate: behavioralData.filter(b => b.exit_intent).length / behavioralData.length * 100
  };
}

function groupByCohort(events: any[], cohortType: string) {
  const cohorts = {};
  
  for (const event of events) {
    let cohortName = 'Unknown';
    
    switch (cohortType) {
      case 'device_type':
        cohortName = event.metadata?.deviceType || 'Unknown';
        break;
      case 'traffic_source':
        cohortName = event.metadata?.utmSource || 'Direct';
        break;
      case 'geographic':
        cohortName = event.metadata?.country || 'Unknown';
        break;
      case 'time_based':
        cohortName = new Date(event.event_timestamp).toISOString().split('T')[0];
        break;
    }
    
    if (!cohorts[cohortName]) {
      cohorts[cohortName] = [];
    }
    cohorts[cohortName].push(event);
  }
  
  return cohorts;
}