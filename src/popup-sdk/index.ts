// Lightweight SmartPop SDK Entry Point
// This is the minimal customer-facing popup code

interface PopupConfig {
  shop: string;
  apiUrl: string;
}

interface PopupCampaign {
  id: string;
  type: string;
  title: string;
  subtitle: string;
  discount_code?: string;
  discount_percent?: number;
  template: string;
  position: string;
  triggers: any;
}

class LightweightPopupSDK {
  private config: PopupConfig;
  private campaigns: PopupCampaign[] = [];
  private behavior = {
    isFirstVisit: !localStorage.getItem('smartpop_visited'),
    timeOnSite: 0,
    scrollDepth: 0,
    hasExitIntent: false
  };
  private activePopup: PopupCampaign | null = null;
  private sessionId: string;

  constructor(config: PopupConfig) {
    this.config = config;
    this.sessionId = this.generateSessionId();
    this.init();
  }

  private generateSessionId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  private async init() {
    // Skip if in admin context
    if (this.isAdminContext()) {
      return;
    }

    localStorage.setItem('smartpop_visited', '1');
    await this.loadCampaigns();
    this.startBehaviorTracking();
    setInterval(() => this.checkPopupTriggers(), 1000);
  }

  private isAdminContext(): boolean {
    const hostname = window.location.hostname;
    const pathname = window.location.pathname;
    
    return hostname === 'admin.shopify.com' ||
           pathname.includes('/admin') ||
           pathname.includes('/apps') ||
           pathname.includes('/install') ||
           pathname.includes('/auth') ||
           window !== window.top; // iframe
  }

  private async loadCampaigns() {
    try {
      const response = await fetch(`${this.config.apiUrl}/popup-config?shop=${this.config.shop}`);
      const data = await response.json();
      this.campaigns = data.campaigns || [];
    } catch (error) {
      console.error('SmartPop: Failed to load campaigns', error);
    }
  }

