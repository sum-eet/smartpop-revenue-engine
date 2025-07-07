# 🔧 Email Validation & Capture Fix Plan (Simplified)

## 🔍 CORE ISSUES TO FIX

### 1. **Weak Email Validation** ❌
**Location**: `popup-embed-public/index.ts:400`  
**Current**: `if (!email || !email.includes('@'))`  
**Problem**: Accepts `@`, `a@`, `user@`, etc.

### 2. **No Dedicated Email Storage** ❌
**Problem**: Emails stored in generic `popup_events` table  
**Issues**: No email management, status tracking, or analytics

### 3. **Basic Email Input Issues** ⚠️
**Status**: Working but can be improved  
**Found**: Email inputs properly connected, but validation feedback missing

## 🎯 SIMPLIFIED FIX PLAN (NO INTEGRATIONS)

### Phase 1: Enhanced Email Validation (1.5 hours)

#### 1.1 RFC 5322 Compliant Validation
```javascript
function validateEmail(email) {
  // Length validation
  if (!email || email.length < 5 || email.length > 254) return false;
  
  // RFC 5322 regex
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
  
  if (!emailRegex.test(email)) return false;
  
  // Split validation
  const parts = email.split('@');
  if (parts.length !== 2) return false;
  
  const [local, domain] = parts;
  
  // Local part validation (before @)
  if (local.length > 64) return false;
  if (local.startsWith('.') || local.endsWith('.')) return false;
  if (local.includes('..')) return false;
  
  // Domain validation
  if (domain.length > 253) return false;
  if (!domain.includes('.')) return false;
  if (domain.startsWith('.') || domain.endsWith('.')) return false;
  if (domain.includes('..')) return false;
  
  return true;
}
```

#### 1.2 Real-time Validation Feedback
```javascript
// Add to email input
<input 
  type="email" 
  id="email-${popup.id}" 
  placeholder="${popup.email_placeholder || 'Enter your email'}"
  oninput="validateEmailRealtime('${popup.id}')"
  style="/* existing styles */"
/>
<div id="email-feedback-${popup.id}" class="email-feedback"></div>

// Validation function
window.validateEmailRealtime = function(popupId) {
  const email = document.getElementById('email-' + popupId).value;
  const feedbackEl = document.getElementById('email-feedback-' + popupId);
  
  if (!email) {
    feedbackEl.textContent = '';
    return;
  }
  
  if (validateEmail(email)) {
    feedbackEl.textContent = '✓ Email looks good!';
    feedbackEl.style.color = '#27ae60';
  } else {
    feedbackEl.textContent = 'Please enter a valid email (e.g., user@example.com)';
    feedbackEl.style.color = '#e74c3c';
  }
};
```

#### 1.3 Enhanced Submit Function
```javascript
window.submitEmail = function(popupId, discountCode) {
  const email = document.getElementById('email-' + popupId).value.trim();
  
  if (!validateEmail(email)) {
    alert('Please enter a valid email address (e.g., user@example.com)');
    return;
  }
  
  // Rest of existing submission logic...
};
```

### Phase 2: Dedicated Email Database (1 hour)

#### 2.1 Create Email Subscribers Table
```sql
-- Simple email subscribers table
CREATE TABLE email_subscribers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  email_hash TEXT NOT NULL UNIQUE, -- SHA256 for privacy
  shop_id UUID REFERENCES shops(id) ON DELETE CASCADE,
  
  -- Capture details
  first_captured_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  popup_id UUID REFERENCES popups(id),
  discount_code TEXT,
  
  -- Simple status tracking
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'unsubscribed')),
  
  -- Metadata
  page_url TEXT,
  user_agent TEXT,
  ip_address INET,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Indexes
CREATE INDEX idx_email_subscribers_email ON email_subscribers(email);
CREATE INDEX idx_email_subscribers_shop ON email_subscribers(shop_id);
CREATE UNIQUE INDEX idx_email_subscribers_shop_email ON email_subscribers(shop_id, email);
```

### Phase 3: Email Capture API (1 hour)

#### 3.1 Create Email Capture Function
```typescript
// /supabase/functions/email-capture/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method === 'POST') {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const { email, shopId, popupId, discountCode, pageUrl } = await req.json()
    
    // Server-side email validation
    if (!validateEmailServerSide(email)) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Invalid email format' 
      }), { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Hash email for privacy
    const emailHash = await hashEmail(email)
    
    // Create or update subscriber
    const { data, error } = await supabase
      .from('email_subscribers')
      .upsert({
        email: email,
        email_hash: emailHash,
        shop_id: shopId,
        popup_id: popupId,
        discount_code: discountCode,
        page_url: pageUrl,
        user_agent: req.headers.get('User-Agent'),
        ip_address: req.headers.get('CF-Connecting-IP') || 'unknown',
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'shop_id,email'
      })
      .select()

    if (error) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Failed to save email' 
      }), { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    return new Response(JSON.stringify({ 
      success: true,
      message: 'Email captured successfully'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})

function validateEmailServerSide(email: string): boolean {
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/
  return email && email.length >= 5 && email.length <= 254 && emailRegex.test(email)
}

async function hashEmail(email: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(email.toLowerCase())
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}
```

