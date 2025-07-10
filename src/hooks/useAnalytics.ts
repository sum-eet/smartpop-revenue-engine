import { useQuery } from '@tanstack/react-query';
import { supabaseApiClient } from '@/lib/shopify/session-token';
import { getShopDomain } from '@/lib/shopify/app-bridge';

interface AnalyticsData {
  totalEvents: number;
  views: number;
  conversions: number;
  closes: number;
  conversionRate: number;
  byPopup: any[];
}

interface ComprehensiveAnalyticsData {
  core_metrics: {
    total_popup_views: number;
    total_email_optins: number;
    optin_conversion_rate: number;
    abandonment_rate: number;
    total_abandonments: number;
    timeframe: string;
    last_updated: string;
  };
  daily_trend: any[];
  top_performing_popups: any[];
  device_analytics: any;
  peak_hours: any[];
  top_pages: any[];
  popup_type_performance: any[];
  engagement_metrics: any;
  recent_activity: any[];
  shop_domain: string;
  generated_at: string;
  total_events_analyzed: number;
}

const FALLBACK_SHOP_DOMAIN = 'testingstoresumeet.myshopify.com';

// Fetch basic analytics
const fetchBasicAnalytics = async (): Promise<AnalyticsData> => {
  const shopDomain = getShopDomain() || FALLBACK_SHOP_DOMAIN;
  const response = await supabaseApiClient.get(`/popup-track?shop=${shopDomain}`);
  
  if (!response.ok) {
    throw new Error('Failed to fetch basic analytics');
  }
  return response.json();
};

// Fetch comprehensive analytics
const fetchComprehensiveAnalytics = async (timeframe: string): Promise<ComprehensiveAnalyticsData> => {
  const shopDomain = getShopDomain() || FALLBACK_SHOP_DOMAIN;
  const response = await supabaseApiClient.get(`/popup-track?analytics=true&shop=${shopDomain}&timeframe=${timeframe}`);
  
  if (!response.ok) {
    throw new Error('Failed to fetch comprehensive analytics');
  }
  const data = await response.json();
  
  // Safeguard: Ensure conversions never exceed views
  const views = data.core_metrics?.total_popup_views || 0;
  const conversions = Math.min(
    data.core_metrics?.total_email_optins || 0,
    views // Conversions can't exceed views
  );
  
  // Apply safeguard to comprehensive analytics
  return {
    ...data,
    core_metrics: {
      ...data.core_metrics,
      total_email_optins: conversions,
      optin_conversion_rate: views > 0 ? (conversions / views * 100) : 0,
      abandonment_rate: views > 0 ? ((views - conversions) / views * 100) : 0
    }
  };
};

// Hook for basic analytics
export const useBasicAnalytics = () => {
  return useQuery({
    queryKey: ['basicAnalytics'],
    queryFn: fetchBasicAnalytics,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    retry: 3,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });
};

// Hook for comprehensive analytics
export const useComprehensiveAnalytics = (timeframe: string) => {
  return useQuery({
    queryKey: ['comprehensiveAnalytics', timeframe],
    queryFn: () => fetchComprehensiveAnalytics(timeframe),
    staleTime: 3 * 60 * 1000, // 3 minutes
    gcTime: 5 * 60 * 1000, // 5 minutes
    retry: 2,
    refetchOnWindowFocus: false,
    enabled: !!timeframe,
  });
};

// Export types
export type { AnalyticsData, ComprehensiveAnalyticsData };