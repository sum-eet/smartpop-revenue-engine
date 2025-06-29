// Shopify integration for e-commerce tracking and data capture

import { EcommerceEvent, TrackingEvent } from '@/types/tracking';

export interface ShopifyConfig {
  shopDomain: string;
  accessToken: string;
  webhookSecret?: string;
  trackingEnabled: boolean;
}

export interface ShopifyCustomer {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  phone?: string;
  tags: string;
  created_at: string;
  updated_at: string;
  total_spent: string;
  orders_count: number;
}

export interface ShopifyOrder {
  id: number;
  order_number: number;
  email: string;
  created_at: string;
  updated_at: string;
  total_price: string;
  subtotal_price: string;
  currency: string;
  financial_status: string;
  fulfillment_status: string;
  line_items: Array<{
    id: number;
    product_id: number;
    variant_id: number;
    title: string;
    quantity: number;
    price: string;
    sku: string;
  }>;
  customer: ShopifyCustomer;
  shipping_address?: any;
  billing_address?: any;
}

export class ShopifyIntegration {
  private config: ShopifyConfig;
  private baseUrl: string;
  private headers: Record<string, string>;

  constructor(config: ShopifyConfig) {
    this.config = config;
    this.baseUrl = `https://${config.shopDomain}.myshopify.com`;
    this.headers = {
      'Content-Type': 'application/json',
      'X-Shopify-Access-Token': config.accessToken
    };
  }

  /**
   * Install tracking script on Shopify store
   */
  public async installTrackingScript(scriptUrl: string): Promise<void> {
    try {
      const scriptTag = {
        script_tag: {
          event: 'onload',
          src: scriptUrl,
          display_scope: 'online_store'
        }
      };

      const response = await fetch(`${this.baseUrl}/admin/api/2023-10/script_tags.json`, {
        method: 'POST',
        headers: this.headers,
        body: JSON.stringify(scriptTag)
      });

      if (!response.ok) {
        throw new Error(`Failed to install script: ${response.statusText}`);
      }

      const result = await response.json();
      console.log('Tracking script installed:', result.script_tag.id);
    } catch (error) {
      console.error('Failed to install tracking script:', error);
      throw error;
    }
  }

  /**
   * Get store information
   */
  public async getStoreInfo(): Promise<any> {
    try {
      const response = await fetch(`${this.baseUrl}/admin/api/2023-10/shop.json`, {
        headers: this.headers
      });

      if (!response.ok) {
        throw new Error(`Failed to get store info: ${response.statusText}`);
      }

      const result = await response.json();
      return result.shop;
    } catch (error) {
      console.error('Failed to get store info:', error);
      throw error;
    }
  }

  /**
   * Get customer data
   */
  public async getCustomer(customerId: number): Promise<ShopifyCustomer> {
    try {
      const response = await fetch(`${this.baseUrl}/admin/api/2023-10/customers/${customerId}.json`, {
        headers: this.headers
      });

      if (!response.ok) {
        throw new Error(`Failed to get customer: ${response.statusText}`);
      }

      const result = await response.json();
      return result.customer;
    } catch (error) {
      console.error('Failed to get customer:', error);
      throw error;
    }
  }

  /**
   * Get order data
   */
  public async getOrder(orderId: number): Promise<ShopifyOrder> {
    try {
      const response = await fetch(`${this.baseUrl}/admin/api/2023-10/orders/${orderId}.json`, {
        headers: this.headers
      });

      if (!response.ok) {
        throw new Error(`Failed to get order: ${response.statusText}`);
      }

      const result = await response.json();
      return result.order;
    } catch (error) {
      console.error('Failed to get order:', error);
      throw error;
    }
  }

