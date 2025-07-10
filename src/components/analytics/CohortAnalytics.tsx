import React, { useState, useEffect } from 'react';
import { Card, Layout, Text, Button, SkeletonBodyText, Banner, Badge, Select } from '@shopify/polaris';

interface CohortAnalyticsProps {
  shop: string;
  authToken?: string;
  timeframe: string;
}

interface CohortData {
  cohortAnalysis: any[];
  cohortType: string;
  summary: {
    totalCohorts: number;
    totalVisitors: number;
    totalConversions: number;
    avgConversionRate: number;
    bestPerformingCohort: string;
    worstPerformingCohort: string;
  };
}

export function CohortAnalytics({ shop, authToken, timeframe }: CohortAnalyticsProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cohortData, setCohortData] = useState<CohortData | null>(null);
  const [selectedCohortType, setSelectedCohortType] = useState('device_type');
  const [calculating, setCalculating] = useState(false);

  const cohortTypeOptions = [
    { label: 'Device Type', value: 'device_type' },
    { label: 'Traffic Source', value: 'traffic_source' },
    { label: 'Geographic', value: 'geographic' },
    { label: 'Time-based', value: 'time_based' },
  ];

  useEffect(() => {
    loadCohortData();
  }, [timeframe, selectedCohortType, shop]);

  const loadCohortData = async () => {
    if (!shop) return;
    
    setLoading(true);
    setError(null);

    try {
      const baseUrl = import.meta.env.VITE_SUPABASE_URL?.replace('/rest/v1', '') || '';
      const response = await fetch(
        `${baseUrl}/functions/v1/advanced-analytics?type=cohort&timeframe=${timeframe}&cohortType=${selectedCohortType}`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${authToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Cohort analytics request failed: ${response.status}`);
      }

      const data = await response.json();
      setCohortData(data);
    } catch (err) {
      console.error('Failed to load cohort data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load cohort analytics');
    } finally {
      setLoading(false);
    }
  };

  const calculateNewCohortAnalysis = async () => {
    setCalculating(true);
    setError(null);

    try {
      const baseUrl = import.meta.env.VITE_SUPABASE_URL?.replace('/rest/v1', '') || '';
      const response = await fetch(
        `${baseUrl}/functions/v1/advanced-analytics`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${authToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            type: 'cohort',
            timeframe,
            cohortType: selectedCohortType
          })
        }
      );

      if (!response.ok) {
        throw new Error(`Cohort calculation failed: ${response.status}`);
      }

      // Reload data after calculation
      await loadCohortData();
    } catch (err) {
      console.error('Failed to calculate cohort analysis:', err);
      setError(err instanceof Error ? err.message : 'Failed to calculate cohort analysis');
    } finally {
      setCalculating(false);
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

  const getPerformanceBadge = (conversionRate: number, avgRate: number) => {
    if (conversionRate > avgRate * 1.2) return { tone: 'success' as const, label: 'High Performer' };
    if (conversionRate > avgRate * 0.8) return { tone: 'info' as const, label: 'Average' };
    return { tone: 'warning' as const, label: 'Below Average' };
  };

  const getSignificanceBadge = (isSignificant: boolean) => {
    return isSignificant 
      ? { tone: 'success' as const, label: 'Significant' }
      : { tone: 'critical' as const, label: 'Not Significant' };
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
          <Banner status="critical" title="Cohort Analytics Error">
            <p>{error}</p>
            <Button onClick={loadCohortData}>Retry</Button>
          </Banner>
        </Layout.Section>
      )}

      <Layout.Section>
        <Card sectioned>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <Text variant="headingMd" as="h3">Cohort Analysis</Text>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
              <div style={{ minWidth: '200px' }}>
                <Select
                  options={cohortTypeOptions}
                  value={selectedCohortType}
                  onChange={setSelectedCohortType}
                />
              </div>
              <Button 
                onClick={calculateNewCohortAnalysis} 
                loading={calculating}
                primary
              >
                Calculate Cohorts
              </Button>
            </div>
          </div>

          {!cohortData || !cohortData.summary ? (
            <div style={{ textAlign: 'center', padding: '40px' }}>
              <Text as="p" tone="subdued">No cohort analysis available. Click "Calculate Cohorts" to generate analysis.</Text>
            </div>
          ) : (
            <>
              {/* Cohort Summary */}
              <Layout>
                <Layout.Section oneThird>
                  <Card sectioned>
                    <div style={{ textAlign: 'center' }}>
                      <Text variant="headingLg" as="h4">
                        {cohortData.summary.totalCohorts}
                      </Text>
                      <Text as="p" tone="subdued">Total Cohorts</Text>
                      <Text as="p" tone="subdued" variant="bodySm">
                        {selectedCohortType.replace('_', ' ')}
                      </Text>
                    </div>
                  </Card>
                </Layout.Section>

                <Layout.Section oneThird>
                  <Card sectioned>
                    <div style={{ textAlign: 'center' }}>
                      <Text variant="headingLg" as="h4">
                        {formatPercentage(cohortData.summary.avgConversionRate)}
                      </Text>
                      <Text as="p" tone="subdued">Avg Conversion Rate</Text>
                      <Text as="p" tone="subdued" variant="bodySm">
                        {formatNumber(cohortData.summary.totalConversions)} conversions
                      </Text>
                    </div>
                  </Card>
                </Layout.Section>

                <Layout.Section oneThird>
                  <Card sectioned>
                    <div style={{ textAlign: 'center' }}>
                      <Text variant="headingLg" as="h4">
                        {formatNumber(cohortData.summary.totalVisitors)}
                      </Text>
                      <Text as="p" tone="subdued">Total Visitors</Text>
                      <Text as="p" tone="subdued" variant="bodySm">
                        Across all cohorts
                      </Text>
                    </div>
                  </Card>
                </Layout.Section>
              </Layout>

              {/* Best and Worst Performers */}
              {(cohortData.summary.bestPerformingCohort || cohortData.summary.worstPerformingCohort) && (
                <div style={{ marginTop: '20px' }}>
                  <Layout>
                    {cohortData.summary.bestPerformingCohort && (
                      <Layout.Section oneHalf>
                        <Card sectioned>
                          <div style={{ textAlign: 'center' }}>
                            <Badge tone="success">Best Performer</Badge>
                            <Text variant="headingMd" as="h4" style={{ marginTop: '8px' }}>
                              {cohortData.summary.bestPerformingCohort}
                            </Text>
                            <Text as="p" tone="subdued">
                              Highest conversion rate
                            </Text>
                          </div>
                        </Card>
                      </Layout.Section>
                    )}
                    
                    {cohortData.summary.worstPerformingCohort && (
                      <Layout.Section oneHalf>
                        <Card sectioned>
                          <div style={{ textAlign: 'center' }}>
                            <Badge tone="warning">Needs Attention</Badge>
                            <Text variant="headingMd" as="h4" style={{ marginTop: '8px' }}>
                              {cohortData.summary.worstPerformingCohort}
                            </Text>
                            <Text as="p" tone="subdued">
                              Lowest conversion rate
                            </Text>
                          </div>
                        </Card>
                      </Layout.Section>
                    )}
                  </Layout>
                </div>
              )}

              {/* Detailed Cohort Analysis */}
              {cohortData.cohortAnalysis && cohortData.cohortAnalysis.length > 0 && (
                <div style={{ marginTop: '20px' }}>
                  <Card sectioned>
                    <Text variant="headingMd" as="h4" style={{ marginBottom: '16px' }}>
                      Cohort Performance Details
                    </Text>
                    <div style={{ maxHeight: '500px', overflowY: 'auto' }}>
                      {cohortData.cohortAnalysis
                        .sort((a, b) => b.conversion_rate - a.conversion_rate)
                        .map((cohort: any, index: number) => (
                        <div key={cohort.id} style={{
                          padding: '16px',
                          border: '1px solid #e1e5e9',
                          borderRadius: '8px',
                          marginBottom: '12px',
                          backgroundColor: index < 3 ? '#f9fafb' : 'white'
                        }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                            <div>
                              <Text variant="headingMd" as="h5">
                                {cohort.cohort_name}
                              </Text>
                              <Text as="p" tone="subdued" variant="bodySm">
                                Period: {new Date(cohort.cohort_period).toLocaleDateString()}
                              </Text>
                            </div>
                            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                              <Badge tone={getPerformanceBadge(cohort.conversion_rate, cohortData.summary.avgConversionRate).tone}>
                                {getPerformanceBadge(cohort.conversion_rate, cohortData.summary.avgConversionRate).label}
                              </Badge>
                              <Badge tone={getSignificanceBadge(cohort.is_significant).tone}>
                                {getSignificanceBadge(cohort.is_significant).label}
                              </Badge>
                            </div>
                          </div>

                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '16px' }}>
                            <div>
                              <Text as="p" variant="bodySm" tone="subdued">Visitors</Text>
                              <Text variant="bodyMd" as="p">{formatNumber(cohort.visitors)}</Text>
                            </div>
                            <div>
                              <Text as="p" variant="bodySm" tone="subdued">Conversions</Text>
                              <Text variant="bodyMd" as="p">{formatNumber(cohort.conversions)}</Text>
                            </div>
                            <div>
                              <Text as="p" variant="bodySm" tone="subdued">Conversion Rate</Text>
                              <Text variant="bodyMd" as="p" tone={cohort.conversion_rate > cohortData.summary.avgConversionRate ? 'success' : undefined}>
                                {formatPercentage(cohort.conversion_rate)}
                              </Text>
                            </div>
                            <div>
                              <Text as="p" variant="bodySm" tone="subdued">Revenue</Text>
                              <Text variant="bodyMd" as="p">{formatCurrency(cohort.revenue)}</Text>
                            </div>
                            <div>
                              <Text as="p" variant="bodySm" tone="subdued">Revenue per Visitor</Text>
                              <Text variant="bodyMd" as="p">{formatCurrency(cohort.revenue_per_visitor)}</Text>
                            </div>
                            <div>
                              <Text as="p" variant="bodySm" tone="subdued">Sample Size</Text>
                              <Text variant="bodyMd" as="p">{formatNumber(cohort.visitors)}</Text>
                            </div>
                          </div>

                          {/* Confidence Interval */}
                          <div style={{ marginTop: '12px', padding: '8px', backgroundColor: '#f1f2f3', borderRadius: '4px' }}>
                            <Text as="p" variant="bodySm">
                              <strong>95% Confidence Interval:</strong> {' '}
                              {formatPercentage(cohort.confidence_interval_lower)} - {formatPercentage(cohort.confidence_interval_upper)}
                            </Text>
                          </div>

                          {/* Performance Bar */}
                          <div style={{ marginTop: '12px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                              <Text as="p" variant="bodySm" tone="subdued">
                                Performance vs Average
                              </Text>
                              <Text as="p" variant="bodySm">
                                {cohort.conversion_rate > cohortData.summary.avgConversionRate ? '+' : ''}
                                {((cohort.conversion_rate - cohortData.summary.avgConversionRate) / cohortData.summary.avgConversionRate * 100).toFixed(1)}%
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
                                backgroundColor: cohort.conversion_rate > cohortData.summary.avgConversionRate ? '#00a047' : '#d72c0d',
                                width: `${Math.min(100, Math.abs((cohort.conversion_rate - cohortData.summary.avgConversionRate) / cohortData.summary.avgConversionRate) * 100)}%`,
                                transition: 'width 0.3s ease'
                              }} />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </Card>
                </div>
              )}

              {/* Cohort Comparison Chart */}
              <div style={{ marginTop: '20px' }}>
                <Card sectioned>
                  <Text variant="headingMd" as="h4" style={{ marginBottom: '16px' }}>
                    Cohort Comparison Chart
                  </Text>
                  <div style={{ padding: '20px' }}>
                    {cohortData.cohortAnalysis
                      .sort((a, b) => b.conversion_rate - a.conversion_rate)
                      .slice(0, 10)
                      .map((cohort: any, index: number) => {
                        const maxRate = Math.max(...cohortData.cohortAnalysis.map(c => c.conversion_rate));
                        const barWidth = maxRate > 0 ? (cohort.conversion_rate / maxRate) * 100 : 0;
                        
                        return (
                          <div key={cohort.id} style={{ marginBottom: '16px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                              <Text as="p" variant="bodyMd">
                                {cohort.cohort_name}
                              </Text>
                              <Text as="p" variant="bodyMd">
                                {formatPercentage(cohort.conversion_rate)}
                              </Text>
                            </div>
                            <div style={{ 
                              height: '8px',
                              backgroundColor: '#e1e5e9',
                              borderRadius: '4px',
                              overflow: 'hidden'
                            }}>
                              <div style={{
                                height: '100%',
                                backgroundColor: index < 3 ? '#00a047' : index < 6 ? '#6371c7' : '#d9822b',
                                width: `${barWidth}%`,
                                transition: 'width 0.5s ease',
                                borderRadius: '4px'
                              }} />
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </Card>
              </div>
            </>
          )}
        </Card>
      </Layout.Section>
    </Layout>
  );
}