
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PopupManager } from '@/components/PopupManager';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Play, RotateCcw } from 'lucide-react';
import { Link } from 'react-router-dom';

const Demo = () => {
  const [demoMode, setDemoMode] = useState<'store' | 'admin'>('store');
  const [forcePopup, setForcePopup] = useState<string | null>(null);

  const mockProducts = [
    {
      id: 1,
      name: 'Premium Wireless Headphones',
      price: 199,
      image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=300',
      rating: 4.8
    },
    {
      id: 2,
      name: 'Smart Fitness Watch',
      price: 299,
      image: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=300',
      rating: 4.6
    },
    {
      id: 3,
      name: 'Minimalist Laptop Stand',
      price: 89,
      image: 'https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?w=300',
      rating: 4.9
    }
  ];

  const triggerPopup = (type: string) => {
    // In real implementation, this would trigger the popup manager
    console.log(`Triggering ${type} popup`);
    setForcePopup(type);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Demo Controls */}
      <div className="bg-blue-600 text-white py-3">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link to="/" className="flex items-center gap-2 hover:text-blue-200">
                <ArrowLeft className="w-4 h-4" />
                Back to Landing
              </Link>
              <Badge variant="secondary">DEMO MODE</Badge>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="flex bg-blue-700 rounded-lg p-1">
                <button
                  onClick={() => setDemoMode('store')}
                  className={`px-3 py-1 rounded text-sm ${
                    demoMode === 'store' ? 'bg-white text-blue-600' : 'text-white'
                  }`}
                >
                  Store View
                </button>
                <button
                  onClick={() => setDemoMode('admin')}
                  className={`px-3 py-1 rounded text-sm ${
                    demoMode === 'admin' ? 'bg-white text-blue-600' : 'text-white'
                  }`}
                >
                  Admin Dashboard
                </button>
              </div>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.location.reload()}
                className="bg-white/10 border-white/20 text-white hover:bg-white/20"
              >
                <RotateCcw className="w-4 h-4 mr-1" />
                Reset Demo
              </Button>
            </div>
          </div>
        </div>
      </div>

      {demoMode === 'store' ? (
        <>
          {/* Mock Shopify Store */}
          <div className="bg-white">
            {/* Store Header */}
            <div className="border-b">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
                <div className="flex items-center justify-between">
                  <h1 className="text-2xl font-bold">Demo Electronics Store</h1>
                  <div className="flex items-center gap-4">
                    <span className="text-sm text-gray-600">Cart (0)</span>
                    <Button variant="outline" size="sm">Login</Button>
                  </div>
                </div>
              </div>
            </div>

            {/* Hero Section */}
            <div className="bg-gradient-to-r from-purple-600 to-blue-600 text-white py-20">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
                <h2 className="text-4xl font-bold mb-4">Summer Sale - 30% Off</h2>
                <p className="text-xl mb-8">Premium electronics at unbeatable prices</p>
                <Button size="lg" className="bg-white text-purple-600 hover:bg-gray-100">
                  Shop Now
                </Button>
              </div>
            </div>

            {/* Products */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
              <h3 className="text-2xl font-bold mb-8">Featured Products</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {mockProducts.map((product) => (
                  <Card key={product.id} className="hover:shadow-lg transition-shadow">
                    <CardContent className="p-0">
                      <img
                        src={product.image}
                        alt={product.name}
                        className="w-full h-48 object-cover rounded-t-lg"
                      />
                      <div className="p-4">
                        <h4 className="font-semibold mb-2">{product.name}</h4>
                        <div className="flex items-center justify-between">
                          <span className="text-2xl font-bold">${product.price}</span>
                          <span className="text-sm text-gray-600">⭐ {product.rating}</span>
                        </div>
                        <Button className="w-full mt-4">Add to Cart</Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </div>

          {/* Popup Test Controls */}
          <div className="fixed bottom-4 right-4 bg-white rounded-lg shadow-lg p-4 border">
            <h4 className="font-semibold mb-3">Test Popups</h4>
            <div className="space-y-2">
              <Button 
                size="sm" 
                variant="outline" 
                onClick={() => triggerPopup('welcome')}
                className="w-full"
              >
                <Play className="w-3 h-3 mr-1" />
                Welcome Popup
              </Button>
              <Button 
                size="sm" 
                variant="outline" 
                onClick={() => triggerPopup('exit-intent')}
                className="w-full"
              >
                <Play className="w-3 h-3 mr-1" />
                Exit Intent
              </Button>
              <Button 
                size="sm" 
                variant="outline" 
                onClick={() => triggerPopup('cart-abandon')}
                className="w-full"
              >
                <Play className="w-3 h-3 mr-1" />
                Cart Recovery
              </Button>
            </div>
          </div>

          {/* Popup Manager */}
          <PopupManager />
        </>
      ) : (
        /* Admin Dashboard Iframe */
        <div className="h-screen">
          <iframe
            src="/dashboard"
            className="w-full h-full border-0"
            title="SmartPop Admin Dashboard"
          />
        </div>
      )}
    </div>
  );
};

export default Demo;
