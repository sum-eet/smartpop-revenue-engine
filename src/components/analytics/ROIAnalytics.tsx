import React, { useState, useEffect } from 'react';
import { Card, Layout, Text, Button, SkeletonBodyText, Banner, Badge, Select } from '@shopify/polaris';

interface ROIAnalyticsProps {
  shop: string;
  authToken?: string;
  timeframe: string;
}

interface ROIData {
  roiCalculations: any[];
  summary: {
    avgROI: number;
    totalRevenue: number;
    totalCost: number;
    totalROI: number;
    bestPerformingPeriod: any;
  };
}

export function ROIAnalytics({ shop, authToken, timeframe }: ROIAnalyticsProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [roiData, setRoiData] = useState<ROIData | null>(null);
  const [selectedPopup, setSelectedPopup] = useState('all');
  const [calculating, setCalculating] = useState(false);

  useEffect(() => {
    loadROIData();
  }, [timeframe, selectedPopup, shop]);

  const loadROIData = async () => {
    if (!shop) return;
    
    setLoading(true);
    setError(null);

    try {
      const baseUrl = import.meta.env.VITE_SUPABASE_URL?.replace('/rest/v1', '') || '';
      const popupParam = selectedPopup !== 'all' ? `&popupId=${selectedPopup}` : '';
      const response = await fetch(
        `${baseUrl}/functions/v1/advanced-analytics?type=roi&timeframe=${timeframe}${popupParam}`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${authToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error(`ROI analytics request failed: ${response.status}`);
      }

      const data = await response.json();
      setRoiData(data);
    } catch (err) {
      console.error('Failed to load ROI data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load ROI analytics');
    } finally {
      setLoading(false);
    }
  };

  const calculateNewROI = async () => {
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
            type: 'roi',
            timeframe,
            popupId: selectedPopup !== 'all' ? selectedPopup : undefined
          })
        }
      );

      if (!response.ok) {
        throw new Error(`ROI calculation failed: ${response.status}`);
      }

      // Reload data after calculation
      await loadROIData();
    } catch (err) {
      console.error('Failed to calculate ROI:', err);
      setError(err instanceof Error ? err.message : 'Failed to calculate ROI');
    } finally {
      setCalculating(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', { 
      style: 'currency', 
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(amount || 0);
  };

  const formatPercentage = (value: number) => {
    return `${(value || 0).toFixed(2)}%`;
  };

  const getROIStatus = (roi: number) => {
    if (roi > 100) return { tone: 'success' as const, label: 'Excellent' };
    if (roi > 50) return { tone: 'success' as const, label: 'Good' };
    if (roi > 0) return { tone: 'warning' as const, label: 'Positive' };
    return { tone: 'critical' as const, label: 'Negative' };
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
          <Banner status="critical" title="ROI Analytics Error">
            <p>{error}</p>
            <Button onClick={loadROIData}>Retry</Button>
          </Banner>
        </Layout.Section>
      )}

      <Layout.Section>
        <Card sectioned>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <Text variant="headingMd" as="h3">ROI Analysis</Text>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
              <div style={{ minWidth: '200px' }}>
                <Select
                  options={[
                    { label: 'All Popups', value: 'all' },
                    // Add popup options here when available
                  ]}
                  value={selectedPopup}
                  onChange={setSelectedPopup}
                />
              </div>
              <Button 
                onClick={calculateNewROI} 
                loading={calculating}
                primary
              >
                Calculate ROI
              </Button>
            </div>
          </div>

          {!roiData || !roiData.summary ? (
            <div style={{ textAlign: 'center', padding: '40px' }}>
              <Text as="p" tone="subdued">No ROI data available. Click "Calculate ROI" to generate analysis.</Text>
            </div>
          ) : (
            <>
              {/* ROI Summary */}
              <Layout>
                <Layout.Section oneThird>
                  <Card sectioned>
                    <div style={{ textAlign: 'center' }}>
                      <Text variant="headingLg" as="h4">
                        {formatPercentage(roiData.summary.totalROI)}
                      </Text>
                      <Text as="p" tone="subdued">Total ROI</Text>
                      <div style={{ marginTop: '8px' }}>
                        <Badge tone={getROIStatus(roiData.summary.totalROI).tone}>
                          {getROIStatus(roiData.summary.totalROI).label}
                        </Badge>
                      </div>
                    </div>
                  </Card>
                </Layout.Section>

                <Layout.Section oneThird>
                  <Card sectioned>
                    <div style={{ textAlign: 'center' }}>
                      <Text variant="headingLg" as="h4">
                        {formatCurrency(roiData.summary.totalRevenue)}
                      </Text>
                      <Text as="p" tone="subdued">Total Revenue</Text>
                      <Text as="p" tone="subdued" variant="bodySm">
                        Cost: {formatCurrency(roiData.summary.totalCost)}
                      </Text>
                    </div>
                  </Card>
                </Layout.Section>

                <Layout.Section oneThird>
                  <Card sectioned>
                    <div style={{ textAlign: 'center' }}>
                      <Text variant="headingLg" as="h4">
                        {formatPercentage(roiData.summary.avgROI)}
                      </Text>
                      <Text as="p" tone="subdued">Average ROI</Text>
                      <Text as="p" tone="subdued" variant="bodySm">
                        Across all periods
                      </Text>
                    </div>
                  </Card>
                </Layout.Section>
              </Layout>

              {/* Best Performing Period */}
              {roiData.summary.bestPerformingPeriod && (
                <div style={{ marginTop: '20px' }}>
                  <Card sectioned>
                    <Text variant="headingMd" as="h4">Best Performing Period</Text>
                    <Layout>
                      <Layout.Section oneHalf>
                        <div style={{ padding: '16px 0' }}>
                          <Text as="p">
                            <strong>Period:</strong> {' '}
                            {new Date(roiData.summary.bestPerformingPeriod.calculation_period_start).toLocaleDateString()} - {' '}
                            {new Date(roiData.summary.bestPerformingPeriod.calculation_period_end).toLocaleDateString()}
                          </Text>
                          <Text as="p">
                            <strong>ROI:</strong> {formatPercentage(roiData.summary.bestPerformingPeriod.roi_percentage)}
                          </Text>
                          <Text as="p">
                            <strong>ROAS:</strong> {roiData.summary.bestPerformingPeriod.roas?.toFixed(2)}x
                          </Text>
                        </div>
                      </Layout.Section>
                      <Layout.Section oneHalf>
                        <div style={{ padding: '16px 0' }}>
                          <Text as="p">
                            <strong>Revenue:</strong> {formatCurrency(roiData.summary.bestPerformingPeriod.attributed_revenue)}
                          </Text>
                          <Text as="p">
                            <strong>Cost per conversion:</strong> {formatCurrency(roiData.summary.bestPerformingPeriod.cost_per_conversion)}
                          </Text>
                          <Text as="p">
                            <strong>Lift over baseline:</strong> {formatPercentage(roiData.summary.bestPerformingPeriod.lift_over_baseline)}
                          </Text>
                        </div>
                      </Layout.Section>
                    </Layout>
                  </Card>
                </div>
              )}

              {/* Detailed ROI Calculations */}
              {roiData.roiCalculations && roiData.roiCalculations.length > 0 && (
                <div style={{ marginTop: '20px' }}>
                  <Card sectioned>
                    <Text variant="headingMd" as="h4">ROI Calculation History</Text>
                    <div style={{ marginTop: '16px', maxHeight: '400px', overflowY: 'auto' }}>
                      {roiData.roiCalculations.map((calculation: any, index: number) => (
                        <div key={calculation.id} style={{
                          padding: '16px',
                          border: '1px solid #e1e5e9',
                          borderRadius: '8px',
                          marginBottom: '12px',
                          backgroundColor: index === 0 ? '#f9fafb' : 'white'
                        }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <div>
                              <Text variant="bodyMd" as="p">
                                <strong>
                                  {new Date(calculation.calculation_period_start).toLocaleDateString()} - {' '}
                                  {new Date(calculation.calculation_period_end).toLocaleDateString()}
                                </strong>
                              </Text>
                              <Text as="p" tone="subdued" variant="bodySm">
                                {calculation.popup_id ? `Popup: ${calculation.popup_id.slice(0, 8)}...` : 'All Popups'}
                              </Text>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                              <Badge tone={getROIStatus(calculation.roi_percentage).tone}>
                                {formatPercentage(calculation.roi_percentage)} ROI
                              </Badge>
                            </div>
                          </div>
                          
                          <div style={{ marginTop: '12px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '12px' }}>
                            <div>
                              <Text as="p" variant="bodySm" tone="subdued">Revenue</Text>
                              <Text as="p">{formatCurrency(calculation.attributed_revenue)}</Text>
                            </div>
                            <div>
                              <Text as="p" variant="bodySm" tone="subdued">Cost</Text>
                              <Text as="p">{formatCurrency(calculation.total_cost)}</Text>
                            </div>
                            <div>
                              <Text as="p" variant="bodySm" tone="subdued">ROAS</Text>
                              <Text as="p">{calculation.roas?.toFixed(2)}x</Text>
                            </div>
                            <div>
                              <Text as="p" variant="bodySm" tone="subdued">Incremental Revenue</Text>
                              <Text as="p">{formatCurrency(calculation.incremental_revenue)}</Text>
                            </div>
                            <div>
                              <Text as="p" variant="bodySm" tone="subdued">Cost per Conversion</Text>
                              <Text as="p">{formatCurrency(calculation.cost_per_conversion)}</Text>
                            </div>
                            <div>
                              <Text as="p" variant="bodySm" tone="subdued">Revenue per Visitor</Text>
                              <Text as="p">{formatCurrency(calculation.revenue_per_visitor)}</Text>
                            </div>
                          </div>

                          <div style={{ marginTop: '12px', padding: '8px', backgroundColor: '#f1f2f3', borderRadius: '4px' }}>
                            <Text as="p" variant="bodySm">
                              <strong>Conversion Rate:</strong> {formatPercentage(calculation.actual_conversion_rate * 100)} {' '}
                              (Baseline: {formatPercentage(calculation.baseline_conversion_rate * 100)}) {' '}
                              <strong>Lift:</strong> {formatPercentage(calculation.lift_over_baseline)}
                            </Text>
                          </div>
                        </div>
                      ))}
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