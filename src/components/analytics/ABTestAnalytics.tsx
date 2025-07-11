import React, { useState, useEffect } from 'react';
import { Card, Layout, Text, Button, SkeletonBodyText, Banner, Badge } from '@shopify/polaris';

interface ABTestAnalyticsProps {
  shop: string;
  authToken?: string;
  timeframe: string;
}

interface ABTestData {
  abTestResults: any[];
  summary: {
    totalTests: number;
    activeTests: number;
    completedTests: number;
    significantTests: number;
    significanceRate: number;
  };
}

export function ABTestAnalytics({ shop, authToken, timeframe }: ABTestAnalyticsProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [abTestData, setAbTestData] = useState<ABTestData | null>(null);

  useEffect(() => {
    loadABTestData();
  }, [timeframe, shop]);

  const loadABTestData = async () => {
    if (!shop) return;
    
    setLoading(true);
    setError(null);

    try {
      const baseUrl = import.meta.env.VITE_SUPABASE_URL?.replace('/rest/v1', '') || '';
      const response = await fetch(
        `${baseUrl}/functions/v1/advanced-analytics?type=ab_test&timeframe=${timeframe}`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${authToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error(`A/B test analytics request failed: ${response.status}`);
      }

      const data = await response.json();
      setAbTestData(data);
    } catch (err) {
      console.error('Failed to load A/B test data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load A/B test analytics');
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

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', { 
      style: 'currency', 
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(amount || 0);
  };

  const getTestStatusBadge = (status: string, isSignificant: boolean) => {
    switch (status) {
      case 'running':
        return { tone: 'info' as const, label: 'Running' };
      case 'completed':
        return { tone: 'success' as const, label: isSignificant ? 'Completed (Significant)' : 'Completed' };
      case 'paused':
        return { tone: 'warning' as const, label: 'Paused' };
      case 'stopped':
        return { tone: 'critical' as const, label: 'Stopped' };
      default:
        return { tone: 'info' as const, label: status };
    }
  };

  const getConversionLiftBadge = (lift: number) => {
    if (lift > 20) return { tone: 'success' as const, label: 'High Lift' };
    if (lift > 5) return { tone: 'success' as const, label: 'Good Lift' };
    if (lift > 0) return { tone: 'info' as const, label: 'Positive' };
    if (lift > -10) return { tone: 'warning' as const, label: 'Negative' };
    return { tone: 'critical' as const, label: 'Poor Performance' };
  };

  const calculateVariantPerformance = (test: any) => {
    const controlRate = test.control_visitors > 0 ? (test.control_conversions / test.control_visitors) * 100 : 0;
    const treatmentRate = test.treatment_visitors > 0 ? (test.treatment_conversions / test.treatment_visitors) * 100 : 0;
    const controlRevPerVisitor = test.control_visitors > 0 ? test.control_revenue / test.control_visitors : 0;
    const treatmentRevPerVisitor = test.treatment_visitors > 0 ? test.treatment_revenue / test.treatment_visitors : 0;

    return {
      controlRate,
      treatmentRate,
      controlRevPerVisitor,
      treatmentRevPerVisitor
    };
  };

  if (loading) {
    return (
      <Layout>
        <Layout.Section>
          <Card>
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
          <Banner tone="critical" title="A/B Test Analytics Error">
            <p>{error}</p>
            <Button onClick={loadABTestData}>Retry</Button>
          </Banner>
        </Layout.Section>
      )}

      <Layout.Section>
        <Card>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <Text variant="headingMd" as="h3">A/B Test Analytics</Text>
            <Button onClick={loadABTestData} loading={loading}>
              Refresh
            </Button>
          </div>

          {!abTestData || !abTestData.summary ? (
            <div style={{ textAlign: 'center', padding: '40px' }}>
              <Text as="p" tone="subdued">No A/B test data available.</Text>
            </div>
          ) : (
            <>
              {/* A/B Test Summary */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
                <Card>
                  <div style={{ textAlign: 'center' }}>
                    <Text variant="headingLg" as="h4">
                      {abTestData.summary.totalTests}
                    </Text>
                    <Text as="p" tone="subdued">Total Tests</Text>
                  </div>
                </Card>

                <Card>
                  <div style={{ textAlign: 'center' }}>
                    <Text variant="headingLg" as="h4">
                      {abTestData.summary.activeTests}
                    </Text>
                    <Text as="p" tone="subdued">Active Tests</Text>
                  </div>
                </Card>

                <Card>
                  <div style={{ textAlign: 'center' }}>
                    <Text variant="headingLg" as="h4">
                      {abTestData.summary.significantTests}
                    </Text>
                    <Text as="p" tone="subdued">Significant Results</Text>
                  </div>
                </Card>

                <Card>
                  <div style={{ textAlign: 'center' }}>
                    <Text variant="headingLg" as="h4">
                      {formatPercentage(abTestData.summary.significanceRate)}
                    </Text>
                    <Text as="p" tone="subdued">Significance Rate</Text>
                  </div>
                </Card>
              </div>

              {/* Detailed A/B Test Results */}
              {abTestData.abTestResults && abTestData.abTestResults.length > 0 && (
                <div style={{ marginTop: '20px' }}>
                  <Card>
                    <div style={{ marginBottom: '16px' }}>
                      <Text variant="headingMd" as="h4">
                        Test Results
                      </Text>
                    </div>
                    <div style={{ maxHeight: '600px', overflowY: 'auto' }}>
                      {abTestData.abTestResults.map((test: any) => {
                        const performance = calculateVariantPerformance(test);
                        const totalSampleSize = test.control_visitors + test.treatment_visitors;
                        const progressPercentage = test.sample_size_required > 0 
                          ? Math.min(100, (totalSampleSize / test.sample_size_required) * 100)
                          : 0;

                        return (
                          <div key={test.id} style={{
                            padding: '20px',
                            border: '1px solid #e1e5e9',
                            borderRadius: '8px',
                            marginBottom: '16px',
                            backgroundColor: test.is_statistically_significant ? '#f0f9ff' : 'white'
                          }}>
                            {/* Test Header */}
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                              <div>
                                <Text variant="headingMd" as="h5">
                                  Test ID: {test.test_id}
                                </Text>
                                <Text as="p" tone="subdued" variant="bodySm">
                                  Popup: {test.popup_id?.slice(0, 8)}... | 
                                  Started: {new Date(test.test_start_date).toLocaleDateString()}
                                </Text>
                              </div>
                              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                <Badge tone={getTestStatusBadge(test.test_status, test.is_statistically_significant).tone}>
                                  {getTestStatusBadge(test.test_status, test.is_statistically_significant).label}
                                </Badge>
                                <Badge tone={getConversionLiftBadge(test.conversion_lift).tone}>
                                  {`${formatPercentage(test.conversion_lift)} lift`}
                                </Badge>
                                {test.is_statistically_significant && (
                                  <Badge tone="success">Significant</Badge>
                                )}
                              </div>
                            </div>

                            {/* Sample Size Progress */}
                            <div style={{ marginBottom: '16px' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                                <Text as="p" variant="bodySm" tone="subdued">
                                  Sample Size Progress
                                </Text>
                                <Text as="p" variant="bodySm">
                                  {formatNumber(totalSampleSize)} / {formatNumber(test.sample_size_required)} 
                                  ({progressPercentage.toFixed(1)}%)
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
                                  backgroundColor: progressPercentage >= 100 ? '#00a047' : '#6371c7',
                                  width: `${progressPercentage}%`,
                                  transition: 'width 0.3s ease'
                                }} />
                              </div>
                            </div>

                            {/* Variant Comparison */}
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                              {/* Control Variant */}
                              <div style={{ 
                                padding: '16px', 
                                border: '1px solid #e1e5e9', 
                                borderRadius: '6px',
                                backgroundColor: '#f9fafb'
                              }}>
                                <div style={{ marginBottom: '12px' }}>
                                  <Text variant="bodyMd" as="p">
                                    <strong>Control: {test.control_variant}</strong>
                                  </Text>
                                </div>
                                <div style={{ display: 'grid', gap: '8px' }}>
                                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <Text as="p" variant="bodySm">Visitors:</Text>
                                    <Text as="p" variant="bodySm">{formatNumber(test.control_visitors)}</Text>
                                  </div>
                                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <Text as="p" variant="bodySm">Conversions:</Text>
                                    <Text as="p" variant="bodySm">{formatNumber(test.control_conversions)}</Text>
                                  </div>
                                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <Text as="p" variant="bodySm">Conversion Rate:</Text>
                                    <Text as="p" variant="bodySm">{formatPercentage(performance.controlRate)}</Text>
                                  </div>
                                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <Text as="p" variant="bodySm">Revenue:</Text>
                                    <Text as="p" variant="bodySm">{formatCurrency(test.control_revenue)}</Text>
                                  </div>
                                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <Text as="p" variant="bodySm">Rev/Visitor:</Text>
                                    <Text as="p" variant="bodySm">{formatCurrency(performance.controlRevPerVisitor)}</Text>
                                  </div>
                                </div>
                              </div>

                              {/* Treatment Variant */}
                              <div style={{ 
                                padding: '16px', 
                                border: '1px solid #e1e5e9', 
                                borderRadius: '6px',
                                backgroundColor: test.conversion_lift > 0 ? '#f0f9ff' : '#fef7f0'
                              }}>
                                <div style={{ marginBottom: '12px' }}>
                                  <Text variant="bodyMd" as="p">
                                    <strong>Treatment: {test.treatment_variant}</strong>
                                  </Text>
                                </div>
                                <div style={{ display: 'grid', gap: '8px' }}>
                                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <Text as="p" variant="bodySm">Visitors:</Text>
                                    <Text as="p" variant="bodySm">{formatNumber(test.treatment_visitors)}</Text>
                                  </div>
                                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <Text as="p" variant="bodySm">Conversions:</Text>
                                    <Text as="p" variant="bodySm">{formatNumber(test.treatment_conversions)}</Text>
                                  </div>
                                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <Text as="p" variant="bodySm">Conversion Rate:</Text>
                                    <Text as="p" variant="bodySm" tone={performance.treatmentRate > performance.controlRate ? 'success' : undefined}>
                                      {formatPercentage(performance.treatmentRate)}
                                    </Text>
                                  </div>
                                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <Text as="p" variant="bodySm">Revenue:</Text>
                                    <Text as="p" variant="bodySm">{formatCurrency(test.treatment_revenue)}</Text>
                                  </div>
                                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <Text as="p" variant="bodySm">Rev/Visitor:</Text>
                                    <Text as="p" variant="bodySm" tone={performance.treatmentRevPerVisitor > performance.controlRevPerVisitor ? 'success' : undefined}>
                                      {formatCurrency(performance.treatmentRevPerVisitor)}
                                    </Text>
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* Statistical Results */}
                            <div style={{ 
                              marginTop: '16px', 
                              padding: '12px', 
                              backgroundColor: '#f1f2f3', 
                              borderRadius: '6px' 
                            }}>
                              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '12px' }}>
                                <div>
                                  <Text as="p" variant="bodySm" tone="subdued">Conversion Lift</Text>
                                  <Text as="p" variant="bodyMd" tone={test.conversion_lift > 0 ? 'success' : 'critical'}>
                                    {test.conversion_lift > 0 ? '+' : ''}{formatPercentage(test.conversion_lift)}
                                  </Text>
                                </div>
                                <div>
                                  <Text as="p" variant="bodySm" tone="subdued">P-Value</Text>
                                  <Text as="p" variant="bodyMd">
                                    {test.p_value?.toFixed(4) || 'N/A'}
                                  </Text>
                                </div>
                                <div>
                                  <Text as="p" variant="bodySm" tone="subdued">Confidence Level</Text>
                                  <Text as="p" variant="bodyMd">
                                    {test.confidence_level}%
                                  </Text>
                                </div>
                                {test.winner_variant && (
                                  <div>
                                    <Text as="p" variant="bodySm" tone="subdued">Winner</Text>
                                    <Text as="p" variant="bodyMd" tone="success">
                                      {test.winner_variant}
                                    </Text>
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Test Duration */}
                            <div style={{ marginTop: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <Text as="p" variant="bodySm" tone="subdued">
                                Test Duration: {' '}
                                {Math.floor((new Date().getTime() - new Date(test.test_start_date).getTime()) / (1000 * 60 * 60 * 24))} days
                              </Text>
                              {test.test_end_date && (
                                <Text as="p" variant="bodySm" tone="subdued">
                                  Ended: {new Date(test.test_end_date).toLocaleDateString()}
                                </Text>
                              )}
                            </div>
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