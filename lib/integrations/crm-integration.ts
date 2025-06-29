// CRM integration for customer data synchronization

import { ConsentRecord, SessionData, BehavioralProfile } from '@/types/tracking';

export interface CRMConfig {
  provider: 'hubspot' | 'salesforce' | 'mailchimp' | 'klaviyo' | 'custom';
  apiKey: string;
  apiUrl?: string;
  enabled: boolean;
}

export interface CRMContact {
  id?: string;
  email: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  company?: string;
  tags: string[];
  customFields: Record<string, any>;
  source: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CRMSyncOptions {
  includeConsentData: boolean;
  includeBehavioralData: boolean;
  includeSessionData: boolean;
  syncFrequency: 'realtime' | 'hourly' | 'daily';
}

export class CRMIntegration {
  private config: CRMConfig;
  private syncOptions: CRMSyncOptions;

  constructor(config: CRMConfig, syncOptions: CRMSyncOptions) {
    this.config = config;
    this.syncOptions = syncOptions;
  }

  /**
   * Sync contact to CRM system
   */
  public async syncContact(contact: CRMContact): Promise<string | null> {
    if (!this.config.enabled) {
      console.log('CRM sync disabled');
      return null;
    }

    try {
      switch (this.config.provider) {
        case 'hubspot':
          return await this.syncToHubSpot(contact);
        case 'mailchimp':
          return await this.syncToMailchimp(contact);
        case 'klaviyo':
          return await this.syncToKlaviyo(contact);
        case 'salesforce':
          return await this.syncToSalesforce(contact);
        case 'custom':
          return await this.syncToCustomCRM(contact);
        default:
          throw new Error(`Unsupported CRM provider: ${this.config.provider}`);
      }
    } catch (error) {
      console.error('Failed to sync contact to CRM:', error);
      throw error;
    }
  }

  /**
   * Sync to HubSpot
   */
  private async syncToHubSpot(contact: CRMContact): Promise<string> {
    const hubspotContact = {
      properties: {
        email: contact.email,
        firstname: contact.firstName,
        lastname: contact.lastName,
        phone: contact.phone,
        company: contact.company,
        hs_lead_status: 'NEW',
        lifecyclestage: 'lead',
        ...this.mapCustomFields(contact.customFields, 'hubspot')
      }
    };

    const response = await fetch('https://api.hubapi.com/crm/v3/objects/contacts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.config.apiKey}`
      },
      body: JSON.stringify(hubspotContact)
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`HubSpot sync failed: ${error.message}`);
    }

    const result = await response.json();
    
    // Add tags if supported
    if (contact.tags.length > 0) {
      await this.addHubSpotTags(result.id, contact.tags);
    }

