
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, BarChart3, Users, DollarSign, MousePointer, Settings, Eye } from 'lucide-react';
import { PopupCreationModal } from '@/components/PopupCreationModal';

const Dashboard = () => {
  const [isPopupModalOpen, setIsPopupModalOpen] = useState(false);
  const [campaigns] = useState([
    {
      id: 1,
      name: 'Welcome New Visitors',
      type: 'Email Capture',
      status: 'active',
      views: 2450,
      conversions: 245,
      revenue: 1220,
      conversionRate: 10.0
    },
    {
      id: 2,
      name: 'Cart Abandonment Recovery',
      type: 'Cart Recovery',
      status: 'active',
      views: 890,
      conversions: 134,
      revenue: 2680,
      conversionRate: 15.1
    },
    {
      id: 3,
      name: 'Exit Intent Discount',
      type: 'Exit Intent',
      status: 'paused',
      views: 1200,
      conversions: 84,
      revenue: 420,
      conversionRate: 7.0
    }
  ]);

  const totalRevenue = campaigns.reduce((sum, campaign) => sum + campaign.revenue, 0);
  const totalConversions = campaigns.reduce((sum, campaign) => sum + campaign.conversions, 0);
  const totalViews = campaigns.reduce((sum, campaign) => sum + campaign.views, 0);
  const avgConversionRate = totalViews > 0 ? (totalConversions / totalViews) * 100 : 0;

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
              onClick={() => setIsPopupModalOpen(true)}
            >
              <Plus className="w-4 h-4 mr-2" />
              Create Popup
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${totalRevenue.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">+12.5% from last month</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Conversions</CardTitle>
              <MousePointer className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalConversions.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">+8.2% from last month</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Popup Views</CardTitle>
              <Eye className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalViews.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">+15.3% from last month</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg. Conversion Rate</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{avgConversionRate.toFixed(1)}%</div>
              <p className="text-xs text-muted-foreground">+2.1% from last month</p>
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
                <CardTitle>Active Campaigns</CardTitle>
                <CardDescription>
                  Manage your popup campaigns and track their performance
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {campaigns.map((campaign) => (
                    <div key={campaign.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-semibold">{campaign.name}</h3>
                          <Badge variant={campaign.status === 'active' ? 'default' : 'secondary'}>
                            {campaign.status}
                          </Badge>
                          <Badge variant="outline">{campaign.type}</Badge>
                        </div>
                        <div className="grid grid-cols-4 gap-4 text-sm text-gray-600">
                          <div>
                            <span className="font-medium">{campaign.views}</span>
                            <div>Views</div>
                          </div>
                          <div>
                            <span className="font-medium">{campaign.conversions}</span>
                            <div>Conversions</div>
                          </div>
                          <div>
                            <span className="font-medium">${campaign.revenue}</span>
                            <div>Revenue</div>
                          </div>
                          <div>
                            <span className="font-medium">{campaign.conversionRate}%</span>
                            <div>Conv. Rate</div>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm">
                          <Settings className="w-4 h-4 mr-1" />
                          Edit
                        </Button>
                        <Button variant="outline" size="sm">
                          <BarChart3 className="w-4 h-4 mr-1" />
                          View Stats
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="analytics" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Analytics Dashboard</CardTitle>
                <CardDescription>
                  Detailed performance metrics and insights
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-64 flex items-center justify-center text-gray-500">
                  📊 Analytics charts would go here
                  <br />
                  (Revenue over time, conversion funnels, device breakdown, etc.)
                </div>
              </CardContent>
            </Card>
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
        onClose={() => setIsPopupModalOpen(false)}
      />
    </div>
  );
};

export default Dashboard;
