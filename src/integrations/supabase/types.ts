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
      shops: {
        Row: {
          access_token: string
          id: string
          installed_at: string | null
          scope: string | null
          shop_domain: string
          updated_at: string | null
        }
        Insert: {
          access_token: string
          id?: string
          installed_at?: string | null
          scope?: string | null
          shop_domain: string
          updated_at?: string | null
        }
        Update: {
          access_token?: string
          id?: string
          installed_at?: string | null
          scope?: string | null
          shop_domain?: string
          updated_at?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      create_default_campaigns: {
        Args: { shop_uuid: string }
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
