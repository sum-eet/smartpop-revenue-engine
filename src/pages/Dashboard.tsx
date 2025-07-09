import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, BarChart3, Users, DollarSign, MousePointer, Settings, Eye, Edit, Trash2, TrendingUp, Clock, Smartphone, Monitor } from 'lucide-react';
import { PopupCreationModal } from '@/components/PopupCreationModal';

const Dashboard = () => {
  const [isPopupModalOpen, setIsPopupModalOpen] = useState(false);
  const [editingPopup, setEditingPopup] = useState(null);
  const [popups, setPopups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [duplicateIds, setDuplicateIds] = useState([]);
  const [analytics, setAnalytics] = useState({
    totalEvents: 0,
    views: 0,
    conversions: 0,
    closes: 0,
    conversionRate: 0,
    byPopup: []
  });
  const [comprehensiveAnalytics, setComprehensiveAnalytics] = useState(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(true);
  const [timeframe, setTimeframe] = useState('7d');

  // Calculate total revenue (mock calculation: $5 per conversion)
  const revenuePerConversion = 5;
  const totalRevenue = analytics.conversions * revenuePerConversion;
  const totalConversions = analytics.conversions;
  const totalViews = analytics.views;
  const avgConversionRate = analytics.conversionRate;

  // Fetch popups and analytics from API
  useEffect(() => {
    fetchPopups();
    fetchAnalytics();
  }, []);

  // Refetch analytics when timeframe changes
  useEffect(() => {
    fetchAnalytics();
  }, [timeframe]);

  const fetchPopups = async () => {
    try {
      setLoading(true);
      // Fetch all popups including inactive ones for dashboard
      const response = await fetch('https://zsmoutzjhqjgjehaituw.supabase.co/functions/v1/popup-config?shop=testingstoresumeet.myshopify.com&dashboard=true');
      if (response.ok) {
        const data = await response.json();
        
        console.log(`Fetched ${data.length} popups from API`);
        console.log('Popup IDs from API:', data.map(p => p.id));
        
        setPopups(data);
      }
    } catch (error) {
      console.error('Error fetching popups:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAnalytics = async () => {
    try {
      setAnalyticsLoading(true);
      
      // Fetch basic analytics for backwards compatibility
      const basicResponse = await fetch('https://zsmoutzjhqjgjehaituw.supabase.co/functions/v1/popup-track?shop=testingstoresumeet.myshopify.com');
      if (basicResponse.ok) {
        const basicData = await basicResponse.json();
        setAnalytics(basicData);
      }

      // Fetch comprehensive analytics
      const comprehensiveResponse = await fetch(`https://zsmoutzjhqjgjehaituw.supabase.co/functions/v1/popup-track?analytics=true&shop=testingstoresumeet.myshopify.com&timeframe=${timeframe}`);
      if (comprehensiveResponse.ok) {
        const comprehensiveData = await comprehensiveResponse.json();
        setComprehensiveAnalytics(comprehensiveData);
      }
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setAnalyticsLoading(false);
    }
  };

  const handleEditPopup = (popup: any) => {
    setEditingPopup(popup);
    setIsPopupModalOpen(true);
  };

  const getPopupTypeColor = (type: string) => {
    switch (type) {
      case 'email_capture': return 'bg-blue-500';
      case 'discount_offer': return 'bg-green-500';
      case 'announcement': return 'bg-purple-500';
      case 'survey': return 'bg-orange-500';
      default: return 'bg-gray-500';
    }
  };

  const getTriggerTypeLabel = (type: string, value: string) => {
    switch (type) {
      case 'time_delay': return `After ${value}s`;
      case 'exit_intent': return 'Exit Intent';
      case 'scroll_depth': return `${value}% Scroll`;
      case 'page_view': return `${value} Page Views`;
      case 'click': return 'On Click';
      default: return type;
    }
  };

  // Check if running inside Shopify admin iframe
  const isInShopifyFrame = window !== window.top;

  return (
    <div className={`${isInShopifyFrame ? 'min-h-full' : 'min-h-screen'} bg-gray-50`}>
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">SmartPop Dashboard</h1>
              <p className="text-gray-600">My Awesome Store</p>
            </div>
            <Button 
              className="bg-blue-600 hover:bg-blue-700"
              onClick={() => {
                setEditingPopup(null);
                setIsPopupModalOpen(true);
              }}
            >
              <Plus className="w-4 h-4 mr-2" />
              Create Popup
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Timeframe Selector */}
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold">Analytics Overview</h2>
          <Select value={timeframe} onValueChange={setTimeframe}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1d">Last 24 hours</SelectItem>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="all">All time</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Popup Views</CardTitle>
              <Eye className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {comprehensiveAnalytics ? comprehensiveAnalytics.core_metrics.total_popup_views.toLocaleString() : totalViews.toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground">Total impressions</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Email Opt-ins</CardTitle>
              <MousePointer className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {comprehensiveAnalytics ? comprehensiveAnalytics.core_metrics.total_email_optins.toLocaleString() : totalConversions.toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground">Email captures</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Optin Conversion Rate</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {comprehensiveAnalytics ? comprehensiveAnalytics.core_metrics.optin_conversion_rate.toFixed(1) : avgConversionRate.toFixed(1)}%
              </div>
              <p className="text-xs text-muted-foreground">Views to emails</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Abandonment Rate</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {comprehensiveAnalytics ? comprehensiveAnalytics.core_metrics.abandonment_rate.toFixed(1) : '0.0'}%
              </div>
              <p className="text-xs text-muted-foreground">Views without conversion</p>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <Tabs defaultValue="campaigns" className="space-y-6">
          <TabsList>
            <TabsTrigger value="campaigns">Campaigns</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>
          
          <TabsContent value="campaigns" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Your Popups</CardTitle>
                <CardDescription>
                  Manage your popup campaigns and track their performance
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="text-center py-8">
                    <div className="text-gray-500">Loading popups...</div>
                  </div>
                ) : popups.length === 0 ? (
                  <div className="text-center py-8">
                    <div className="text-gray-500 mb-4">No popups created yet</div>
                    <Button onClick={() => {
                      setEditingPopup(null);
                      setIsPopupModalOpen(true);
                    }}>
                      <Plus className="w-4 h-4 mr-2" />
                      Create Your First Popup
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {popups.map((popup: any) => {
                      const isDuplicate = duplicateIds.includes(popup.id);
                      return (
                      <div key={popup.id} className={`flex items-center justify-between p-4 border rounded-lg ${isDuplicate ? 'bg-red-50 border-red-300' : ''}`}>
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="font-semibold">{popup.name}</h3>
                            {isDuplicate && (
                              <Badge variant="destructive" className="text-xs">
                                DUPLICATE - DELETE ME
                              </Badge>
                            )}
                            <Badge variant={popup.is_active ? 'default' : 'secondary'}>
                              {popup.is_active ? 'Active' : 'Inactive'}
                            </Badge>
                            <Badge 
                              variant="outline" 
                              className={`text-white ${getPopupTypeColor(popup.popup_type)}`}
                            >
                              {popup.popup_type?.replace('_', ' ')}
                            </Badge>
                            <Badge variant="secondary">
                              {getTriggerTypeLabel(popup.trigger_type, popup.trigger_value)}
                            </Badge>
                          </div>
                          <div className="grid grid-cols-4 gap-4 text-sm text-gray-600">
                            <div>
                              <span className="font-medium">{popup.title || 'No title'}</span>
                              <div>Title</div>
                            </div>
                            <div>
                              <span className="font-medium">{popup.page_target?.replace('_', ' ')}</span>
                              <div>Target</div>
                            </div>
                            <div>
                              <span className="font-medium">{new Date(popup.created_at).toLocaleDateString()}</span>
                              <div>Created</div>
                            </div>
                            <div>
                              {(() => {
                                const popupAnalytics = analytics.byPopup?.find(p => p.popupId === popup.id);
                                return (
                                  <>
                                    <span className="font-medium">
                                      {popupAnalytics ? `${popupAnalytics.views} views, ${popupAnalytics.conversions} conversions` : 'No data'}
                                    </span>
                                    <div>Analytics</div>
                                  </>
                                );
                              })()}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={async () => {
                              const newStatus = !popup.is_active;
                              try {
                                const response = await fetch('https://zsmoutzjhqjgjehaituw.supabase.co/functions/v1/popup-config', {
                                  method: 'POST',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({
                                    action: 'toggle_active',
                                    id: popup.id,
                                    is_active: newStatus
                                  })
                                });
                                if (response.ok) {
                                  fetchPopups();
                                } else {
                                  alert('Failed to update popup status');
                                }
                              } catch (error) {
                                console.error('Error toggling popup:', error);
                                alert('Error updating popup status');
                              }
                            }}
                            className={popup.is_active ? 'text-orange-600 hover:text-orange-700' : 'text-green-600 hover:text-green-700'}
                          >
                            {popup.is_active ? 'Deactivate' : 'Activate'}
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleEditPopup(popup)}
                          >
                            <Edit className="w-4 h-4 mr-1" />
                            Edit
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={async () => {
                              if (!confirm('Are you sure you want to permanently delete this popup?')) return;
                              try {
                                const response = await fetch('https://zsmoutzjhqjgjehaituw.supabase.co/functions/v1/popup-config', {
                                  method: 'POST',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({
                                    action: 'delete',
                                    id: popup.id
                                  })
                                });
                                if (response.ok) {
                                  fetchPopups();
                                } else {
                                  alert('Failed to delete popup');
                                }
                              } catch (error) {
                                console.error('Error deleting popup:', error);
                                alert('Error deleting popup');
                              }
                            }}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="analytics" className="space-y-6">
            {analyticsLoading ? (
              <Card>
                <CardContent className="text-center py-8">
                  <div className="text-gray-500">Loading comprehensive analytics...</div>
                </CardContent>
              </Card>
            ) : comprehensiveAnalytics ? (
              <div className="space-y-6">
                {/* Device Analytics */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Smartphone className="h-5 w-5" />
                        Device Performance
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg">
                          <div className="flex items-center gap-3">
                            <Smartphone className="h-8 w-8 text-blue-600" />
                            <div>
                              <div className="font-semibold">Mobile</div>
                              <div className="text-sm text-gray-600">{comprehensiveAnalytics.device_analytics.mobile.views} views</div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-lg font-bold">{comprehensiveAnalytics.device_analytics.mobile.optin_conversion_rate}%</div>
                            <div className="text-sm text-gray-600">{comprehensiveAnalytics.device_analytics.mobile.conversions} conversions</div>
                          </div>
                        </div>
                        
                        <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg">
                          <div className="flex items-center gap-3">
                            <Monitor className="h-8 w-8 text-green-600" />
                            <div>
                              <div className="font-semibold">Desktop</div>
                              <div className="text-sm text-gray-600">{comprehensiveAnalytics.device_analytics.desktop.views} views</div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-lg font-bold">{comprehensiveAnalytics.device_analytics.desktop.optin_conversion_rate}%</div>
                            <div className="text-sm text-gray-600">{comprehensiveAnalytics.device_analytics.desktop.conversions} conversions</div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Peak Hours */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Clock className="h-5 w-5" />
                        Peak Hours (Last 7 Days)
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {comprehensiveAnalytics.peak_hours.slice(0, 5).map((hour: any, index: number) => (
                          <div key={hour.hour} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center text-sm font-medium text-purple-600">
                                #{index + 1}
                              </div>
                              <div>
                                <div className="font-semibold">{hour.hour_display}</div>
                                <div className="text-sm text-gray-600">{hour.views} views</div>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="font-bold text-purple-600">{hour.optin_conversion_rate}%</div>
                              <div className="text-sm text-gray-600">{hour.conversions} conversions</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Top Performing Popups */}
                <Card>
                  <CardHeader>
                    <CardTitle>Top Performing Popups</CardTitle>
                    <CardDescription>Best converting popups by optin rate</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {comprehensiveAnalytics.top_performing_popups.map((popup: any) => (
                        <Card key={popup.popup_id} className="bg-gradient-to-br from-blue-50 to-purple-50">
                          <CardHeader className="pb-3">
                            <CardTitle className="text-base">{popup.name}</CardTitle>
                            <CardDescription>
                              <Badge variant="outline" className="text-xs">
                                {popup.popup_type?.replace('_', ' ')}
                              </Badge>
                            </CardDescription>
                          </CardHeader>
                          <CardContent>
                            <div className="space-y-2">
                              <div className="flex justify-between">
                                <span className="text-sm text-gray-600">Views:</span>
                                <span className="font-medium">{popup.views.toLocaleString()}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-sm text-gray-600">Conversions:</span>
                                <span className="font-medium">{popup.conversions.toLocaleString()}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-sm text-gray-600">Optin Rate:</span>
                                <span className="font-bold text-green-600">{popup.optin_conversion_rate}%</span>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Page Performance & Popup Types */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>Top Converting Pages</CardTitle>
                      <CardDescription>Pages with highest popup conversion rates</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {comprehensiveAnalytics.top_pages.slice(0, 5).map((page: any, index: number) => (
                          <div key={page.page_url} className="flex items-center justify-between p-3 border rounded-lg">
                            <div className="flex-1 min-w-0">
                              <div className="font-medium truncate">{page.page_name}</div>
                              <div className="text-sm text-gray-600 truncate">{page.page_url}</div>
                            </div>
                            <div className="text-right ml-4">
                              <div className="font-bold text-blue-600">{page.optin_conversion_rate}%</div>
                              <div className="text-sm text-gray-600">{page.conversions}/{page.views}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Popup Type Performance</CardTitle>
                      <CardDescription>Performance by popup type</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {comprehensiveAnalytics.popup_type_performance.map((type: any) => (
                          <div key={type.popup_type} className="flex items-center justify-between p-3 border rounded-lg">
                            <div>
                              <div className="font-medium">{type.type_display}</div>
                              <div className="text-sm text-gray-600">{type.views} views</div>
                            </div>
                            <div className="text-right">
                              <div className="font-bold text-green-600">{type.optin_conversion_rate}%</div>
                              <div className="text-sm text-gray-600">{type.conversions} conversions</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Recent Activity */}
                <Card>
                  <CardHeader>
                    <CardTitle>Recent Activity</CardTitle>
                    <CardDescription>Latest popup interactions</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 max-h-96 overflow-y-auto">
                      {comprehensiveAnalytics.recent_activity.slice(0, 20).map((activity: any, index: number) => (
                        <div key={index} className="flex items-center justify-between p-2 text-sm border-b last:border-b-0">
                          <div className="flex items-center gap-3">
                            <Badge variant={activity.event_type === 'conversion' ? 'default' : 'secondary'} className="text-xs">
                              {activity.event_type}
                            </Badge>
                            <span className="text-gray-600">{activity.email || 'Anonymous'}</span>
                          </div>
                          <div className="text-right">
                            <div className="text-gray-500">{activity.time_ago}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            ) : (
              <Card>
                <CardContent className="text-center py-8">
                  <div className="text-gray-500 mb-4">No comprehensive analytics available</div>
                  <p className="text-sm text-gray-400">
                    Analytics will appear here once your popups start receiving views and interactions.
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
          
          <TabsContent value="settings" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>App Settings</CardTitle>
                <CardDescription>
                  Configure your SmartPop integration
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <h4 className="font-medium">Global Popup Settings</h4>
                    <p className="text-sm text-gray-600">Default behavior for all popups</p>
                  </div>
                  <Button variant="outline">Configure</Button>
                </div>
                
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <h4 className="font-medium">Email Integration</h4>
                    <p className="text-sm text-gray-600">Connect with Klaviyo, Mailchimp, etc.</p>
                  </div>
                  <Button variant="outline">Setup</Button>
                </div>
                
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <h4 className="font-medium">Analytics Tracking</h4>
                    <p className="text-sm text-gray-600">Google Analytics, Facebook Pixel</p>
                  </div>
                  <Button variant="outline">Configure</Button>
                </div>
                
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Popup Creation Modal */}
      <PopupCreationModal 
        isOpen={isPopupModalOpen}
        onClose={() => {
          setIsPopupModalOpen(false);
          setEditingPopup(null);
        }}
        onSuccess={() => {
          fetchPopups();
          fetchAnalytics();
        }}
        editingPopup={editingPopup}
      />
    </div>
  );
};

export default Dashboard;
