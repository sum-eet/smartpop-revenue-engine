import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Clock, 
  MousePointer, 
  Eye, 
  ArrowLeft, 
  Home, 
  ShoppingBag, 
  FileText, 
  Search,
  Mail,
  MessageSquare,
  Gift,
  X,
  Monitor
} from 'lucide-react';

interface PopupCreationModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingPopup?: any;
}

type TriggerType = 'time_delay' | 'click' | 'exit_intent' | 'scroll_depth' | 'page_view';
type PageTarget = 'all_pages' | 'homepage' | 'product_pages' | 'collection_pages' | 'blog_pages' | 'cart_page' | 'checkout_page';
type PopupType = 'email_capture' | 'discount_offer' | 'announcement' | 'survey';

export const PopupCreationModal: React.FC<PopupCreationModalProps> = ({ isOpen, onClose, editingPopup }) => {
  const [step, setStep] = useState(1);
  const [isSaving, setIsSaving] = useState(false);
  const [popupConfig, setPopupConfig] = useState({
    name: '',
    triggerType: '' as TriggerType,
    triggerValue: '',
    pageTarget: '' as PageTarget,
    popupType: '' as PopupType,
    title: '',
    description: '',
    buttonText: '',
    emailPlaceholder: 'Enter your email',
    discountCode: '',
    discountPercent: '',
  });

  // Initialize form with editing popup data
  React.useEffect(() => {
    if (editingPopup) {
      setPopupConfig({
        name: editingPopup.name || '',
        triggerType: editingPopup.trigger_type || '',
        triggerValue: editingPopup.trigger_value || '',
        pageTarget: editingPopup.page_target || '',
        popupType: editingPopup.popup_type || '',
        title: editingPopup.title || '',
        description: editingPopup.description || '',
        buttonText: editingPopup.button_text || '',
        emailPlaceholder: editingPopup.email_placeholder || 'Enter your email',
        discountCode: editingPopup.discount_code || '',
        discountPercent: editingPopup.discount_percent || '',
      });
    } else {
      // Reset to default when creating new popup
      setPopupConfig({
        name: '',
        triggerType: '' as TriggerType,
        triggerValue: '',
        pageTarget: '' as PageTarget,
        popupType: '' as PopupType,
        title: '',
        description: '',
        buttonText: '',
        emailPlaceholder: 'Enter your email',
        discountCode: '',
        discountPercent: '',
      });
      setStep(1);
    }
  }, [editingPopup, isOpen]);

  const triggerOptions = [
    {
      id: 'time_delay',
      name: 'Time Delay',
      description: 'Show after visitor spends time on page',
      icon: Clock,
      example: '5 seconds'
    },
    {
      id: 'exit_intent',
      name: 'Exit Intent',
      description: 'Show when visitor is about to leave',
      icon: ArrowLeft,
      example: 'Mouse leaves window'
    },
    {
      id: 'scroll_depth',
      name: 'Scroll Depth',
      description: 'Show after scrolling percentage',
      icon: Eye,
      example: '50% scrolled'
    },
    {
      id: 'click',
      name: 'Click Trigger',
      description: 'Show when specific element is clicked',
      icon: MousePointer,
      example: 'Button or link click'
    },
    {
      id: 'page_view',
      name: 'Page Views',
      description: 'Show after number of page views',
      icon: Eye,
      example: '3rd page view'
    }
  ];

  const pageTargets = [
    { id: 'all_pages', name: 'All Pages', icon: Home, description: 'Show on entire website' },
    { id: 'homepage', name: 'Homepage', icon: Home, description: 'Landing page only' },
    { id: 'product_pages', name: 'Product Pages', icon: ShoppingBag, description: 'Individual product pages' },
    { id: 'collection_pages', name: 'Collection Pages', icon: Search, description: 'Category/collection pages' },
    { id: 'blog_pages', name: 'Blog Pages', icon: FileText, description: 'Blog posts and articles' },
    { id: 'cart_page', name: 'Cart Page', icon: ShoppingBag, description: 'Shopping cart page' },
    { id: 'checkout_page', name: 'Checkout', icon: ShoppingBag, description: 'Checkout process' }
  ];

  const popupTypes = [
    {
      id: 'email_capture',
      name: 'Email Capture',
      description: 'Collect email addresses for newsletter',
      icon: Mail,
      color: 'bg-blue-500'
    },
    {
      id: 'discount_offer',
      name: 'Discount Offer',
      description: 'Offer coupon codes and discounts',
      icon: Gift,
      color: 'bg-green-500'
    },
    {
      id: 'announcement',
      name: 'Announcement',
      description: 'Share important news or updates',
      icon: MessageSquare,
      color: 'bg-purple-500'
    },
    {
      id: 'survey',
      name: 'Survey/Feedback',
      description: 'Collect customer feedback',
      icon: MessageSquare,
      color: 'bg-orange-500'
    }
  ];

  const handleNext = () => {
    if (step < 4) setStep(step + 1);
  };

  const handleBack = () => {
    if (step > 1) setStep(step - 1);
  };

  const handleSave = async () => {
    if (isSaving) return; // Prevent duplicate submissions
    
    setIsSaving(true);
    
    try {
      const isEditing = !!editingPopup;
      const url = isEditing 
        ? `https://zsmoutzjhqjgjehaituw.supabase.co/functions/v1/popup-config/${editingPopup.id}`
        : 'https://zsmoutzjhqjgjehaituw.supabase.co/functions/v1/popup-config';
      
      const method = isEditing ? 'PUT' : 'POST';
      const payload = {
        ...popupConfig,
        isActive: true,
        ...(isEditing ? {} : { createdAt: new Date().toISOString() })
      };

      // Save or update popup configuration
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        const savedPopup = await response.json();
        console.log(`Popup ${isEditing ? 'updated' : 'saved'} successfully:`, savedPopup);
        
        // Reset form and close modal
        onClose();
        setStep(1);
        setIsSaving(false);
        setPopupConfig({
          name: '',
          triggerType: '' as TriggerType,
          triggerValue: '',
          pageTarget: '' as PageTarget,
          popupType: '' as PopupType,
          title: '',
          description: '',
          buttonText: '',
          emailPlaceholder: 'Enter your email',
          discountCode: '',
          discountPercent: '',
        });
        
        // Refresh the page to show the updated popup in the campaigns list
        window.location.reload();
      } else {
        console.error(`Failed to ${isEditing ? 'update' : 'save'} popup`);
        setIsSaving(false);
      }
    } catch (error) {
      console.error(`Error ${editingPopup ? 'updating' : 'saving'} popup:`, error);
      setIsSaving(false);
    }
  };

  const renderStepContent = () => {
    switch (step) {
      case 1:
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-4">Choose Your Trigger</h3>
              <p className="text-gray-600 mb-6">When should this popup appear to your visitors?</p>
              <div className="grid grid-cols-1 gap-4">
                {triggerOptions.map((trigger) => {
                  const IconComponent = trigger.icon;
                  return (
                    <Card
                      key={trigger.id}
                      className={`cursor-pointer transition-all hover:shadow-md ${
                        popupConfig.triggerType === trigger.id ? 'ring-2 ring-blue-500' : ''
                      }`}
                      onClick={() => setPopupConfig(prev => ({ ...prev, triggerType: trigger.id as TriggerType }))}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-center space-x-4">
                          <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                            <IconComponent className="w-5 h-5 text-blue-600" />
                          </div>
                          <div className="flex-1">
                            <h4 className="font-medium">{trigger.name}</h4>
                            <p className="text-sm text-gray-600">{trigger.description}</p>
                            <Badge variant="secondary" className="mt-1 text-xs">{trigger.example}</Badge>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-4">Configure Trigger Settings</h3>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="popup-name">Popup Name</Label>
                  <Input
                    id="popup-name"
                    value={popupConfig.name}
                    onChange={(e) => setPopupConfig(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="e.g., Homepage Welcome Popup"
                  />
                </div>
                
                {popupConfig.triggerType === 'time_delay' && (
                  <div>
                    <Label htmlFor="time-delay">Time Delay (seconds)</Label>
                    <Input
                      id="time-delay"
                      type="number"
                      value={popupConfig.triggerValue}
                      onChange={(e) => setPopupConfig(prev => ({ ...prev, triggerValue: e.target.value }))}
                      placeholder="5"
                    />
                  </div>
                )}
                
                {popupConfig.triggerType === 'scroll_depth' && (
                  <div>
                    <Label htmlFor="scroll-depth">Scroll Depth (%)</Label>
                    <Input
                      id="scroll-depth"
                      type="number"
                      value={popupConfig.triggerValue}
                      onChange={(e) => setPopupConfig(prev => ({ ...prev, triggerValue: e.target.value }))}
                      placeholder="50"
                      max="100"
                    />
                  </div>
                )}
                
                {popupConfig.triggerType === 'page_view' && (
                  <div>
                    <Label htmlFor="page-views">Number of Page Views</Label>
                    <Input
                      id="page-views"
                      type="number"
                      value={popupConfig.triggerValue}
                      onChange={(e) => setPopupConfig(prev => ({ ...prev, triggerValue: e.target.value }))}
                      placeholder="3"
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-4">Select Page Targeting</h3>
              <p className="text-gray-600 mb-6">Where should this popup appear on your website?</p>
              <div className="grid grid-cols-1 gap-3">
                {pageTargets.map((page) => {
                  const IconComponent = page.icon;
                  return (
                    <Card
                      key={page.id}
                      className={`cursor-pointer transition-all hover:shadow-md ${
                        popupConfig.pageTarget === page.id ? 'ring-2 ring-blue-500' : ''
                      }`}
                      onClick={() => setPopupConfig(prev => ({ ...prev, pageTarget: page.id as PageTarget }))}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-center space-x-4">
                          <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                            <IconComponent className="w-4 h-4 text-gray-600" />
                          </div>
                          <div>
                            <h4 className="font-medium">{page.name}</h4>
                            <p className="text-sm text-gray-600">{page.description}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-4">Design Your Popup</h3>
              <p className="text-gray-600 mb-6">Choose the type and customize your popup content</p>
              
              <Tabs defaultValue="design" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="design">Design</TabsTrigger>
                  <TabsTrigger value="preview">Preview</TabsTrigger>
                </TabsList>
                
                <TabsContent value="design" className="space-y-6 mt-6">
                  <div>
                    <Label className="text-base font-medium">Popup Type</Label>
                    <div className="grid grid-cols-2 gap-3 mt-3">
                    {popupTypes.map((type) => {
                      const IconComponent = type.icon;
                      return (
                        <Card
                          key={type.id}
                          className={`cursor-pointer transition-all hover:shadow-md ${
                            popupConfig.popupType === type.id ? 'ring-2 ring-blue-500' : ''
                          }`}
                          onClick={() => setPopupConfig(prev => ({ ...prev, popupType: type.id as PopupType }))}
                        >
                          <CardContent className="p-4">
                            <div className="flex items-center space-x-3">
                              <div className={`w-8 h-8 ${type.color} rounded-full flex items-center justify-center`}>
                                <IconComponent className="w-4 h-4 text-white" />
                              </div>
                              <div>
                                <h4 className="font-medium text-sm">{type.name}</h4>
                                <p className="text-xs text-gray-600">{type.description}</p>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                    </div>
                  </div>

                  {popupConfig.popupType && (
                    <div className="space-y-4 border-t pt-6">
                      <div>
                        <Label htmlFor="popup-title">Popup Title</Label>
                        <Input
                          id="popup-title"
                          value={popupConfig.title}
                          onChange={(e) => setPopupConfig(prev => ({ ...prev, title: e.target.value }))}
                          placeholder="Enter your popup title"
                        />
                      </div>
                      
                      <div>
                        <Label htmlFor="popup-description">Description</Label>
                        <Textarea
                          id="popup-description"
                          value={popupConfig.description}
                          onChange={(e) => setPopupConfig(prev => ({ ...prev, description: e.target.value }))}
                          placeholder="Enter your popup description"
                          rows={3}
                        />
                      </div>
                      
                      <div>
                        <Label htmlFor="button-text">Button Text</Label>
                        <Input
                          id="button-text"
                          value={popupConfig.buttonText}
                          onChange={(e) => setPopupConfig(prev => ({ ...prev, buttonText: e.target.value }))}
                          placeholder="Get Started"
                        />
                      </div>

                      {popupConfig.popupType === 'email_capture' && (
                        <div>
                          <Label htmlFor="email-placeholder">Email Input Placeholder</Label>
                          <Input
                            id="email-placeholder"
                            value={popupConfig.emailPlaceholder}
                            onChange={(e) => setPopupConfig(prev => ({ ...prev, emailPlaceholder: e.target.value }))}
                            placeholder="Enter your email"
                          />
                        </div>
                      )}

                      {popupConfig.popupType === 'discount_offer' && (
                        <>
                          <div>
                            <Label htmlFor="discount-code">Discount Code</Label>
                            <Input
                              id="discount-code"
                              value={popupConfig.discountCode}
                              onChange={(e) => setPopupConfig(prev => ({ ...prev, discountCode: e.target.value }))}
                              placeholder="SAVE10"
                            />
                          </div>
                          <div>
                            <Label htmlFor="discount-percent">Discount Percentage</Label>
                            <Input
                              id="discount-percent"
                              type="number"
                              value={popupConfig.discountPercent}
                              onChange={(e) => setPopupConfig(prev => ({ ...prev, discountPercent: e.target.value }))}
                              placeholder="10"
                            />
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </TabsContent>
                
                <TabsContent value="preview" className="mt-6">
                  <div className="bg-gray-100 p-6 rounded-lg">
                    <div className="flex items-center justify-center mb-4">
                      <Monitor className="w-5 h-5 mr-2 text-gray-600" />
                      <span className="text-sm font-medium text-gray-600">Popup Preview</span>
                    </div>
                    
                    {popupConfig.popupType && (
                      <div className="max-w-md mx-auto bg-white rounded-lg shadow-lg p-6 border relative">
                        <div className="text-center space-y-4">
                          {popupConfig.title && (
                            <h3 className="text-xl font-bold text-gray-900">{popupConfig.title}</h3>
                          )}
                          
                          {popupConfig.description && (
                            <p className="text-gray-600">{popupConfig.description}</p>
                          )}
                          
                          {popupConfig.popupType === 'email_capture' && (
                            <div className="space-y-3">
                              <Input
                                placeholder={popupConfig.emailPlaceholder}
                                className="w-full"
                                disabled
                              />
                              <Button className="w-full bg-blue-600 hover:bg-blue-700" disabled>
                                {popupConfig.buttonText || 'Subscribe'}
                              </Button>
                            </div>
                          )}
                          
                          {popupConfig.popupType === 'discount_offer' && (
                            <div className="space-y-3">
                              {popupConfig.discountCode && (
                                <div className="bg-green-50 border-2 border-green-200 rounded-lg p-3">
                                  <div className="text-green-800 font-mono text-lg font-bold">
                                    {popupConfig.discountCode}
                                  </div>
                                  {popupConfig.discountPercent && (
                                    <div className="text-green-600 text-sm">
                                      {popupConfig.discountPercent}% OFF
                                    </div>
                                  )}
                                </div>
                              )}
                              <Button className="w-full bg-green-600 hover:bg-green-700" disabled>
                                {popupConfig.buttonText || 'Claim Discount'}
                              </Button>
                            </div>
                          )}
                          
                          {popupConfig.popupType === 'announcement' && (
                            <div className="space-y-3">
                              <Button className="w-full bg-purple-600 hover:bg-purple-700" disabled>
                                {popupConfig.buttonText || 'Learn More'}
                              </Button>
                            </div>
                          )}
                          
                          {popupConfig.popupType === 'survey' && (
                            <div className="space-y-3">
                              <Textarea
                                placeholder="Your feedback..."
                                className="w-full"
                                rows={3}
                                disabled
                              />
                              <Button className="w-full bg-orange-600 hover:bg-orange-700" disabled>
                                {popupConfig.buttonText || 'Submit Feedback'}
                              </Button>
                            </div>
                          )}
                          
                          <button className="absolute top-2 right-2 w-6 h-6 bg-gray-200 rounded-full flex items-center justify-center text-gray-500 hover:bg-gray-300">
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    )}
                    
                    {!popupConfig.popupType && (
                      <div className="text-center text-gray-500 py-8">
                        Select a popup type to see preview
                      </div>
                    )}
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  const isStepValid = () => {
    switch (step) {
      case 1:
        return popupConfig.triggerType !== '';
      case 2:
        return popupConfig.name !== '' && popupConfig.triggerValue !== '';
      case 3:
        return popupConfig.pageTarget !== '';
      case 4:
        return popupConfig.popupType !== '' && popupConfig.title !== '' && popupConfig.buttonText !== '';
      default:
        return false;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle>{editingPopup ? 'Edit Popup' : 'Create New Popup'}</DialogTitle>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>
          <div className="flex items-center space-x-2 mt-4">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  i === step
                    ? 'bg-blue-600 text-white'
                    : i < step
                    ? 'bg-green-500 text-white'
                    : 'bg-gray-200 text-gray-600'
                }`}
              >
                {i}
              </div>
            ))}
          </div>
          <div className="text-sm text-gray-600 mt-2">
            Step {step} of 4: {
              step === 1 ? 'Choose Trigger' :
              step === 2 ? 'Configure Settings' :
              step === 3 ? 'Select Pages' :
              'Design Popup'
            }
          </div>
        </DialogHeader>

        <div className="mt-6">
          {renderStepContent()}
        </div>

        <div className="flex justify-between mt-8 pt-6 border-t">
          <Button
            variant="outline"
            onClick={handleBack}
            disabled={step === 1}
          >
            Back
          </Button>
          
          <div className="space-x-2">
            {step < 4 ? (
              <Button
                onClick={handleNext}
                disabled={!isStepValid()}
                className="bg-blue-600 hover:bg-blue-700"
              >
                Next
              </Button>
            ) : (
              <Button
                onClick={handleSave}
                disabled={!isStepValid() || isSaving}
                className="bg-green-600 hover:bg-green-700"
              >
                {isSaving ? (editingPopup ? 'Updating...' : 'Creating...') : (editingPopup ? 'Update Popup' : 'Create Popup')}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};