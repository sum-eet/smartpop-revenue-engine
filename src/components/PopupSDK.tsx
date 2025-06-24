
import React, { useState, useEffect } from 'react';
import { X, ShoppingCart, Mail, Clock } from 'lucide-react';

interface PopupConfig {
  id: string;
  type: 'email-capture' | 'cart-abandonment' | 'exit-intent' | 'welcome';
  title: string;
  subtitle: string;
  discountCode?: string;
  discountPercent?: number;
  template: 'minimal' | 'bold' | 'elegant';
  position: 'center' | 'bottom-right' | 'bottom-bar';
  showAfter?: number; // seconds
}

interface PopupSDKProps {
  config: PopupConfig;
  onClose: () => void;
  onSubmit: (email: string) => void;
  isVisible: boolean;
}

export const PopupSDK: React.FC<PopupSDKProps> = ({ config, onClose, onSubmit, isVisible }) => {
  const [email, setEmail] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [countdown, setCountdown] = useState(900); // 15 minutes in seconds

  useEffect(() => {
    if (config.type === 'cart-abandonment' && countdown > 0) {
      const timer = setInterval(() => {
        setCountdown(prev => prev - 1);
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [config.type, countdown]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (email) {
      onSubmit(email);
      setIsSubmitted(true);
      setTimeout(() => {
        onClose();
      }, 2000);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getTemplateStyles = () => {
    switch (config.template) {
      case 'bold':
        return 'bg-gradient-to-br from-red-500 to-pink-600 text-white';
      case 'elegant':
        return 'bg-white text-gray-800 border border-gray-200 shadow-2xl';
      default:
        return 'bg-white text-gray-800 shadow-xl';
    }
  };

  const getPositionStyles = () => {
    switch (config.position) {
      case 'bottom-right':
        return 'fixed bottom-4 right-4 max-w-sm';
      case 'bottom-bar':
        return 'fixed bottom-0 left-0 right-0 max-w-none';
      default:
        return 'fixed inset-4 max-w-md mx-auto my-auto';
    }
  };

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center">
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      
      {/* Popup */}
      <div className={`relative ${getPositionStyles()} ${getTemplateStyles()} rounded-xl p-6 animate-in fade-in slide-in-from-bottom-4 duration-300`}>
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1 rounded-full hover:bg-black/10 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {isSubmitted ? (
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Mail className="w-8 h-8 text-green-600" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Thank You!</h3>
            <p className="text-sm opacity-75">
              {config.discountCode && `Your discount code: ${config.discountCode}`}
            </p>
          </div>
        ) : (
          <>
            {/* Icon */}
            <div className="flex justify-center mb-4">
              {config.type === 'cart-abandonment' && (
                <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
                  <ShoppingCart className="w-6 h-6 text-orange-600" />
                </div>
              )}
              {config.type === 'email-capture' && (
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                  <Mail className="w-6 h-6 text-blue-600" />
                </div>
              )}
            </div>

            {/* Content */}
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold mb-2">{config.title}</h2>
              <p className="text-sm opacity-75 mb-4">{config.subtitle}</p>
              
              {config.discountPercent && (
                <div className="bg-green-100 text-green-800 rounded-full px-4 py-2 inline-block mb-4">
                  <span className="font-semibold">{config.discountPercent}% OFF</span>
                </div>
              )}

              {config.type === 'cart-abandonment' && countdown > 0 && (
                <div className="flex items-center justify-center gap-2 text-sm text-orange-600 mb-4">
                  <Clock className="w-4 h-4" />
                  <span>Offer expires in {formatTime(countdown)}</span>
                </div>
              )}
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <input
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-800"
                required
              />
              <button
                type="submit"
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors"
              >
                {config.type === 'cart-abandonment' ? 'Save My Cart' : 'Get Discount'}
              </button>
            </form>

            <p className="text-xs opacity-50 text-center mt-4">
              We respect your privacy. Unsubscribe at any time.
            </p>
          </>
        )}
      </div>
    </div>
  );
};
