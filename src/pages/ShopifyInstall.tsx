import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ShoppingBag, Zap, TrendingUp, ArrowRight } from 'lucide-react';

const ShopifyInstall = () => {
  const [shopDomain, setShopDomain] = useState('');
  const [isInstalling, setIsInstalling] = useState(false);

  const handleInstall = async () => {
    if (!shopDomain) return;
    
    setIsInstalling(true);
    
    // Clean up shop domain
    const cleanDomain = shopDomain.replace(/^https?:\/\//, '').replace(/\.myshopify\.com.*$/, '');
    const fullDomain = cleanDomain.includes('.') ? cleanDomain : `${cleanDomain}.myshopify.com`;
    
    // Open OAuth in new window to avoid iframe restrictions
    const authUrl = `https://zsmoutzjhqjgjehaituw.supabase.co/functions/v1/shopify-auth?shop=${fullDomain}`;
    window.open(authUrl, '_blank', 'width=600,height=700,scrollbars=yes,resizable=yes');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800">
      <div className="absolute inset-0 bg-black/20"></div>
      
      <div className="relative max-w-4xl mx-auto px-4 py-20">
        <div className="text-center text-white mb-12">
          <Badge variant="secondary" className="bg-white/10 text-white border-white/20 mb-4">
            <Zap className="w-4 h-4 mr-2" />
            Shopify App Installation
          </Badge>
          
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            Install SmartPop on Your Store
          </h1>
          
          <p className="text-xl text-blue-100 max-w-2xl mx-auto">
            Start converting more visitors in under 2 minutes. No coding required.
          </p>
        </div>

        <Card className="max-w-lg mx-auto">
          <CardHeader className="text-center">
            <CardTitle className="flex items-center justify-center gap-2">
              <ShoppingBag className="w-5 h-5" />
              Connect Your Shopify Store
            </CardTitle>
            <CardDescription>
              Enter your store's domain to begin installation
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-medium">Store Domain</label>
              <div className="flex">
                <Input
                  type="text"
                  placeholder="your-store"
                  value={shopDomain}
                  onChange={(e) => setShopDomain(e.target.value)}
                  className="rounded-r-none"
                />
                <div className="bg-gray-100 px-3 py-2 border border-l-0 rounded-r-md text-sm text-gray-600 flex items-center">
                  .myshopify.com
                </div>
              </div>
              <p className="text-xs text-gray-500">
                Just enter your store name, we'll add the rest
              </p>
            </div>
            
            <Button 
              onClick={handleInstall} 
              disabled={!shopDomain || isInstalling}
              className="w-full bg-blue-600 hover:bg-blue-700"
              size="lg"
            >
              {isInstalling ? (
                'Redirecting to Shopify...'
              ) : (
                <>
                  Install SmartPop App
                  <ArrowRight className="w-4 h-4 ml-2" />
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12 text-white">
          <div className="text-center">
            <div className="w-12 h-12 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <Zap className="w-6 h-6" />
            </div>
            <h3 className="font-semibold mb-2">Quick Setup</h3>
            <p className="text-sm text-blue-100">Install and configure in under 2 minutes</p>
          </div>
          
          <div className="text-center">
            <div className="w-12 h-12 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <TrendingUp className="w-6 h-6" />
            </div>
            <h3 className="font-semibold mb-2">Higher Conversions</h3>
            <p className="text-sm text-blue-100">10%+ average conversion rate increase</p>
          </div>
          
          <div className="text-center">
            <div className="w-12 h-12 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <ShoppingBag className="w-6 h-6" />
            </div>
            <h3 className="font-semibold mb-2">Revenue Tracking</h3>
            <p className="text-sm text-blue-100">Track real sales, not just email signups</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ShopifyInstall;
