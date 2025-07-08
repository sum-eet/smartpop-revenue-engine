import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'GET') {
    return new Response('Method not allowed', { status: 405, headers: corsHeaders })
  }

  try {
    const url = new URL(req.url)
    const shop = url.searchParams.get('shop') || 'testingstoresumeet.myshopify.com'
    
    console.log('Serving popup script for shop:', shop)

    const script = `
/**
 * SmartPop Revenue Engine - Live Script
 * Shop: ${shop}
 * Generated: ${new Date().toISOString()}
 */

(function() {
  'use strict';
  
  if (window.smartPopInitialized) {
    console.log('🎯 SmartPop already initialized - cleaning up old popups');
    // Clean up any existing popups from old versions
    const existingPopups = document.querySelectorAll('[id^="smartpop-"], .smartpop-popup, [class*="smartpop"]');
    existingPopups.forEach(p => p.remove());
    return;
  }
  window.smartPopInitialized = true;
  console.log('🚀 SmartPop (popup-script) initialized');

  function shouldSkipPopup() {
    const currentUrl = window.location.href;
    const currentPath = window.location.pathname;
    const hostname = window.location.hostname;
    
    if (hostname === 'admin.shopify.com') {
      console.log('🚫 SmartPop: Blocked admin.shopify.com domain');
      return true;
    }
    
    if (currentPath.includes('/admin') || currentPath.includes('/apps')) {
      console.log('🚫 SmartPop: Blocked admin path:', currentPath);
      return true;
    }
    
    if (window !== window.top) {
      console.log('🚫 SmartPop: Blocked iframe context');
      return true;
    }
    
    console.log('✅ SmartPop: Customer store page confirmed');
    return false;
  }

  if (shouldSkipPopup()) {
    console.log('🚫 SmartPop: Exiting due to admin detection');
    return;
  }

  console.log('🚀 SmartPop: Initializing on customer store');

  let popups = [];
  let shownPopups = new Set();
  let currentScrollDepth = 0;
  let timeOnSite = 0;
  let hasExitIntent = false;

  // GLOBAL EMAIL VALIDATION - Available to all popup types
  window.validateEmail = function(email) {
    console.log('🔍 Validating email:', email);
    
    // Basic checks first
    if (!email || typeof email !== 'string') {
      console.log('❌ Email is empty or not string');
      return false;
    }
    
    const cleanEmail = email.trim();
    
    // Length validation
    if (cleanEmail.length < 3 || cleanEmail.length > 254) {
      console.log('❌ Email length invalid:', cleanEmail.length);
      return false;
    }
    
    // Must contain exactly one @
    const atCount = (cleanEmail.match(/@/g) || []).length;
    if (atCount !== 1) {
      console.log('❌ Must contain exactly one @, found:', atCount);
      return false;
    }
    
    // Split by @
    const parts = cleanEmail.split('@');
    const [local, domain] = parts;
    
    // Local part (before @) validation
    if (!local || local.length === 0) {
      console.log('❌ Missing local part (before @)');
      return false;
    }
    
    // Domain part (after @) validation  
    if (!domain || domain.length === 0) {
      console.log('❌ Missing domain part (after @)');
      return false;
    }
    
    // Domain MUST contain at least one dot
    if (!domain.includes('.')) {
      console.log('❌ Domain must contain at least one dot');
      return false;
    }
    
    // Domain must not start or end with dot
    if (domain.startsWith('.') || domain.endsWith('.')) {
      console.log('❌ Domain cannot start or end with dot');
      return false;
    }
    
    // Domain must have something after the last dot (TLD)
    const domainParts = domain.split('.');
    const tld = domainParts[domainParts.length - 1];
    if (!tld || tld.length < 2) {
      console.log('❌ Invalid TLD:', tld);
      return false;
    }
    
    // Basic character validation (simplified but effective)
    const emailRegex = /^[a-zA-Z0-9._+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(cleanEmail)) {
      console.log('❌ Failed regex test');
      return false;
    }
    
    console.log('✅ Email validation passed');
    return true;
  };

  // GLOBAL POPUP SUBMIT HANDLER - Available to all popup types
  window.handlePopupSubmit = function(popupId) {
    const emailInput = document.getElementById(\`email-input-\${popupId}\`);
    if (!emailInput) {
      console.error('❌ Email input not found for popup:', popupId);
      return;
    }
    
    const email = emailInput.value.trim();
    console.log('🔍 Popup submit attempt:', { popupId, email });
    
    if (window.validateEmail(email)) {
      console.log('✅ Email validation passed - submitting');
      alert('Thank you! Check your email for the discount code.');
      document.getElementById(\`smartpop-\${popupId}\`)?.remove();
    } else {
      console.log('❌ Email validation failed');
      emailInput.style.borderColor = '#ff3b30';
      emailInput.focus();
      setTimeout(() => {
        emailInput.style.borderColor = '#ddd';
      }, 2000);
    }
  };
  
  // Progressive Smart Exit Intent System
  let smartExitIntent = {
    confidenceScore: 0,
    currentLevel: 0,
    sessionShows: 0,
    maxShows: 3,
    lastActivity: Date.now(),
    mouseVelocity: 0,
    mouseVector: { x: 0, y: 0, speed: 0, angle: 0, acceleration: 0 },
    scrollHistory: [],
    debugMode: false,
    platform: 'unknown',
    cooldownUntil: 0,
    levelCooldowns: [0, 0, 0], // Separate cooldowns for each level
    disabled: false
  };

  async function loadAndShowPopups() {
    try {
      console.log('📥 Loading popup configs...');
      
      const response = await fetch('https://zsmoutzjhqjgjehaituw.supabase.co/functions/v1/popup-config?action=list&shop_domain=${shop}');
      
      if (!response.ok) {
        console.log('❌ Failed to load popups:', response.status);
        return;
      }
      
      popups = await response.json();
      console.log('📊 Loaded', popups.length, 'popup configs');
      
      // Start tracking behavior
      startBehaviorTracking();
      
    } catch (error) {
      console.error('❌ Error loading popups:', error);
    }
  }

  function startBehaviorTracking() {
    // Track time on site
    setInterval(() => {
      timeOnSite++;
      checkTriggers();
    }, 1000);

    // Track scroll depth
    let ticking = false;
    function handleScroll() {
      if (!ticking) {
        requestAnimationFrame(() => {
          const scrolled = Math.round(
            (window.scrollY / (document.documentElement.scrollHeight - window.innerHeight)) * 100
          );
          currentScrollDepth = Math.min(100, Math.max(0, scrolled || 0));
          checkTriggers();
          ticking = false;
        });
        ticking = true;
      }
    }

    window.addEventListener('scroll', handleScroll, { passive: true });
    
    // Initialize Smart Exit Intent System ONLY if there are active exit intent popups
    const hasExitIntentPopups = popups.some(popup => 
      popup.is_active && !popup.is_deleted && popup.trigger_type === 'exit_intent'
    );
    
    if (hasExitIntentPopups) {
      console.log('🚪 Exit intent popups found - initializing Smart Exit Intent System');
      initializeSmartExitIntent();
    } else {
      console.log('ℹ️ No active exit intent popups - skipping Smart Exit Intent System');
    }
    
    // Initial check
    checkTriggers();
  }

  function initializeSmartExitIntent() {
    // Platform Detection
    const userAgent = navigator.userAgent;
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
    const isIOS = /iPad|iPhone|iPod/.test(userAgent);
    const isAndroid = /Android/i.test(userAgent);
    const isSafari = /Safari/.test(userAgent) && !/Chrome/.test(userAgent);
    const isChrome = /Chrome/i.test(userAgent);
    
    smartExitIntent.platform = isMobile ? (isIOS ? 'ios' : 'android') : 'desktop';
    
    console.log(\`🧠 Smart Exit Intent initialized for \${smartExitIntent.platform}\`);
    
    // Desktop-specific tracking
    if (!isMobile) {
      setupDesktopExitIntent();
    } else {
      setupMobileExitIntent();
    }
    
    // Universal tracking
    setupUniversalExitIntent();
    
    // Debug mode (enable for testing)
    if (window.location.hostname.includes('testingstoresumeet')) {
      smartExitIntent.debugMode = true;
      console.log('🐛 Debug mode enabled for Smart Exit Intent');
    }
  }

  function setupDesktopExitIntent() {
    let lastMouseX = 0, lastMouseY = 0, lastMouseTime = 0;
    let lastVelocity = 0;
    let mouseVelocityHistory = [];
    
    // Velocity-Based Exit Detection (Not Position)
    function handleMouseMove(e) {
      const now = Date.now();
      const deltaTime = now - lastMouseTime;
      const deltaY = e.clientY - lastMouseY;
      const deltaX = e.clientX - lastMouseX;
      
      if (deltaTime > 0 && deltaTime < 100) { // Ignore large time gaps
        const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
        const speed = distance / deltaTime * 1000; // px/s
        const angle = Math.atan2(deltaY, deltaX) * 180 / Math.PI; // degrees
        const acceleration = speed - lastVelocity;
        
        // Update mouse vector
        smartExitIntent.mouseVector = {
          x: deltaX,
          y: deltaY,
          speed: speed,
          angle: angle,
          acceleration: acceleration
        };
        
        // 1. ESCAPE VELOCITY: Moving 1000+ px/second AWAY from content
        if (speed > 1000) {
          addConfidenceScore(35, \`🚀 Escape velocity: \${Math.round(speed)}px/s\`);
        }
        
        // 2. DIAGONAL ESCAPE: Moving up+right or up+left (toward corners)
        if (deltaY < 0 && Math.abs(deltaX) > 10 && speed > 500) {
          const direction = deltaX > 0 ? 'up-right' : 'up-left';
          addConfidenceScore(30, \`↗️ Diagonal escape: \${direction}\`);
        }
        
        // 3. EDGE RUSH: Accelerating toward ANY edge
        const nearEdge = e.clientX <= 50 || e.clientX >= window.innerWidth - 50 || 
                        e.clientY <= 50 || e.clientY >= window.innerHeight - 50;
        if (nearEdge && acceleration > 500) {
          addConfidenceScore(25, \`⚡ Edge rush: acceleration \${Math.round(acceleration)}\`);
        }
        
        // 4. RAPID UPWARD MOVEMENT
        if (deltaY < -20 && speed > 800) {
          addConfidenceScore(40, \`⬆️ Rapid upward: \${Math.round(speed)}px/s\`);
        }
        
        // 5. CORNER TARGETING (high-speed movement toward corners)
        const towardCorner = (e.clientX < 100 && e.clientY < 100) || 
                           (e.clientX > window.innerWidth - 100 && e.clientY < 100);
        if (towardCorner && speed > 600) {
          addConfidenceScore(35, '🎯 Corner targeting detected');
        }
        
        lastVelocity = speed;
      }
      
      lastMouseX = e.clientX;
      lastMouseY = e.clientY;
      lastMouseTime = now;
      smartExitIntent.lastActivity = now;
    }
    
    // 2. Tab Switch Intent
    function handleVisibilityChange() {
      if (document.hidden) {
        // Don't trigger if media is playing
        const hasActiveMedia = document.querySelector('video:not([paused]), audio:not([paused])');
        if (!hasActiveMedia) {
          addConfidenceScore(30, '👁️ Tab switch/visibility lost');
        }
      }
    }
    
    // 3. Keyboard Shortcuts Detection
    function handleKeyDown(e) {
      const isCtrlCmd = e.ctrlKey || e.metaKey;
      
      if (isCtrlCmd) {
        // Address bar focus (Ctrl/Cmd + L)
        if (e.key === 'l') {
          addConfidenceScore(35, '⌨️ Address bar focus shortcut');
        }
        // New tab (Ctrl/Cmd + T)
        if (e.key === 't') {
          addConfidenceScore(40, '⌨️ New tab shortcut');
        }
        // Close tab (Ctrl/Cmd + W)
        if (e.key === 'w') {
          addConfidenceScore(50, '⌨️ Close tab shortcut');
        }
      }
    }
    
    // Event listeners with throttling
    let mouseMoveTimeout;
    document.addEventListener('mousemove', (e) => {
      if (!mouseMoveTimeout) {
        mouseMoveTimeout = setTimeout(() => {
          handleMouseMove(e);
          mouseMoveTimeout = null;
        }, 50);
      }
    }, { passive: true });
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    document.addEventListener('keydown', handleKeyDown);
    
    console.log('🖥️ Desktop exit intent tracking enabled');
  }

  function setupMobileExitIntent() {
    let touchStartX = 0, touchStartY = 0, touchStartTime = 0;
    let swipeHistory = [];
    
    // 1. iOS Back Gesture Detection
    function handleTouchStart(e) {
      const touch = e.touches[0];
      touchStartX = touch.clientX;
      touchStartY = touch.clientY;
      touchStartTime = Date.now();
      
      // iOS back gesture starts from left edge
      if (smartExitIntent.platform === 'ios' && touchStartX <= 20) {
        console.log('📱 iOS back gesture start detected');
      }
    }
    
    function handleTouchMove(e) {
      if (!e.touches[0]) return;
      
      const touch = e.touches[0];
      const deltaX = touch.clientX - touchStartX;
      const deltaY = touch.clientY - touchStartY;
      const deltaTime = Date.now() - touchStartTime;
      
      // iOS Safari back swipe
      if (smartExitIntent.platform === 'ios' && touchStartX <= 20 && deltaX > 50 && deltaTime < 800) {
        addConfidenceScore(35, '📱 iOS back swipe gesture');
      }
      
      // Android home gesture
      if (smartExitIntent.platform === 'android' && touchStartY >= window.innerHeight * 0.9) {
        const swipeVelocity = Math.abs(deltaY) / deltaTime * 1000;
        if (deltaY < -window.innerHeight * 0.3 && swipeVelocity > 500) {
          addConfidenceScore(30, '📱 Android home gesture');
        }
      }
    }
    
    // 2. Frustration Pattern Detection
    function trackSwipePattern(direction) {
      const now = Date.now();
      swipeHistory.push({ direction, time: now });
      
      // Keep only recent swipes
      swipeHistory = swipeHistory.filter(s => now - s.time < 3000);
      
      // Rapid alternating scrolls (frustration)
      if (swipeHistory.length >= 3) {
        const recent = swipeHistory.slice(-3);
        const hasAlternating = recent[0].direction !== recent[1].direction && 
                             recent[1].direction !== recent[2].direction;
        if (hasAlternating) {
          addConfidenceScore(25, '😤 Frustration scroll pattern');
        }
      }
    }
    
    document.addEventListener('touchstart', handleTouchStart, { passive: true });
    document.addEventListener('touchmove', handleTouchMove, { passive: true });
    
    console.log('📱 Mobile exit intent tracking enabled');
  }

  function setupUniversalExitIntent() {
    let scrollHistory = [];
    let idleTimer;
    let rapidScrollCount = 0;
    
    // 1. Rapid Scroll to Top Detection
    function trackScrollPattern() {
      const now = Date.now();
      const scrollPercent = currentScrollDepth;
      
      scrollHistory.push({ percent: scrollPercent, time: now });
      if (scrollHistory.length > 10) scrollHistory.shift();
      
      // Check for rapid scroll from >50% to <10%
      if (scrollHistory.length >= 2) {
        const recent = scrollHistory.slice(-2);
        const timeDiff = recent[1].time - recent[0].time;
        const scrollDiff = recent[0].percent - recent[1].percent;
        
        if (scrollDiff > 40 && timeDiff < 800 && recent[1].percent < 10) {
          addConfidenceScore(30, '⚡ Rapid scroll to top');
        }
      }
    }
    
    // 2. Idle + Sudden Activity Pattern
    function resetIdleTimer() {
      clearTimeout(idleTimer);
      const wasIdle = Date.now() - smartExitIntent.lastActivity > 15000;
      
      smartExitIntent.lastActivity = Date.now();
      
      if (wasIdle) {
        console.log('⏰ User returned from 15s+ idle state');
        // Next action gets bonus points
        setTimeout(() => {
          addConfidenceScore(20, '😴 Post-idle activity spike');
        }, 100);
      }
      
      idleTimer = setTimeout(() => {
        console.log('💤 User idle for 15+ seconds');
      }, 15000);
    }
    
    // 3. Form Interaction Protection
    function isUserEngaged() {
      const activeElement = document.activeElement;
      const isFormFocused = activeElement && (
        activeElement.tagName === 'INPUT' || 
        activeElement.tagName === 'TEXTAREA' ||
        activeElement.contentEditable === 'true'
      );
      
      const hasFileUpload = document.querySelector('input[type="file"]');
      const hasActiveMedia = document.querySelector('video:not([paused]), audio:not([paused])');
      
      return isFormFocused || hasFileUpload || hasActiveMedia;
    }
    
    // Scroll tracking with pattern analysis
    let scrollTimeout;
    function handleScroll() {
      trackScrollPattern();
      resetIdleTimer();
      
      clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(() => {
        rapidScrollCount = 0;
      }, 1000);
    }
    
    // Activity tracking
    document.addEventListener('scroll', handleScroll, { passive: true });
    document.addEventListener('click', resetIdleTimer);
    document.addEventListener('keypress', resetIdleTimer);
    document.addEventListener('touchstart', resetIdleTimer, { passive: true });
    
    // Page unload detection
    window.addEventListener('beforeunload', () => {
      addConfidenceScore(20, '🚪 Page unload event');
    });
    
    resetIdleTimer();
    console.log('🌍 Universal exit intent tracking enabled');
  }

  function addConfidenceScore(points, reason) {
    const now = Date.now();
    
    // Session limit check
    if (smartExitIntent.disabled || smartExitIntent.sessionShows >= smartExitIntent.maxShows) {
      if (smartExitIntent.debugMode) {
        console.log(\`🚫 Session limit reached (\${smartExitIntent.sessionShows}/\${smartExitIntent.maxShows})\`);
      }
      return;
    }
    
    // Engagement check
    if (now - window.performance.now() < 3000) {
      if (smartExitIntent.debugMode) {
        console.log(\`⚡ Too soon after page load, ignoring: \${reason}\`);
      }
      return;
    }
    
    smartExitIntent.confidenceScore += points;
    
    if (smartExitIntent.debugMode) {
      console.log(\`🎯 +\${points} points: \${reason} (Total: \${smartExitIntent.confidenceScore})\`);
    }
    
    // Progressive Popup Strategy - Escalating popups based on exit intensity
    checkProgressivePopupTrigger(reason);
  }

  function checkProgressivePopupTrigger(reason) {
    const now = Date.now();
    const score = smartExitIntent.confidenceScore;
    
    // Level 1: Soft popup (60 points)
    if (score >= 60 && smartExitIntent.currentLevel < 1 && now > smartExitIntent.levelCooldowns[0]) {
      triggerProgressivePopup(1, reason);
    }
    // Level 2: Urgent popup (120 points)  
    else if (score >= 120 && smartExitIntent.currentLevel < 2 && now > smartExitIntent.levelCooldowns[1]) {
      triggerProgressivePopup(2, reason);
    }
    // Level 3: Final attempt (180+ points)
    else if (score >= 180 && smartExitIntent.currentLevel < 3 && now > smartExitIntent.levelCooldowns[2]) {
      triggerProgressivePopup(3, reason);
    }
  }

  function triggerProgressivePopup(level, reason) {
    const now = Date.now();
    
    smartExitIntent.currentLevel = level;
    smartExitIntent.sessionShows++;
    hasExitIntent = true;
    
    // Debug logging for multi-show analysis
    if (smartExitIntent.debugMode) {
      console.log('📊 Post-popup state:', {
        level: level,
        sessionShows: smartExitIntent.sessionShows,
        currentScore: smartExitIntent.confidenceScore,
        hasShownPopup: smartExitIntent.sessionShows > 0,
        sessionStorage: sessionStorage.getItem('smartPopShown'),
        localStorage: localStorage.getItem('smartPopShown'),
        nextShowAllowed: level < 3,
        currentCooldown: 'No session blocking',
        triggerReason: reason
      });
    }
    
    // Score reset strategy (not to 0)
    if (level === 1) {
      smartExitIntent.confidenceScore = 30; // Reset to 30 (not 0)
      smartExitIntent.levelCooldowns[0] = now + 10000; // 10s cooldown for level 1
    } else if (level === 2) {
      smartExitIntent.confidenceScore = 60; // Reset to 60
      smartExitIntent.levelCooldowns[1] = now + 15000; // 15s cooldown for level 2
    } else if (level === 3) {
      smartExitIntent.disabled = true; // Disable for session after level 3
      smartExitIntent.levelCooldowns[2] = now + 999999999; // Effectively disabled
    }
    
    console.log(\`🎪 Progressive Popup Level \${level} triggered! Score: \${smartExitIntent.confidenceScore}\`);
    console.log(\`🎯 Trigger: \${reason}\`);
    
    // Show the appropriate popup level
    showProgressivePopup(level);
  }

  function checkTriggers() {
    const activePopups = popups.filter(p => p.is_active && !p.is_deleted);
    
    for (const popup of activePopups) {
      if (shownPopups.has(popup.id)) continue;
      
      let shouldShow = false;
      
      if (popup.trigger_type === 'scroll_depth') {
        const targetDepth = parseInt(popup.trigger_value || '50');
        if (currentScrollDepth >= targetDepth) {
          console.log(\`🎯 Scroll trigger met: \${currentScrollDepth}% >= \${targetDepth}%\`);
          shouldShow = true;
        }
      } else if (popup.trigger_type === 'time_delay') {
        const targetTime = parseInt(popup.trigger_value || '5');
        if (timeOnSite >= targetTime) {
          console.log(\`⏰ Time trigger met: \${timeOnSite}s >= \${targetTime}s\`);
          shouldShow = true;
        }
      } else if (popup.trigger_type === 'page_view') {
        console.log('👁️ Page view trigger met');
        shouldShow = true;
      } else if (popup.trigger_type === 'exit_intent') {
        if (hasExitIntent) {
          console.log('🚪 Exit intent trigger met');
          shouldShow = true;
        }
      }
      
      if (shouldShow) {
        console.log('🎯 Showing popup:', popup.name);
        showPopup(popup);
        shownPopups.add(popup.id);
        break; // Only show one popup at a time
      }
    }
  }
  
  // Platform Detection for Native-Style Notifications
  function getPlatform() {
    const ua = navigator.userAgent;
    const platform = navigator.platform;
    
    if (/iPhone|iPad/.test(ua)) return 'ios';
    if (/Android/.test(ua)) return 'android';
    if (/Mac/.test(platform)) return 'macos';
    if (/Win/.test(platform)) return 'windows';
    return 'generic';
  }

  function getBrowser() {
    const ua = navigator.userAgent;
    if (/Chrome/.test(ua) && !/Edge/.test(ua)) return 'chrome';
    if (/Safari/.test(ua) && !/Chrome/.test(ua)) return 'safari';
    if (/Firefox/.test(ua)) return 'firefox';
    if (/Edge/.test(ua)) return 'edge';
    return 'unknown';
  }

  function getNotificationStyle(popup = null) {
    const platform = getPlatform();
    const browser = getBrowser();
    
    // Allow URL override for testing
    const urlParams = new URLSearchParams(window.location.search);
    const forceStyle = urlParams.get('popup_style');
    if (forceStyle) return forceStyle;
    
    // Use popup's configured style if available
    let popupStyle = null;
    if (popup) {
      // Try to get style from popup_style field or parse from description
      popupStyle = popup.popup_style;
      if (!popupStyle && popup.description) {
        const styleMatch = popup.description.match(/\\[STYLE:(\\w+)\\]/);
        if (styleMatch) {
          popupStyle = styleMatch[1];
        }
      }
    }
    
    if (popupStyle) {
      if (popupStyle === 'native') {
        // Auto-detect platform for native style
        const styles = {
          ios: 'ios-notification',
          android: 'android-toast',
          macos: browser === 'safari' ? 'macos-safari' : 'macos-chrome',
          windows: 'windows-toast',
          generic: 'generic-notification'
        };
        return styles[platform] || styles.generic;
      } else if (popupStyle === 'traditional') {
        return 'traditional-modal';
      } else if (popupStyle === 'minimal') {
        return 'minimal-banner';
      } else if (popupStyle === 'corner') {
        return 'corner-toast';
      }
    }
    
    // Default to native platform detection
    const styles = {
      ios: 'ios-notification',
      android: 'android-toast',
      macos: browser === 'safari' ? 'macos-safari' : 'macos-chrome',
      windows: 'windows-toast',
      generic: 'generic-notification'
    };
    
    return styles[platform] || styles.generic;
  }

  function respectsReducedMotion() {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  function prefersDarkMode() {
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  }

  function createPlatformSpecificHTML(notificationStyle, id, title, description, buttonText, urgency, urgencyColors, level) {
    const currentTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
    if (notificationStyle === 'ios-notification') {
      // Pixel-perfect iOS notification structure
      return \`
        <div 
          id="\${id}" 
          class="native-notification ios-notification"
          role="dialog"
          aria-labelledby="ios-title-\${level}"
          aria-describedby="ios-desc-\${level}"
          aria-live="polite"
          tabindex="-1"
        >
          <div class="ios-notification-content">
            <div class="ios-notification-header">
              <span class="ios-notification-app-name">YOUR STORE</span>
              <span class="ios-notification-time">now</span>
            </div>
            <div class="ios-notification-body">
              <div id="ios-title-\${level}" class="ios-notification-title">\${title}</div>
              <div id="ios-desc-\${level}" class="ios-notification-message">\${description}</div>
              
              <input 
                type="email" 
                class="smartpop-email"
                placeholder="Enter your email for the discount"
                aria-label="Email address"
                style="width: 100%; padding: 12px; border: 1px solid rgba(0,0,0,0.1); border-radius: 8px; font-size: 15px; margin-bottom: 8px; box-sizing: border-box; background: rgba(255,255,255,0.8);"
                required
              >
              
              <button 
                class="smartpop-btn"
                onclick="window.submitSmartPopup('\${id}')"
                style="background: \${urgencyColors[urgency]}; color: white; border: none; padding: 12px 20px; border-radius: 12px; font-size: 15px; font-weight: 600; cursor: pointer; width: 100%; font-family: inherit;"
              >\${buttonText}</button>
            </div>
          </div>
        </div>
      \`;
    } 
    
    else if (notificationStyle.includes('macos')) {
      // Pixel-perfect macOS notification structure
      return \`
        <div 
          id="\${id}" 
          class="native-notification \${notificationStyle}"
          role="dialog"
          aria-labelledby="macos-title-\${level}"
          aria-describedby="macos-desc-\${level}"
          aria-live="polite"
          tabindex="-1"
        >
          <div class="macos-notification-close" onclick="window.dismissSmartPopup('\${id}')" aria-label="Close notification"></div>
          <div class="macos-notification-content">
            <div class="macos-notification-text">
              <div class="macos-notification-app-name">Your Store</div>
              <div id="macos-title-\${level}" class="macos-notification-title">\${title}</div>
              <div id="macos-desc-\${level}" class="macos-notification-message">\${description}</div>
              
              <input 
                type="email" 
                class="smartpop-email"
                placeholder="Enter your email for the discount"
                aria-label="Email address"
                style="width: 100%; padding: 8px 12px; border: 1px solid rgba(0,0,0,0.2); border-radius: 6px; font-size: 13px; margin-bottom: 8px; box-sizing: border-box; background: rgba(255,255,255,0.9);"
                required
              >
              
              <button 
                class="smartpop-btn"
                onclick="window.submitSmartPopup('\${id}')"
                style="background: \${urgencyColors[urgency]}; color: white; border: none; padding: 8px 16px; border-radius: 6px; font-size: 13px; font-weight: 600; cursor: pointer; width: 100%; font-family: inherit;"
              >\${buttonText}</button>
            </div>
          </div>
        </div>
      \`;
    }
    
    else {
      // Generic structure for other notification styles
      return \`
        <div 
          id="\${id}" 
          class="smartpop-notification \${notificationStyle}"
          role="dialog"
          aria-labelledby="smartpop-title-\${level}"
          aria-describedby="smartpop-desc-\${level}"
          aria-live="polite"
          tabindex="-1"
        >
          <button 
            class="smartpop-close" 
            onclick="window.dismissSmartPopup('\${id}')"
            aria-label="Close notification"
            title="Close"
            style="position: absolute; top: 12px; right: 12px; background: none; border: none; font-size: 20px; cursor: pointer; color: #666; width: 24px; height: 24px; display: flex; align-items: center; justify-content: center;"
          >×</button>
          
          <h3 id="smartpop-title-\${level}" style="margin: 0 0 8px 0; font-size: 18px; font-weight: 600; color: #000;">\${title}</h3>
          <p id="smartpop-desc-\${level}" style="margin: 0 0 12px 0; font-size: 15px; color: #666; line-height: 1.4;">\${description}</p>
          
          <input 
            type="email" 
            class="smartpop-email"
            placeholder="Enter your email for the discount"
            aria-label="Email address"
            style="width: 100%; padding: 12px 16px; border: 1px solid #ddd; border-radius: 8px; font-size: 16px; margin-bottom: 12px; box-sizing: border-box; background: #fff;"
            required
          >
          
          <button 
            class="smartpop-btn"
            onclick="window.submitSmartPopup('\${id}')"
            style="background: \${urgencyColors[urgency]}; color: white; border: none; padding: 12px 20px; border-radius: 8px; font-size: 16px; font-weight: 600; cursor: pointer; width: 100%; font-family: inherit;"
          >\${buttonText}</button>
          
          \${urgency === 'final' ? \`<p style="margin: 12px 0 0 0; color: \${urgencyColors.final}; font-size: 12px; font-weight: 500; text-align: center;">⚠️ This offer will not be shown again</p>\` : ''}
        </div>
      \`;
    }
  }

  function createNativeNotification(config) {
    const { id, title, description, buttonText, urgency, platform, notificationStyle, isDarkMode, reducedMotion, level } = config;
    
    // Get system fonts for each platform
    const systemFonts = {
      ios: '-apple-system, SF Pro Display, system-ui, sans-serif',
      android: 'Roboto, system-ui, sans-serif',
      macos: '-apple-system, SF Pro Display, system-ui, sans-serif',
      windows: 'Segoe UI, system-ui, sans-serif',
      generic: 'system-ui, -apple-system, sans-serif'
    };
    
    const fontFamily = systemFonts[platform] || systemFonts.generic;
    
    // Dark mode color schemes
    const colorSchemes = {
      light: {
        background: platform === 'android' ? '#323232' : 'rgba(255,255,255,0.98)',
        text: platform === 'android' ? '#ffffff' : '#000000',
        secondaryText: platform === 'android' ? '#ffffff' : '#666666',
        border: 'rgba(0,0,0,0.1)',
        shadow: 'rgba(0,0,0,0.12)'
      },
      dark: {
        background: platform === 'android' ? '#424242' : 'rgba(44,44,46,0.98)',
        text: '#ffffff',
        secondaryText: '#8e8e93',
        border: 'rgba(255,255,255,0.1)',
        shadow: 'rgba(0,0,0,0.3)'
      }
    };
    
    const colors = isDarkMode ? colorSchemes.dark : colorSchemes.light;
    
    // Urgency-based styling
    const urgencyColors = {
      soft: platform === 'ios' ? '#007AFF' : platform === 'android' ? '#2196F3' : '#0066CC',
      urgent: '#FF9500',
      final: '#FF3B30'
    };
    
    const buttonColor = urgencyColors[urgency];
    
    return \`
      <style>
        /* Base notification styles for all platforms */
        .native-notification {
          position: fixed;
          z-index: 9999;
          
          /* Typography - San Francisco font stack */
          font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Display', 'SF Pro Text', 'Helvetica Neue', Helvetica, Arial, sans-serif;
          -webkit-font-smoothing: antialiased;
          -moz-osx-font-smoothing: grayscale;
          
          /* Prevent text selection */
          -webkit-user-select: none;
          user-select: none;
          
          /* Hardware acceleration */
          transform: translateZ(0);
          will-change: transform;
        }

        /* iOS Notification (iPhone/iPad) - Pixel Perfect */
        .ios-notification {
          /* Positioning */
          top: 0;
          left: 0;
          right: 0;
          transform: translateY(-100%);
          
          /* iOS 15+ Safe area support */
          padding-top: env(safe-area-inset-top, 0);
          
          /* Container */
          background: \${isDarkMode ? 'rgba(30, 30, 30, 0.82)' : 'rgba(247, 247, 247, 0.82)'};
          backdrop-filter: blur(20px) saturate(180%);
          -webkit-backdrop-filter: blur(20px) saturate(180%);
          
          /* Touch gesture support */
          touch-action: pan-y;
          
          /* Inner content wrapper */
          display: flex;
          flex-direction: column;
          padding: 0;
        }

        .ios-notification-content {
          /* Actual notification card */
          margin: 8px 8px 8px 8px;
          background: \${isDarkMode ? 'rgba(45, 45, 45, 0.78)' : 'rgba(255, 255, 255, 0.78)'};
          border-radius: 13px;
          box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
          overflow: hidden;
        }

        .ios-notification-header {
          display: flex;
          align-items: center;
          padding: 10px 16px 8px 16px;
          gap: 8px;
        }

        .ios-notification-app-name {
          font-size: 13px;
          font-weight: 400;
          color: \${isDarkMode ? 'rgba(255, 255, 255, 0.55)' : 'rgba(0, 0, 0, 0.5)'};
          letter-spacing: -0.08px;
          line-height: 16px;
          text-transform: uppercase;
          flex: 1;
        }

        .ios-notification-time {
          font-size: 13px;
          font-weight: 400;
          color: \${isDarkMode ? 'rgba(255, 255, 255, 0.55)' : 'rgba(0, 0, 0, 0.5)'};
          letter-spacing: -0.08px;
        }

        .ios-notification-body {
          padding: 0 16px 12px 16px;
        }

        .ios-notification-title {
          font-size: 15px;
          font-weight: 600;
          color: \${isDarkMode ? '#fff' : '#000'};
          letter-spacing: -0.24px;
          line-height: 20px;
          margin-bottom: 2px;
        }

        .ios-notification-message {
          font-size: 15px;
          font-weight: 400;
          color: \${isDarkMode ? '#fff' : '#000'};
          letter-spacing: -0.24px;
          line-height: 20px;
          margin-bottom: 12px;
        }

        /* macOS Notification - Pixel Perfect */
        .macos-chrome, .macos-safari, .macos-notification {
          /* Positioning */
          top: 10px;
          right: 10px;
          width: 360px;
          transform: translateX(380px);
          
          /* Container */
          background: \${isDarkMode ? 'rgba(50, 50, 50, 0.95)' : 'rgba(239, 239, 239, 0.95)'};
          backdrop-filter: blur(30px) saturate(180%);
          -webkit-backdrop-filter: blur(30px) saturate(180%);
          border-radius: 11px;
          box-shadow: \${isDarkMode ? 
            '0 0 0 0.5px rgba(255, 255, 255, 0.1), 0 3px 8px rgba(0, 0, 0, 0.3), 0 10px 35px rgba(0, 0, 0, 0.2)' :
            '0 0 0 0.5px rgba(0, 0, 0, 0.1), 0 3px 8px rgba(0, 0, 0, 0.12), 0 10px 35px rgba(0, 0, 0, 0.08)'};
          padding: 12px;
        }

        .macos-notification-content {
          display: flex;
          gap: 12px;
        }

        .macos-notification-text {
          flex: 1;
          display: flex;
          flex-direction: column;
          justify-content: center;
        }

        .macos-notification-app-name {
          font-size: 13px;
          font-weight: 600;
          color: \${isDarkMode ? 'rgba(255, 255, 255, 0.85)' : 'rgba(0, 0, 0, 0.85)'};
          margin-bottom: 2px;
          letter-spacing: -0.08px;
        }

        .macos-notification-title {
          font-size: 13px;
          font-weight: 600;
          color: \${isDarkMode ? '#fff' : '#000'};
          margin-bottom: 1px;
          letter-spacing: -0.08px;
          line-height: 17px;
        }

        .macos-notification-message {
          font-size: 13px;
          font-weight: 400;
          color: \${isDarkMode ? 'rgba(255, 255, 255, 0.7)' : 'rgba(0, 0, 0, 0.7)'};
          letter-spacing: -0.08px;
          line-height: 17px;
          margin-bottom: 12px;
        }

        /* macOS Close button */
        .macos-notification-close {
          position: absolute;
          top: 6px;
          left: 6px;
          width: 12px;
          height: 12px;
          border-radius: 50%;
          background: #ff5f57;
          border: 0.5px solid rgba(0, 0, 0, 0.1);
          opacity: 0;
          transition: opacity 0.2s ease;
          cursor: pointer;
        }

        .macos-notification:hover .macos-notification-close,
        .macos-chrome:hover .macos-notification-close,
        .macos-safari:hover .macos-notification-close {
          opacity: 1;
        }

        /* Android Toast - Bottom center */
        .android-toast {
          position: fixed;
          bottom: -100px;
          left: 50%;
          transform: translateX(-50%);
          background: \${colors.background};
          color: \${colors.text};
          border-radius: 8px;
          padding: 16px 24px;
          font-family: Roboto, system-ui, sans-serif;
          z-index: 999999;
          min-width: 280px;
          max-width: calc(100% - 40px);
          box-shadow: 0 4px 12px \${colors.shadow};
        }

        /* Windows Toast - Bottom right */
        .windows-toast {
          position: fixed;
          bottom: -100px;
          right: -400px;
          width: 360px;
          background: \${colors.background};
          border-radius: 8px;
          padding: 16px 20px;
          font-family: 'Segoe UI', system-ui, sans-serif;
          z-index: 999999;
          border: 1px solid \${colors.border};
          box-shadow: 0 6px 20px \${colors.shadow};
        }

        /* Traditional Modal - Centered overlay */
        .traditional-modal {
          position: fixed;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 400px;
          max-width: 90%;
          background: \${colors.background};
          border-radius: 16px;
          padding: 32px;
          font-family: \${fontFamily};
          z-index: 999999;
          border: 1px solid \${colors.border};
          box-shadow: 0 20px 40px \${colors.shadow};
        }

        .traditional-modal::before {
          content: '';
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: rgba(0, 0, 0, 0.5);
          z-index: -1;
        }

        /* Minimal Banner - Top bar */
        .minimal-banner {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          background: \${colors.background};
          padding: 12px 20px;
          font-family: \${fontFamily};
          z-index: 999999;
          border-bottom: 1px solid \${colors.border};
          box-shadow: 0 2px 8px \${colors.shadow};
        }

        /* Corner Toast - Bottom right */
        .corner-toast {
          position: fixed;
          bottom: 20px;
          right: 20px;
          width: 320px;
          background: \${colors.background};
          border-radius: 8px;
          padding: 16px 20px;
          font-family: \${fontFamily};
          z-index: 999999;
          border: 1px solid \${colors.border};
          box-shadow: 0 6px 20px \${colors.shadow};
        }

        /* iOS Animations */
        @keyframes ios-slide-in {
          to {
            transform: translateY(0);
          }
        }

        @keyframes ios-slide-out {
          to {
            transform: translateY(-110%);
          }
        }

        .ios-notification.show {
          animation: ios-slide-in \${reducedMotion ? '0.01ms' : '0.3s'} cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards;
        }

        .ios-notification.hide {
          animation: ios-slide-out \${reducedMotion ? '0.01ms' : '0.25s'} cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards;
        }

        /* macOS Animations */
        @keyframes macos-slide-in {
          to {
            transform: translateX(0);
          }
        }

        @keyframes macos-slide-out {
          to {
            transform: translateX(380px);
          }
        }

        .macos-chrome.show, .macos-safari.show, .macos-notification.show {
          animation: macos-slide-in \${reducedMotion ? '0.01ms' : '0.4s'} cubic-bezier(0.68, -0.55, 0.265, 1.55) forwards;
        }

        .macos-chrome.hide, .macos-safari.hide, .macos-notification.hide {
          animation: macos-slide-out \${reducedMotion ? '0.01ms' : '0.3s'} cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards;
        }

        /* Android Animations */
        @keyframes android-slide-up {
          to {
            bottom: 20px;
          }
        }

        .android-toast.show {
          animation: android-slide-up \${reducedMotion ? '0.01ms' : '0.2s'} cubic-bezier(0.4, 0, 0.2, 1) forwards;
        }

        /* Windows Animations */
        @keyframes windows-slide-in {
          to {
            bottom: 20px;
            right: 20px;
          }
        }

        .windows-toast.show {
          animation: windows-slide-in \${reducedMotion ? '0.01ms' : '0.3s'} ease-out forwards;
        }

        /* Generic fade animations for other styles */
        @keyframes fadeIn {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }

        .traditional-modal.show, .minimal-banner.show, .corner-toast.show {
          animation: fadeIn \${reducedMotion ? '0.01ms' : '0.3s'} ease-out forwards;
        }

        /* Landscape adjustments for iOS */
        @media (orientation: landscape) {
          .ios-notification-content {
            margin: 6px 44px 6px 44px; /* Account for safe areas */
          }
        }

        /* iPad specific adjustments */
        @media (min-width: 768px) {
          .ios-notification-content {
            max-width: 420px;
            margin-left: auto;
            margin-right: auto;
          }
        }

        /* Reduced motion fallback */
        @media (prefers-reduced-motion: reduce) {
          .native-notification * {
            animation-duration: 0.01ms !important;
            animation-iteration-count: 1 !important;
            transition-duration: 0.01ms !important;
          }
        }

        /* Touch gestures for mobile */
        .smartpop-notification {
          touch-action: pan-y;
          user-select: none;
        }

        .smartpop-notification.ios-notification {
          cursor: grab;
        }

        .smartpop-notification.android-toast {
          cursor: grab;
        }

        /* Hover states for desktop */
        .smartpop-notification:hover {
          transform: translateY(-2px);
          transition: transform 0.2s ease;
        }

        /* Focus styles for accessibility */
        .smartpop-notification:focus-within {
          outline: 2px solid \${buttonColor};
          outline-offset: 2px;
        }

        /* Button styles matching platform */
        .smartpop-btn {
          background: \${buttonColor};
          color: white;
          border: none;
          padding: \${platform === 'android' ? '8px 16px' : '12px 20px'};
          border-radius: \${platform === 'android' ? '4px' : platform === 'ios' ? '12px' : '8px'};
          font-size: \${platform === 'android' ? '14px' : '16px'};
          font-weight: \${platform === 'ios' ? '600' : platform === 'android' ? '500' : '600'};
          cursor: pointer;
          transition: all 0.2s ease;
          font-family: inherit;
          margin-top: 12px;
          width: 100%;
        }

        .smartpop-btn:hover {
          opacity: 0.9;
          transform: translateY(-1px);
        }

        .smartpop-btn:active {
          transform: translateY(0);
        }

        /* Close button */
        .smartpop-close {
          position: absolute;
          top: \${platform === 'android' ? '8px' : '12px'};
          right: \${platform === 'android' ? '8px' : '12px'};
          background: none;
          border: none;
          font-size: \${platform === 'android' ? '18px' : '20px'};
          cursor: pointer;
          color: \${colors.secondaryText};
          padding: 4px;
          border-radius: 50%;
          transition: all 0.2s ease;
          display: flex;
          align-items: center;
          justify-content: center;
          width: 24px;
          height: 24px;
        }

        .smartpop-close:hover {
          background: \${isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'};
          color: \${colors.text};
        }

        /* Content styles */
        .smartpop-title {
          font-size: \${platform === 'android' ? '16px' : '18px'};
          font-weight: \${platform === 'ios' ? '600' : platform === 'android' ? '500' : '600'};
          color: \${colors.text};
          margin: 0 0 8px 0;
          line-height: 1.3;
        }

        .smartpop-description {
          font-size: \${platform === 'android' ? '14px' : '15px'};
          color: \${colors.secondaryText};
          margin: 0 0 12px 0;
          line-height: 1.4;
        }

        .smartpop-email {
          width: 100%;
          padding: \${platform === 'android' ? '8px 12px' : '12px 16px'};
          border: 1px solid \${colors.border};
          border-radius: \${platform === 'android' ? '4px' : platform === 'ios' ? '12px' : '8px'};
          font-size: 16px;
          font-family: inherit;
          background: \${isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)'};
          color: \${colors.text};
          margin-bottom: 12px;
          box-sizing: border-box;
          transition: border-color 0.2s ease;
        }

        .smartpop-email:focus {
          outline: none;
          border-color: \${buttonColor};
        }

        .smartpop-email::placeholder {
          color: \${colors.secondaryText};
        }
      </style>
      
      \${createPlatformSpecificHTML(notificationStyle, id, title, description, buttonText, urgency, urgencyColors, level)}
    \`;
  }

  function showProgressivePopup(level) {
    const popupId = \`smartpop-progressive-\${level}\`;
    const platform = getPlatform();
    
    // Get the first active popup to determine style preference
    const activePopup = popups.find(p => p.is_active && !p.is_deleted);
    const notificationStyle = getNotificationStyle(activePopup);
    const isDarkMode = prefersDarkMode();
    const reducedMotion = respectsReducedMotion();
    
    // Remove any existing progressive popups
    const existingPopups = document.querySelectorAll('[id^="smartpop-progressive-"]');
    existingPopups.forEach(popup => popup.remove());
    
    let title, description, buttonText, urgency;
    
    // Level-specific content
    if (level === 1) {
      title = "Hey, before you leave...";
      description = "Get 15% off your first order. No commitment required!";
      buttonText = "Show Me The Deal";
      urgency = "soft";
    } else if (level === 2) {
      title = "Don't miss out!";
      description = "This 20% discount expires in 2 minutes. Don't let it slip away!";
      buttonText = "Grab 20% Off Now";
      urgency = "urgent";
    } else if (level === 3) {
      title = "🚨 LAST CHANCE - Exclusive Offer";
      description = "Final opportunity: 25% off + FREE shipping. This won't be shown again!";
      buttonText = "CLAIM 25% OFF NOW";
      urgency = "final";
    }
    
    // Generate platform-specific notification HTML
    const notificationHTML = createNativeNotification({
      id: popupId,
      title,
      description,
      buttonText,
      urgency,
      platform,
      notificationStyle,
      isDarkMode,
      reducedMotion,
      level
    });
    
    document.body.insertAdjacentHTML('beforeend', notificationHTML);
    
    // Trigger animation after a brief delay
    setTimeout(() => {
      const popup = document.getElementById(popupId);
      if (popup) {
        popup.classList.add('show');
      }
    }, 10);
    
    // Setup global functions for interaction
    window.dismissSmartPopup = (id) => {
      const popup = document.getElementById(id);
      if (popup) {
        popup.style.opacity = '0';
        popup.style.transform = 'translateY(-20px)';
        setTimeout(() => popup.remove(), 200);
      }
    };
    
    // Fixed email validation - ACTUALLY WORKS NOW (same as popup-embed-public)
    window.validateEmail = function(email) {
      console.log('🔍 Validating email:', email);
      
      // Basic checks first
      if (!email || typeof email !== 'string') {
        console.log('❌ Email is empty or not string');
        return false;
      }
      
      const cleanEmail = email.trim();
      
      // Length validation
      if (cleanEmail.length < 3 || cleanEmail.length > 254) {
        console.log('❌ Email length invalid:', cleanEmail.length);
        return false;
      }
      
      // Must contain exactly one @
      const atCount = (cleanEmail.match(/@/g) || []).length;
      if (atCount !== 1) {
        console.log('❌ Must contain exactly one @, found:', atCount);
        return false;
      }
      
      // Split by @
      const parts = cleanEmail.split('@');
      const [local, domain] = parts;
      
      // Local part (before @) validation
      if (!local || local.length === 0) {
        console.log('❌ Missing local part (before @)');
        return false;
      }
      
      // Domain part (after @) validation  
      if (!domain || domain.length === 0) {
        console.log('❌ Missing domain part (after @)');
        return false;
      }
      
      // Domain MUST contain at least one dot
      if (!domain.includes('.')) {
        console.log('❌ Domain must contain at least one dot');
        return false;
      }
      
      // Domain must not start or end with dot
      if (domain.startsWith('.') || domain.endsWith('.')) {
        console.log('❌ Domain cannot start or end with dot');
        return false;
      }
      
      // Domain must have something after the last dot (TLD)
      const domainParts = domain.split('.');
      const tld = domainParts[domainParts.length - 1];
      if (!tld || tld.length < 2) {
        console.log('❌ Invalid TLD:', tld);
        return false;
      }
      
      // Basic character validation (simplified but effective)
      const emailRegex = /^[a-zA-Z0-9._+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
      if (!emailRegex.test(cleanEmail)) {
        console.log('❌ Failed regex test');
        return false;
      }
      
      console.log('✅ Email validation passed');
      return true;
    };

    // Proper popup submit handler with validation
    window.handlePopupSubmit = function(popupId) {
      const emailInput = document.getElementById(\`email-input-\${popupId}\`);
      if (!emailInput) {
        console.error('❌ Email input not found for popup:', popupId);
        return;
      }
      
      const email = emailInput.value.trim();
      console.log('🔍 Popup submit attempt:', { popupId, email });
      
      if (window.validateEmail(email)) {
        console.log('✅ Email validation passed - submitting');
        alert('Thank you! Check your email for the discount code.');
        document.getElementById(\`smartpop-\${popupId}\`)?.remove();
      } else {
        console.log('❌ Email validation failed');
        emailInput.style.borderColor = '#ff3b30';
        emailInput.focus();
        setTimeout(() => {
          emailInput.style.borderColor = '#ddd';
        }, 2000);
      }
    };

    window.submitSmartPopup = (id) => {
      const popup = document.getElementById(id);
      const emailInput = popup.querySelector('.smartpop-email');
      const email = emailInput.value.trim();
      
      // FIXED: Use proper validation instead of broken email.includes('@')
      if (window.validateEmail(email)) {
        console.log('📧 Email submitted:', email);
        // Here you would typically send to your email service
        alert('Thank you! Check your email for the discount code.');
        window.dismissSmartPopup(id);
      } else {
        console.log('❌ Invalid email rejected:', email);
        emailInput.style.borderColor = '#ff3b30';
        emailInput.focus();
        setTimeout(() => {
          emailInput.style.borderColor = '';
        }, 2000);
      }
    };
    
    // Setup touch gestures for mobile
    setupTouchGestures(popupId, platform);
    
    // Setup keyboard navigation
    setupKeyboardNavigation(popupId);
    
    // Auto-dismiss after 7 seconds (except for final level)
    if (urgency !== 'final') {
      setTimeout(() => {
        const popup = document.getElementById(popupId);
        if (popup) {
          window.dismissSmartPopup(popupId);
        }
      }, 7000);
    }
    
    if (smartExitIntent.debugMode) {
      console.log(\`🎪 Progressive Popup Level \${level} displayed\`);
      console.log(\`🎯 Platform: \${platform}, Style: \${notificationStyle}, Dark Mode: \${isDarkMode}\`);
    }
  }

  function setupTouchGestures(popupId, platform) {
    const popup = document.getElementById(popupId);
    if (!popup) return;
    
    let startY = 0;
    let startX = 0;
    let currentY = 0;
    let currentX = 0;
    
    // iOS Style: Swipe up to dismiss
    if (platform === 'ios') {
      popup.addEventListener('touchstart', (e) => {
        startY = e.touches[0].clientY;
        currentY = startY;
      }, { passive: true });
      
      popup.addEventListener('touchmove', (e) => {
        currentY = e.touches[0].clientY;
        const deltaY = startY - currentY;
        
        // Allow upward swipe
        if (deltaY > 0) {
          popup.style.transform = \`translateX(-50%) translateY(-\${deltaY}px)\`;
          popup.style.opacity = Math.max(0.3, 1 - deltaY / 100);
        }
      }, { passive: true });
      
      popup.addEventListener('touchend', () => {
        const deltaY = startY - currentY;
        
        if (deltaY > 50) {
          // Swipe up detected - dismiss
          window.dismissSmartPopup(popupId);
        } else {
          // Snap back
          popup.style.transform = 'translateX(-50%) translateY(0)';
          popup.style.opacity = '1';
        }
      }, { passive: true });
    }
    
    // Android Style: Swipe left/right to dismiss
    if (platform === 'android') {
      popup.addEventListener('touchstart', (e) => {
        startX = e.touches[0].clientX;
        currentX = startX;
      }, { passive: true });
      
      popup.addEventListener('touchmove', (e) => {
        currentX = e.touches[0].clientX;
        const deltaX = currentX - startX;
        
        popup.style.transform = \`translateX(calc(-50% + \${deltaX}px))\`;
        popup.style.opacity = Math.max(0.3, 1 - Math.abs(deltaX) / 150);
      }, { passive: true });
      
      popup.addEventListener('touchend', () => {
        const deltaX = Math.abs(currentX - startX);
        
        if (deltaX > 80) {
          // Swipe detected - dismiss
          window.dismissSmartPopup(popupId);
        } else {
          // Snap back
          popup.style.transform = 'translateX(-50%)';
          popup.style.opacity = '1';
        }
      }, { passive: true });
    }
  }

  function setupKeyboardNavigation(popupId) {
    const popup = document.getElementById(popupId);
    if (!popup) return;
    
    // Focus the popup for keyboard navigation
    popup.focus();
    
    // Handle keyboard events
    const handleKeyDown = (e) => {
      if (e.target.closest(\`#\${popupId}\`)) {
        switch (e.key) {
          case 'Escape':
            e.preventDefault();
            window.dismissSmartPopup(popupId);
            break;
          case 'Enter':
            if (e.target.tagName !== 'BUTTON' && e.target.tagName !== 'INPUT') {
              e.preventDefault();
              const submitBtn = popup.querySelector('.smartpop-btn');
              if (submitBtn) submitBtn.click();
            }
            break;
          case 'Tab':
            // Keep focus within popup
            const focusableElements = popup.querySelectorAll('button, input, [tabindex]:not([tabindex="-1"])');
            const firstElement = focusableElements[0];
            const lastElement = focusableElements[focusableElements.length - 1];
            
            if (e.shiftKey && document.activeElement === firstElement) {
              e.preventDefault();
              lastElement.focus();
            } else if (!e.shiftKey && document.activeElement === lastElement) {
              e.preventDefault();
              firstElement.focus();
            }
            break;
        }
      }
    };
    
    document.addEventListener('keydown', handleKeyDown);
    
    // Clean up event listener when popup is removed
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.removedNodes.forEach((node) => {
          if (node.id === popupId) {
            document.removeEventListener('keydown', handleKeyDown);
            observer.disconnect();
          }
        });
      });
    });
    
    observer.observe(document.body, { childList: true });
  }

  function showPopup(popup) {
    const popupHTML = \`
      <div id="smartpop-\${popup.id}" style="
        position: fixed; top: 0; left: 0; width: 100%; height: 100%;
        background: rgba(0, 0, 0, 0.7); z-index: 999999; display: flex;
        align-items: center; justify-content: center;
        font-family: -apple-system, BlinkMacSystemFont, sans-serif;
      ">
        <div style="
          background: white; border-radius: 12px; padding: 32px;
          max-width: 450px; width: 90%; text-align: center;
          box-shadow: 0 20px 40px rgba(0,0,0,0.3); position: relative;
        ">
          <button onclick="document.getElementById('smartpop-\${popup.id}').remove()" style="
            position: absolute; top: 16px; right: 16px; background: none;
            border: none; font-size: 24px; cursor: pointer; color: #666;
          ">×</button>
          
          <h2 style="margin: 0 0 16px 0; color: #333; font-size: 24px;">
            \${popup.title || 'Special Offer!'}
          </h2>
          
          <p style="margin: 0 0 24px 0; color: #666; font-size: 16px;">
            \${popup.description || 'Get a special discount!'}
          </p>
          
          <input type="email" id="email-input-\${popup.id}" placeholder="\${popup.email_placeholder || 'Enter your email'}" 
                 style="width: 100%; padding: 12px; border: 2px solid #ddd;
                        border-radius: 6px; font-size: 16px; margin-bottom: 16px;
                        box-sizing: border-box;">
          
          <button onclick="handlePopupSubmit('\${popup.id}')" 
                  style="background: #007cba; color: white; border: none;
                         padding: 14px 28px; border-radius: 6px; font-size: 16px;
                         cursor: pointer; width: 100%;">
            \${popup.button_text || 'Get Offer'}
          </button>
        </div>
      </div>
    \`;
    
    document.body.insertAdjacentHTML('beforeend', popupHTML);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadAndShowPopups);
  } else {
    loadAndShowPopups();
  }
  
  console.log('🎯 SmartPop loaded for shop: ${shop}');
})();
`
    
    return new Response(script, {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/javascript',
        'Cache-Control': 'no-cache, no-store, must-revalidate'
      }
    })
    
  } catch (error) {
    console.error('Script generation error:', error)
    return new Response(`console.error('SmartPop Error: ${error.message}');`, {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/javascript' }
    })
  }
})