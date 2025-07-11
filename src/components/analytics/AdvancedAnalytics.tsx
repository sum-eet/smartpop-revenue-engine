import React, { useState, useEffect } from 'react';
import { Card, Layout, Text, Button, Badge, Tabs, Select, Page, Banner, SkeletonBodyText } from '@shopify/polaris';
import { ROIAnalytics } from './ROIAnalytics';
import { AttributionAnalytics } from './AttributionAnalytics';
import { CohortAnalytics } from './CohortAnalytics';
import { ABTestAnalytics } from './ABTestAnalytics';
import { BehavioralAnalytics } from './BehavioralAnalytics';
import { StatisticalInsights } from './StatisticalInsights';

interface AdvancedAnalyticsProps {
  shop: string;
  authToken?: string;
  isEmbedded?: boolean;
}

export function AdvancedAnalytics({ shop, authToken, isEmbedded = false }: AdvancedAnalyticsProps) {
  const [selectedTab, setSelectedTab] = useState(0);
  const [timeframe, setTimeframe] = useState('30d');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dashboardData, setDashboardData] = useState<any>(null);

  const tabs = [
    { id: 'dashboard', content: 'Overview', panelID: 'dashboard-panel' },
    { id: 'roi', content: 'ROI Analysis', panelID: 'roi-panel' },
    { id: 'attribution', content: 'Attribution', panelID: 'attribution-panel' },
    { id: 'cohorts', content: 'Cohort Analysis', panelID: 'cohorts-panel' },
    { id: 'abtests', content: 'A/B Tests', panelID: 'abtests-panel' },
    { id: 'behavioral', content: 'Behavioral', panelID: 'behavioral-panel' },
    { id: 'insights', content: 'Insights', panelID: 'insights-panel' },
  ];

  const timeframeOptions = [
    { label: 'Last 24 hours', value: '1d' },
    { label: 'Last 7 days', value: '7d' },
    { label: 'Last 30 days', value: '30d' },
    { label: 'Last 90 days', value: '90d' },
    { label: 'All time', value: 'all' },
  ];

  useEffect(() => {
    loadDashboardData();
  }, [timeframe, shop]);

  const loadDashboardData = async () => {
    if (!shop) return;
    
    setLoading(true);
    setError(null);

    try {
      const baseUrl = import.meta.env.VITE_SUPABASE_URL?.replace('/rest/v1', '') || '';
      const response = await fetch(
        `${baseUrl}/functions/v1/advanced-analytics?type=dashboard&timeframe=${timeframe}`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${authToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Analytics request failed: ${response.status}`);
      }

      const data = await response.json();
      setDashboardData(data);
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load analytics data');
    } finally {
      setLoading(false);
    }
  };

  const renderTabContent = () => {
    const currentTab = tabs[selectedTab];

    switch (currentTab.id) {
      case 'dashboard':
        return <DashboardOverview data={dashboardData} loading={loading} timeframe={timeframe} />;
      case 'roi':
        return <ROIAnalytics shop={shop} authToken={authToken} timeframe={timeframe} />;
      case 'attribution':
        return <AttributionAnalytics shop={shop} authToken={authToken} timeframe={timeframe} />;
      case 'cohorts':
        return <CohortAnalytics shop={shop} authToken={authToken} timeframe={timeframe} />;
      case 'abtests':
        return <ABTestAnalytics shop={shop} authToken={authToken} timeframe={timeframe} />;
      case 'behavioral':
        return <BehavioralAnalytics shop={shop} authToken={authToken} timeframe={timeframe} />;
      case 'insights':
        return <StatisticalInsights shop={shop} authToken={authToken} timeframe={timeframe} />;
      default:
        return <Text as="p">Select a tab to view analytics</Text>;
    }
  };

  return (
    <Page 
      title="Advanced Analytics" 
      subtitle="Comprehensive analytics with attribution tracking, ROI analysis, and statistical insights"
    >
      {error && (
        <Layout.Section>
          <Banner tone="critical" title="Analytics Error">
            <p>{error}</p>
            <Button onClick={loadDashboardData}>Retry</Button>
          </Banner>
        </Layout.Section>
      )}

      <Layout>
        <Layout.Section>
          <Card>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <Text variant="headingMd" as="h2">Analytics Dashboard</Text>
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                <Text as="span">Time period:</Text>
                <div style={{ minWidth: '150px' }}>
                  <Select
                    label="Time period"
                    options={timeframeOptions}
                    value={timeframe}
                    onChange={setTimeframe}
                  />
                </div>
                <Button onClick={loadDashboardData} loading={loading}>
                  Refresh
                </Button>
              </div>
            </div>

            <Tabs tabs={tabs} selected={selectedTab} onSelect={setSelectedTab}>
              <div style={{ marginTop: '20px' }}>
                {renderTabContent()}
              </div>
            </Tabs>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}

interface DashboardOverviewProps {
  data: any;
  loading: boolean;
  timeframe: string;
}

function DashboardOverview({ data, loading, timeframe }: DashboardOverviewProps) {
  if (loading) {
    return (
      <Layout>
        <Layout.Section variant="oneHalf">
          <Card>
            <SkeletonBodyText lines={3} />
          </Card>
        </Layout.Section>
        <Layout.Section variant="oneHalf">
          <Card>
            <SkeletonBodyText lines={3} />
          </Card>
        </Layout.Section>
      </Layout>
    );
  }

  if (!data) {
    return (
      <Card>
        <Text as="p">No analytics data available for the selected timeframe.</Text>
      </Card>
    );
  }

  const { summary, realTimeMetrics, topPerformingPopups, dailyTrend } = data;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', { 
      style: 'currency', 
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(amount);
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('en-US').format(num);
  };

  return (
    <Layout>
      {/* Summary Metrics */}
      <Layout.Section>
        <Layout>
          <Layout.Section variant="oneThird">
            <Card>
              <Text variant="headingMd" as="h3">Total Revenue</Text>
              <Text variant="headingLg" as="p" tone="success">
                {formatCurrency(summary.totalRevenue || 0)}
              </Text>
              <Text as="p" tone="subdued">
                {formatCurrency(summary.revenuePerVisitor || 0)} per visitor
              </Text>
            </Card>
          </Layout.Section>
          
          <Layout.Section variant="oneThird">
            <Card>
              <Text variant="headingMd" as="h3">Conversions</Text>
              <Text variant="headingLg" as="p">
                {formatNumber(summary.totalConversions || 0)}
              </Text>
              <Text as="p" tone="subdued">
                {summary.avgConversionRate?.toFixed(2) || 0}% conversion rate
              </Text>
            </Card>
          </Layout.Section>
          
          <Layout.Section variant="oneThird">
            <Card>
              <Text variant="headingMd" as="h3">Unique Visitors</Text>
              <Text variant="headingLg" as="p">
                {formatNumber(summary.totalVisitors || 0)}
              </Text>
              <Text as="p" tone="subdued">
                {timeframe} period
              </Text>
            </Card>
          </Layout.Section>
        </Layout>
      </Layout.Section>

      {/* Real-time Metrics */}
      {realTimeMetrics && (
        <Layout.Section>
          <Card>
            <Text variant="headingMd" as="h3">Real-time Activity (Last Hour)</Text>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginTop: '16px' }}>
              <div style={{ textAlign: 'center', padding: '16px' }}>
                <Text variant="headingLg" as="p">{realTimeMetrics.active_visitors_last_hour || 0}</Text>
                <Text as="p" tone="subdued">Active Visitors</Text>
              </div>
              <div style={{ textAlign: 'center', padding: '16px' }}>
                <Text variant="headingLg" as="p">{realTimeMetrics.popup_views_last_hour || 0}</Text>
                <Text as="p" tone="subdued">Popup Views</Text>
              </div>
              <div style={{ textAlign: 'center', padding: '16px' }}>
                <Text variant="headingLg" as="p">{realTimeMetrics.conversions_last_hour || 0}</Text>
                <Text as="p" tone="subdued">Conversions</Text>
              </div>
              <div style={{ textAlign: 'center', padding: '16px' }}>
                <Text variant="headingLg" as="p">{formatCurrency(realTimeMetrics.revenue_last_hour || 0)}</Text>
                <Text as="p" tone="subdued">Revenue</Text>
              </div>
            </div>
          </Card>
        </Layout.Section>
      )}

      {/* Top Performing Popups */}
      {topPerformingPopups && topPerformingPopups.length > 0 && (
        <Layout.Section>
          <Card>
            <Text variant="headingMd" as="h3">Top Performing Popups</Text>
            <div style={{ marginTop: '16px' }}>
              {topPerformingPopups.slice(0, 5).map((popup: any, index: number) => (
                <div key={popup.popup_id} style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center',
                  padding: '12px 0',
                  borderBottom: index < 4 ? '1px solid #e1e5e9' : 'none'
                }}>
                  <div>
                    <Text variant="bodyMd" as="p">Popup #{popup.popup_id.slice(0, 8)}...</Text>
                    <Text as="p" tone="subdued">{popup.conversions} conversions</Text>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <Text variant="bodyMd" as="p">{formatCurrency(popup.total_revenue || 0)}</Text>
                    <Badge tone={index === 0 ? 'success' : 'info'}>
                      {popup.avg_time_to_conversion ? `${Math.round(popup.avg_time_to_conversion / 60)}min avg` : 'New'}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </Layout.Section>
      )}

      {/* Daily Trend */}
      {dailyTrend && dailyTrend.length > 0 && (
        <Layout.Section>
          <Card>
            <Text variant="headingMd" as="h3">Daily Performance Trend</Text>
            <div style={{ marginTop: '16px', maxHeight: '300px', overflowY: 'auto' }}>
              {dailyTrend.slice(0, 10).map((day: any) => (
                <div key={day.date} style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center',
                  padding: '8px 0',
                  borderBottom: '1px solid #f1f2f3'
                }}>
                  <Text as="p">{new Date(day.date).toLocaleDateString()}</Text>
                  <div style={{ display: 'flex', gap: '16px', textAlign: 'right' }}>
                    <div>
                      <Text as="p">{day.unique_visitors || 0}</Text>
                      <Text as="p" tone="subdued" variant="bodySm">visitors</Text>
                    </div>
                    <div>
                      <Text as="p">{day.email_conversions || 0}</Text>
                      <Text as="p" tone="subdued" variant="bodySm">conversions</Text>
                    </div>
                    <div>
                      <Text as="p">{day.email_conversion_rate?.toFixed(1) || 0}%</Text>
                      <Text as="p" tone="subdued" variant="bodySm">rate</Text>
                    </div>
                    <div>
                      <Text as="p">{formatCurrency(day.total_revenue || 0)}</Text>
                      <Text as="p" tone="subdued" variant="bodySm">revenue</Text>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </Layout.Section>
      )}
    </Layout>
  );
}