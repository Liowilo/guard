export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "14.5";
  };
  public: {
    Tables: {
      families: {
        Row: { created_at: string; id: string; name: string };
        Insert: { created_at?: string; id?: string; name: string };
        Update: { created_at?: string; id?: string; name?: string };
        Relationships: [];
      };
      pacts: {
        Row: {
          created_at: string;
          family_id: string;
          id: string;
          menor_id: string;
          monitored_categories: Database["public"]["Enums"]["signal_label"][];
          signed_by_menor_at: string | null;
          signed_by_tutor_at: string | null;
          status: Database["public"]["Enums"]["pact_status"];
          trusted_adult_id: string | null;
          tutor_id: string;
        };
        Insert: {
          created_at?: string;
          family_id: string;
          id?: string;
          menor_id: string;
          monitored_categories?: Database["public"]["Enums"]["signal_label"][];
          signed_by_menor_at?: string | null;
          signed_by_tutor_at?: string | null;
          status?: Database["public"]["Enums"]["pact_status"];
          trusted_adult_id?: string | null;
          tutor_id: string;
        };
        Update: {
          created_at?: string;
          family_id?: string;
          id?: string;
          menor_id?: string;
          monitored_categories?: Database["public"]["Enums"]["signal_label"][];
          signed_by_menor_at?: string | null;
          signed_by_tutor_at?: string | null;
          status?: Database["public"]["Enums"]["pact_status"];
          trusted_adult_id?: string | null;
          tutor_id?: string;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          created_at: string;
          display_name: string;
          family_id: string;
          id: string;
          role: Database["public"]["Enums"]["user_role"];
        };
        Insert: {
          created_at?: string;
          display_name: string;
          family_id: string;
          id: string;
          role: Database["public"]["Enums"]["user_role"];
        };
        Update: {
          created_at?: string;
          display_name?: string;
          family_id?: string;
          id?: string;
          role?: Database["public"]["Enums"]["user_role"];
        };
        Relationships: [];
      };
      signals: {
        Row: {
          detected_at: string;
          id: string;
          label: Database["public"]["Enums"]["signal_label"];
          menor_id: string;
          pact_id: string;
          platform: string | null;
          risk_level: Database["public"]["Enums"]["risk_level"];
          score: number;
        };
        Insert: {
          detected_at?: string;
          id?: string;
          label: Database["public"]["Enums"]["signal_label"];
          menor_id: string;
          pact_id: string;
          platform?: string | null;
          risk_level: Database["public"]["Enums"]["risk_level"];
          score: number;
        };
        Update: {
          detected_at?: string;
          id?: string;
          label?: Database["public"]["Enums"]["signal_label"];
          menor_id?: string;
          pact_id?: string;
          platform?: string | null;
          risk_level?: Database["public"]["Enums"]["risk_level"];
          score?: number;
        };
        Relationships: [];
      };
      sos_events: {
        Row: {
          acknowledged_at: string | null;
          id: string;
          notes: string | null;
          pact_id: string;
          triggered_at: string;
          triggered_by: string;
          trusted_adult_id: string | null;
        };
        Insert: {
          acknowledged_at?: string | null;
          id?: string;
          notes?: string | null;
          pact_id: string;
          triggered_at?: string;
          triggered_by: string;
          trusted_adult_id?: string | null;
        };
        Update: {
          acknowledged_at?: string | null;
          id?: string;
          notes?: string | null;
          pact_id?: string;
          triggered_at?: string;
          triggered_by?: string;
          trusted_adult_id?: string | null;
        };
        Relationships: [];
      };
    };
    Views: { [_ in never]: never };
    Functions: { auth_family_id: { Args: never; Returns: string } };
    Enums: {
      pact_status: "pending" | "signed" | "paused" | "revoked";
      risk_level: "bajo" | "medio" | "alto";
      signal_label:
        | "love_bombing"
        | "intimacy_escalation"
        | "emotional_isolation"
        | "deceptive_offer"
        | "off_platform_request";
      user_role: "tutor" | "menor" | "adulto_confianza";
    };
    CompositeTypes: { [_ in never]: never };
  };
};

export type SignalLabel = Database["public"]["Enums"]["signal_label"];
export type RiskLevel = Database["public"]["Enums"]["risk_level"];
export type UserRole = Database["public"]["Enums"]["user_role"];
export type PactStatus = Database["public"]["Enums"]["pact_status"];

export type Profile = Database["public"]["Tables"]["profiles"]["Row"];
export type Pact = Database["public"]["Tables"]["pacts"]["Row"];
export type Signal = Database["public"]["Tables"]["signals"]["Row"];
export type SosEvent = Database["public"]["Tables"]["sos_events"]["Row"];
export type Family = Database["public"]["Tables"]["families"]["Row"];
