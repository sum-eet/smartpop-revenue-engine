import React, { useState, useEffect } from 'react';
import { Card, Layout, Text, Button, SkeletonBodyText, Banner, Badge, Tabs } from '@shopify/polaris';

interface StatisticalInsightsProps {
  shop: string;
  authToken?: string;
  timeframe: string;
}

interface InsightsData {
  correlationAnalysis: Array<{
    factor1: string;
    factor2: string;
    correlation: number;
    significance: number;
    description: string;
  }>;
  predictiveModels: Array<{
    model: string;
    accuracy: number;
    predictions: any[];
    description: string;
  }>;
  statisticalTests: Array<{
    test: string;
    result: string;
    pValue: number;
    conclusion: string;
  }>;
  recommendations: Array<{
    category: string;
    priority: 'high' | 'medium' | 'low';
    recommendation: string;
    expectedImpact: string;
    confidence: number;
  }>;
}

export function StatisticalInsights({ shop, authToken, timeframe }: StatisticalInsightsProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [insightsData, setInsightsData] = useState<InsightsData | null>(null);
  const [selectedTab, setSelectedTab] = useState(0);

  const tabs = [
    { id: 'correlations', content: 'Correlations', panelID: 'correlations-panel' },
    { id: 'predictions', content: 'Predictions', panelID: 'predictions-panel' },
    { id: 'tests', content: 'Statistical Tests', panelID: 'tests-panel' },
    { id: 'recommendations', content: 'Recommendations', panelID: 'recommendations-panel' },
  ];

  useEffect(() => {
    generateInsights();
  }, [timeframe, shop]);

  const generateInsights = async () => {
    if (!shop) return;
    
    setLoading(true);
    setError(null);

    try {
      // Since we don't have a real insights API yet, we'll generate mock insights
      // In production, this would call the advanced analytics API
      const mockInsights = generateMockInsights();
      setInsightsData(mockInsights);
    } catch (err) {
      console.error('Failed to generate insights:', err);
      setError(err instanceof Error ? err.message : 'Failed to generate statistical insights');
    } finally {
      setLoading(false);
    }
  };

  const generateMockInsights = (): InsightsData => {
    return {
      correlationAnalysis: [
        {
          factor1: 'Time on Site',
          factor2: 'Conversion Rate',
          correlation: 0.73,
          significance: 0.001,
          description: 'Strong positive correlation between time spent on site and conversion likelihood.'
        },
        {
          factor1: 'Mobile Device',
          factor2: 'Bounce Rate',
          correlation: 0.42,
          significance: 0.023,
          description: 'Mobile users show higher bounce rates compared to desktop users.'
        },
        {
          factor1: 'Scroll Depth',
          factor2: 'Email Submission',
          correlation: 0.68,
          significance: 0.002,
          description: 'Users who scroll deeper are more likely to submit email addresses.'
        },
        {
          factor1: 'Exit Intent',
          factor2: 'Popup Engagement',
          correlation: 0.31,
          significance: 0.045,
          description: 'Exit intent detection correlates with popup interaction rates.'
        },
        {
          factor1: 'Traffic Source (Organic)',
          factor2: 'Session Duration',
          correlation: 0.56,
          significance: 0.007,
          description: 'Organic traffic tends to have longer session durations.'
        }
      ],
      predictiveModels: [
        {
          model: 'Conversion Probability',
          accuracy: 84.2,
          predictions: [
            { segment: 'First-time mobile visitors', probability: 0.12, confidence: 0.89 },
            { segment: 'Returning desktop users', probability: 0.34, confidence: 0.92 },
            { segment: 'High engagement sessions', probability: 0.67, confidence: 0.95 },
            { segment: 'Cart abandoners', probability: 0.23, confidence: 0.87 }
          ],
          description: 'Predicts likelihood of email conversion based on behavioral patterns.'
        },
        {
          model: 'Optimal Popup Timing',
          accuracy: 76.8,
          predictions: [
            { segment: 'Mobile users', optimalTime: '15 seconds', liftPotential: '23%' },
            { segment: 'Desktop users', optimalTime: '8 seconds', liftPotential: '18%' },
            { segment: 'Returning visitors', optimalTime: '25 seconds', liftPotential: '31%' },
            { segment: 'High-intent users', optimalTime: '5 seconds', liftPotential: '42%' }
          ],
          description: 'Recommends optimal timing for popup display based on user characteristics.'
        }
      ],
      statisticalTests: [
        {
          test: 'Mobile vs Desktop Conversion Rates',
          result: 'Statistically Significant',
          pValue: 0.012,
          conclusion: 'Desktop users convert 28% better than mobile users (p=0.012)'
        },
        {
          test: 'Time-based Popup Performance',
          result: 'Significant Difference',
          pValue: 0.034,
          conclusion: 'Popups shown after 10s perform 15% better than immediate display'
        },
        {
          test: 'Traffic Source Impact on Revenue',
          result: 'Highly Significant',
          pValue: 0.003,
          conclusion: 'Organic traffic generates 2.3x higher revenue per visitor'
        },
        {
          test: 'Seasonal Conversion Patterns',
          result: 'Not Significant',
          pValue: 0.156,
          conclusion: 'No significant seasonal variation in conversion rates detected'
        }
      ],
      recommendations: [
        {
          category: 'Optimization',
          priority: 'high',
          recommendation: 'Implement delayed popup timing for desktop users (8 seconds)',
          expectedImpact: '+18% conversion rate improvement',
          confidence: 0.89
        },
        {
          category: 'Targeting',
          priority: 'high',
          recommendation: 'Create mobile-specific popup designs with larger touch targets',
          expectedImpact: '+12% mobile conversion rate',
          confidence: 0.76
        },
        {
          category: 'Content',
          priority: 'medium',
          recommendation: 'Focus acquisition efforts on organic search channels',
          expectedImpact: '+35% revenue per visitor',
          confidence: 0.92
        },
        {
          category: 'Testing',
          priority: 'medium',
          recommendation: 'A/B test scroll-triggered vs time-triggered popups',
          expectedImpact: '+22% overall performance',
          confidence: 0.68
        },
        {
          category: 'Personalization',
          priority: 'low',
          recommendation: 'Implement returning visitor recognition with different messaging',
          expectedImpact: '+8% returning visitor conversion',
          confidence: 0.54
        }
      ]
    };
  };

  const formatCorrelation = (correlation: number) => {
    const abs = Math.abs(correlation);
    if (abs >= 0.7) return { strength: 'Strong', color: '#00a047' };
    if (abs >= 0.4) return { strength: 'Moderate', color: '#6371c7' };
    if (abs >= 0.2) return { strength: 'Weak', color: '#d9822b' };
    return { strength: 'Very Weak', color: '#d72c0d' };
  };

  const getPriorityBadge = (priority: 'high' | 'medium' | 'low') => {
    switch (priority) {
      case 'high':
        return { tone: 'critical' as const, label: 'High Priority' };
      case 'medium':
        return { tone: 'warning' as const, label: 'Medium Priority' };
      case 'low':
        return { tone: 'info' as const, label: 'Low Priority' };
    }
  };

  const renderTabContent = () => {
    if (!insightsData) return null;

    const currentTab = tabs[selectedTab];

    switch (currentTab.id) {
      case 'correlations':
        return <CorrelationAnalysis correlations={insightsData.correlationAnalysis} />;
      case 'predictions':
        return <PredictiveModels models={insightsData.predictiveModels} />;
      case 'tests':
        return <StatisticalTests tests={insightsData.statisticalTests} />;
      case 'recommendations':
        return <Recommendations recommendations={insightsData.recommendations} />;
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
          <Banner tone="critical" title="Statistical Insights Error">
            <p>{error}</p>
            <Button onClick={generateInsights}>Retry</Button>
          </Banner>
        </Layout.Section>
      )}

      <Layout.Section>
        <Card >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <Text variant="headingMd" as="h3">Statistical Insights</Text>
            <Button onClick={generateInsights} loading={loading}>
              Regenerate Insights
            </Button>
          </div>

          {insightsData && (
            <Tabs tabs={tabs} selected={selectedTab} onSelect={setSelectedTab}>
              <div style={{ marginTop: '20px' }}>
                {renderTabContent()}
              </div>
            </Tabs>
          )}
        </Card>
      </Layout.Section>
    </Layout>
  );
}

