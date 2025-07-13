
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from "@/components/ui/sonner";
import { lazy, Suspense, useEffect } from 'react';
import { PopupManager } from './components/PopupManager';
import { AppBridgeProvider } from './components/AppBridgeProvider';
import { PolarisProvider } from './components/PolarisProvider';
import { monitoring, trackCustomEvent } from './lib/monitoring';

// Lazy load admin dashboard and heavy components
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Demo = lazy(() => import('./pages/Demo'));
const ShopifyAuth = lazy(() => import('./pages/ShopifyAuth'));
const ShopifyInstall = lazy(() => import('./pages/ShopifyInstall'));

// Keep lightweight pages as regular imports
import Index from './pages/Index';
import NotFound from './pages/NotFound';

const queryClient = new QueryClient();

// Component to conditionally render PopupManager with ultra-minimal loading
const ConditionalPopupManager = () => {
  const location = useLocation();
  
  // Don't show popups on admin or auth pages
  const skipPopupPages = ['/install', '/auth/shopify', '/dashboard'];
  
  if (skipPopupPages.includes(location.pathname)) {
    return null;
  }
  
  // Only load PopupManager for customer-facing pages
  return <PopupManager />;
};

function App() {
  useEffect(() => {
    // Track app initialization
    trackCustomEvent('app_initialized', {
      timestamp: Date.now(),
      url: window.location.href,
      userAgent: navigator.userAgent
    });

    // Track performance metrics
    const loadTime = performance.now();
    if (loadTime > 1000) {
      trackCustomEvent('app_slow_load', {
        loadTime,
        timestamp: Date.now()
      });
    }
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <AppBridgeProvider>
        <PolarisProvider>
          <Router>
            <div className="min-h-screen bg-background">
              <Suspense fallback={<div className="flex items-center justify-center min-h-screen">Loading...</div>}>
                <Routes>
                  <Route path="/" element={<Index />} />
                  <Route path="/dashboard" element={<Dashboard />} />
                  <Route path="/demo" element={<Demo />} />
                  <Route path="/auth/shopify" element={<ShopifyAuth />} />
                  <Route path="/install" element={<ShopifyInstall />} />
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </Suspense>
              <ConditionalPopupManager />
              <Toaster />
            </div>
          </Router>
        </PolarisProvider>
      </AppBridgeProvider>
    </QueryClientProvider>
  );
}

export default App;