    return result.id;
  }

  /**
   * Sync to Mailchimp
   */
  private async syncToMailchimp(contact: CRMContact): Promise<string> {
    const listId = process.env.MAILCHIMP_LIST_ID;
    if (!listId) {
      throw new Error('Mailchimp list ID not configured');
    }

    const mailchimpContact = {
      email_address: contact.email,
      status: 'subscribed',
      merge_fields: {
        FNAME: contact.firstName || '',
        LNAME: contact.lastName || '',
        PHONE: contact.phone || '',
        ...this.mapCustomFields(contact.customFields, 'mailchimp')
      },
      tags: contact.tags
    };

    const response = await fetch(`https://us1.api.mailchimp.com/3.0/lists/${listId}/members`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.config.apiKey}`
      },
      body: JSON.stringify(mailchimpContact)
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Mailchimp sync failed: ${error.detail}`);
    }

    const result = await response.json();
    return result.id;
  }

  /**
   * Sync to Klaviyo
   */
  private async syncToKlaviyo(contact: CRMContact): Promise<string> {
    const klaviyoProfile = {
      data: {
        type: 'profile',
        attributes: {
          email: contact.email,
          first_name: contact.firstName,
          last_name: contact.lastName,
          phone_number: contact.phone,
          organization: contact.company,
          properties: {
            source: contact.source,
            tags: contact.tags,
            ...contact.customFields
          }
        }
      }
    };

    const response = await fetch('https://a.klaviyo.com/api/profiles/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Klaviyo-API-Key ${this.config.apiKey}`,
        'revision': '2023-12-15'
      },
      body: JSON.stringify(klaviyoProfile)
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Klaviyo sync failed: ${error.errors?.[0]?.detail || 'Unknown error'}`);
    }

    const result = await response.json();
    return result.data.id;
  }

  /**
   * Sync to Salesforce
   */
  private async syncToSalesforce(contact: CRMContact): Promise<string> {
    // Salesforce requires OAuth flow, this is a simplified version
    const salesforceContact = {
      Email: contact.email,
      FirstName: contact.firstName,
      LastName: contact.lastName,
      Phone: contact.phone,
      Company: contact.company,
      LeadSource: contact.source,
      ...this.mapCustomFields(contact.customFields, 'salesforce')
    };

    const response = await fetch(`${this.config.apiUrl}/services/data/v57.0/sobjects/Lead/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.config.apiKey}`
      },
      body: JSON.stringify(salesforceContact)
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Salesforce sync failed: ${error[0]?.message || 'Unknown error'}`);
    }

    const result = await response.json();
    return result.id;
  }

  /**
   * Sync to custom CRM
   */
  private async syncToCustomCRM(contact: CRMContact): Promise<string> {
    if (!this.config.apiUrl) {
      throw new Error('Custom CRM API URL not configured');
    }

    const response = await fetch(`${this.config.apiUrl}/contacts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.config.apiKey}`
      },
      body: JSON.stringify(contact)
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Custom CRM sync failed: ${error.message || 'Unknown error'}`);
    }

    const result = await response.json();
    return result.id;
  }

  /**
   * Add tags to HubSpot contact
   */
  private async addHubSpotTags(contactId: string, tags: string[]): Promise<void> {
    // HubSpot doesn't have built-in tags, so we'll use a custom property
    const tagsProperty = {
      properties: {
        smartpop_tags: tags.join(', ')
      }
    };

    await fetch(`https://api.hubapi.com/crm/v3/objects/contacts/${contactId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.config.apiKey}`
      },
      body: JSON.stringify(tagsProperty)
    });
  }

  /**
   * Map custom fields to CRM-specific format
   */
  private mapCustomFields(fields: Record<string, any>, provider: string): Record<string, any> {
    const mapped: Record<string, any> = {};

    Object.entries(fields).forEach(([key, value]) => {
      switch (provider) {
        case 'hubspot':
          // HubSpot uses snake_case for custom properties
          mapped[`smartpop_${key.toLowerCase()}`] = value;
          break;
        case 'mailchimp':
          // Mailchimp uses UPPERCASE for merge fields
          mapped[`SP_${key.toUpperCase()}`] = value;
          break;
        case 'salesforce':
          // Salesforce uses PascalCase with __c suffix for custom fields
          mapped[`SmartPop_${key}__c`] = value;
          break;
        default:
          mapped[key] = value;
      }
    });

    return mapped;
  }

  /**
   * Create CRM contact from session data
   */
  public createContactFromSession(
    sessionData: SessionData,
    consentRecord?: ConsentRecord,
    behavioralProfile?: BehavioralProfile
  ): CRMContact {
    const contact: CRMContact = {
      email: '', // Will be set when available
      tags: ['smartpop-tracked'],
      customFields: {},
      source: `smartpop-${sessionData.source}`,
      createdAt: sessionData.startTime,
      updatedAt: new Date()
    };

    // Add session data if enabled
    if (this.syncOptions.includeSessionData) {
      contact.customFields = {
        ...contact.customFields,
        session_duration: sessionData.duration,
        page_views: sessionData.pageViews,
        bounced: sessionData.bounced,
        traffic_source: sessionData.source,
        traffic_medium: sessionData.medium,
        campaign: sessionData.campaign,
        device_type: this.getDeviceType(sessionData.device),
        browser: this.getBrowser(sessionData.userAgent),
        country: sessionData.country,
        region: sessionData.region,
        city: sessionData.city
      };
    }

    // Add consent data if enabled
    if (this.syncOptions.includeConsentData && consentRecord) {
      contact.customFields = {
        ...contact.customFields,
        consent_analytics: consentRecord.permissions.analytics,
        consent_marketing: consentRecord.permissions.marketing,
        consent_personalization: consentRecord.permissions.personalization,
        consent_date: consentRecord.timestamp.toISOString(),
        consent_source: consentRecord.source
      };

      contact.tags.push(`consent-${consentRecord.source}`);
    }

    // Add behavioral data if enabled
    if (this.syncOptions.includeBehavioralData && behavioralProfile) {
      contact.customFields = {
        ...contact.customFields,
        total_sessions: behavioralProfile.totalSessions,
        total_page_views: behavioralProfile.totalPageViews,
        avg_session_duration: behavioralProfile.averageSessionDuration,
        bounce_rate: behavioralProfile.bounceRate,
        engagement_score: behavioralProfile.engagementScore,
        risk_score: behavioralProfile.riskScore,
        preferred_categories: behavioralProfile.preferredCategories.join(', '),
        last_active: behavioralProfile.lastActive.toISOString()
      };

      // Add engagement-based tags
      if (behavioralProfile.engagementScore > 80) {
        contact.tags.push('high-engagement');
      } else if (behavioralProfile.engagementScore > 50) {
        contact.tags.push('medium-engagement');
      } else {
        contact.tags.push('low-engagement');
      }

      // Add behavioral tags
      if (behavioralProfile.totalSessions > 10) {
        contact.tags.push('frequent-visitor');
      }
      if (behavioralProfile.bounceRate < 30) {
        contact.tags.push('engaged-visitor');
      }
    }

    return contact;
  }

  /**
   * Get device type from device fingerprint
   */
  private getDeviceType(device: any): string {
    if (!device?.screenResolution) return 'unknown';
    
    const [width] = device.screenResolution.split('x').map(Number);
    if (width < 768) return 'mobile';
    if (width < 1024) return 'tablet';
    return 'desktop';
  }

  /**
   * Get browser from user agent
   */
  private getBrowser(userAgent: string): string {
    if (!userAgent) return 'unknown';
    
    if (userAgent.includes('Chrome')) return 'Chrome';
    if (userAgent.includes('Firefox')) return 'Firefox';
    if (userAgent.includes('Safari')) return 'Safari';
    if (userAgent.includes('Edge')) return 'Edge';
    return 'Other';
  }

  /**
   * Batch sync multiple contacts
   */
  public async batchSyncContacts(contacts: CRMContact[]): Promise<void> {
    const batchSize = 100; // Most CRMs support batch operations
    
    for (let i = 0; i < contacts.length; i += batchSize) {
      const batch = contacts.slice(i, i + batchSize);
      
      try {
        await Promise.all(batch.map(contact => this.syncContact(contact)));
        console.log(`Synced batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(contacts.length / batchSize)}`);
      } catch (error) {
        console.error(`Failed to sync batch ${Math.floor(i / batchSize) + 1}:`, error);
      }
      
      // Rate limiting - wait between batches
      if (i + batchSize < contacts.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
  }

  /**
   * Update existing contact
   */
  public async updateContact(contactId: string, updates: Partial<CRMContact>): Promise<void> {
    if (!this.config.enabled) return;

    try {
      switch (this.config.provider) {
        case 'hubspot':
          await this.updateHubSpotContact(contactId, updates);
          break;
        case 'mailchimp':
          await this.updateMailchimpContact(contactId, updates);
          break;
        case 'klaviyo':
          await this.updateKlaviyoContact(contactId, updates);
          break;
        case 'salesforce':
          await this.updateSalesforceContact(contactId, updates);
          break;
        case 'custom':
          await this.updateCustomCRMContact(contactId, updates);
          break;
      }
    } catch (error) {
      console.error('Failed to update contact in CRM:', error);
      throw error;
    }
  }

  /**
   * Update HubSpot contact
   */
  private async updateHubSpotContact(contactId: string, updates: Partial<CRMContact>): Promise<void> {
    const properties: Record<string, any> = {};
    
    if (updates.firstName) properties.firstname = updates.firstName;
    if (updates.lastName) properties.lastname = updates.lastName;
    if (updates.phone) properties.phone = updates.phone;
    if (updates.company) properties.company = updates.company;
    if (updates.customFields) {
      Object.assign(properties, this.mapCustomFields(updates.customFields, 'hubspot'));
    }

    if (Object.keys(properties).length === 0) return;

    const response = await fetch(`https://api.hubapi.com/crm/v3/objects/contacts/${contactId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.config.apiKey}`
      },
      body: JSON.stringify({ properties })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`HubSpot update failed: ${error.message}`);
    }
  }

  /**
   * Update Mailchimp contact
   */
  private async updateMailchimpContact(contactId: string, updates: Partial<CRMContact>): Promise<void> {
    const listId = process.env.MAILCHIMP_LIST_ID;
    if (!listId) throw new Error('Mailchimp list ID not configured');

    const updateData: any = {};
    
    if (updates.firstName || updates.lastName || updates.phone || updates.customFields) {
      updateData.merge_fields = {};
      if (updates.firstName) updateData.merge_fields.FNAME = updates.firstName;
      if (updates.lastName) updateData.merge_fields.LNAME = updates.lastName;
      if (updates.phone) updateData.merge_fields.PHONE = updates.phone;
      if (updates.customFields) {
        Object.assign(updateData.merge_fields, this.mapCustomFields(updates.customFields, 'mailchimp'));
      }
    }

    if (updates.tags) {
      updateData.tags = updates.tags;
    }

    if (Object.keys(updateData).length === 0) return;

    const response = await fetch(`https://us1.api.mailchimp.com/3.0/lists/${listId}/members/${contactId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.config.apiKey}`
      },
      body: JSON.stringify(updateData)
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Mailchimp update failed: ${error.detail}`);
    }
  }

  /**
   * Update Klaviyo contact
   */
  private async updateKlaviyoContact(contactId: string, updates: Partial<CRMContact>): Promise<void> {
    const updateData: any = {
      data: {
        type: 'profile',
        id: contactId,
        attributes: {}
      }
    };

    if (updates.firstName) updateData.data.attributes.first_name = updates.firstName;
    if (updates.lastName) updateData.data.attributes.last_name = updates.lastName;
    if (updates.phone) updateData.data.attributes.phone_number = updates.phone;
    if (updates.company) updateData.data.attributes.organization = updates.company;
    
    if (updates.customFields || updates.tags) {
      updateData.data.attributes.properties = {};
      if (updates.customFields) {
        Object.assign(updateData.data.attributes.properties, updates.customFields);
      }
      if (updates.tags) {
        updateData.data.attributes.properties.tags = updates.tags;
      }
    }

    const response = await fetch(`https://a.klaviyo.com/api/profiles/${contactId}/`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Klaviyo-API-Key ${this.config.apiKey}`,
        'revision': '2023-12-15'
      },
      body: JSON.stringify(updateData)
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Klaviyo update failed: ${error.errors?.[0]?.detail || 'Unknown error'}`);
    }
  }

  /**
   * Update Salesforce contact
   */
  private async updateSalesforceContact(contactId: string, updates: Partial<CRMContact>): Promise<void> {
    const updateData: Record<string, any> = {};
    
    if (updates.firstName) updateData.FirstName = updates.firstName;
    if (updates.lastName) updateData.LastName = updates.lastName;
    if (updates.phone) updateData.Phone = updates.phone;
    if (updates.company) updateData.Company = updates.company;
    if (updates.customFields) {
      Object.assign(updateData, this.mapCustomFields(updates.customFields, 'salesforce'));
    }

    if (Object.keys(updateData).length === 0) return;

    const response = await fetch(`${this.config.apiUrl}/services/data/v57.0/sobjects/Lead/${contactId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.config.apiKey}`
      },
      body: JSON.stringify(updateData)
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Salesforce update failed: ${error[0]?.message || 'Unknown error'}`);
    }
  }

  /**
   * Update custom CRM contact
   */
  private async updateCustomCRMContact(contactId: string, updates: Partial<CRMContact>): Promise<void> {
    if (!this.config.apiUrl) throw new Error('Custom CRM API URL not configured');

    const response = await fetch(`${this.config.apiUrl}/contacts/${contactId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.config.apiKey}`
      },
      body: JSON.stringify(updates)
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Custom CRM update failed: ${error.message || 'Unknown error'}`);
    }
  }
}