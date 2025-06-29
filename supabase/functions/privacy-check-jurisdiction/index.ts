import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
}

// GDPR countries (EU + EEA + UK)
const GDPR_COUNTRIES = [
  'AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FI', 'FR', 'DE', 'GR', 'HU', 'IE', 'IT', 'LV', 'LT', 'LU', 'MT', 'NL', 'PL', 'PT', 'RO', 'SK', 'SI', 'ES', 'SE', 'GB', 'IS', 'LI', 'NO'
]

// CCPA states (US)
const CCPA_STATES = ['CA', 'CO', 'CT', 'UT', 'VA'] // California, Colorado, Connecticut, Utah, Virginia

serve(async (req) => {
  const timestamp = new Date().toISOString()
  console.log(`[${timestamp}] === PRIVACY JURISDICTION CHECK ===`)
  
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Get client IP from headers
    const clientIP = req.headers.get('CF-Connecting-IP') || 
                    req.headers.get('X-Forwarded-For') || 
                    req.headers.get('X-Real-IP') || 
                    'unknown'

    console.log(`[${timestamp}] Client IP:`, clientIP)

    let requiresConsent = false
    let jurisdiction = 'unknown'
    let reason = 'Default privacy-first approach'

    // For development/testing, check if it's a local IP
    if (clientIP === 'unknown' || clientIP.startsWith('127.') || clientIP.startsWith('192.168.') || clientIP.startsWith('10.')) {
      // Default to requiring consent for privacy-first approach
      requiresConsent = true
      jurisdiction = 'development'
      reason = 'Development environment - defaulting to privacy-first'
    } else {
      try {
        // Use a geolocation service to determine country/state
        // For production, you'd use a service like MaxMind, IPInfo, or similar
        const geoResponse = await fetch(`http://ip-api.com/json/${clientIP}?fields=status,country,countryCode,region,regionName`)
        
        if (geoResponse.ok) {
          const geoData = await geoResponse.json()
          console.log(`[${timestamp}] Geo data:`, geoData)

          if (geoData.status === 'success') {
            const countryCode = geoData.countryCode
            const regionCode = geoData.region

            jurisdiction = `${countryCode}${regionCode ? `-${regionCode}` : ''}`

            // Check if GDPR applies
            if (GDPR_COUNTRIES.includes(countryCode)) {
              requiresConsent = true
              reason = `GDPR applies - EU/EEA country: ${geoData.country}`
            }
            // Check if CCPA applies (US states)
            else if (countryCode === 'US' && CCPA_STATES.includes(regionCode)) {
              requiresConsent = true
              reason = `CCPA applies - US state: ${geoData.regionName}`
            }
            // Other privacy laws (Brazil LGPD, etc.)
            else if (['BR', 'CA', 'AU', 'NZ', 'JP', 'KR', 'SG'].includes(countryCode)) {
              requiresConsent = true
              reason = `Privacy law applies - Country: ${geoData.country}`
            }
            else {
              // Default to privacy-first approach for other countries
              requiresConsent = true
              reason = 'Privacy-first approach for all users'
            }
          }
        }
      } catch (geoError) {
        console.warn(`[${timestamp}] Geolocation failed:`, geoError)
        // Default to requiring consent on geo lookup failure
        requiresConsent = true
        reason = 'Geolocation failed - defaulting to privacy-first'
      }
    }

    console.log(`[${timestamp}] Jurisdiction check result:`, {
      requiresConsent,
      jurisdiction,
      reason
    })

    return new Response(JSON.stringify({
      requiresConsent,
      jurisdiction,
      reason,
      clientIP: clientIP === 'unknown' ? undefined : clientIP,
      timestamp
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error(`[${timestamp}] Function error:`, error)
    
    // Default to requiring consent on any error
    return new Response(JSON.stringify({
      requiresConsent: true,
      jurisdiction: 'error',
      reason: 'Error determining jurisdiction - defaulting to privacy-first',
      timestamp
    }), {
      status: 200, // Return 200 with default values rather than error
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})