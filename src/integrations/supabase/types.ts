export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      api_keys: {
        Row: {
          created_at: string | null
          created_by: string | null
          expires_at: string | null
          id: string
          is_active: boolean | null
          key_hash: string
          key_prefix: string
          last_used_at: string | null
          notes: string | null
          permissions: Json | null
          rate_limit_per_minute: number | null
          shop_domain: string
          updated_at: string | null
          usage_count: number | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          key_hash: string
          key_prefix: string
          last_used_at?: string | null
          notes?: string | null
          permissions?: Json | null
          rate_limit_per_minute?: number | null
          shop_domain: string
          updated_at?: string | null
          usage_count?: number | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          key_hash?: string
          key_prefix?: string
          last_used_at?: string | null
          notes?: string | null
          permissions?: Json | null
          rate_limit_per_minute?: number | null
          shop_domain?: string
          updated_at?: string | null
          usage_count?: number | null
        }
        Relationships: []
      }
      consent_records: {
        Row: {
          consent_string: string
          created_at: string | null
          id: string
          ip_address: string | null
          permissions: Json
          session_id: string
          source: string
          updated_at: string | null
          user_agent: string | null
          user_id: string | null
          version: string
        }
        Insert: {
          consent_string: string
          created_at?: string | null
          id: string
          ip_address?: string | null
          permissions: Json
          session_id: string
          source: string
          updated_at?: string | null
          user_agent?: string | null
          user_id?: string | null
          version: string
        }
        Update: {
          consent_string?: string
          created_at?: string | null
          id?: string
          ip_address?: string | null
          permissions?: Json
          session_id?: string
          source?: string
          updated_at?: string | null
          user_agent?: string | null
          user_id?: string | null
          version?: string
        }
        Relationships: []
      }
      crm_sync_queue: {
        Row: {
          created_at: string | null
          customer_data: Json
          data_hash: string | null
          encryption_key_id: string | null
          id: string
          last_error: string | null
          retry_count: number | null
          sync_status: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          customer_data: Json
          data_hash?: string | null
          encryption_key_id?: string | null
          id?: string
          last_error?: string | null
          retry_count?: number | null
          sync_status?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          customer_data?: Json
          data_hash?: string | null
          encryption_key_id?: string | null
          id?: string
          last_error?: string | null
          retry_count?: number | null
          sync_status?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      data_deletion_log: {
        Row: {
          deletion_results: Json | null
          id: number
          requested_at: string | null
          session_id: string | null
          success: boolean
          total_records_deleted: number | null
          user_id: string | null
        }
        Insert: {
          deletion_results?: Json | null
          id?: number
          requested_at?: string | null
          session_id?: string | null
          success: boolean
          total_records_deleted?: number | null
          user_id?: string | null
        }
        Update: {
          deletion_results?: Json | null
          id?: number
          requested_at?: string | null
          session_id?: string | null
          success?: boolean
          total_records_deleted?: number | null
          user_id?: string | null
        }
        Relationships: []
      }
      data_requests: {
        Row: {
          completed_at: string | null
          created_at: string | null
          id: string
          reason: string | null
          request_type: string
          requested_at: string | null
          status: string
          subject_id: string
          updated_at: string | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          id?: string
          reason?: string | null
          request_type: string
          requested_at?: string | null
          status?: string
          subject_id: string
          updated_at?: string | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          id?: string
          reason?: string | null
          request_type?: string
          requested_at?: string | null
          status?: string
          subject_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "data_requests_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "data_subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      data_subjects: {
        Row: {
          created_at: string | null
          email: string | null
          id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          email?: string | null
          id?: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string | null
          id?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      generic_webhooks: {
        Row: {
          created_at: string | null
          headers: Json | null
          id: string
          payload: Json
        }
        Insert: {
          created_at?: string | null
          headers?: Json | null
          id?: string
          payload: Json
        }
        Update: {
          created_at?: string | null
          headers?: Json | null
          id?: string
          payload?: Json
        }
        Relationships: []
      }
      ip_whitelist: {
        Row: {
          created_at: string | null
          created_by: string | null
          description: string | null
          id: number
          ip_address: unknown
          is_active: boolean | null
          shop_domain: string
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: number
          ip_address: unknown
          is_active?: boolean | null
          shop_domain: string
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: number
          ip_address?: unknown
          is_active?: boolean | null
          shop_domain?: string
        }
        Relationships: []
      }
      popup_campaigns: {
        Row: {
          created_at: string | null
          discount_code: string | null
          discount_percent: number | null
          id: string
          is_active: boolean | null
          name: string
          position: string | null
          shop_id: string | null
          subtitle: string | null
          template: string | null
          title: string
          triggers: Json | null
          type: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          discount_code?: string | null
          discount_percent?: number | null
          id?: string
          is_active?: boolean | null
          name: string
          position?: string | null
          shop_id?: string | null
          subtitle?: string | null
          template?: string | null
          title: string
          triggers?: Json | null
          type: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          discount_code?: string | null
          discount_percent?: number | null
          id?: string
          is_active?: boolean | null
          name?: string
          position?: string | null
          shop_id?: string | null
          subtitle?: string | null
          template?: string | null
          title?: string
          triggers?: Json | null
          type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "popup_campaigns_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
        ]
      }
      popup_conversions: {
        Row: {
          campaign_id: string | null
          converted_at: string | null
          discount_code_used: string | null
          email: string | null
          id: string
          order_id: string | null
          revenue_amount: number | null
          shop_id: string | null
          view_id: string | null
        }
        Insert: {
          campaign_id?: string | null
          converted_at?: string | null
          discount_code_used?: string | null
          email?: string | null
          id?: string
          order_id?: string | null
          revenue_amount?: number | null
          shop_id?: string | null
          view_id?: string | null
        }
        Update: {
          campaign_id?: string | null
          converted_at?: string | null
          discount_code_used?: string | null
          email?: string | null
          id?: string
          order_id?: string | null
          revenue_amount?: number | null
          shop_id?: string | null
          view_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "popup_conversions_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "popup_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "popup_conversions_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "popup_conversions_view_id_fkey"
            columns: ["view_id"]
            isOneToOne: false
            referencedRelation: "popup_views"
            referencedColumns: ["id"]
          },
        ]
      }
      popup_events: {
        Row: {
          created_at: string | null
          discount_code_used: string | null
          email: string | null
          event_type: string
          id: string
          page_url: string | null
          popup_id: string | null
          shop_domain: string | null
          timestamp: string | null
          user_agent: string | null
          visitor_ip: string | null
        }
        Insert: {
          created_at?: string | null
          discount_code_used?: string | null
          email?: string | null
          event_type: string
          id?: string
          page_url?: string | null
          popup_id?: string | null
          shop_domain?: string | null
          timestamp?: string | null
          user_agent?: string | null
          visitor_ip?: string | null
        }
        Update: {
          created_at?: string | null
          discount_code_used?: string | null
          email?: string | null
          event_type?: string
          id?: string
          page_url?: string | null
          popup_id?: string | null
          shop_domain?: string | null
          timestamp?: string | null
          user_agent?: string | null
          visitor_ip?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "popup_events_popup_id_fkey"
            columns: ["popup_id"]
            isOneToOne: false
            referencedRelation: "popups"
            referencedColumns: ["id"]
          },
        ]
      }
      popup_views: {
        Row: {
          campaign_id: string | null
          id: string
          page_url: string | null
          session_id: string | null
          shop_id: string | null
          user_agent: string | null
          viewed_at: string | null
          visitor_ip: string | null
        }
        Insert: {
          campaign_id?: string | null
          id?: string
          page_url?: string | null
          session_id?: string | null
          shop_id?: string | null
          user_agent?: string | null
          viewed_at?: string | null
          visitor_ip?: string | null
        }
        Update: {
          campaign_id?: string | null
          id?: string
          page_url?: string | null
          session_id?: string | null
          shop_id?: string | null
          user_agent?: string | null
          viewed_at?: string | null
          visitor_ip?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "popup_views_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "popup_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "popup_views_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
        ]
      }
      popups: {
        Row: {
          button_text: string | null
          created_at: string | null
          deleted_at: string | null
          description: string | null
          discount_code: string | null
          discount_percent: string | null
          email_placeholder: string | null
          id: string
          is_active: boolean | null
          is_deleted: boolean
          name: string
          page_target: string
          popup_type: string
          shop_id: string | null
          title: string | null
          trigger_type: string
          trigger_value: string | null
          updated_at: string | null
        }
        Insert: {
          button_text?: string | null
          created_at?: string | null
          deleted_at?: string | null
          description?: string | null
          discount_code?: string | null
          discount_percent?: string | null
          email_placeholder?: string | null
          id?: string
          is_active?: boolean | null
          is_deleted?: boolean
          name: string
          page_target: string
          popup_type: string
          shop_id?: string | null
          title?: string | null
          trigger_type: string
          trigger_value?: string | null
          updated_at?: string | null
        }
        Update: {
          button_text?: string | null
          created_at?: string | null
          deleted_at?: string | null
          description?: string | null
          discount_code?: string | null
          discount_percent?: string | null
          email_placeholder?: string | null
          id?: string
          is_active?: boolean | null
          is_deleted?: boolean
          name?: string
          page_target?: string
          popup_type?: string
          shop_id?: string | null
          title?: string | null
          trigger_type?: string
          trigger_value?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "popups_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
        ]
      }
      request_audit: {
        Row: {
          api_key_prefix: string | null
          created_at: string | null
          endpoint: string
          error_message: string | null
          id: number
          ip_address: string | null
          method: string
          request_size: number | null
          response_status: number | null
          response_time_ms: number | null
          shop_domain: string | null
          user_agent: string | null
        }
        Insert: {
          api_key_prefix?: string | null
          created_at?: string | null
          endpoint: string
          error_message?: string | null
          id?: number
          ip_address?: string | null
          method: string
          request_size?: number | null
          response_status?: number | null
          response_time_ms?: number | null
          shop_domain?: string | null
          user_agent?: string | null
        }
        Update: {
          api_key_prefix?: string | null
          created_at?: string | null
          endpoint?: string
          error_message?: string | null
          id?: number
          ip_address?: string | null
          method?: string
          request_size?: number | null
          response_status?: number | null
          response_time_ms?: number | null
          shop_domain?: string | null
          user_agent?: string | null
        }
        Relationships: []
      }
      security_logs: {
        Row: {
          created_at: string | null
          details: Json | null
          event_type: string
          id: number
          ip_address: string
          request_method: string | null
          request_path: string | null
          severity: string | null
          shop_domain: string | null
          user_agent: string | null
        }
        Insert: {
          created_at?: string | null
          details?: Json | null
          event_type: string
          id?: number
          ip_address: string
          request_method?: string | null
          request_path?: string | null
          severity?: string | null
          shop_domain?: string | null
          user_agent?: string | null
        }
        Update: {
          created_at?: string | null
          details?: Json | null
          event_type?: string
          id?: number
          ip_address?: string
          request_method?: string | null
          request_path?: string | null
          severity?: string | null
          shop_domain?: string | null
          user_agent?: string | null
        }
        Relationships: []
      }
      sessions: {
        Row: {
          bounced: boolean | null
          campaign: string | null
          city: string | null
          country: string | null
          created_at: string | null
          device_fingerprint: Json | null
          duration: number | null
          end_time: string | null
          ip_address: string | null
          medium: string | null
          page_views: number | null
          region: string | null
          session_id: string
          source: string | null
          start_time: string | null
          updated_at: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          bounced?: boolean | null
          campaign?: string | null
          city?: string | null
          country?: string | null
          created_at?: string | null
          device_fingerprint?: Json | null
          duration?: number | null
          end_time?: string | null
          ip_address?: string | null
          medium?: string | null
          page_views?: number | null
          region?: string | null
          session_id: string
          source?: string | null
          start_time?: string | null
          updated_at?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          bounced?: boolean | null
          campaign?: string | null
          city?: string | null
          country?: string | null
          created_at?: string | null
          device_fingerprint?: Json | null
          duration?: number | null
          end_time?: string | null
          ip_address?: string | null
          medium?: string | null
          page_views?: number | null
          region?: string | null
          session_id?: string
          source?: string | null
          start_time?: string | null
          updated_at?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      shopify_installations: {
        Row: {
          access_token: string
          app_version: string | null
          id: string
          installation_method: string | null
          installed_at: string | null
          is_active: boolean | null
          script_tag_id: number | null
          shop_domain: string
          updated_at: string | null
        }
        Insert: {
          access_token: string
          app_version?: string | null
          id?: string
          installation_method?: string | null
          installed_at?: string | null
          is_active?: boolean | null
          script_tag_id?: number | null
          shop_domain: string
          updated_at?: string | null
        }
        Update: {
          access_token?: string
          app_version?: string | null
          id?: string
          installation_method?: string | null
          installed_at?: string | null
          is_active?: boolean | null
          script_tag_id?: number | null
          shop_domain?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      shopify_webhooks: {
        Row: {
          created_at: string | null
          error_message: string | null
          id: string
          payload: Json
          processing_status: string | null
          retry_count: number | null
          shop_domain: string
          signature_verified: boolean | null
          topic: string
          verified: boolean | null
        }
        Insert: {
          created_at?: string | null
          error_message?: string | null
          id?: string
          payload: Json
          processing_status?: string | null
          retry_count?: number | null
          shop_domain: string
          signature_verified?: boolean | null
          topic: string
          verified?: boolean | null
        }
        Update: {
          created_at?: string | null
          error_message?: string | null
          id?: string
          payload?: Json
          processing_status?: string | null
          retry_count?: number | null
          shop_domain?: string
          signature_verified?: boolean | null
          topic?: string
          verified?: boolean | null
        }
        Relationships: []
      }
      shops: {
        Row: {
          access_token: string
          current_month_usage: number | null
          id: string
          installed_at: string | null
          monthly_request_limit: number | null
          plan_type: string | null
          scope: string | null
          security_settings: Json | null
          shop_domain: string
          subscription_status: string | null
          uninstalled_at: string | null
          updated_at: string | null
        }
        Insert: {
          access_token: string
          current_month_usage?: number | null
          id?: string
          installed_at?: string | null
          monthly_request_limit?: number | null
          plan_type?: string | null
          scope?: string | null
          security_settings?: Json | null
          shop_domain: string
          subscription_status?: string | null
          uninstalled_at?: string | null
          updated_at?: string | null
        }
        Update: {
          access_token?: string
          current_month_usage?: number | null
          id?: string
          installed_at?: string | null
          monthly_request_limit?: number | null
          plan_type?: string | null
          scope?: string | null
          security_settings?: Json | null
          shop_domain?: string
          subscription_status?: string | null
          uninstalled_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      tracking_events: {
        Row: {
          batch_id: string | null
          created_at: string | null
          event_data: Json
          event_type: string
          id: string
          session_id: string
          timestamp: string | null
          user_id: string | null
        }
        Insert: {
          batch_id?: string | null
          created_at?: string | null
          event_data: Json
          event_type: string
          id?: string
          session_id: string
          timestamp?: string | null
          user_id?: string | null
        }
        Update: {
          batch_id?: string | null
          created_at?: string | null
          event_data?: Json
          event_type?: string
          id?: string
          session_id?: string
          timestamp?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      webhook_security: {
        Row: {
          created_at: string | null
          failed_verification_count: number | null
          id: string
          is_active: boolean | null
          last_verified_at: string | null
          shop_domain: string
          signature_algorithm: string | null
          updated_at: string | null
          webhook_secret: string
        }
        Insert: {
          created_at?: string | null
          failed_verification_count?: number | null
          id?: string
          is_active?: boolean | null
          last_verified_at?: string | null
          shop_domain: string
          signature_algorithm?: string | null
          updated_at?: string | null
          webhook_secret: string
        }
        Update: {
          created_at?: string | null
          failed_verification_count?: number | null
          id?: string
          is_active?: boolean | null
          last_verified_at?: string | null
          shop_domain?: string
          signature_algorithm?: string | null
          updated_at?: string | null
          webhook_secret?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      cleanup_old_security_logs: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      create_default_campaigns: {
        Args: { shop_uuid: string }
        Returns: undefined
      }
      get_shop_rate_limits: {
        Args: { p_shop_domain: string }
        Returns: {
          rate_limit_per_minute: number
          monthly_limit: number
          current_usage: number
          subscription_status: string
        }[]
      }
      is_ip_whitelisted: {
        Args: { p_shop_domain: string; p_ip_address: string }
        Returns: boolean
      }
      log_security_event: {
        Args: {
          p_shop_domain: string
          p_ip_address: string
          p_event_type: string
          p_user_agent?: string
          p_request_path?: string
          p_request_method?: string
          p_details?: Json
          p_severity?: string
        }
        Returns: undefined
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DefaultSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
