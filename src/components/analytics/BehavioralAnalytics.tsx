import React, { useState, useEffect } from 'react';
import { Card, Layout, Text, Button, SkeletonBodyText, Banner, Badge } from '@shopify/polaris';

interface BehavioralAnalyticsProps {
  shop: string;
  authToken?: string;
  timeframe: string;
}

interface BehavioralData {
  behavioralData: any[];
  insights: {
    totalSessions: number;
    avgTimeOnSite: number;
    avgScrollDepth: number;
    highEngagementRate: number;
    exitIntentRate: number;
  };
}

export function BehavioralAnalytics({ shop, authToken, timeframe }: BehavioralAnalyticsProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [behavioralData, setBehavioralData] = useState<BehavioralData | null>(null);

  useEffect(() => {
    loadBehavioralData();
  }, [timeframe, shop]);

  const loadBehavioralData = async () => {
    if (!shop) return;
    
    setLoading(true);
    setError(null);

    try {
      const baseUrl = import.meta.env.VITE_SUPABASE_URL?.replace('/rest/v1', '') || '';
      const response = await fetch(
        `${baseUrl}/functions/v1/advanced-analytics?type=behavioral&timeframe=${timeframe}`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${authToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Behavioral analytics request failed: ${response.status}`);
      }

      const data = await response.json();
      setBehavioralData(data);
    } catch (err) {
      console.error('Failed to load behavioral data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load behavioral analytics');
    } finally {
      setLoading(false);
    }
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('en-US').format(num || 0);
  };

  const formatPercentage = (value: number) => {
    return `${(value || 0).toFixed(1)}%`;
  };

  const formatDuration = (seconds: number) => {
    if (seconds < 60) {
      return `${seconds}s`;
    } else if (seconds < 3600) {
      return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
    } else {
      return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
    }
  };

  const getEngagementBadge = (engagementLevel: string) => {
    switch (engagementLevel) {
      case 'high':
        return { tone: 'success' as const, label: 'High Engagement' };
      case 'medium':
        return { tone: 'info' as const, label: 'Medium Engagement' };
      case 'low':
        return { tone: 'warning' as const, label: 'Low Engagement' };
      default:
        return { tone: 'info' as const, label: engagementLevel };
    }
  };

  const getDeviceTypeBadge = (deviceType: string) => {
    switch (deviceType) {
      case 'mobile':
        return { tone: 'info' as const, label: 'Mobile' };
      case 'desktop':
        return { tone: 'success' as const, label: 'Desktop' };
      case 'tablet':
        return { tone: 'warning' as const, label: 'Tablet' };
      default:
        return { tone: 'info' as const, label: deviceType || 'Unknown' };
    }
  };

  const calculateEngagementScore = (session: any) => {
    let score = 0;
    
    // Time on site scoring (max 30 points)
    if (session.time_on_site > 30000) score += 10; // 30 seconds
    if (session.time_on_site > 60000) score += 10; // 1 minute
    if (session.time_on_site > 180000) score += 10; // 3 minutes
    
    // Scroll depth scoring (max 30 points)
    if (session.scroll_depth > 25) score += 10;
    if (session.scroll_depth > 50) score += 10;
    if (session.scroll_depth > 75) score += 10;
    
    // Interaction scoring (max 40 points)
    if (session.mouse_movements > 50) score += 10;
    if (session.click_count > 2) score += 10;
    if (session.click_count > 5) score += 10;
    if (session.pages_viewed > 1) score += 10;
    
    return Math.min(100, score);
  };

  if (loading) {
    return (
      <Layout>
        <Layout.Section>
          <Card sectioned>
            <SkeletonBodyText lines={8} />
          </Card>
        </Layout.Section>
      </Layout>
    );
  }

  return (
    <Layout>
      {error && (
        <Layout.Section>
          <Banner status="critical" title="Behavioral Analytics Error">
            <p>{error}</p>
            <Button onClick={loadBehavioralData}>Retry</Button>
          </Banner>
        </Layout.Section>
      )}

      <Layout.Section>
        <Card sectioned>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <Text variant="headingMd" as="h3">Behavioral Analytics</Text>
            <Button onClick={loadBehavioralData} loading={loading}>
              Refresh
            </Button>
          </div>

          {!behavioralData || !behavioralData.insights ? (
            <div style={{ textAlign: 'center', padding: '40px' }}>
              <Text as="p" tone="subdued">No behavioral data available.</Text>
            </div>
          ) : (
            <>
              {/* Behavioral Insights Summary */}
              <Layout>
                <Layout.Section oneThird>
                  <Card sectioned>
                    <div style={{ textAlign: 'center' }}>
                      <Text variant="headingLg" as="h4">
                        {formatNumber(behavioralData.insights.totalSessions)}
                      </Text>
                      <Text as="p" tone="subdued">Total Sessions</Text>
                    </div>
                  </Card>
                </Layout.Section>

                <Layout.Section oneThird>
                  <Card sectioned>
                    <div style={{ textAlign: 'center' }}>
                      <Text variant="headingLg" as="h4">
                        {formatDuration(behavioralData.insights.avgTimeOnSite)}
                      </Text>
                      <Text as="p" tone="subdued">Avg Time on Site</Text>
                    </div>
                  </Card>
                </Layout.Section>

                <Layout.Section oneThird>
                  <Card sectioned>
                    <div style={{ textAlign: 'center' }}>
                      <Text variant="headingLg" as="h4">
                        {formatPercentage(behavioralData.insights.avgScrollDepth)}
                      </Text>
                      <Text as="p" tone="subdued">Avg Scroll Depth</Text>
                    </div>
                  </Card>
                </Layout.Section>
              </Layout>

              {/* Additional Metrics */}
              <div style={{ marginTop: '20px' }}>
                <Layout>
                  <Layout.Section oneHalf>
                    <Card sectioned>
                      <div style={{ textAlign: 'center' }}>
                        <Text variant="headingLg" as="h4">
                          {formatPercentage(behavioralData.insights.highEngagementRate)}
                        </Text>
                        <Text as="p" tone="subdued">High Engagement Rate</Text>
                        <Text as="p" tone="subdued" variant="bodySm">
                          Sessions with high engagement
                        </Text>
                      </div>
                    </Card>
                  </Layout.Section>

                  <Layout.Section oneHalf>
                    <Card sectioned>
                      <div style={{ textAlign: 'center' }}>
                        <Text variant="headingLg" as="h4">
                          {formatPercentage(behavioralData.insights.exitIntentRate)}
                        </Text>
                        <Text as="p" tone="subdued">Exit Intent Rate</Text>
                        <Text as="p" tone="subdued" variant="bodySm">
                          Sessions showing exit intent
                        </Text>
                      </div>
                    </Card>
                  </Layout.Section>
                </Layout>
              </div>

              {/* Engagement Distribution */}
              {behavioralData.behavioralData && behavioralData.behavioralData.length > 0 && (
                <div style={{ marginTop: '20px' }}>
                  <Card sectioned>
                    <Text variant="headingMd" as="h4" style={{ marginBottom: '16px' }}>
                      Engagement Distribution
                    </Text>
                    <Layout>
                      <Layout.Section oneThird>
                        <div style={{ textAlign: 'center', padding: '16px' }}>
                          <Text variant="headingLg" as="h4" tone="success">
                            {behavioralData.behavioralData.filter(s => s.engagement_level === 'high').length}
                          </Text>
                          <Text as="p" tone="subdued">High Engagement</Text>
                          <Text as="p" tone="subdued" variant="bodySm">
                            {formatPercentage(
                              (behavioralData.behavioralData.filter(s => s.engagement_level === 'high').length / 
                               behavioralData.behavioralData.length) * 100
                            )}
                          </Text>
                        </div>
                      </Layout.Section>

                      <Layout.Section oneThird>
                        <div style={{ textAlign: 'center', padding: '16px' }}>
                          <Text variant="headingLg" as="h4">
                            {behavioralData.behavioralData.filter(s => s.engagement_level === 'medium').length}
                          </Text>
                          <Text as="p" tone="subdued">Medium Engagement</Text>
                          <Text as="p" tone="subdued" variant="bodySm">
                            {formatPercentage(
                              (behavioralData.behavioralData.filter(s => s.engagement_level === 'medium').length / 
                               behavioralData.behavioralData.length) * 100
                            )}
                          </Text>
                        </div>
                      </Layout.Section>

                      <Layout.Section oneThird>
                        <div style={{ textAlign: 'center', padding: '16px' }}>
                          <Text variant="headingLg" as="h4" tone="warning">
                            {behavioralData.behavioralData.filter(s => s.engagement_level === 'low').length}
                          </Text>
                          <Text as="p" tone="subdued">Low Engagement</Text>
                          <Text as="p" tone="subdued" variant="bodySm">
                            {formatPercentage(
                              (behavioralData.behavioralData.filter(s => s.engagement_level === 'low').length / 
                               behavioralData.behavioralData.length) * 100
                            )}
                          </Text>
                        </div>
                      </Layout.Section>
                    </Layout>
                  </Card>
                </div>
              )}

              {/* Device Type Analysis */}
              {behavioralData.behavioralData && behavioralData.behavioralData.length > 0 && (
                <div style={{ marginTop: '20px' }}>
                  <Card sectioned>
                    <Text variant="headingMd" as="h4" style={{ marginBottom: '16px' }}>
                      Device Type Performance
                    </Text>
                    {['mobile', 'desktop', 'tablet'].map(deviceType => {
                      const deviceSessions = behavioralData.behavioralData.filter(s => s.device_type === deviceType);
                      if (deviceSessions.length === 0) return null;

                      const avgTimeOnSite = deviceSessions.reduce((sum, s) => sum + s.time_on_site, 0) / deviceSessions.length;
                      const avgScrollDepth = deviceSessions.reduce((sum, s) => sum + s.scroll_depth, 0) / deviceSessions.length;
                      const highEngagementCount = deviceSessions.filter(s => s.engagement_level === 'high').length;

                      return (
                        <div key={deviceType} style={{
                          padding: '16px',
                          border: '1px solid #e1e5e9',
                          borderRadius: '8px',
                          marginBottom: '12px'
                        }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                            <div>
                              <Badge tone={getDeviceTypeBadge(deviceType).tone}>
                                {getDeviceTypeBadge(deviceType).label}
                              </Badge>
                              <Text as="p" tone="subdued" variant="bodySm" style={{ marginTop: '4px' }}>
                                {formatNumber(deviceSessions.length)} sessions
                              </Text>
                            </div>
                            <Text as="p" variant="bodyMd">
                              {formatPercentage((highEngagementCount / deviceSessions.length) * 100)} high engagement
                            </Text>
                          </div>

                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '16px' }}>
                            <div>
                              <Text as="p" variant="bodySm" tone="subdued">Avg Time on Site</Text>
                              <Text as="p">{formatDuration(avgTimeOnSite / 1000)}</Text>
                            </div>
                            <div>
                              <Text as="p" variant="bodySm" tone="subdued">Avg Scroll Depth</Text>
                              <Text as="p">{formatPercentage(avgScrollDepth)}</Text>
                            </div>
                            <div>
                              <Text as="p" variant="bodySm" tone="subdued">High Engagement</Text>
                              <Text as="p">{formatNumber(highEngagementCount)} / {formatNumber(deviceSessions.length)}</Text>
                            </div>
                            <div>
                              <Text as="p" variant="bodySm" tone="subdued">Exit Intent Rate</Text>
                              <Text as="p">
                                {formatPercentage((deviceSessions.filter(s => s.exit_intent).length / deviceSessions.length) * 100)}
                              </Text>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </Card>
                </div>
              )}

              {/* Detailed Session Data */}
              {behavioralData.behavioralData && behavioralData.behavioralData.length > 0 && (
                <div style={{ marginTop: '20px' }}>
                  <Card sectioned>
                    <Text variant="headingMd" as="h4" style={{ marginBottom: '16px' }}>
                      Recent Sessions
                    </Text>
                    <div style={{ maxHeight: '500px', overflowY: 'auto' }}>
                      {behavioralData.behavioralData
                        .sort((a, b) => new Date(b.session_start).getTime() - new Date(a.session_start).getTime())
                        .slice(0, 20)
                        .map((session: any) => {
                          const engagementScore = calculateEngagementScore(session);
                          
                          return (
                            <div key={session.id} style={{
                              padding: '16px',
                              border: '1px solid #e1e5e9',
                              borderRadius: '8px',
                              marginBottom: '12px',
                              backgroundColor: session.engagement_level === 'high' ? '#f0f9ff' : 'white'
                            }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                                <div>
                                  <Text variant="bodyMd" as="p">
                                    <strong>Session:</strong> {session.session_id.slice(0, 12)}...
                                  </Text>
                                  <Text as="p" tone="subdued" variant="bodySm">
                                    Started: {new Date(session.session_start).toLocaleString()}
                                  </Text>
                                </div>
                                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                  <Badge tone={getEngagementBadge(session.engagement_level).tone}>
                                    {getEngagementBadge(session.engagement_level).label}
                                  </Badge>
                                  <Badge tone={getDeviceTypeBadge(session.device_type).tone}>
                                    {getDeviceTypeBadge(session.device_type).label}
                                  </Badge>
                                  {session.exit_intent && (
                                    <Badge tone="warning">Exit Intent</Badge>
                                  )}
                                </div>
                              </div>

                              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '12px', marginBottom: '12px' }}>
                                <div>
                                  <Text as="p" variant="bodySm" tone="subdued">Time on Site</Text>
                                  <Text as="p">{formatDuration(session.time_on_site / 1000)}</Text>
                                </div>
                                <div>
                                  <Text as="p" variant="bodySm" tone="subdued">Pages Viewed</Text>
                                  <Text as="p">{formatNumber(session.pages_viewed)}</Text>
                                </div>
                                <div>
                                  <Text as="p" variant="bodySm" tone="subdued">Scroll Depth</Text>
                                  <Text as="p">{formatPercentage(session.scroll_depth)}</Text>
                                </div>
                                <div>
                                  <Text as="p" variant="bodySm" tone="subdued">Click Count</Text>
                                  <Text as="p">{formatNumber(session.click_count)}</Text>
                                </div>
                                <div>
                                  <Text as="p" variant="bodySm" tone="subdued">Mouse Movements</Text>
                                  <Text as="p">{formatNumber(session.mouse_movements)}</Text>
                                </div>
                                {session.cart_value && (
                                  <div>
                                    <Text as="p" variant="bodySm" tone="subdued">Cart Value</Text>
                                    <Text as="p">${session.cart_value.toFixed(2)}</Text>
                                  </div>
                                )}
                              </div>

                              {/* Engagement Score Bar */}
                              <div style={{ marginTop: '12px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                                  <Text as="p" variant="bodySm" tone="subdued">
                                    Engagement Score
                                  </Text>
                                  <Text as="p" variant="bodySm">
                                    {engagementScore}/100
                                  </Text>
                                </div>
                                <div style={{ 
                                  height: '6px',
                                  backgroundColor: '#e1e5e9',
                                  borderRadius: '3px',
                                  overflow: 'hidden'
                                }}>
                                  <div style={{
                                    height: '100%',
                                    backgroundColor: engagementScore >= 70 ? '#00a047' : engagementScore >= 40 ? '#6371c7' : '#d9822b',
                                    width: `${engagementScore}%`,
                                    transition: 'width 0.3s ease'
                                  }} />
                                </div>
                              </div>

                              {/* Product Views and Search Queries */}
                              {(session.product_views?.length > 0 || session.search_queries?.length > 0) && (
                                <div style={{ marginTop: '12px', padding: '8px', backgroundColor: '#f9fafb', borderRadius: '4px' }}>
                                  {session.product_views?.length > 0 && (
                                    <Text as="p" variant="bodySm">
                                      <strong>Products viewed:</strong> {session.product_views.slice(0, 3).join(', ')}
                                      {session.product_views.length > 3 && ` +${session.product_views.length - 3} more`}
                                    </Text>
                                  )}
                                  {session.search_queries?.length > 0 && (
                                    <Text as="p" variant="bodySm" style={{ marginTop: '4px' }}>
                                      <strong>Search queries:</strong> {session.search_queries.slice(0, 2).join(', ')}
                                      {session.search_queries.length > 2 && ` +${session.search_queries.length - 2} more`}
                                    </Text>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })}
                    </div>
                  </Card>
                </div>
              )}
            </>
          )}
        </Card>
      </Layout.Section>
    </Layout>
  );
}