  private startBehaviorTracking() {
    setInterval(() => this.behavior.timeOnSite++, 1000);

    let ticking = false;
    window.addEventListener('scroll', () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          const scrolled = (window.scrollY / (document.body.scrollHeight - window.innerHeight)) * 100;
          this.behavior.scrollDepth = Math.max(this.behavior.scrollDepth, scrolled || 0);
          ticking = false;
        });
        ticking = true;
      }
    }, { passive: true });

    document.addEventListener('mouseleave', (e) => {
      if (e.clientY <= 0) {
        this.behavior.hasExitIntent = true;
      }
    });
  }

  private checkPopupTriggers() {
    if (this.activePopup) return;

    const eligibleCampaign = this.campaigns.find(campaign => {
      const triggers = campaign.triggers;
      
      if (triggers.isFirstVisit && !this.behavior.isFirstVisit) return false;
      if (triggers.timeOnSite && this.behavior.timeOnSite < triggers.timeOnSite) return false;
      if (triggers.hasExitIntent && !this.behavior.hasExitIntent) return false;
      
      return true;
    });

    if (eligibleCampaign) {
      this.showPopup(eligibleCampaign);
    }
  }

  private async showPopup(campaign: PopupCampaign) {
    this.activePopup = campaign;
    
    await this.trackEvent('view', { campaignId: campaign.id });
    
    const popupContainer = document.createElement('div');
    popupContainer.innerHTML = this.createPopupHTML(campaign);
    document.body.appendChild(popupContainer);
    
    this.attachPopupEvents(popupContainer, campaign);
  }

  private createPopupHTML(campaign: PopupCampaign): string {
    return `
      <div class="smartpop-overlay" style="position: fixed; inset: 0; z-index: 9999; display: flex; align-items: center; justify-content: center; background: rgba(0,0,0,0.5); backdrop-filter: blur(4px);">
        <div class="smartpop-popup" style="position: relative; max-width: 400px; padding: 24px; border-radius: 12px; background: white; animation: smartpop-fadein 0.3s ease-out;">
          <button class="smartpop-close" style="position: absolute; top: 16px; right: 16px; background: none; border: none; font-size: 24px; cursor: pointer; opacity: 0.6;">&times;</button>
          
          <div style="text-align: center; margin-bottom: 24px;">
            <h2 style="font-size: 24px; font-weight: bold; margin-bottom: 8px;">${campaign.title}</h2>
            <p style="opacity: 0.8; margin-bottom: 16px;">${campaign.subtitle || ''}</p>
            
            ${campaign.discount_percent ? `
              <div style="background: #10b981; color: white; border-radius: 20px; padding: 8px 16px; display: inline-block; margin-bottom: 16px;">
                <span style="font-weight: 600;">${campaign.discount_percent}% OFF</span>
              </div>
            ` : ''}
          </div>
          
          <form class="smartpop-form" style="display: flex; flex-direction: column; gap: 12px;">
            <input type="email" placeholder="Enter your email" required style="padding: 12px; border: 1px solid #d1d5db; border-radius: 6px; font-size: 16px;">
            <button type="submit" style="background: #3b82f6; color: white; padding: 12px; border: none; border-radius: 6px; font-size: 16px; font-weight: 600; cursor: pointer;">
              Get Discount
            </button>
          </form>
        </div>
      </div>
      
      <style>
        @keyframes smartpop-fadein {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
      </style>
    `;
  }

  private attachPopupEvents(container: HTMLElement, campaign: PopupCampaign) {
    const closeBtn = container.querySelector('.smartpop-close');
    const form = container.querySelector('.smartpop-form') as HTMLFormElement;
    const overlay = container.querySelector('.smartpop-overlay');
    
    const closePopup = () => {
      container.remove();
      this.activePopup = null;
    };
    
    closeBtn?.addEventListener('click', closePopup);
    overlay?.addEventListener('click', (e) => {
      if (e.target === overlay) closePopup();
    });
    
    form?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const emailInput = form.querySelector('input[type="email"]') as HTMLInputElement;
      const email = emailInput.value;
      
      if (email) {
        await this.trackEvent('conversion', {
          campaignId: campaign.id,
          email: email,
          discountCode: campaign.discount_code
        });
        
        this.showSuccessMessage(container, campaign);
      }
    });
  }

  private showSuccessMessage(container: HTMLElement, campaign: PopupCampaign) {
    const popup = container.querySelector('.smartpop-popup');
    if (popup) {
      popup.innerHTML = `
        <div style="text-align: center; padding: 40px 20px;">
          <div style="width: 64px; height: 64px; background: #10b981; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 16px;">
            <span style="color: white; font-size: 24px;">✓</span>
          </div>
          <h3 style="font-size: 20px; font-weight: 600; margin-bottom: 8px;">Thank You!</h3>
          ${campaign.discount_code ? `
            <p style="margin-bottom: 16px;">Your discount code:</p>
            <div style="background: #f3f4f6; padding: 12px; border-radius: 6px; font-family: monospace; font-size: 18px; font-weight: bold;">
              ${campaign.discount_code}
            </div>
          ` : ''}
        </div>
      `;
      
      if (campaign.discount_code) {
        navigator.clipboard?.writeText(campaign.discount_code);
      }
      
      setTimeout(() => {
        container.remove();
        this.activePopup = null;
      }, 3000);
    }
  }

  private async trackEvent(event: string, data: any) {
    try {
      await fetch(`${this.config.apiUrl}/popup-track`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shop: this.config.shop,
          event,
          sessionId: this.sessionId,
          pageUrl: window.location.href,
          ...data
        })
      });
    } catch (error) {
      console.error('SmartPop: Failed to track event', error);
    }
  }
}

// Initialize SDK when loaded (customer-facing only)
if (typeof window !== 'undefined') {
  (window as any).LightweightPopupSDK = LightweightPopupSDK;
  
  const config = (window as any).SMARTPOP_CONFIG;
  if (config) {
    new LightweightPopupSDK(config);
  }
}

export default LightweightPopupSDK;