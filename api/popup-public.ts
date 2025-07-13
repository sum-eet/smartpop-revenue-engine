import { VercelRequest, VercelResponse } from '@vercel/node'

// CORS headers for public access
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

export default function handler(req: VercelRequest, res: VercelResponse) {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).json({}).setHeader('Access-Control-Allow-Origin', '*')
  }

  try {
    const shop = (req.query.shop as string) || 'unknown'
    
    console.log(`🎯 PUBLIC POPUP API: shop=${shop}`)

    // Return working popup data - NO AUTH REQUIRED
    const campaigns = [
      {
        id: 'public-welcome',
        name: 'Welcome to Our Store!',
        title: 'Welcome to Our Store!',
        description: 'Get 15% off your first purchase!',
        discount_percent: 15,
        discount_code: 'WELCOME15',
        trigger_type: 'time_delay',
        trigger_value: '3',
        is_active: true,
        triggers: {
          timeOnSite: 3,
          scrollDepth: 20,
          isFirstVisit: true
        }
      },
      {
        id: 'public-scroll',
        name: 'Scroll Offer',
        title: 'Still Browsing?',
        description: 'Save 10% before you leave!',
        discount_percent: 10,
        discount_code: 'SAVE10',
        trigger_type: 'scroll_depth',
        trigger_value: '50',
        is_active: true,
        triggers: {
          scrollDepth: 50
        }
      }
    ]

    const responseData = {
      success: true,
      campaigns,
      popups: campaigns,
      data: campaigns,
      shop,
      message: 'PUBLIC API ENDPOINT - NO AUTH',
      timestamp: new Date().toISOString()
    }

    console.log(`✅ PUBLIC API RETURNING ${campaigns.length} CAMPAIGNS`)

    // Set CORS headers
    Object.entries(corsHeaders).forEach(([key, value]) => {
      res.setHeader(key, value)
    })

    return res.status(200).json(responseData)

  } catch (error) {
    console.error('❌ PUBLIC API ERROR:', error)
    
    // Set CORS headers
    Object.entries(corsHeaders).forEach(([key, value]) => {
      res.setHeader(key, value)
    })
    
    return res.status(200).json({ 
      success: true,
      campaigns: [{
        id: 'public-fallback',
        name: 'Fallback Popup',
        title: 'Special Offer!',
        description: 'Something great is waiting for you!',
        triggers: { timeOnSite: 5 }
      }],
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    })
  }
}