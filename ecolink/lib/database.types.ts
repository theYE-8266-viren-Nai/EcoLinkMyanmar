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
          created_at: string;
        };
        Insert: {
          id?: string;
          auth_user_id?: string | null;
          display_name: string;
          email: string;
          avatar_url?: string | null;
          created_at?: string;
        };
        Update: {
          auth_user_id?: string | null;
          display_name?: string;
          email?: string;
          avatar_url?: string | null;
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
    Functions: Record<string, never>;
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
