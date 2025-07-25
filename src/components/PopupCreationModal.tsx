import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';

type TriggerType = 'page_view' | 'time_delay' | 'scroll_depth' | 'exit_intent';
type PageTarget = 'all_pages' | 'home_page' | 'product_pages' | 'cart_page' | 'checkout_page';
type PopupType = 'email_capture' | 'discount_offer' | 'announcement' | 'newsletter';
type PopupStyle = 'native' | 'traditional' | 'minimal' | 'corner';

interface PopupFormData {
  name: string;
  triggerType: TriggerType;
  triggerValue: string;
  pageTarget: PageTarget;
  popupType: PopupType;
  popupStyle: PopupStyle;
  title: string;
  description: string;
  buttonText: string;
  emailPlaceholder: string;
  discountCode: string;
  discountPercent: string;
  isActive: boolean;
}

interface PopupCreationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  editingPopup?: any;
}

export const PopupCreationModal: React.FC<PopupCreationModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  editingPopup
}) => {
  const [formData, setFormData] = useState<PopupFormData>({
    name: '',
    triggerType: 'page_view',
    triggerValue: '',
    pageTarget: 'all_pages',
    popupType: 'email_capture',
    popupStyle: 'native',
    title: '',
    description: '',
    buttonText: 'Get Started',
    emailPlaceholder: 'Enter your email',
    discountCode: '',
    discountPercent: '',
    isActive: true
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  // Populate form when editing
  useEffect(() => {
    if (editingPopup) {
      setFormData({
        name: editingPopup.name || '',
        triggerType: editingPopup.trigger_type || 'page_view',
        triggerValue: editingPopup.trigger_value || '',
        pageTarget: editingPopup.page_target || 'all_pages',
        popupType: editingPopup.popup_type || 'email_capture',
        popupStyle: editingPopup.popup_style || 'native',
        title: editingPopup.title || '',
        description: editingPopup.description || '',
        buttonText: editingPopup.button_text || 'Get Started',
        emailPlaceholder: editingPopup.email_placeholder || 'Enter your email',
        discountCode: editingPopup.discount_code || '',
        discountPercent: editingPopup.discount_percent || '',
        isActive: editingPopup.is_active !== undefined ? editingPopup.is_active : true
      });
    } else {
      // Reset form for new popup
      setFormData({
        name: '',
        triggerType: 'page_view',
        triggerValue: '',
        pageTarget: 'all_pages',
        popupType: 'email_capture',
        popupStyle: 'native',
        title: '',
        description: '',
        buttonText: 'Get Started',
        emailPlaceholder: 'Enter your email',
        discountCode: '',
        discountPercent: '',
        isActive: true
      });
    }
  }, [editingPopup, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    if (!formData.name.trim()) {
      toast.error('Please enter a popup name');
      return;
    }

    setIsSubmitting(true);
    
    try {
      const url = 'https://zsmoutzjhqjgjehaituw.supabase.co/functions/v1/popup-config';
      
      const body = editingPopup 
        ? { 
            action: 'save',
            id: editingPopup.id,
            ...formData,
            shop_domain: 'testingstoresumeet.myshopify.com'
          }
        : { 
            action: 'save',
            ...formData,
            shop_domain: 'testingstoresumeet.myshopify.com'
          };

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to ${editingPopup ? 'update' : 'create'} popup`);
      }

      toast.success(`Popup ${editingPopup ? 'updated' : 'created'} successfully!`);
      onSuccess();
      onClose();
      
    } catch (error) {
      console.error(`Error ${editingPopup ? 'updating' : 'creating'} popup:`, error);
      toast.error(error instanceof Error ? error.message : `Failed to ${editingPopup ? 'update' : 'create'} popup`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editingPopup ? 'Edit Popup' : 'Create New Popup'}</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="name">Popup Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="e.g., Welcome Discount"
                required
              />
            </div>
            
            <div>
              <Label htmlFor="triggerType">Trigger Type</Label>
              <Select 
                value={formData.triggerType} 
                onValueChange={(value: TriggerType) => setFormData(prev => ({ ...prev, triggerType: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select trigger" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="page_view">Page View</SelectItem>
                  <SelectItem value="time_delay">Time Delay</SelectItem>
                  <SelectItem value="scroll_depth">Scroll Depth</SelectItem>
                  <SelectItem value="exit_intent">Exit Intent</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {(formData.triggerType === 'time_delay' || formData.triggerType === 'scroll_depth') && (
            <div>
              <Label htmlFor="triggerValue">
                {formData.triggerType === 'time_delay' ? 'Delay (seconds)' : 'Scroll Percentage (%)'}
              </Label>
              <Input
                id="triggerValue"
                type="number"
                value={formData.triggerValue}
                onChange={(e) => setFormData(prev => ({ ...prev, triggerValue: e.target.value }))}
                placeholder={formData.triggerType === 'time_delay' ? '10' : '50'}
                min="1"
                max={formData.triggerType === 'scroll_depth' ? '100' : undefined}
              />
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="pageTarget">Page Target</Label>
              <Select 
                value={formData.pageTarget} 
                onValueChange={(value: PageTarget) => setFormData(prev => ({ ...prev, pageTarget: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select pages" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all_pages">All Pages</SelectItem>
                  <SelectItem value="home_page">Home Page</SelectItem>
                  <SelectItem value="product_pages">Product Pages</SelectItem>
                  <SelectItem value="cart_page">Cart Page</SelectItem>
                  <SelectItem value="checkout_page">Checkout Page</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="popupType">Popup Type</Label>
              <Select 
                value={formData.popupType} 
                onValueChange={(value: PopupType) => setFormData(prev => ({ ...prev, popupType: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="email_capture">Email Capture</SelectItem>
                  <SelectItem value="discount_offer">Discount Offer</SelectItem>
                  <SelectItem value="announcement">Announcement</SelectItem>
                  <SelectItem value="newsletter">Newsletter</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label htmlFor="popupStyle" className="text-sm font-medium">Popup Style</Label>
            <Select 
              value={formData.popupStyle} 
              onValueChange={(value: PopupStyle) => setFormData(prev => ({ ...prev, popupStyle: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select style" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="native">
                  <div className="flex flex-col items-start">
                    <span className="font-medium">Native Notifications</span>
                    <span className="text-xs text-muted-foreground">Platform-specific style (iOS, Android, macOS)</span>
                  </div>
                </SelectItem>
                <SelectItem value="traditional">
                  <div className="flex flex-col items-start">
                    <span className="font-medium">Traditional Modal</span>
                    <span className="text-xs text-muted-foreground">Centered overlay popup</span>
                  </div>
                </SelectItem>
                <SelectItem value="minimal">
                  <div className="flex flex-col items-start">
                    <span className="font-medium">Minimal Banner</span>
                    <span className="text-xs text-muted-foreground">Subtle top or bottom bar</span>
                  </div>
                </SelectItem>
                <SelectItem value="corner">
                  <div className="flex flex-col items-start">
                    <span className="font-medium">Corner Toast</span>
                    <span className="text-xs text-muted-foreground">Bottom-right notification</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground mt-1">
              {formData.popupStyle === 'native' && '✨ Automatically matches user\'s device style (iOS, Android, macOS, Windows)'}
              {formData.popupStyle === 'traditional' && '📱 Classic centered popup with overlay backdrop'}
              {formData.popupStyle === 'minimal' && '🎯 Non-intrusive bar that keeps page interactive'}
              {formData.popupStyle === 'corner' && '🔔 Small notification in bottom-right corner'}
            </p>
          </div>

          <div>
            <Label htmlFor="title">Popup Title</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              placeholder="e.g., Get 10% Off Your First Order!"
            />
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="e.g., Join thousands of happy customers and save on your first purchase."
              rows={3}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="buttonText">Button Text</Label>
              <Input
                id="buttonText"
                value={formData.buttonText}
                onChange={(e) => setFormData(prev => ({ ...prev, buttonText: e.target.value }))}
                placeholder="Get Started"
              />
            </div>
            
            <div>
              <Label htmlFor="emailPlaceholder">Email Placeholder</Label>
              <Input
                id="emailPlaceholder"
                value={formData.emailPlaceholder}
                onChange={(e) => setFormData(prev => ({ ...prev, emailPlaceholder: e.target.value }))}
                placeholder="Enter your email"
              />
            </div>
          </div>

          {formData.popupType === 'discount_offer' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="discountCode">Discount Code</Label>
                <Input
                  id="discountCode"
                  value={formData.discountCode}
                  onChange={(e) => setFormData(prev => ({ ...prev, discountCode: e.target.value }))}
                  placeholder="SAVE10"
                />
              </div>
              
              <div>
                <Label htmlFor="discountPercent">Discount Percentage</Label>
                <Input
                  id="discountPercent"
                  type="number"
                  value={formData.discountPercent}
                  onChange={(e) => setFormData(prev => ({ ...prev, discountPercent: e.target.value }))}
                  placeholder="10"
                  min="1"
                  max="100"
                />
              </div>
            </div>
          )}

          <div className="flex items-center space-x-2">
            <Switch
              id="isActive"
              checked={formData.isActive}
              onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isActive: checked }))}
            />
            <Label htmlFor="isActive">Active</Label>
          </div>

          <div className="flex gap-3 pt-4">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting} className="flex-1">
              {isSubmitting ? (editingPopup ? 'Updating...' : 'Creating...') : (editingPopup ? 'Update Popup' : 'Create Popup')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
