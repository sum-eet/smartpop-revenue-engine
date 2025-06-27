import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    const supabase = createClient(supabaseUrl!, supabaseKey!)

    if (req.method === 'POST') {
      const { shop } = await req.json()
      
      if (!shop) {
        return new Response(JSON.stringify({ error: 'Shop parameter required' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      console.log('Starting cleanup for shop:', shop)

      // Get all popups for the shop
      const { data: popups, error: fetchError } = await supabase
        .from('popups')
        .select(`
          *,
          shops!inner(shop_domain)
        `)
        .eq('shops.shop_domain', shop)
        .order('created_at', { ascending: false })

      if (fetchError) {
        throw fetchError
      }

      console.log('Found', popups?.length || 0, 'popups')

      if (!popups || popups.length <= 1) {
        return new Response(JSON.stringify({ 
          message: 'No cleanup needed',
          totalPopups: popups?.length || 0,
          duplicatesRemoved: 0
        }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      // Group popups by their content signature (name + trigger + target + type)
      const popupGroups = new Map()
      
      popups.forEach(popup => {
        const signature = `${popup.name}-${popup.trigger_type}-${popup.trigger_value}-${popup.page_target}-${popup.popup_type}-${popup.title}-${popup.description}`
        
        if (!popupGroups.has(signature)) {
          popupGroups.set(signature, [])
        }
        popupGroups.get(signature).push(popup)
      })

      console.log('Found', popupGroups.size, 'unique popup groups')

      let totalRemoved = 0
      const idsToDelete = []

      // For each group, keep the most recent and mark others for deletion
      for (const [signature, group] of popupGroups) {
        if (group.length > 1) {
          console.log(`Found ${group.length} duplicates for signature: ${signature}`)
          
          // Sort by created_at desc (most recent first)
          group.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
          
          // Keep the first (most recent), delete the rest
          const toDelete = group.slice(1)
          toDelete.forEach(popup => {
            idsToDelete.push(popup.id)
            console.log(`Marking for deletion: ${popup.id} (created: ${popup.created_at})`)
          })
          
          totalRemoved += toDelete.length
        }
      }

      if (idsToDelete.length === 0) {
        return new Response(JSON.stringify({ 
          message: 'No duplicates found',
          totalPopups: popups.length,
          duplicatesRemoved: 0
        }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      console.log('Deleting', idsToDelete.length, 'duplicate popups')

      // Delete duplicates in batches
      const batchSize = 10
      for (let i = 0; i < idsToDelete.length; i += batchSize) {
        const batch = idsToDelete.slice(i, i + batchSize)
        
        const { error: deleteError } = await supabase
          .from('popups')
          .delete()
          .in('id', batch)

        if (deleteError) {
          console.error('Error deleting batch:', deleteError)
          throw deleteError
        }
        
        console.log(`Deleted batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(idsToDelete.length/batchSize)}`)
      }

      // Also cleanup related popup_events for deleted popups
      if (idsToDelete.length > 0) {
        const { error: eventsError } = await supabase
          .from('popup_events')
          .delete()
          .in('popup_id', idsToDelete)

        if (eventsError) {
          console.error('Error deleting related events:', eventsError)
          // Don't throw here as the main cleanup succeeded
        } else {
          console.log('Cleaned up related popup events')
        }
      }

      return new Response(JSON.stringify({ 
        message: 'Cleanup completed successfully',
        totalPopups: popups.length,
        duplicatesRemoved: totalRemoved,
        remainingPopups: popups.length - totalRemoved,
        deletedIds: idsToDelete
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
    
  } catch (error) {
    console.error('Cleanup error:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})