/**
 * SmartPop Scroll Tracker & Popup System
 * This script should be embedded on your website to enable scroll-triggered popups
 */

class SmartPopScrollTracker {
  constructor(config = {}) {
    // CRITICAL: Don't run on admin/app pages
    const currentUrl = window.location.href;
    const currentPath = window.location.pathname;
    
    // Skip if on admin pages or app pages
    if (currentPath.includes('/admin') || 
        currentPath.includes('/apps') ||
        currentUrl.includes('shopifyapp.com') ||
        currentUrl.includes('claude.ai') ||
        currentUrl.includes('partners.shopify.com') ||
        document.querySelector('meta[name="shopify-checkout-api-token"]') ||
        document.querySelector('[data-shopify-app]') ||
        document.querySelector('body[data-env="development"]')) {
      console.log('🚫 SmartPop: Skipping admin/app page:', currentPath);
      return;
    }

    this.config = {
      apiBaseUrl: 'https://zsmoutzjhqjgjehaituw.supabase.co/functions/v1',
      shop: 'testingstoresumeet.myshopify.com',
      trackingInterval: 1000, // Track scroll every 1 second
      sessionId: this.generateSessionId(),
      userId: null,
      ...config
    }
    
    this.maxScrollReached = 0
    this.isTracking = false
    this.trackingTimer = null
    this.shownPopups = new Set()
    
    this.init()
  }