  /**
   * Convert Shopify order to tracking events
   */
  public orderToTrackingEvents(order: ShopifyOrder, sessionId: string): TrackingEvent[] {
    const events: TrackingEvent[] = [];
    const timestamp = new Date();

    // Purchase event
    const purchaseEvent: EcommerceEvent = {
      type: 'purchase',
      transactionId: order.id.toString(),
      revenue: parseFloat(order.total_price),
      currency: order.currency,
      timestamp
    };

    events.push({
      id: `purchase_${order.id}_${Date.now()}`,
      sessionId,
      userId: order.customer.id.toString(),
      type: 'ecommerce',
      data: purchaseEvent,
      timestamp
    });

    // Individual product purchase events
    order.line_items.forEach((item, index) => {
      const productEvent: EcommerceEvent = {
        type: 'purchase',
        productId: item.product_id.toString(),
        productName: item.title,
        price: parseFloat(item.price),
        currency: order.currency,
        quantity: item.quantity,
        transactionId: order.id.toString(),
        timestamp
      };

      events.push({
        id: `product_purchase_${order.id}_${item.id}_${Date.now()}`,
        sessionId,
        userId: order.customer.id.toString(),
        type: 'ecommerce',
        data: productEvent,
        timestamp
      });
    });

    return events;
  }

  /**
   * Create webhook for order events
   */
  public async createOrderWebhook(webhookUrl: string): Promise<void> {
    try {
      const webhook = {
        webhook: {
          topic: 'orders/create',
          address: webhookUrl,
          format: 'json'
        }
      };

      const response = await fetch(`${this.baseUrl}/admin/api/2023-10/webhooks.json`, {
        method: 'POST',
        headers: this.headers,
        body: JSON.stringify(webhook)
      });

      if (!response.ok) {
        throw new Error(`Failed to create webhook: ${response.statusText}`);
      }

      const result = await response.json();
      console.log('Order webhook created:', result.webhook.id);
    } catch (error) {
      console.error('Failed to create order webhook:', error);
      throw error;
    }
  }