#### 3.2 Update Submit Function to Use New API
```javascript
window.submitEmail = function(popupId, discountCode) {
  const email = document.getElementById('email-' + popupId).value.trim();
  
  if (!validateEmail(email)) {
    alert('Please enter a valid email address (e.g., user@example.com)');
    return;
  }

  // Get shop ID from existing popup data
  const shopId = '${shop}'; // This will be interpolated

  // Submit to new email capture API
  fetch('${apiBaseUrl}/email-capture', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: email,
      shopId: shopId,
      popupId: popupId,
      discountCode: discountCode,
      pageUrl: window.location.href
    })
  })
  .then(response => response.json())
  .then(result => {
    if (result.success) {
      console.log('📧 Email captured successfully');
      showSuccessMessage(popupId, discountCode);
    } else {
      console.error('Email capture failed:', result.error);
      alert('Failed to save email. Please try again.');
    }
  })
  .catch(error => {
    console.error('Email capture error:', error);
    alert('Network error. Please try again.');
  });
};
```

### Phase 4: Basic Email Management (0.5 hours)

#### 4.1 Simple Email List API
```typescript
// Add to existing popup-config function or create new endpoint
// GET /email-subscribers?shop=shopDomain
export async function getEmailSubscribers(shopDomain: string) {
  const { data, error } = await supabase
    .from('email_subscribers')
    .select(`
      email,
      first_captured_at,
      popup_id,
      discount_code,
      status,
      popups(name)
    `)
    .eq('shops.shop_domain', shopDomain)
    .eq('status', 'active')
    .order('first_captured_at', { ascending: false })

  return { data, error }
}
```

## 📋 IMPLEMENTATION PLAN (SIMPLIFIED)

### Step 1: Enhanced Validation (1.5 hours)
1. Replace weak email validation with RFC 5322 compliant regex
2. Add real-time validation feedback to email inputs
3. Enhance submit function with better error handling
4. Test validation with common invalid email patterns

### Step 2: Email Database (1 hour)
1. Create email_subscribers table with essential fields
2. Add necessary indexes for performance
3. Create database migration file
4. Test table creation and data insertion

### Step 3: Capture API (1 hour)
1. Create email-capture Supabase function
2. Add server-side validation and email hashing
3. Update popup submit function to use new API
4. Test end-to-end email capture flow

### Step 4: Basic Management (0.5 hours)
1. Add simple email list endpoint
2. Test email retrieval by shop
3. Verify data structure and format

## 📁 FILES TO MODIFY/CREATE

### Modify Existing
- `/supabase/functions/popup-embed-public/index.ts` - Enhanced validation & submit function

### Create New
- `/supabase/migrations/20250706000002_create_email_subscribers.sql` - Email table
- `/supabase/functions/email-capture/index.ts` - Email capture API

## ✅ SUCCESS CRITERIA

### Email Validation
- [ ] Rejects `@`, `a@`, `user@`, `@domain.com`
- [ ] Accepts `user@example.com`, `test.email@domain.co.uk`
- [ ] Real-time feedback shows validation status
- [ ] Server-side validation prevents invalid data

### Email Storage
- [ ] Emails stored in dedicated table
- [ ] Duplicate handling (upsert by shop + email)
- [ ] Basic metadata captured (popup, timestamp, etc.)
- [ ] Email privacy (hashed storage option)

### User Experience
- [ ] Clear validation feedback
- [ ] Smooth email submission flow
- [ ] Proper error handling and messages
- [ ] No breaking changes to existing functionality

## ⏱️ REVISED ESTIMATE

**Total Time: 4 hours**
- Phase 1: Enhanced validation (1.5 hours)
- Phase 2: Email database (1 hour) 
- Phase 3: Capture API (1 hour)
- Phase 4: Basic management (0.5 hours)

**Priority**: HIGH (affects core product functionality)
**Complexity**: MEDIUM (focused scope, no integrations)
**Risk**: LOW (incremental improvements, backward compatible)

---

## 🎯 READY FOR IMPLEMENTATION

This simplified plan focuses on the core issues:
- ✅ Fixes weak email validation (main problem)
- ✅ Creates proper email storage system
- ✅ Maintains existing functionality
- ✅ Sets foundation for future integrations
- ✅ No complex external integrations

**Result: Transform email validation from broken → enterprise-grade in 4 hours!** 🚀