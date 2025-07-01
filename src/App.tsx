
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from "@/components/ui/sonner";
import Index from './pages/Index';
import Dashboard from './pages/Dashboard';
import Demo from './pages/Demo';
import ShopifyAuth from './pages/ShopifyAuth';
import ShopifyInstall from './pages/ShopifyInstall';
import NotFound from './pages/NotFound';
import { PopupManager } from './components/PopupManager';

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
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
          <PopupManager />
          <Toaster />
        </div>
      </Router>
    </QueryClientProvider>
  );
}

export default App;