  /**
   * Verify webhook signature
   */
  public verifyWebhook(body: string, signature: string): boolean {
    if (!this.config.webhookSecret) {
      console.warn('Webhook secret not configured');
      return false;
    }

    try {
      const crypto = require('crypto');
      const hmac = crypto.createHmac('sha256', this.config.webhookSecret);
      hmac.update(body, 'utf8');
      const hash = hmac.digest('base64');
      
      return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(hash));
    } catch (error) {
      console.error('Failed to verify webhook:', error);
      return false;
    }
  }

  /**
   * Sync customer data to CRM/tracking system
   */
  public async syncCustomer(customer: ShopifyCustomer, sessionId?: string): Promise<void> {
    try {
      const customerData = {
        shopifyId: customer.id,
        email: customer.email,
        firstName: customer.first_name,
        lastName: customer.last_name,
        phone: customer.phone,
        tags: customer.tags.split(',').map(tag => tag.trim()),
        totalSpent: parseFloat(customer.total_spent),
        ordersCount: customer.orders_count,
        createdAt: customer.created_at,
        updatedAt: customer.updated_at,
        sessionId
      };

      // Send to tracking system
      await fetch('/api/integrations/shopify/customer-sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(customerData)
      });

      console.log('Customer synced:', customer.email);
    } catch (error) {
      console.error('Failed to sync customer:', error);
      throw error;
    }
  }

  /**
   * Get products for tracking
   */
  public async getProducts(limit: number = 250): Promise<any[]> {
    try {
      const response = await fetch(`${this.baseUrl}/admin/api/2023-10/products.json?limit=${limit}`, {
        headers: this.headers
      });

      if (!response.ok) {
        throw new Error(`Failed to get products: ${response.statusText}`);
      }

      const result = await response.json();
      return result.products;
    } catch (error) {
      console.error('Failed to get products:', error);
      throw error;
    }
  }

  /**
   * Track product view
   */
  public async trackProductView(productId: string, sessionId: string, userId?: string): Promise<void> {
    try {
      // Get product details from Shopify
      const response = await fetch(`${this.baseUrl}/admin/api/2023-10/products/${productId}.json`, {
        headers: this.headers
      });

      if (!response.ok) {
        throw new Error(`Failed to get product: ${response.statusText}`);
      }

      const result = await response.json();
      const product = result.product;

      const productViewEvent: EcommerceEvent = {
        type: 'product_view',
        productId: product.id.toString(),
        productName: product.title,
        category: product.product_type,
        price: parseFloat(product.variants[0]?.price || '0'),
        currency: 'USD', // Default - should be from store settings
        timestamp: new Date()
      };

      const trackingEvent: TrackingEvent = {
        id: `product_view_${productId}_${Date.now()}`,
        sessionId,
        userId,
        type: 'ecommerce',
        data: productViewEvent,
        timestamp: new Date()
      };

      // Send to tracking system
      await fetch('/api/tracking/ingest', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          sessionId,
          events: [trackingEvent]
        })
      });

      console.log('Product view tracked:', product.title);
    } catch (error) {
      console.error('Failed to track product view:', error);
    }
  }

  /**
   * Get store analytics data
   */
  public async getStoreAnalytics(startDate: Date, endDate: Date): Promise<any> {
    try {
      const [ordersResponse, customersResponse] = await Promise.all([
        fetch(`${this.baseUrl}/admin/api/2023-10/orders.json?created_at_min=${startDate.toISOString()}&created_at_max=${endDate.toISOString()}&limit=250`, {
          headers: this.headers
        }),
        fetch(`${this.baseUrl}/admin/api/2023-10/customers.json?created_at_min=${startDate.toISOString()}&created_at_max=${endDate.toISOString()}&limit=250`, {
          headers: this.headers
        })
      ]);

      const [ordersData, customersData] = await Promise.all([
        ordersResponse.json(),
        customersResponse.json()
      ]);

      const analytics = {
        orders: ordersData.orders,
        customers: customersData.customers,
        totalRevenue: ordersData.orders.reduce((sum: number, order: any) => 
          sum + parseFloat(order.total_price), 0
        ),
        averageOrderValue: ordersData.orders.length > 0 
          ? ordersData.orders.reduce((sum: number, order: any) => 
              sum + parseFloat(order.total_price), 0
            ) / ordersData.orders.length 
          : 0,
        newCustomers: customersData.customers.length,
        orderCount: ordersData.orders.length
      };

      return analytics;
    } catch (error) {
      console.error('Failed to get store analytics:', error);
      throw error;
    }
  }

  /**
   * Install metafields for tracking
   */
  public async installTrackingMetafields(): Promise<void> {
    try {
      // Create metafield definition for tracking consent
      const metafield = {
        metafield_definition: {
          namespace: 'smartpop',
          key: 'tracking_consent',
          name: 'Tracking Consent',
          description: 'Customer tracking consent preferences',
          type: 'json'
        }
      };

      const response = await fetch(`${this.baseUrl}/admin/api/2023-10/metafield_definitions.json`, {
        method: 'POST',
        headers: this.headers,
        body: JSON.stringify(metafield)
      });

      if (!response.ok) {
        throw new Error(`Failed to create metafield: ${response.statusText}`);
      }

      console.log('Tracking metafields installed');
    } catch (error) {
      console.error('Failed to install tracking metafields:', error);
      throw error;
    }
  }

  /**
   * Update customer consent preferences
   */
  public async updateCustomerConsent(customerId: number, consentData: any): Promise<void> {
    try {
      const metafield = {
        metafield: {
          namespace: 'smartpop',
          key: 'tracking_consent',
          value: JSON.stringify(consentData),
          type: 'json'
        }
      };

      const response = await fetch(`${this.baseUrl}/admin/api/2023-10/customers/${customerId}/metafields.json`, {
        method: 'POST',
        headers: this.headers,
        body: JSON.stringify(metafield)
      });

      if (!response.ok) {
        throw new Error(`Failed to update customer consent: ${response.statusText}`);
      }

      console.log('Customer consent updated:', customerId);
    } catch (error) {
      console.error('Failed to update customer consent:', error);
      throw error;
    }
  }
}