export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          auth_user_id: string | null;
          display_name: string;
          email: string;
          avatar_url: string | null;
          member_code: string | null;
          preferred_language: string;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          auth_user_id?: string | null;
          display_name: string;
          email: string;
          avatar_url?: string | null;
          member_code?: string | null;
          preferred_language?: string;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Update: {
          auth_user_id?: string | null;
          display_name?: string;
          email?: string;
          avatar_url?: string | null;
          member_code?: string | null;
          preferred_language?: string;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
      };
      recycling_centers: {
        Row: {
          id: string;
          slug: string;
          name: string;
          township: string;
          address: string;
          latitude: number;
          longitude: number;
          opening_hours: string;
          accepted_materials: string[];
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          slug: string;
          name: string;
          township: string;
          address: string;
          latitude: number;
          longitude: number;
          opening_hours: string;
          accepted_materials?: string[];
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          slug?: string;
          name?: string;
          township?: string;
          address?: string;
          latitude?: number;
          longitude?: number;
          opening_hours?: string;
          accepted_materials?: string[];
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      center_staff_assignments: {
        Row: {
          id: string;
          center_id: string;
          profile_id: string;
          role: "manager" | "operator";
          is_active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          center_id: string;
          profile_id: string;
          role?: "manager" | "operator";
          is_active?: boolean;
          created_at?: string;
        };
        Update: {
          center_id?: string;
          profile_id?: string;
          role?: "manager" | "operator";
          is_active?: boolean;
          created_at?: string;
        };
      };
      verified_drop_offs: {
        Row: {
          id: string;
          center_id: string;
          member_profile_id: string;
          recorded_by_profile_id: string;
          material_slug: string;
          weight_kg: number;
          points_awarded: number;
          recorded_at: string;
        };
        Insert: {
          id?: string;
          center_id: string;
          member_profile_id: string;
          recorded_by_profile_id: string;
          material_slug: string;
          weight_kg: number;
          points_awarded: number;
          recorded_at?: string;
        };
        Update: {
          center_id?: string;
          member_profile_id?: string;
          recorded_by_profile_id?: string;
          material_slug?: string;
          weight_kg?: number;
          points_awarded?: number;
          recorded_at?: string;
        };
      };
      point_ledger_entries: {
        Row: {
          id: string;
          profile_id: string;
          center_id: string | null;
          drop_off_id: string | null;
          points: number;
          entry_type: "earned" | "redeemed" | "adjusted" | "refunded";
          description: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          profile_id: string;
          center_id?: string | null;
          drop_off_id?: string | null;
          points: number;
          entry_type: "earned" | "redeemed" | "adjusted" | "refunded";
          description: string;
          created_at?: string;
        };
        Update: {
          profile_id?: string;
          center_id?: string | null;
          drop_off_id?: string | null;
          points?: number;
          entry_type?: "earned" | "redeemed" | "adjusted" | "refunded";
          description?: string;
          created_at?: string;
        };
      };
      partner_reward_offers: {
        Row: {
          id: string;
          center_id: string | null;
          title: string;
          description: string;
          township: string;
          points_cost: number;
          stock: number;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          center_id?: string | null;
          title: string;
          description: string;
          township: string;
          points_cost: number;
          stock?: number;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          center_id?: string | null;
          title?: string;
          description?: string;
          township?: string;
          points_cost?: number;
          stock?: number;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      partner_reward_redemptions: {
        Row: {
          id: string;
          profile_id: string;
          reward_offer_id: string;
          claim_code: string;
          points_spent: number;
          status: "reserved" | "fulfilled" | "cancelled" | "refunded";
          fulfilled_at: string | null;
          fulfilled_by_profile_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          profile_id: string;
          reward_offer_id: string;
          claim_code: string;
          points_spent: number;
          status?: "reserved" | "fulfilled" | "cancelled" | "refunded";
          fulfilled_at?: string | null;
          fulfilled_by_profile_id?: string | null;
          created_at?: string;
        };
        Update: {
          profile_id?: string;
          reward_offer_id?: string;
          claim_code?: string;
          points_spent?: number;
          status?: "reserved" | "fulfilled" | "cancelled" | "refunded";
          fulfilled_at?: string | null;
          fulfilled_by_profile_id?: string | null;
          created_at?: string;
        };
      };
      user_notifications: {
        Row: {
          id: string;
          profile_id: string;
          kind: "points" | "reward" | "report" | "center" | "system";
          title: string;
          message: string;
          href: string | null;
          read_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          profile_id: string;
          kind: "points" | "reward" | "report" | "center" | "system";
          title: string;
          message: string;
          href?: string | null;
          read_at?: string | null;
          created_at?: string;
        };
        Update: {
          profile_id?: string;
          kind?: "points" | "reward" | "report" | "center" | "system";
          title?: string;
          message?: string;
          href?: string | null;
          read_at?: string | null;
          created_at?: string;
        };
      };
      environment_reports: {
        Row: {
          id: string;
          latitude: number;
          longitude: number;
          dirtiness_score: number;
          waste_type:
            | "MIXED"
            | "PLASTIC"
            | "PAPER_CARDBOARD"
            | "METAL"
            | "GLASS"
            | "ORGANIC"
            | "E_WASTE"
            | "HAZARDOUS"
            | "OTHER"
            | null;
          notes: string | null;
          observed_at: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          latitude: number;
          longitude: number;
          dirtiness_score: number;
          waste_type?:
            | "MIXED"
            | "PLASTIC"
            | "PAPER_CARDBOARD"
            | "METAL"
            | "GLASS"
            | "ORGANIC"
            | "E_WASTE"
            | "HAZARDOUS"
            | "OTHER"
            | null;
          notes?: string | null;
          observed_at?: string;
          created_at?: string;
        };
        Update: {
          latitude?: number;
          longitude?: number;
          dirtiness_score?: number;
          waste_type?:
            | "MIXED"
            | "PLASTIC"
            | "PAPER_CARDBOARD"
            | "METAL"
            | "GLASS"
            | "ORGANIC"
            | "E_WASTE"
            | "HAZARDOUS"
            | "OTHER"
            | null;
          notes?: string | null;
          observed_at?: string;
          created_at?: string;
        };
      };
    };
    Views: Record<string, never>;
    Functions: {
      ensure_current_profile: {
        Args: { profile_display_name: string; profile_email: string };
        Returns: Array<{ profile_id: string; member_code: string; display_name: string }>;
      };
      record_center_drop_off: {
        Args: { member_code: string; material_slug: string; weight_kg: number };
        Returns: Array<{ drop_off_id: string; points_awarded: number; center_id: string }>;
      };
      redeem_partner_reward: {
        Args: { reward_id: string };
        Returns: Array<{ redemption_id: string; claim_code: string }>;
      };
      fulfill_partner_reward: {
        Args: { reward_claim_code: string };
        Returns: string;
      };
    };
    Enums: {
      environment_waste_type:
        | "MIXED"
        | "PLASTIC"
        | "PAPER_CARDBOARD"
        | "METAL"
        | "GLASS"
        | "ORGANIC"
        | "E_WASTE"
        | "HAZARDOUS"
        | "OTHER";
    };
    CompositeTypes: Record<string, never>;
  };
};
