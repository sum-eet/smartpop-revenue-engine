import React, { useState, useCallback, useMemo } from 'react';
import { Page, Card, Button, Badge, Tabs, Select, Text, Layout, BlockStack, InlineStack } from '@shopify/polaris';
import { PlusIcon, EditIcon, DeleteIcon } from '@shopify/polaris-icons';
import { AnalyticsCardsSkeleton, PopupTableSkeleton } from '@/components/ui/skeleton';
import { PopupCreationModal } from '@/components/PopupCreationModal';
import { usePopups, useTogglePopup, useDeletePopup } from '@/hooks/usePopups';
import { useBasicAnalytics, useComprehensiveAnalytics } from '@/hooks/useAnalytics';
import { useDebounce } from '@/hooks/useDebounce';
import { useAppBridge } from '@/hooks/useAppBridge';

const DashboardPolarisSimple = () => {
  const [isPopupModalOpen, setIsPopupModalOpen] = useState(false);
  const [editingPopup, setEditingPopup] = useState(null);
  const [timeframe, setTimeframe] = useState('7d');
  const [selectedTab, setSelectedTab] = useState(0);
  
  // App Bridge integration
  const { isEmbedded, shopDomain } = useAppBridge();
  
  // Debounce timeframe changes to prevent excessive API calls
  const debouncedTimeframe = useDebounce(timeframe, 300);
  
  // React Query hooks for data fetching
  const { data: popups = [], isLoading: loading } = usePopups();
  const { data: analytics, isLoading: analyticsLoading } = useBasicAnalytics();
  const { data: comprehensiveAnalytics, isLoading: comprehensiveAnalyticsLoading } = useComprehensiveAnalytics(debouncedTimeframe);
  
  // Mutations for popup operations
  const togglePopupMutation = useTogglePopup();
  const deletePopupMutation = useDeletePopup();

  // Memoized calculations for performance
  const calculatedMetrics = useMemo(() => {
    if (!analytics) return { totalRevenue: 0, totalConversions: 0, totalViews: 0, avgConversionRate: 0 };
    return {
      totalRevenue: analytics.conversions * 5,
      totalConversions: analytics.conversions,
      totalViews: analytics.views,
      avgConversionRate: analytics.conversionRate
    };
  }, [analytics]);

  // Handlers
  const handleEditPopup = useCallback((popup: any) => {
    setEditingPopup(popup);
    setIsPopupModalOpen(true);
  }, []);
  
  const handleTogglePopup = useCallback(async (popupId: string, currentStatus: boolean) => {
    try {
      await togglePopupMutation.mutateAsync({
        id: popupId,
        is_active: !currentStatus
      });
    } catch (error) {
      console.error('Error toggling popup:', error);
    }
  }, [togglePopupMutation]);
  
  const handleDeletePopup = useCallback(async (popupId: string) => {
    if (window.confirm('Are you sure you want to delete this popup?')) {
      try {
        await deletePopupMutation.mutateAsync(popupId);
      } catch (error) {
        console.error('Error deleting popup:', error);
      }
    }
  }, [deletePopupMutation]);

  const getPopupTypeColor = (type: string) => {
    switch (type) {
      case 'email_capture': return 'info';
      case 'discount_offer': return 'success';
      case 'announcement': return 'attention';
      case 'survey': return 'warning';
      default: return 'new';
    }
  };

  // Timeframe options
  const timeframeOptions = [
    { label: 'Last 24 hours', value: '1d' },
    { label: 'Last 7 days', value: '7d' },
    { label: 'Last 30 days', value: '30d' },
    { label: 'All time', value: 'all' },
  ];

  // Tab options
  const tabs = [
    { id: 'campaigns', content: 'Campaigns' },
    { id: 'analytics', content: 'Analytics' },
    { id: 'settings', content: 'Settings' },
  ];

  return (
    <Page
      title="SmartPop Dashboard"
      subtitle={`${shopDomain || 'My Awesome Store'}${isEmbedded ? ' (Embedded)' : ''}`}
      primaryAction={{
        content: 'Create Popup',
        onAction: () => {
          setEditingPopup(null);
          setIsPopupModalOpen(true);
        },
        icon: PlusIcon,
      }}
      fullWidth
    >
      <Layout>
        {/* Analytics Overview */}
        <Layout.Section>
          <BlockStack gap="400">
            {/* Header with timeframe selector */}
            <Card>
              <InlineStack align="space-between">
                <Text as="h2" variant="headingLg">Analytics Overview</Text>
                <Select
                  label="Timeframe"
                  labelHidden
                  options={timeframeOptions}
                  value={timeframe}
                  onChange={setTimeframe}
                />
              </InlineStack>
            </Card>

            {/* Analytics Cards */}
            {analyticsLoading || comprehensiveAnalyticsLoading ? (
              <Card>
                <Text as="p" variant="bodyMd">Loading analytics...</Text>
              </Card>
            ) : (
              <InlineStack gap="400" wrap={false}>
                <div style={{ flex: 1 }}>
                  <Card>
                    <BlockStack gap="100">
                      <Text as="p" variant="bodySm" tone="subdued">Popup Views</Text>
                      <Text as="p" variant="heading2xl">
                        {comprehensiveAnalytics ? 
                          comprehensiveAnalytics.core_metrics.total_popup_views.toLocaleString() : 
                          calculatedMetrics.totalViews.toLocaleString()
                        }
                      </Text>
                    </BlockStack>
                  </Card>
                </div>
                <div style={{ flex: 1 }}>
                  <Card>
                    <BlockStack gap="100">
                      <Text as="p" variant="bodySm" tone="subdued">Email Opt-ins</Text>
                      <Text as="p" variant="heading2xl">
                        {comprehensiveAnalytics ? 
                          comprehensiveAnalytics.core_metrics.total_email_optins.toLocaleString() : 
                          calculatedMetrics.totalConversions.toLocaleString()
                        }
                      </Text>
                    </BlockStack>
                  </Card>
                </div>
                <div style={{ flex: 1 }}>
                  <Card>
                    <BlockStack gap="100">
                      <Text as="p" variant="bodySm" tone="subdued">Conversion Rate</Text>
                      <Text as="p" variant="heading2xl">
                        {comprehensiveAnalytics ? 
                          `${comprehensiveAnalytics.core_metrics.optin_conversion_rate.toFixed(1)}%` : 
                          `${calculatedMetrics.avgConversionRate.toFixed(1)}%`
                        }
                      </Text>
                    </BlockStack>
                  </Card>
                </div>
              </InlineStack>
            )}
          </BlockStack>
        </Layout.Section>

        {/* Main Content */}
        <Layout.Section>
          <Card>
            <Tabs
              tabs={tabs}
              selected={selectedTab}
              onSelect={setSelectedTab}
              fitted
            >
              <div style={{ padding: '16px' }}>
                {/* Campaigns Tab */}
                {selectedTab === 0 && (
                  <BlockStack gap="400">
                    <div>
                      <Text as="h3" variant="headingMd">Your Popups</Text>
                      <Text as="p" variant="bodyMd" tone="subdued">
                        Manage your popup campaigns and track their performance
                      </Text>
                    </div>
                    
                    {loading ? (
                      <Card>
                        <Text as="p" variant="bodyMd">Loading popups...</Text>
                      </Card>
                    ) : popups.length === 0 ? (
                      <Card>
                        <div style={{ textAlign: 'center', padding: '40px' }}>
                          <BlockStack gap="400">
                            <Text as="p" variant="bodyMd" tone="subdued">No popups created yet</Text>
                            <Button
                              variant="primary"
                              onClick={() => {
                                setEditingPopup(null);
                                setIsPopupModalOpen(true);
                              }}
                              icon={PlusIcon}
                            >
                              Create Your First Popup
                            </Button>
                          </BlockStack>
                        </div>
                      </Card>
                    ) : (
                      <BlockStack gap="200">
                        {popups.map((popup: any) => (
                          <Card key={popup.id}>
                            <InlineStack align="space-between">
                              <BlockStack gap="200">
                                <InlineStack gap="200" align="start">
                                  <Text as="h4" variant="headingSm">{popup.name}</Text>
                                  <Badge tone={popup.is_active ? 'success' : 'critical'}>
                                    {popup.is_active ? 'Active' : 'Inactive'}
                                  </Badge>
                                  <Badge tone={getPopupTypeColor(popup.popup_type)}>
                                    {popup.popup_type?.replace('_', ' ')}
                                  </Badge>
                                </InlineStack>
                                
                                <Text as="p" variant="bodySm" tone="subdued">
                                  Created: {new Date(popup.created_at).toLocaleDateString()}
                                </Text>
                              </BlockStack>
                              
                              <InlineStack gap="200">
                                <Button
                                  onClick={() => handleTogglePopup(popup.id, popup.is_active)}
                                  loading={togglePopupMutation.isPending}
                                >
                                  {popup.is_active ? 'Deactivate' : 'Activate'}
                                </Button>
                                <Button
                                  onClick={() => handleEditPopup(popup)}
                                  icon={EditIcon}
                                >
                                  Edit
                                </Button>
                                <Button
                                  onClick={() => handleDeletePopup(popup.id)}
                                  loading={deletePopupMutation.isPending}
                                  tone="critical"
                                  icon={DeleteIcon}
                                />
                              </InlineStack>
                            </InlineStack>
                          </Card>
                        ))}
                      </BlockStack>
                    )}
                  </BlockStack>
                )}

                {/* Analytics Tab */}
                {selectedTab === 1 && (
                  <BlockStack gap="400">
                    <Text as="h3" variant="headingMd">Comprehensive Analytics</Text>
                    <Text as="p" variant="bodyMd" tone="subdued">
                      Advanced analytics features with Polaris design system.
                    </Text>
                  </BlockStack>
                )}

                {/* Settings Tab */}
                {selectedTab === 2 && (
                  <BlockStack gap="400">
                    <Text as="h3" variant="headingMd">App Settings</Text>
                    <Text as="p" variant="bodyMd" tone="subdued">
                      Configure your SmartPop integration with Shopify design patterns.
                    </Text>
                  </BlockStack>
                )}
              </div>
            </Tabs>
          </Card>
        </Layout.Section>
      </Layout>

      {/* Keep existing modal for now */}
      <PopupCreationModal 
        isOpen={isPopupModalOpen}
        onClose={() => {
          setIsPopupModalOpen(false);
          setEditingPopup(null);
        }}
        onSuccess={() => {
          // React Query will auto-refetch
        }}
        editingPopup={editingPopup}
      />
    </Page>
  );
};

export default DashboardPolarisSimple;