import {
  extension,
  Banner,
  Button,
  InlineStack,
  Text,
  TextField,
  BlockStack,
  useSettings,
  useApi,
  useShop,
  useCustomer,
  useOrder,
  reactExtension,
} from '@shopify/ui-extensions-react/checkout';

// Checkout footer extension
export const checkoutFooterExtension = reactExtension(
  'purchase.checkout.footer.render',
  () => <SmartPopCheckoutExtension position="footer" />
);

// Checkout header extension
export const checkoutHeaderExtension = reactExtension(
  'purchase.checkout.header.render',
  () => <SmartPopCheckoutExtension position="header" />
);

// Thank you page extension
export const thankYouExtension = reactExtension(
  'purchase.thank-you.footer.render',
  () => <SmartPopThankYouExtension />
);

interface SmartPopCheckoutExtensionProps {
  position: 'header' | 'footer';
}

function SmartPopCheckoutExtension({ position }: SmartPopCheckoutExtensionProps) {
  const settings = useSettings();
  const api = useApi();
  const shop = useShop();
  const customer = useCustomer();

  // Only show if enabled and position matches
  if (!settings.checkout_popup_enabled || settings.checkout_popup_position !== position) {
    return null;
  }

  const handleEmailCapture = async (email: string) => {
    try {
      // Track email capture during checkout
      await fetch('https://zsmoutzjhqjgjehaituw.supabase.co/functions/v1/email-capture', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          shopDomain: shop.myshopifyDomain,
          popupId: 'checkout-extension',
          discountCode: settings.discount_offer,
          pageUrl: 'checkout',
          metadata: {
            position,
            customerExists: !!customer,
            checkoutToken: api.checkout?.token,
          }
        })
      });

      console.log('✅ Checkout email capture successful');
    } catch (error) {
      console.error('❌ Checkout email capture failed:', error);
    }
  };

  return (
    <Banner
      title={settings.checkout_popup_title || 'Complete Your Purchase!'}
      tone="info"
      onDismiss={() => {
        // Track dismissal
        fetch('https://zsmoutzjhqjgjehaituw.supabase.co/functions/v1/popup-track', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            eventType: 'checkout_banner_dismissed',
            shop: shop.myshopifyDomain,
            position,
            timestamp: new Date().toISOString()
          })
        }).catch(console.error);
      }}
    >
      <BlockStack spacing="tight">
        <Text>
          {settings.checkout_popup_description || 'Don\'t miss out on exclusive offers!'}
        </Text>
        
        {settings.email_capture_enabled && !customer && (
          <CheckoutEmailCapture 
            onEmailCapture={handleEmailCapture}
            discountCode={settings.discount_offer}
          />
        )}
        
        {settings.discount_offer && (
          <InlineStack spacing="tight" blockAlignment="center">
            <Text emphasis="bold">Discount Code:</Text>
            <Text appearance="monospace">{settings.discount_offer}</Text>
          </InlineStack>
        )}
      </BlockStack>
    </Banner>
  );
}

interface CheckoutEmailCaptureProps {
  onEmailCapture: (email: string) => void;
  discountCode?: string;
}

function CheckoutEmailCapture({ onEmailCapture, discountCode }: CheckoutEmailCaptureProps) {
  const [email, setEmail] = React.useState('');
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [isSubmitted, setIsSubmitted] = React.useState(false);

  const handleSubmit = async () => {
    if (!email || isSubmitting) return;

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      console.error('Invalid email format');
      return;
    }

    setIsSubmitting(true);
    
    try {
      await onEmailCapture(email);
      setIsSubmitted(true);
    } catch (error) {
      console.error('Email capture failed:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSubmitted) {
    return (
      <Banner tone="success">
        <Text>
          ✅ Thank you! {discountCode && `Your discount code ${discountCode} has been applied.`}
        </Text>
      </Banner>
    );
  }

  return (
    <BlockStack spacing="tight">
      <Text size="small">Get exclusive offers sent to your email:</Text>
      <InlineStack spacing="tight">
        <TextField
          label="Email address"
          value={email}
          onChange={setEmail}
          placeholder="your@email.com"
          type="email"
        />
        <Button
          onPress={handleSubmit}
          loading={isSubmitting}
          disabled={!email || isSubmitting}
        >
          Subscribe
        </Button>
      </InlineStack>
    </BlockStack>
  );
}

function SmartPopThankYouExtension() {
  const settings = useSettings();
  const shop = useShop();
  const order = useOrder();
  const customer = useCustomer();

  // Track thank you page view
  React.useEffect(() => {
    fetch('https://zsmoutzjhqjgjehaituw.supabase.co/functions/v1/popup-track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        eventType: 'thank_you_page_view',
        shop: shop.myshopifyDomain,
        orderId: order?.id,
        customerEmail: customer?.email,
        timestamp: new Date().toISOString()
      })
    }).catch(console.error);
  }, []);

  if (!settings.checkout_popup_enabled) {
    return null;
  }

  return (
    <Banner
      title="🎉 Thank You for Your Purchase!"
      tone="success"
    >
      <BlockStack spacing="tight">
        <Text>
          Your order has been confirmed! Keep an eye out for exclusive offers and updates.
        </Text>
        
        {order && (
          <InlineStack spacing="tight" blockAlignment="center">
            <Text emphasis="bold">Order #:</Text>
            <Text appearance="monospace">{order.name}</Text>
          </InlineStack>
        )}
        
        <Text size="small" appearance="subdued">
          We'll send tracking information to your email once your order ships.
        </Text>
      </BlockStack>
    </Banner>
  );
}

// Export all extensions
export default {
  checkoutFooterExtension,
  checkoutHeaderExtension,
  thankYouExtension,
};