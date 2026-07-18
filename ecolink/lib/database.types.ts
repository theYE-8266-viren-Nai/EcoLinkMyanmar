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
<<<<<<< HEAD
          preferred_language: string;
=======
>>>>>>> 966e585 (feat: add collector vehicles API and location tracking)
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
<<<<<<< HEAD
          preferred_language?: string;
=======
>>>>>>> 966e585 (feat: add collector vehicles API and location tracking)
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
<<<<<<< HEAD
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
=======
>>>>>>> 966e585 (feat: add collector vehicles API and location tracking)
          created_at?: string;
        };
        Relationships: [];
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
          reporter_profile_id: string | null;
          issue_type: string | null;
          severity: string | null;
          status: string;
          photo_storage_path: string | null;
          location: Json | null;
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
          reporter_profile_id?: string | null;
          issue_type?: string | null;
          severity?: string | null;
          status?: string;
          photo_storage_path?: string | null;
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
          reporter_profile_id?: string | null;
          issue_type?: string | null;
          severity?: string | null;
          status?: string;
          photo_storage_path?: string | null;
          observed_at?: string;
          created_at?: string;
        };
        Relationships: [];
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
          location: Json | null;
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
          updated_at?: string;
        };
        Relationships: [];
      };
      collector_vehicles: {
        Row: {
          id: string;
          center_id: string;
          public_label: string;
          is_active: boolean;
          is_public: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          center_id: string;
          public_label: string;
          is_active?: boolean;
          is_public?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          center_id?: string;
          public_label?: string;
          is_active?: boolean;
          is_public?: boolean;
          updated_at?: string;
        };
        Relationships: [];
      };
      collector_vehicle_locations: {
        Row: {
          vehicle_id: string;
          latitude: number;
          longitude: number;
          heading: number;
          speed_kph: number;
          status: "collecting" | "en_route" | "returning" | "offline";
          observed_at: string;
          updated_at: string;
        };
        Insert: {
          vehicle_id: string;
          latitude: number;
          longitude: number;
          heading?: number;
          speed_kph?: number;
          status?: "collecting" | "en_route" | "returning" | "offline";
          observed_at: string;
          updated_at?: string;
        };
        Update: {
          latitude?: number;
          longitude?: number;
          heading?: number;
          speed_kph?: number;
          status?: "collecting" | "en_route" | "returning" | "offline";
          observed_at?: string;
          updated_at?: string;
        };
        Relationships: [];
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
      get_public_waste_map: {
        Args: {
          min_lng: number;
          min_lat: number;
          max_lng: number;
          max_lat: number;
          requested_zoom: number;
          observed_since: string;
          requested_waste_type?: string | null;
        };
        Returns: Array<{
          mode: string;
          feature_id: string;
          geometry: Json;
          properties: Json;
        }>;
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
