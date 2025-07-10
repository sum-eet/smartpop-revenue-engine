import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabaseApiClient } from '@/lib/shopify/session-token';
import { getShopDomain } from '@/lib/shopify/app-bridge';

interface Popup {
  id: string;
  name: string;
  title: string;
  description: string;
  popup_type: string;
  trigger_type: string;
  trigger_value: string;
  is_active: boolean;
  is_deleted: boolean;
  created_at: string;
  page_target: string;
  discount_percent?: number;
  discount_code?: string;
  email_placeholder?: string;
  button_text?: string;
}

const FALLBACK_SHOP_DOMAIN = 'testingstoresumeet.myshopify.com';

// Fetch all popups
const fetchPopups = async (): Promise<Popup[]> => {
  const shopDomain = getShopDomain() || FALLBACK_SHOP_DOMAIN;
  const response = await supabaseApiClient.get(`/popup-config?shop=${shopDomain}&dashboard=true`);
  
  if (!response.ok) {
    throw new Error('Failed to fetch popups');
  }
  return response.json();
};

// Toggle popup active status
const togglePopupActive = async ({ id, is_active }: { id: string; is_active: boolean }) => {
  const response = await supabaseApiClient.post('/popup-config', {
    action: 'toggle_active',
    id,
    is_active
  });
  
  if (!response.ok) {
    throw new Error('Failed to toggle popup status');
  }
  
  return response.json();
};

// Delete popup
const deletePopup = async (id: string) => {
  const response = await supabaseApiClient.post('/popup-config', {
    action: 'delete',
    id
  });
  
  if (!response.ok) {
    throw new Error('Failed to delete popup');
  }
  
  return response.json();
};

// Create/Update popup
const savePopup = async (popup: Partial<Popup>) => {
  const response = await supabaseApiClient.post('/popup-config', {
    action: popup.id ? 'update' : 'create',
    ...popup
  });
  
  if (!response.ok) {
    throw new Error('Failed to save popup');
  }
  
  return response.json();
};

// Hook for fetching popups
export const usePopups = () => {
  return useQuery({
    queryKey: ['popups'],
    queryFn: fetchPopups,
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 5 * 60 * 1000, // 5 minutes
    retry: 2,
    refetchOnWindowFocus: false,
  });
};

// Hook for toggling popup active status
export const useTogglePopup = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: togglePopupActive,
    onMutate: async ({ id, is_active }) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['popups'] });
      
      // Snapshot the previous value
      const previousPopups = queryClient.getQueryData<Popup[]>(['popups']);
      
      // Optimistically update
      queryClient.setQueryData<Popup[]>(['popups'], (old) => {
        if (!old) return old;
        return old.map(popup => 
          popup.id === id ? { ...popup, is_active } : popup
        );
      });
      
      return { previousPopups };
    },
    onError: (err, variables, context) => {
      // Rollback on error
      if (context?.previousPopups) {
        queryClient.setQueryData(['popups'], context.previousPopups);
      }
    },
    onSuccess: () => {
      // Invalidate and refetch
      queryClient.invalidateQueries({ queryKey: ['popups'] });
    },
  });
};

// Hook for deleting popup
export const useDeletePopup = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: deletePopup,
    onMutate: async (id) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['popups'] });
      
      // Snapshot the previous value
      const previousPopups = queryClient.getQueryData<Popup[]>(['popups']);
      
      // Optimistically update
      queryClient.setQueryData<Popup[]>(['popups'], (old) => {
        if (!old) return old;
        return old.filter(popup => popup.id !== id);
      });
      
      return { previousPopups };
    },
    onError: (err, variables, context) => {
      // Rollback on error
      if (context?.previousPopups) {
        queryClient.setQueryData(['popups'], context.previousPopups);
      }
    },
    onSuccess: () => {
      // Invalidate and refetch
      queryClient.invalidateQueries({ queryKey: ['popups'] });
    },
  });
};

// Hook for saving popup
export const useSavePopup = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: savePopup,
    onSuccess: () => {
      // Invalidate and refetch
      queryClient.invalidateQueries({ queryKey: ['popups'] });
    },
  });
};

// Export types
export type { Popup };