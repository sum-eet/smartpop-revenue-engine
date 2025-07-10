
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from "@/components/ui/sonner";
import Index from './pages/Index';
import Dashboard from './pages/Dashboard';
import Demo from './pages/Demo';
import ShopifyAuth from './pages/ShopifyAuth';
import ShopifyInstall from './pages/ShopifyInstall';
import NotFound from './pages/NotFound';
import { PopupManager } from './components/PopupManager';
import { AppBridgeProvider } from './components/AppBridgeProvider';
import { PolarisProvider } from './components/PolarisProvider';

const queryClient = new QueryClient();

// Component to conditionally render PopupManager
const ConditionalPopupManager = () => {
  const location = useLocation();
  
  // Don't show popups on these pages
  const skipPopupPages = ['/install', '/auth/shopify'];
  
  if (skipPopupPages.includes(location.pathname)) {
    return null;
  }
  
  return <PopupManager />;
};

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AppBridgeProvider>
        <PolarisProvider>
          <Router>
            <div className="min-h-screen bg-background">
              <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/demo" element={<Demo />} />
                <Route path="/auth/shopify" element={<ShopifyAuth />} />
                <Route path="/install" element={<ShopifyInstall />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
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
