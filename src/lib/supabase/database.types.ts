/**
 * Tipos do schema Supabase (Ciclo 0).
 *
 * Gerados diretamente do projeto Supabase de desenvolvimento real
 * (`acadjuris-diagnostico-dev`, apos aplicar supabase/migrations/0001..0005)
 * via `generate_typescript_types` (MCP) / `npx supabase gen types typescript
 * --linked`. Nao editar manualmente -- regenerar e revisar o diff antes de
 * commitar.
 *
 * As funcoes auxiliares de RLS (SECURITY DEFINER) vivem no schema `internal`
 * (migration 0005), que nao e exposto pela API REST -- por isso nao aparecem
 * aqui como `Functions`; isso confirma que o schema `internal` esta
 * realmente inacessivel via PostgREST, nao apenas por convencao.
 */

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
      admin_acadjuris_grant: {
        Row: {
          granted_at: string;
          granted_by: string | null;
          revoked_at: string | null;
          user_id: string;
        };
        Insert: {
          granted_at?: string;
          granted_by?: string | null;
          revoked_at?: string | null;
          user_id: string;
        };
        Update: {
          granted_at?: string;
          granted_by?: string | null;
          revoked_at?: string | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "admin_acadjuris_grant_granted_by_fkey";
            columns: ["granted_by"];
            isOneToOne: false;
            referencedRelation: "app_user";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "admin_acadjuris_grant_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: true;
            referencedRelation: "app_user";
            referencedColumns: ["id"];
          },
        ];
      };
      app_user: {
        Row: {
          created_at: string;
          full_name: string;
          id: string;
        };
        Insert: {
          created_at?: string;
          full_name: string;
          id: string;
        };
        Update: {
          created_at?: string;
          full_name?: string;
          id?: string;
        };
        Relationships: [];
      };
      audit_event: {
        Row: {
          action: string;
          actor_user_id: string | null;
          created_at: string;
          entity_id: string | null;
          entity_table: string;
          id: string;
          justification: string | null;
          new_value: Json | null;
          previous_value: Json | null;
        };
        Insert: {
          action: string;
          actor_user_id?: string | null;
          created_at?: string;
          entity_id?: string | null;
          entity_table: string;
          id?: string;
          justification?: string | null;
          new_value?: Json | null;
          previous_value?: Json | null;
        };
        Update: {
          action?: string;
          actor_user_id?: string | null;
          created_at?: string;
          entity_id?: string | null;
          entity_table?: string;
          id?: string;
          justification?: string | null;
          new_value?: Json | null;
          previous_value?: Json | null;
        };
        Relationships: [
          {
            foreignKeyName: "audit_event_actor_user_id_fkey";
            columns: ["actor_user_id"];
            isOneToOne: false;
            referencedRelation: "app_user";
            referencedColumns: ["id"];
          },
        ];
      };
      client_access: {
        Row: {
          company_id: string | null;
          granted_at: string;
          granted_by: string | null;
          id: string;
          organization_id: string;
          project_id: string | null;
          revoked_at: string | null;
          unit_id: string | null;
          user_id: string;
        };
        Insert: {
          company_id?: string | null;
          granted_at?: string;
          granted_by?: string | null;
          id?: string;
          organization_id: string;
          project_id?: string | null;
          revoked_at?: string | null;
          unit_id?: string | null;
          user_id: string;
        };
        Update: {
          company_id?: string | null;
          granted_at?: string;
          granted_by?: string | null;
          id?: string;
          organization_id?: string;
          project_id?: string | null;
          revoked_at?: string | null;
          unit_id?: string | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "client_access_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "company";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "client_access_granted_by_fkey";
            columns: ["granted_by"];
            isOneToOne: false;
            referencedRelation: "app_user";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "client_access_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organization";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "client_access_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "project";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "client_access_unit_id_fkey";
            columns: ["unit_id"];
            isOneToOne: false;
            referencedRelation: "unit";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "client_access_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "app_user";
            referencedColumns: ["id"];
          },
        ];
      };
      company: {
        Row: {
          created_at: string;
          id: string;
          name: string;
          organization_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          name: string;
          organization_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          name?: string;
          organization_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "company_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organization";
            referencedColumns: ["id"];
          },
        ];
      };
      legal_content_approval_grant: {
        Row: {
          granted_at: string;
          granted_by: string | null;
          revoked_at: string | null;
          user_id: string;
        };
        Insert: {
          granted_at?: string;
          granted_by?: string | null;
          revoked_at?: string | null;
          user_id: string;
        };
        Update: {
          granted_at?: string;
          granted_by?: string | null;
          revoked_at?: string | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "legal_content_approval_grant_granted_by_fkey";
            columns: ["granted_by"];
            isOneToOne: false;
            referencedRelation: "app_user";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "legal_content_approval_grant_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: true;
            referencedRelation: "app_user";
            referencedColumns: ["id"];
          },
        ];
      };
      organization: {
        Row: {
          created_at: string;
          id: string;
          name: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          name: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          name?: string;
        };
        Relationships: [];
      };
      project: {
        Row: {
          created_at: string;
          id: string;
          name: string;
          unit_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          name: string;
          unit_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          name?: string;
          unit_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "project_unit_id_fkey";
            columns: ["unit_id"];
            isOneToOne: false;
            referencedRelation: "unit";
            referencedColumns: ["id"];
          },
        ];
      };
      staff_project_access: {
        Row: {
          granted_at: string;
          granted_by: string | null;
          id: string;
          perfil: Database["public"]["Enums"]["perfil_interno"];
          project_id: string;
          revoked_at: string | null;
          user_id: string;
        };
        Insert: {
          granted_at?: string;
          granted_by?: string | null;
          id?: string;
          perfil: Database["public"]["Enums"]["perfil_interno"];
          project_id: string;
          revoked_at?: string | null;
          user_id: string;
        };
        Update: {
          granted_at?: string;
          granted_by?: string | null;
          id?: string;
          perfil?: Database["public"]["Enums"]["perfil_interno"];
          project_id?: string;
          revoked_at?: string | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "staff_project_access_granted_by_fkey";
            columns: ["granted_by"];
            isOneToOne: false;
            referencedRelation: "app_user";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "staff_project_access_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "project";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "staff_project_access_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "app_user";
            referencedColumns: ["id"];
          },
        ];
      };
      super_admin_grant: {
        Row: {
          granted_at: string;
          granted_by: string | null;
          revoked_at: string | null;
          user_id: string;
        };
        Insert: {
          granted_at?: string;
          granted_by?: string | null;
          revoked_at?: string | null;
          user_id: string;
        };
        Update: {
          granted_at?: string;
          granted_by?: string | null;
          revoked_at?: string | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "super_admin_grant_granted_by_fkey";
            columns: ["granted_by"];
            isOneToOne: false;
            referencedRelation: "app_user";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "super_admin_grant_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: true;
            referencedRelation: "app_user";
            referencedColumns: ["id"];
          },
        ];
      };
      unit: {
        Row: {
          company_id: string;
          created_at: string;
          id: string;
          name: string;
        };
        Insert: {
          company_id: string;
          created_at?: string;
          id?: string;
          name: string;
        };
        Update: {
          company_id?: string;
          created_at?: string;
          id?: string;
          name?: string;
        };
        Relationships: [
          {
            foreignKeyName: "unit_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "company";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      perfil_interno:
        | "admin_acadjuris"
        | "consultor_responsavel"
        | "analista_auditor";
    };
    CompositeTypes: Record<string, never>;
  };
};

export type PerfilInterno = Database["public"]["Enums"]["perfil_interno"];