  generateSessionId() {
    return 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9)
  }

  init() {
    console.log('🚀 SmartPop Scroll Tracker initialized')
    console.log('📊 Session ID:', this.config.sessionId)
    
    // Start tracking when page loads
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.startTracking())
    } else {
      this.startTracking()
    }
  }

  startTracking() {
    console.log('📈 Starting scroll tracking...')
    this.isTracking = true
    
    // Track initial page load
    this.trackScroll()
    
    // Set up continuous tracking
    this.trackingTimer = setInterval(() => {
      if (this.isTracking) {
        this.trackScroll()
      }
    }, this.config.trackingInterval)

    // Also track on scroll events for immediate responsiveness
    let scrollTimeout
    window.addEventListener('scroll', () => {
      clearTimeout(scrollTimeout)
      scrollTimeout = setTimeout(() => {
        this.trackScroll()
      }, 100) // Debounce scroll events
    })

    // Track page visibility changes
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.pauseTracking()
      } else {
        this.resumeTracking()
      }
    })
  }

  pauseTracking() {
    this.isTracking = false
    if (this.trackingTimer) {
      clearInterval(this.trackingTimer)
    }
  }

  resumeTracking() {
    if (!this.isTracking) {
      this.startTracking()
    }
  }

  getScrollData() {
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop
    const documentHeight = Math.max(
      document.body.scrollHeight,
      document.body.offsetHeight,
      document.documentElement.clientHeight,
      document.documentElement.scrollHeight,
      document.documentElement.offsetHeight
    )
    const viewportHeight = window.innerHeight
    const scrollableHeight = documentHeight - viewportHeight
    const scrollPercent = scrollableHeight > 0 ? Math.round((scrollTop / scrollableHeight) * 100) : 0
    
    // Update max scroll reached
    this.maxScrollReached = Math.max(this.maxScrollReached, scrollPercent)
    
    return {
      sessionId: this.config.sessionId,
      userId: this.config.userId,
      scrollPercent: Math.min(scrollPercent, 100), // Cap at 100%
      maxScrollReached: this.maxScrollReached,
      pageUrl: window.location.href,
      pageHeight: documentHeight,
      viewportHeight: viewportHeight,
      scrollPosition: scrollTop,
      pageTarget: this.getPageTarget(),
      shop: this.config.shop
    }
  }

  getPageTarget() {
    const path = window.location.pathname
    if (path === '/' || path === '') return 'homepage'
    if (path.includes('/products/')) return 'product_pages'
    if (path.includes('/collections/')) return 'collection_pages'
    if (path.includes('/blogs/') || path.includes('/blog/')) return 'blog_pages'
    if (path.includes('/cart')) return 'cart_page'
    if (path.includes('/checkout')) return 'checkout_page'
    return 'all_pages'
  }

  async trackScroll() {
    const scrollData = this.getScrollData()
    
    try {
      const response = await fetch(`${this.config.apiBaseUrl}/scroll-tracker`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(scrollData)
      })

      if (!response.ok) {
        console.error('❌ Scroll tracking failed:', response.status)
        return
      }

      const result = await response.json()
      
      // Check for triggered popups
      if (result.triggered_popups && result.triggered_popups.length > 0) {
        for (const popup of result.triggered_popups) {
          if (!this.shownPopups.has(popup.popup_id)) {
            this.showPopup(popup)
            this.shownPopups.add(popup.popup_id)
          }
        }
      }

      console.log(`📊 Scroll: ${scrollData.scrollPercent}% (Max: ${scrollData.maxScrollReached}%)`)
      
    } catch (error) {
      console.error('❌ Scroll tracking error:', error)
    }
  }

  showPopup(popup) {
    console.log(`🎯 Showing popup: ${popup.name} at ${popup.current_scroll}% scroll`)
    
    // Create popup HTML
    const popupHtml = `
      <div id="smartpop-overlay-${popup.popup_id}" class="smartpop-overlay" style="
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0,0,0,0.7);
        z-index: 999999;
        display: flex;
        justify-content: center;
        align-items: center;
        animation: fadeIn 0.3s ease;
      ">
        <div class="smartpop-modal" style="
          background: white;
          border-radius: 12px;
          padding: 32px;
          max-width: 500px;
          margin: 20px;
          box-shadow: 0 20px 40px rgba(0,0,0,0.3);
          text-align: center;
          position: relative;
          animation: slideIn 0.3s ease;
        ">
          <button class="smartpop-close" style="
            position: absolute;
            top: 16px;
            right: 16px;
            background: none;
            border: none;
            font-size: 24px;
            cursor: pointer;
            color: #666;
          ">×</button>
          
          <h2 style="margin: 0 0 16px 0; color: #333; font-size: 24px;">${popup.title}</h2>
          <p style="margin: 0 0 24px 0; color: #666; font-size: 16px; line-height: 1.5;">${popup.description}</p>
          
          <div style="margin: 24px 0;">
            <input type="email" placeholder="${popup.email_placeholder || 'Enter your email'}" 
                   id="smartpop-email-${popup.popup_id}"
                   style="
                     width: 100%;
                     padding: 12px;
                     border: 2px solid #ddd;
                     border-radius: 6px;
                     font-size: 16px;
                     margin-bottom: 16px;
                     box-sizing: border-box;
                   ">
          </div>
          
          <button class="smartpop-submit" style="
            background: #007cba;
            color: white;
            border: none;
            padding: 14px 28px;
            border-radius: 6px;
            font-size: 16px;
            cursor: pointer;
            font-weight: bold;
            width: 100%;
          ">${popup.button_text}</button>
          
          ${popup.discount_code ? `
            <div style="margin-top: 16px; padding: 12px; background: #f0f8f0; border-radius: 6px;">
              <strong>Discount Code: ${popup.discount_code}</strong><br>
              <small>Save ${popup.discount_percent}% on your order!</small>
            </div>
          ` : ''}
        </div>
      </div>
      
      <style>
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideIn {
          from { transform: translateY(-50px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        .smartpop-submit:hover {
          background: #005a8b !important;
        }
        .smartpop-close:hover {
          color: #000 !important;
        }
      </style>
    `
    
    // Add popup to page
    document.body.insertAdjacentHTML('beforeend', popupHtml)
    
    // Track popup view
    this.trackPopupEvent(popup.popup_id, 'view')
    
    // Set up event listeners
    const overlay = document.getElementById(`smartpop-overlay-${popup.popup_id}`)
    const closeBtn = overlay.querySelector('.smartpop-close')
    const submitBtn = overlay.querySelector('.smartpop-submit')
    const emailInput = overlay.querySelector(`#smartpop-email-${popup.popup_id}`)
    
    // Close popup handlers
    const closePopup = () => {
      overlay.style.animation = 'fadeOut 0.3s ease'
      setTimeout(() => overlay.remove(), 300)
      this.trackPopupEvent(popup.popup_id, 'close')
    }
    
    closeBtn.addEventListener('click', closePopup)
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) closePopup()
    })
    
    // Submit handler
    submitBtn.addEventListener('click', () => {
      const email = emailInput.value.trim()
      if (email && this.isValidEmail(email)) {
        this.trackPopupEvent(popup.popup_id, 'conversion', { email })
        closePopup()
        alert(`Thank you! Your discount code: ${popup.discount_code || 'Check your email'}`)
      } else {
        alert('Please enter a valid email address')
      }
    })
  }

  isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  }

  async trackPopupEvent(popupId, eventType, data = {}) {
    try {
      const response = await fetch(`${this.config.apiBaseUrl}/popup-track`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          popupId: popupId,
          eventType: eventType,
          pageUrl: window.location.href,
          shop: this.config.shop,
          ...data
        })
      })

      if (response.ok) {
        console.log(`✅ Popup event tracked: ${eventType} for popup ${popupId}`)
      } else {
        console.error('❌ Failed to track popup event:', response.status)
      }
    } catch (error) {
      console.error('❌ Popup tracking error:', error)
    }
  }

  // Public methods
  stop() {
    this.pauseTracking()
    console.log('⏹️ Scroll tracking stopped')
  }

  getAnalytics() {
    return {
      sessionId: this.config.sessionId,
      maxScrollReached: this.maxScrollReached,
      shownPopups: Array.from(this.shownPopups)
    }
  }
}

// Auto-initialize when script loads
if (typeof window !== 'undefined') {
  // Add CSS for fade out animation
  const style = document.createElement('style')
  style.textContent = `
    @keyframes fadeOut {
      from { opacity: 1; }
      to { opacity: 0; }
    }
  `
  document.head.appendChild(style)
  
  // Initialize tracker
  window.smartPopTracker = new SmartPopScrollTracker()
  
  console.log('🎯 SmartPop Scroll Tracker ready!')
}