function CorrelationAnalysis({ correlations }: { correlations: any[] }) {
  const formatCorrelation = (correlation: number) => {
    const abs = Math.abs(correlation);
    if (abs >= 0.7) return { strength: 'Strong', color: '#00a047' };
    if (abs >= 0.4) return { strength: 'Moderate', color: '#6371c7' };
    if (abs >= 0.2) return { strength: 'Weak', color: '#d9822b' };
    return { strength: 'Very Weak', color: '#d72c0d' };
  };

  return (
    <Card >
      <div style={{ marginBottom: '16px' }}>
        <Text variant="headingMd" as="h4">
          Factor Correlations
        </Text>
      </div>
      <div style={{ maxHeight: '500px', overflowY: 'auto' }}>
        {correlations.map((correlation, index) => {
          const corr = formatCorrelation(correlation.correlation);
          const isPositive = correlation.correlation > 0;
          
          return (
            <div key={index} style={{
              padding: '16px',
              border: '1px solid #e1e5e9',
              borderRadius: '8px',
              marginBottom: '12px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                <div>
                  <Text variant="bodyMd" as="p">
                    <strong>{correlation.factor1}</strong> ↔ <strong>{correlation.factor2}</strong>
                  </Text>
                  <Text as="p" tone="subdued" variant="bodySm">
                    {correlation.description}
                  </Text>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <Badge tone={corr.strength === 'Strong' ? 'success' : corr.strength === 'Moderate' ? 'info' : 'warning'}>
                    {`${corr.strength} ${isPositive ? 'Positive' : 'Negative'}`}
                  </Badge>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                    <Text as="p" variant="bodySm" tone="subdued">
                      Correlation Coefficient
                    </Text>
                    <Text as="p" variant="bodySm">
                      {correlation.correlation > 0 ? '+' : ''}{correlation.correlation.toFixed(3)}
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
                      backgroundColor: corr.color,
                      width: `${Math.abs(correlation.correlation) * 100}%`,
                      transition: 'width 0.3s ease'
                    }} />
                  </div>
                </div>
                <div style={{ textAlign: 'right', minWidth: '100px' }}>
                  <Text as="p" variant="bodySm" tone="subdued">p-value</Text>
                  <Text as="p" variant="bodySm" tone={correlation.significance < 0.05 ? 'success' : 'critical'}>
                    {correlation.significance.toFixed(3)}
                  </Text>
                  {correlation.significance < 0.05 && (
                    <Text as="p" variant="bodySm" tone="success">Significant</Text>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

function PredictiveModels({ models }: { models: any[] }) {
  return (
    <Layout>
      {models.map((model, index) => (
        <Layout.Section key={index}>
          <Card >
            <div style={{ marginBottom: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text variant="headingMd" as="h5">{model.model}</Text>
                <Badge tone="info">{`${model.accuracy}% Accuracy`}</Badge>
              </div>
              <Text as="p" tone="subdued" variant="bodySm">
                {model.description}
              </Text>
            </div>

            <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
              {model.predictions.map((prediction: any, predIndex: number) => (
                <div key={predIndex} style={{
                  padding: '12px',
                  border: '1px solid #e1e5e9',
                  borderRadius: '6px',
                  marginBottom: '8px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <div>
                    <Text as="p" variant="bodyMd">
                      {prediction.segment || prediction.optimalTime}
                    </Text>
                    {prediction.probability && (
                      <Text as="p" tone="subdued" variant="bodySm">
                        Confidence: {(prediction.confidence * 100).toFixed(1)}%
                      </Text>
                    )}
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    {prediction.probability && (
                      <Text as="p" variant="bodyMd">
                        {(prediction.probability * 100).toFixed(1)}% probability
                      </Text>
                    )}
                    {prediction.liftPotential && (
                      <Text as="p" variant="bodyMd" tone="success">
                        {prediction.liftPotential} lift
                      </Text>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </Layout.Section>
      ))}
    </Layout>
  );
}

function StatisticalTests({ tests }: { tests: any[] }) {
  return (
    <Card >
      <div style={{ marginBottom: '16px' }}>
        <Text variant="headingMd" as="h4">
          Statistical Test Results
        </Text>
      </div>
      <div style={{ maxHeight: '500px', overflowY: 'auto' }}>
        {tests.map((test, index) => (
          <div key={index} style={{
            padding: '16px',
            border: '1px solid #e1e5e9',
            borderRadius: '8px',
            marginBottom: '12px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
              <div>
                <Text variant="bodyMd" as="p">
                  <strong>{test.test}</strong>
                </Text>
                <Text as="p" tone="subdued" variant="bodySm">
                  {test.conclusion}
                </Text>
              </div>
              <div style={{ textAlign: 'right' }}>
                <Badge tone={test.pValue < 0.05 ? 'success' : 'critical'}>
                  {test.result}
                </Badge>
                <div style={{ marginTop: '4px' }}>
                  <Text as="p" tone="subdued" variant="bodySm">
                    p = {test.pValue.toFixed(3)}
                  </Text>
                </div>
              </div>
            </div>

            <div style={{ 
              padding: '8px', 
              backgroundColor: test.pValue < 0.05 ? '#f0f9ff' : '#fef7f0', 
              borderRadius: '4px' 
            }}>
              <Text as="p" variant="bodySm">
                <strong>Interpretation:</strong> {' '}
                {test.pValue < 0.05 
                  ? 'The observed difference is statistically significant and unlikely due to chance.'
                  : 'The observed difference could be due to random variation.'}
              </Text>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

function Recommendations({ recommendations }: { recommendations: any[] }) {
  const getPriorityBadge = (priority: 'high' | 'medium' | 'low') => {
    switch (priority) {
      case 'high':
        return { tone: 'critical' as const, label: 'High Priority' };
      case 'medium':
        return { tone: 'warning' as const, label: 'Medium Priority' };
      case 'low':
        return { tone: 'info' as const, label: 'Low Priority' };
    }
  };

  return (
    <Card >
      <div style={{ marginBottom: '16px' }}>
        <Text variant="headingMd" as="h4">
          Data-Driven Recommendations
        </Text>
      </div>
      <div style={{ maxHeight: '600px', overflowY: 'auto' }}>
        {recommendations
          .sort((a, b) => {
            const priorityOrder = { high: 3, medium: 2, low: 1 };
            return priorityOrder[b.priority] - priorityOrder[a.priority];
          })
          .map((rec, index) => (
            <div key={index} style={{
              padding: '16px',
              border: '1px solid #e1e5e9',
              borderRadius: '8px',
              marginBottom: '12px',
              backgroundColor: rec.priority === 'high' ? '#fef7f0' : 'white'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                    <Badge tone={getPriorityBadge(rec.priority).tone}>
                      {getPriorityBadge(rec.priority).label}
                    </Badge>
                    <Badge tone="info">{rec.category}</Badge>
                  </div>
                  <Text variant="bodyMd" as="p">
                    <strong>{rec.recommendation}</strong>
                  </Text>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <Text as="p" variant="bodyMd" tone="success">
                    {rec.expectedImpact}
                  </Text>
                  <Text as="p" tone="subdued" variant="bodySm">
                    {(rec.confidence * 100).toFixed(0)}% confidence
                  </Text>
                </div>
              </div>

              {/* Confidence Bar */}
              <div style={{ marginTop: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                  <Text as="p" variant="bodySm" tone="subdued">
                    Implementation Confidence
                  </Text>
                  <Text as="p" variant="bodySm">
                    {(rec.confidence * 100).toFixed(0)}%
                  </Text>
                </div>
                <div style={{ 
                  height: '4px',
                  backgroundColor: '#e1e5e9',
                  borderRadius: '2px',
                  overflow: 'hidden'
                }}>
                  <div style={{
                    height: '100%',
                    backgroundColor: rec.confidence >= 0.8 ? '#00a047' : rec.confidence >= 0.6 ? '#6371c7' : '#d9822b',
                    width: `${rec.confidence * 100}%`,
                    transition: 'width 0.3s ease'
                  }} />
                </div>
              </div>
            </div>
          ))}
      </div>
    </Card>
  );
}