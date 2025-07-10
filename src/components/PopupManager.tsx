
import React, { useState, useEffect } from 'react';
import { PopupSDK } from './PopupSDK';

interface VisitorBehavior {
  isFirstVisit: boolean;
  timeOnSite: number;
  scrollDepth: number;
  cartValue: number;
  hasExitIntent: boolean;
}

interface PopupConfig {
  id: string;
  type: 'welcome' | 'cart-abandonment' | 'exit-intent' | 'email-capture';
  title: string;
  subtitle: string;
  discountPercent?: number;
  discountCode?: string;
  template: 'minimal' | 'bold' | 'elegant';
  position: 'center' | 'bottom-right' | 'bottom-bar';
  showAfter?: number;
  triggers: {
    isFirstVisit?: boolean;
    timeOnSite?: number;
    scrollDepth?: number;
    cartValue?: number;
    hasExitIntent?: boolean;
  };
}

export const PopupManager: React.FC = () => {
  // CRITICAL ADMIN DETECTION - Block popups on admin pages
  const shouldSkipPopup = () => {
    const hostname = window.location.hostname;
    const currentPath = window.location.pathname;
    
    // Block admin.shopify.com domain
    if (hostname === 'admin.shopify.com') {
      console.log('🚫 SmartPop: Blocked admin.shopify.com domain');
      return true;
    }
    
    // Block admin paths
    if (currentPath.includes('/admin') || currentPath.includes('/apps')) {
      console.log('🚫 SmartPop: Blocked admin path:', currentPath);
      return true;
    }
    
    // Block install and auth pages
    if (currentPath.includes('/install') || currentPath.includes('/auth')) {
      console.log('🚫 SmartPop: Blocked install/auth page:', currentPath);
      return true;
    }
    
    // Block if in iframe (likely admin)
    if (window !== window.top) {
      console.log('🚫 SmartPop: Blocked iframe context');
      return true;
    }
    
    console.log('✅ SmartPop: Customer page confirmed');
    return false;
  };

  // Skip all popup functionality if on admin page
  if (shouldSkipPopup()) {
    return null;
  }

  const [activePopup, setActivePopup] = useState<PopupConfig | null>(null);
  const [shownPopups, setShownPopups] = useState<Set<string>>(new Set());
  const [behavior, setBehavior] = useState<VisitorBehavior>({
    isFirstVisit: !localStorage.getItem('smartpop_visited'),
    timeOnSite: 0,
    scrollDepth: 0,
    cartValue: 0,
    hasExitIntent: false
  });

  // Load popup configurations from API
  const [popupConfigs, setPopupConfigs] = useState<PopupConfig[]>([]);

  useEffect(() => {
    fetchPopupConfigs();
  }, []);

  const fetchPopupConfigs = async () => {
    try {
      const response = await fetch('https://zsmoutzjhqjgjehaituw.supabase.co/functions/v1/popup-config');
      const data = await response.json();
      
      // Transform API data to our format
      const configs: PopupConfig[] = data.map((popup: any) => ({
        id: popup.id,
        type: popup.trigger_type === 'scroll_depth' ? 'email-capture' : 
              popup.trigger_type === 'exit_intent' ? 'exit-intent' :
              popup.trigger_type === 'time_delay' ? 'welcome' : 'welcome',
        title: popup.title || 'Special Offer',
        subtitle: popup.description || 'Don\'t miss out!',
        discountPercent: popup.discount_percent ? parseInt(popup.discount_percent) : undefined,
        discountCode: popup.discount_code,
        template: 'minimal' as const,
        position: 'center' as const,
        triggers: {
          scrollDepth: popup.trigger_type === 'scroll_depth' ? parseInt(popup.trigger_value || '50') : undefined,
          timeOnSite: popup.trigger_type === 'time_delay' ? parseInt(popup.trigger_value || '10') : undefined,
          isFirstVisit: popup.trigger_type === 'page_view' ? true : undefined,
          hasExitIntent: popup.trigger_type === 'exit_intent' ? true : undefined
        }
      })).filter((config: PopupConfig) => 
        config.triggers.scrollDepth || 
        config.triggers.timeOnSite || 
        config.triggers.isFirstVisit || 
        config.triggers.hasExitIntent
      );

      setPopupConfigs(configs);
      console.log('Loaded popup configs:', configs);
    } catch (error) {
      console.error('Failed to load popup configs:', error);
    }
  };

  // Track visitor behavior
  useEffect(() => {
    // Mark as visited
    localStorage.setItem('smartpop_visited', '1');

    // Track time on site
    const timeTracker = setInterval(() => {
      setBehavior(prev => ({ ...prev, timeOnSite: prev.timeOnSite + 1 }));
    }, 1000);

    // Track scroll depth with throttling
    let ticking = false;
    const handleScroll = () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          const scrolled = Math.round(
            (window.scrollY / (document.documentElement.scrollHeight - window.innerHeight)) * 100
          );
          const validScrolled = Math.min(100, Math.max(0, scrolled || 0));
          
          setBehavior(prev => {
            if (validScrolled > prev.scrollDepth) {
              console.log('Scroll depth updated:', validScrolled + '%');
              return { ...prev, scrollDepth: validScrolled };
            }
            return prev;
          });
          ticking = false;
        });
        ticking = true;
      }
    };

    // Track exit intent (desktop only)
    const handleMouseLeave = (e: MouseEvent) => {
      if (e.clientY <= 0) {
        setBehavior(prev => ({ ...prev, hasExitIntent: true }));
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    document.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      clearInterval(timeTracker);
      window.removeEventListener('scroll', handleScroll);
      document.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, []);

  // Check popup triggers
  useEffect(() => {
    if (activePopup) return; // Don't show multiple popups

    const eligiblePopup = popupConfigs.find(popup => {
      // Skip if already shown
      if (shownPopups.has(popup.id)) return false;

      const triggers = popup.triggers;
      
      // Check scroll depth trigger
      if (triggers.scrollDepth && behavior.scrollDepth >= triggers.scrollDepth) {
        console.log(`Scroll trigger met: ${behavior.scrollDepth}% >= ${triggers.scrollDepth}%`);
        return true;
      }
      
      // Check time trigger
      if (triggers.timeOnSite && behavior.timeOnSite >= triggers.timeOnSite) {
        console.log(`Time trigger met: ${behavior.timeOnSite}s >= ${triggers.timeOnSite}s`);
        return true;
      }
      
      // Check first visit trigger
      if (triggers.isFirstVisit && behavior.isFirstVisit) {
        console.log('First visit trigger met');
        return true;
      }
      
      // Check exit intent trigger
      if (triggers.hasExitIntent && behavior.hasExitIntent) {
        console.log('Exit intent trigger met');
        return true;
      }
      
      return false;
    });

    if (eligiblePopup) {
      console.log('Showing popup:', eligiblePopup);
      setActivePopup(eligiblePopup);
      setShownPopups(prev => new Set([...prev, eligiblePopup.id]));
    }
  }, [behavior, popupConfigs, activePopup, shownPopups]);

  const handlePopupSubmit = (email: string) => {
    console.log('Email submitted:', email);
    console.log('Popup:', activePopup?.id);
    
    // Track conversion event
    if (activePopup) {
      fetch('https://zsmoutzjhqjgjehaituw.supabase.co/functions/v1/popup-track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          popupId: activePopup.id,
          eventType: 'conversion',
          shop: window.location.hostname,
          timestamp: new Date().toISOString(),
          pageUrl: window.location.href,
          email: email,
          discountCode: activePopup.discountCode
        })
      }).catch(error => console.error('Failed to track conversion:', error));
    }
  };

  const handlePopupClose = () => {
    if (activePopup) {
      // Track close event
      fetch('https://zsmoutzjhqjgjehaituw.supabase.co/functions/v1/popup-track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          popupId: activePopup.id,
          eventType: 'close',
          shop: window.location.hostname,
          timestamp: new Date().toISOString(),
          pageUrl: window.location.href
        })
      }).catch(error => console.error('Failed to track close:', error));
    }
    
    setActivePopup(null);
  };

  return (
    <>
      {activePopup && (
        <PopupSDK
          config={activePopup}
          isVisible={!!activePopup}
          onSubmit={handlePopupSubmit}
          onClose={handlePopupClose}
        />
      )}
      
      {/* Debug panel - remove in production */}
      {process.env.NODE_ENV === 'development' && (
        <div className="fixed top-4 left-4 bg-black/80 text-white text-xs p-3 rounded z-50 max-w-xs">
          <div>Time: {behavior.timeOnSite}s</div>
          <div>Scroll: {behavior.scrollDepth}%</div>
          <div>First Visit: {behavior.isFirstVisit ? 'Yes' : 'No'}</div>
          <div>Exit Intent: {behavior.hasExitIntent ? 'Yes' : 'No'}</div>
          <div>Active Popup: {activePopup?.id || 'None'}</div>
          <div>Configs Loaded: {popupConfigs.length}</div>
          <div>Shown Popups: {shownPopups.size}</div>
        </div>
      )}
    </>
  );
};
