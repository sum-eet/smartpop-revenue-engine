
import React, { useState, useEffect } from 'react';
import { PopupSDK } from './PopupSDK';

interface VisitorBehavior {
  isFirstVisit: boolean;
  timeOnSite: number;
  scrollDepth: number;
  cartValue: number;
  hasExitIntent: boolean;
}

export const PopupManager: React.FC = () => {
  const [activePopup, setActivePopup] = useState<any>(null);
  const [behavior, setBehavior] = useState<VisitorBehavior>({
    isFirstVisit: true,
    timeOnSite: 0,
    scrollDepth: 0,
    cartValue: 0,
    hasExitIntent: false
  });

  // Mock popup configurations - in real app, these would come from API
  const popupConfigs = [
    {
      id: 'welcome-new',
      type: 'welcome' as const,
      title: 'Welcome! Get 10% Off',
      subtitle: 'Join thousands of happy customers',
      discountPercent: 10,
      discountCode: 'WELCOME10',
      template: 'minimal' as const,
      position: 'center' as const,
      showAfter: 8,
      triggers: { isFirstVisit: true, timeOnSite: 8 }
    },
    {
      id: 'cart-abandon',
      type: 'cart-abandonment' as const,
      title: "Don't Miss Out!",
      subtitle: 'Complete your purchase and save 15%',
      discountPercent: 15,
      discountCode: 'SAVE15',
      template: 'bold' as const,
      position: 'center' as const,
      triggers: { cartValue: 50, timeOnSite: 300 }
    },
    {
      id: 'exit-intent',
      type: 'exit-intent' as const,
      title: 'Wait! Before you go...',
      subtitle: 'Get 20% off your first order',
      discountPercent: 20,
      discountCode: 'SAVE20',
      template: 'elegant' as const,
      position: 'center' as const,
      triggers: { hasExitIntent: true }
    }
  ];

  // Track visitor behavior
  useEffect(() => {
    // Track time on site
    const timeTracker = setInterval(() => {
      setBehavior(prev => ({ ...prev, timeOnSite: prev.timeOnSite + 1 }));
    }, 1000);

    // Track scroll depth
    const handleScroll = () => {
      const scrolled = (window.scrollY / (document.body.scrollHeight - window.innerHeight)) * 100;
      setBehavior(prev => ({ ...prev, scrollDepth: Math.max(prev.scrollDepth, scrolled) }));
    };

    // Track exit intent (desktop only)
    const handleMouseLeave = (e: MouseEvent) => {
      if (e.clientY <= 0) {
        setBehavior(prev => ({ ...prev, hasExitIntent: true }));
      }
    };

    window.addEventListener('scroll', handleScroll);
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
      const triggers = popup.triggers;
      
      if (triggers.isFirstVisit && !behavior.isFirstVisit) return false;
      if (triggers.timeOnSite && behavior.timeOnSite < triggers.timeOnSite) return false;
      if (triggers.cartValue && behavior.cartValue < triggers.cartValue) return false;
      if (triggers.hasExitIntent && !behavior.hasExitIntent) return false;
      
      return true;
    });

    if (eligiblePopup) {
      setActivePopup(eligiblePopup);
    }
  }, [behavior, activePopup]);

  const handlePopupSubmit = (email: string) => {
    console.log('Email submitted:', email);
    console.log('Popup:', activePopup?.id);
    
    // In real app, send to analytics and email service
    // Track conversion event
    window.dispatchEvent(new CustomEvent('smartpop:conversion', {
      detail: {
        popupId: activePopup?.id,
        email,
        discountCode: activePopup?.discountCode
      }
    }));
  };

  const handlePopupClose = () => {
    setActivePopup(null);
    
    // Track close event
    window.dispatchEvent(new CustomEvent('smartpop:close', {
      detail: { popupId: activePopup?.id }
    }));
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
        <div className="fixed top-4 left-4 bg-black/80 text-white text-xs p-3 rounded z-50">
          <div>Time: {behavior.timeOnSite}s</div>
          <div>Scroll: {Math.round(behavior.scrollDepth)}%</div>
          <div>First Visit: {behavior.isFirstVisit ? 'Yes' : 'No'}</div>
          <div>Exit Intent: {behavior.hasExitIntent ? 'Yes' : 'No'}</div>
          <div>Active Popup: {activePopup?.id || 'None'}</div>
        </div>
      )}
    </>
  );
};
