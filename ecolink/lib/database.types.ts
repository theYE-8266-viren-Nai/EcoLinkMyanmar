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
          app_role: "member" | "admin";
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
          app_role?: "member" | "admin";
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
          app_role?: "member" | "admin";
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
          report_id: string | null;
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
          report_id?: string | null;
          points: number;
          entry_type: "earned" | "redeemed" | "adjusted" | "refunded";
          description: string;
          created_at?: string;
        };
        Update: {
          profile_id?: string;
          center_id?: string | null;
          drop_off_id?: string | null;
          report_id?: string | null;
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
          latitude: number | null;
          longitude: number | null;
          dirtiness_score: number | null;
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
          status: "PENDING" | "APPROVED" | "REJECTED";
          photo_storage_path: string | null;
          location: Json | null;
          title: string;
          location_text: string | null;
          details: string | null;
          approved_at: string | null;
          approved_by_profile_id: string | null;
          reviewed_at: string | null;
          reviewed_by_profile_id: string | null;
          rejection_reason: string | null;
          claimed_at: string | null;
          points_awarded: number | null;
          is_claimed: boolean;
          observed_at: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          latitude?: number | null;
          longitude?: number | null;
          dirtiness_score?: number | null;
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
          status?: "PENDING" | "APPROVED" | "REJECTED";
          photo_storage_path?: string | null;
          title?: string;
          location_text?: string | null;
          details?: string | null;
          approved_at?: string | null;
          approved_by_profile_id?: string | null;
          reviewed_at?: string | null;
          reviewed_by_profile_id?: string | null;
          rejection_reason?: string | null;
          claimed_at?: string | null;
          points_awarded?: number | null;
          is_claimed?: boolean;
          observed_at?: string;
          created_at?: string;
        };
        Update: {
          latitude?: number | null;
          longitude?: number | null;
          dirtiness_score?: number | null;
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
          status?: "PENDING" | "APPROVED" | "REJECTED";
          photo_storage_path?: string | null;
          title?: string;
          location_text?: string | null;
          details?: string | null;
          approved_at?: string | null;
          approved_by_profile_id?: string | null;
          reviewed_at?: string | null;
          reviewed_by_profile_id?: string | null;
          rejection_reason?: string | null;
          claimed_at?: string | null;
          points_awarded?: number | null;
          is_claimed?: boolean;
          observed_at?: string;
          created_at?: string;
        };
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
      recycling_route_submission_locks: {
        Row: {
          id: string;
          profile_id: string;
          route_type: "pickup" | "center_dropoff";
          request_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          profile_id: string;
          route_type: "pickup" | "center_dropoff";
          request_id: string;
          created_at?: string;
        };
        Update: {
          profile_id?: string;
          route_type?: "pickup" | "center_dropoff";
          request_id?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      recycling_pickup_requests: {
        Row: {
          id: string;
          profile_id: string;
          selected_items: Json;
          estimated_weight_kg: number;
          estimated_points: number;
          notes: string | null;
          status: "PENDING" | "ACCEPTED" | "COMPLETED" | "CANCELLED" | "REJECTED";
          pickup_address: string;
          route_window: string;
          route_area: string;
          deleted_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          profile_id: string;
          selected_items?: Json;
          estimated_weight_kg?: number;
          estimated_points?: number;
          notes?: string | null;
          status?: "PENDING" | "ACCEPTED" | "COMPLETED" | "CANCELLED" | "REJECTED";
          pickup_address: string;
          route_window: string;
          route_area: string;
          deleted_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          profile_id?: string;
          selected_items?: Json;
          estimated_weight_kg?: number;
          estimated_points?: number;
          notes?: string | null;
          status?: "PENDING" | "ACCEPTED" | "COMPLETED" | "CANCELLED" | "REJECTED";
          pickup_address?: string;
          route_window?: string;
          route_area?: string;
          deleted_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      recycling_center_dropoff_requests: {
        Row: {
          id: string;
          profile_id: string;
          selected_items: Json;
          estimated_weight_kg: number;
          estimated_points: number;
          notes: string | null;
          status: "PENDING" | "ACCEPTED" | "COMPLETED" | "CANCELLED" | "REJECTED";
          center_id: string | null;
          center_name: string;
          center_address: string;
          center_township: string;
          center_hours: string;
          deleted_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          profile_id: string;
          selected_items?: Json;
          estimated_weight_kg?: number;
          estimated_points?: number;
          notes?: string | null;
          status?: "PENDING" | "ACCEPTED" | "COMPLETED" | "CANCELLED" | "REJECTED";
          center_id?: string | null;
          center_name: string;
          center_address: string;
          center_township: string;
          center_hours: string;
          deleted_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          profile_id?: string;
          selected_items?: Json;
          estimated_weight_kg?: number;
          estimated_points?: number;
          notes?: string | null;
          status?: "PENDING" | "ACCEPTED" | "COMPLETED" | "CANCELLED" | "REJECTED";
          center_id?: string | null;
          center_name?: string;
          center_address?: string;
          center_township?: string;
          center_hours?: string;
          deleted_at?: string | null;
          created_at?: string;
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
      current_profile_id: {
        Args: Record<PropertyKey, never>;
        Returns: string;
      };
      current_profile_is_admin: {
        Args: Record<PropertyKey, never>;
        Returns: boolean;
      };
      submit_environment_report: {
        Args: {
          report_title: string;
          report_issue_type: string;
          report_severity: string;
          report_location_text: string;
          report_latitude: number;
          report_longitude: number;
          report_photo_storage_path: string;
          report_details?: string | null;
        };
        Returns: Array<{ report_id: string; status: "PENDING" | "APPROVED" | "REJECTED"; created_at: string }>;
      };
      approve_environment_report: {
        Args: { target_report_id: string };
        Returns: string;
      };
      reject_environment_report: {
        Args: { target_report_id: string; reason?: string | null };
        Returns: string;
      };
      submit_recycling_pickup_request: {
        Args: {
          pickup_address: string;
          route_window: string;
          route_area: string;
          selected_items: Json;
          estimated_weight_kg: number;
          estimated_points: number;
          request_notes?: string | null;
        };
        Returns: Array<{
          request_id: string;
          status: "PENDING" | "ACCEPTED" | "COMPLETED" | "CANCELLED" | "REJECTED";
          created_at: string;
        }>;
      };
      submit_recycling_center_dropoff_request: {
        Args: {
          target_center_id: string | null;
          center_name: string;
          center_address: string;
          center_township: string;
          center_hours: string;
          selected_items: Json;
          estimated_weight_kg: number;
          estimated_points: number;
          request_notes?: string | null;
        };
        Returns: Array<{
          request_id: string;
          status: "PENDING" | "ACCEPTED" | "COMPLETED" | "CANCELLED" | "REJECTED";
          created_at: string;
        }>;
      };
      admin_update_recycling_pickup_request: {
        Args: {
          target_request_id: string;
          next_status: "PENDING" | "ACCEPTED" | "COMPLETED" | "CANCELLED" | "REJECTED";
          next_pickup_address: string;
          next_route_window: string;
          next_route_area: string;
          next_notes?: string | null;
        };
        Returns: string;
      };
      admin_update_recycling_center_dropoff_request: {
        Args: {
          target_request_id: string;
          next_status: "PENDING" | "ACCEPTED" | "COMPLETED" | "CANCELLED" | "REJECTED";
          next_center_name: string;
          next_center_address: string;
          next_center_township: string;
          next_center_hours: string;
          next_notes?: string | null;
        };
        Returns: string;
      };
      admin_delete_recycling_pickup_request: {
        Args: { target_request_id: string };
        Returns: string;
      };
      admin_delete_recycling_center_dropoff_request: {
        Args: { target_request_id: string };
        Returns: string;
      };
    };
    Enums: {
      report_status: "PENDING" | "APPROVED" | "REJECTED";
      recycling_route_request_status: "PENDING" | "ACCEPTED" | "COMPLETED" | "CANCELLED" | "REJECTED";
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
