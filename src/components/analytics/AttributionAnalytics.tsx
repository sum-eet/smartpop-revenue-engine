import React, { useState, useEffect } from 'react';
import { Card, Layout, Text, Button, SkeletonBodyText, Banner, Badge, Tabs } from '@shopify/polaris';

interface AttributionAnalyticsProps {
  shop: string;
  authToken?: string;
  timeframe: string;
}

interface AttributionData {
  attributionEvents: any[];
  customerJourneys: any[];
  attributionPaths: Array<{ path: string; count: number }>;
  journeyInsights: {
    totalJourneys: number;
    avgSessionsPerJourney: number;
    avgEventsPerJourney: number;
    conversionRate: number;
    crossDeviceJourneys: number;
  };
}

export function AttributionAnalytics({ shop, authToken, timeframe }: AttributionAnalyticsProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attributionData, setAttributionData] = useState<AttributionData | null>(null);
  const [selectedTab, setSelectedTab] = useState(0);

  const tabs = [
    { id: 'paths', content: 'Attribution Paths', panelID: 'paths-panel' },
    { id: 'journeys', content: 'Customer Journeys', panelID: 'journeys-panel' },
    { id: 'events', content: 'Attribution Events', panelID: 'events-panel' },
  ];

  useEffect(() => {
    loadAttributionData();
  }, [timeframe, shop]);

  const loadAttributionData = async () => {
    if (!shop) return;
    
    setLoading(true);
    setError(null);

    try {
      const baseUrl = import.meta.env.VITE_SUPABASE_URL?.replace('/rest/v1', '') || '';
      const response = await fetch(
        `${baseUrl}/functions/v1/advanced-analytics?type=attribution&timeframe=${timeframe}`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${authToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Attribution analytics request failed: ${response.status}`);
      }

      const data = await response.json();
      setAttributionData(data);
    } catch (err) {
      console.error('Failed to load attribution data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load attribution analytics');
    } finally {
      setLoading(false);
    }
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('en-US').format(num || 0);
  };

  const formatPercentage = (value: number) => {
    return `${(value || 0).toFixed(2)}%`;
  };

  const getEventTypeBadge = (eventType: string) => {
    switch (eventType) {
      case 'popup_shown':
        return { tone: 'info' as const, label: 'Popup Shown' };
      case 'email_submitted':
        return { tone: 'success' as const, label: 'Email Submitted' };
      case 'purchase_made':
        return { tone: 'success' as const, label: 'Purchase Made' };
      case 'cart_abandoned':
        return { tone: 'warning' as const, label: 'Cart Abandoned' };
      default:
        return { tone: 'info' as const, label: eventType };
    }
  };

  const renderTabContent = () => {
    const currentTab = tabs[selectedTab];

    switch (currentTab.id) {
      case 'paths':
        return <AttributionPaths attributionPaths={attributionData?.attributionPaths || []} />;
      case 'journeys':
        return <CustomerJourneys 
          journeys={attributionData?.customerJourneys || []} 
          insights={attributionData?.journeyInsights}
        />;
      case 'events':
        return <AttributionEvents events={attributionData?.attributionEvents || []} />;
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <Layout>
        <Layout.Section>
          <Card >
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
          <Banner tone="critical" title="Attribution Analytics Error">
            <p>{error}</p>
            <Button onClick={loadAttributionData}>Retry</Button>
          </Banner>
        </Layout.Section>
      )}

      <Layout.Section>
        <Card >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <Text variant="headingMd" as="h3">Attribution Analysis</Text>
            <Button onClick={loadAttributionData} loading={loading}>
              Refresh
            </Button>
          </div>

          {/* Journey Insights Summary */}
          {attributionData?.journeyInsights && (
            <div style={{ marginBottom: '20px' }}>
              <Layout>
                <Layout.Section variant="oneThird">
                  <Card >
                    <div style={{ textAlign: 'center' }}>
                      <Text variant="headingLg" as="h4">
                        {formatNumber(attributionData.journeyInsights.totalJourneys)}
                      </Text>
                      <Text as="p" tone="subdued">Total Journeys</Text>
                    </div>
                  </Card>
                </Layout.Section>

                <Layout.Section variant="oneThird">
                  <Card >
                    <div style={{ textAlign: 'center' }}>
                      <Text variant="headingLg" as="h4">
                        {formatPercentage(attributionData.journeyInsights.conversionRate)}
                      </Text>
                      <Text as="p" tone="subdued">Journey Conversion Rate</Text>
                    </div>
                  </Card>
                </Layout.Section>

                <Layout.Section variant="oneThird">
                  <Card >
                    <div style={{ textAlign: 'center' }}>
                      <Text variant="headingLg" as="h4">
                        {attributionData.journeyInsights.avgSessionsPerJourney.toFixed(1)}
                      </Text>
                      <Text as="p" tone="subdued">Avg Sessions per Journey</Text>
                    </div>
                  </Card>
                </Layout.Section>
              </Layout>
            </div>
          )}

          <Tabs tabs={tabs} selected={selectedTab} onSelect={setSelectedTab}>
            <div style={{ marginTop: '20px' }}>
              {renderTabContent()}
            </div>
          </Tabs>
        </Card>
      </Layout.Section>
    </Layout>
  );
}

function AttributionPaths({ attributionPaths }: { attributionPaths: Array<{ path: string; count: number }> }) {
  if (!attributionPaths || attributionPaths.length === 0) {
    return (
      <Card >
        <Text as="p" tone="subdued">No attribution paths available.</Text>
      </Card>
    );
  }

  const maxCount = Math.max(...attributionPaths.map(p => p.count));

  return (
    <Card >
      <Text variant="headingMd" as="h4" style={{ marginBottom: '16px' }}>
        Most Common Attribution Paths
      </Text>
      <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
        {attributionPaths.map((pathData, index) => (
          <div key={index} style={{
            padding: '16px',
            border: '1px solid #e1e5e9',
            borderRadius: '8px',
            marginBottom: '12px',
            backgroundColor: index < 3 ? '#f9fafb' : 'white'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ flex: 1 }}>
                <Text variant="bodyMd" as="p">
                  <strong>{pathData.path}</strong>
                </Text>
                <div style={{ 
                  marginTop: '8px',
                  height: '4px',
                  backgroundColor: '#e1e5e9',
                  borderRadius: '2px',
                  overflow: 'hidden'
                }}>
                  <div style={{
                    height: '100%',
                    backgroundColor: index < 3 ? '#00a047' : '#6371c7',
                    width: `${(pathData.count / maxCount) * 100}%`,
                    transition: 'width 0.3s ease'
                  }} />
                </div>
              </div>
              <div style={{ marginLeft: '16px', textAlign: 'right' }}>
                <Text variant="headingMd" as="p">
                  {pathData.count}
                </Text>
                <Text as="p" tone="subdued" variant="bodySm">
                  customers
                </Text>
              </div>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

function CustomerJourneys({ 
  journeys, 
  insights 
}: { 
  journeys: any[]; 
  insights?: any 
}) {
  if (!journeys || journeys.length === 0) {
    return (
      <Card >
        <Text as="p" tone="subdued">No customer journeys available.</Text>
      </Card>
    );
  }

  return (
    <Layout>
      {insights && (
        <Layout.Section>
          <Card >
            <Text variant="headingMd" as="h4" style={{ marginBottom: '16px' }}>
              Journey Insights
            </Text>
            <Layout>
              <Layout.Section variant="oneHalf">
                <div style={{ padding: '8px 0' }}>
                  <Text as="p">
                    <strong>Average Events per Journey:</strong> {insights.avgEventsPerJourney.toFixed(1)}
                  </Text>
                  <Text as="p">
                    <strong>Cross-device Journeys:</strong> {insights.crossDeviceJourneys} 
                    ({((insights.crossDeviceJourneys / insights.totalJourneys) * 100).toFixed(1)}%)
                  </Text>
                </div>
              </Layout.Section>
              <Layout.Section variant="oneHalf">
                <div style={{ padding: '8px 0' }}>
                  <Text as="p">
                    <strong>Multi-session Journeys:</strong> {journeys.filter(j => j.total_sessions > 1).length}
                  </Text>
                  <Text as="p">
                    <strong>Completed Purchases:</strong> {journeys.filter(j => j.first_purchase).length}
                  </Text>
                </div>
              </Layout.Section>
            </Layout>
          </Card>
        </Layout.Section>
      )}

      <Layout.Section>
        <Card >
          <Text variant="headingMd" as="h4" style={{ marginBottom: '16px' }}>
            Recent Customer Journeys
          </Text>
          <div style={{ maxHeight: '500px', overflowY: 'auto' }}>
            {journeys.slice(0, 20).map((journey: any) => (
              <div key={journey.id} style={{
                padding: '16px',
                border: '1px solid #e1e5e9',
                borderRadius: '8px',
                marginBottom: '12px'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <Text variant="bodyMd" as="p">
                      <strong>Visitor ID:</strong> {journey.visitor_id.slice(0, 12)}...
                    </Text>
                    <Text as="p" tone="subdued" variant="bodySm">
                      Started: {new Date(journey.journey_start).toLocaleDateString()}
                    </Text>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    {journey.first_purchase && (
                      <Badge tone="success">Converted</Badge>
                    )}
                    {journey.device_types.length > 1 && (
                      <Badge tone="info">Cross-device</Badge>
                    )}
                  </div>
                </div>

                <div style={{ marginTop: '12px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '8px' }}>
                  <div>
                    <Text as="p" variant="bodySm" tone="subdued">Sessions</Text>
                    <Text as="p">{journey.total_sessions}</Text>
                  </div>
                  <div>
                    <Text as="p" variant="bodySm" tone="subdued">Events</Text>
                    <Text as="p">{journey.total_events}</Text>
                  </div>
                  <div>
                    <Text as="p" variant="bodySm" tone="subdued">Devices</Text>
                    <Text as="p">{journey.device_types.join(', ')}</Text>
                  </div>
                  {journey.total_order_value > 0 && (
                    <div>
                      <Text as="p" variant="bodySm" tone="subdued">Revenue</Text>
                      <Text as="p">
                        ${journey.total_order_value.toFixed(2)}
                      </Text>
                    </div>
                  )}
                </div>

                {journey.utm_sources && journey.utm_sources.length > 0 && (
                  <div style={{ marginTop: '8px' }}>
                    <Text as="p" variant="bodySm" tone="subdued">
                      Sources: {journey.utm_sources.join(', ')}
                    </Text>
                  </div>
                )}
              </div>
            ))}
          </div>
        </Card>
      </Layout.Section>
    </Layout>
  );
}

function AttributionEvents({ events }: { events: any[] }) {
  if (!events || events.length === 0) {
    return (
      <Card >
        <Text as="p" tone="subdued">No attribution events available.</Text>
      </Card>
    );
  }

  const getEventTypeBadge = (eventType: string) => {
    switch (eventType) {
      case 'popup_shown':
        return { tone: 'info' as const, label: 'Popup Shown' };
      case 'email_submitted':
        return { tone: 'success' as const, label: 'Email Submitted' };
      case 'purchase_made':
        return { tone: 'success' as const, label: 'Purchase Made' };
      case 'cart_abandoned':
        return { tone: 'warning' as const, label: 'Cart Abandoned' };
      default:
        return { tone: 'info' as const, label: eventType };
    }
  };

  return (
    <Card >
      <Text variant="headingMd" as="h4" style={{ marginBottom: '16px' }}>
        Recent Attribution Events
      </Text>
      <div style={{ maxHeight: '500px', overflowY: 'auto' }}>
        {events.slice(0, 50).map((event: any) => (
          <div key={event.id} style={{
            padding: '12px',
            border: '1px solid #e1e5e9',
            borderRadius: '6px',
            marginBottom: '8px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                <Badge tone={getEventTypeBadge(event.event_type).tone}>
                  {getEventTypeBadge(event.event_type).label}
                </Badge>
                {event.cross_device && (
                  <Badge tone="info">Cross-device</Badge>
                )}
              </div>
              <Text as="p" variant="bodySm">
                <strong>Visitor:</strong> {event.visitor_id.slice(0, 8)}... | 
                <strong> Session:</strong> {event.session_id.slice(0, 8)}...
              </Text>
              {event.email && (
                <Text as="p" variant="bodySm" tone="subdued">
                  Email: {event.email}
                </Text>
              )}
              {event.order_value && (
                <Text as="p" variant="bodySm" tone="subdued">
                  Order Value: ${event.order_value.toFixed(2)}
                </Text>
              )}
            </div>
            <div style={{ textAlign: 'right' }}>
              <Text as="p" variant="bodySm">
                {new Date(event.event_timestamp).toLocaleDateString()}
              </Text>
              <Text as="p" variant="bodySm" tone="subdued">
                {new Date(event.event_timestamp).toLocaleTimeString()}
              </Text>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}