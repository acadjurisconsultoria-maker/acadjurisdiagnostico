/**
 * Tipos do schema Supabase (Ciclo 0).
 *
 * Gerados manualmente a partir de supabase/migrations/*.sql, pois este
 * ambiente nao tem acesso a uma instancia Supabase em execucao para rodar
 * `supabase gen types typescript`. Quando um projeto Supabase real (local
 * ou remoto) estiver disponivel, regenerar com:
 *
 *   npx supabase gen types typescript --local > src/lib/supabase/database.types.ts
 *
 * e revisar o diff manualmente antes de commitar.
 *
 * Formato: cada tabela precisa de Row/Insert/Update/Relationships (mesmo
 * que Relationships seja um array vazio) para casar com o tipo genérico
 * `GenericTable` esperado por @supabase/postgrest-js — sem isso, o
 * TypeScript infere `never` silenciosamente em vez de dar erro claro.
 */

export type PerfilInterno =
  | "admin_acadjuris"
  | "consultor_responsavel"
  | "analista_auditor";

export interface Database {
  public: {
    Tables: {
      app_user: {
        Row: {
          id: string;
          full_name: string;
          created_at: string;
        };
        Insert: {
          id: string;
          full_name: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          full_name?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      organization: {
        Row: {
          id: string;
          name: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      company: {
        Row: {
          id: string;
          organization_id: string;
          name: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          name: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          name?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "company_organization_id_fkey";
            columns: ["organization_id"];
            referencedRelation: "organization";
            referencedColumns: ["id"];
          },
        ];
      };
      unit: {
        Row: {
          id: string;
          company_id: string;
          name: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          company_id: string;
          name: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          company_id?: string;
          name?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "unit_company_id_fkey";
            columns: ["company_id"];
            referencedRelation: "company";
            referencedColumns: ["id"];
          },
        ];
      };
      project: {
        Row: {
          id: string;
          unit_id: string;
          name: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          unit_id: string;
          name: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          unit_id?: string;
          name?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "project_unit_id_fkey";
            columns: ["unit_id"];
            referencedRelation: "unit";
            referencedColumns: ["id"];
          },
        ];
      };
      super_admin_grant: {
        Row: {
          user_id: string;
          granted_by: string | null;
          granted_at: string;
          revoked_at: string | null;
        };
        Insert: {
          user_id: string;
          granted_by?: string | null;
          granted_at?: string;
          revoked_at?: string | null;
        };
        Update: {
          user_id?: string;
          granted_by?: string | null;
          granted_at?: string;
          revoked_at?: string | null;
        };
        Relationships: [];
      };
      admin_acadjuris_grant: {
        Row: {
          user_id: string;
          granted_by: string | null;
          granted_at: string;
          revoked_at: string | null;
        };
        Insert: {
          user_id: string;
          granted_by?: string | null;
          granted_at?: string;
          revoked_at?: string | null;
        };
        Update: {
          user_id?: string;
          granted_by?: string | null;
          granted_at?: string;
          revoked_at?: string | null;
        };
        Relationships: [];
      };
      staff_project_access: {
        Row: {
          id: string;
          user_id: string;
          project_id: string;
          perfil: PerfilInterno;
          granted_by: string | null;
          granted_at: string;
          revoked_at: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          project_id: string;
          perfil: PerfilInterno;
          granted_by?: string | null;
          granted_at?: string;
          revoked_at?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          project_id?: string;
          perfil?: PerfilInterno;
          granted_by?: string | null;
          granted_at?: string;
          revoked_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "staff_project_access_project_id_fkey";
            columns: ["project_id"];
            referencedRelation: "project";
            referencedColumns: ["id"];
          },
        ];
      };
      client_access: {
        Row: {
          id: string;
          user_id: string;
          organization_id: string;
          company_id: string | null;
          unit_id: string | null;
          project_id: string | null;
          granted_by: string | null;
          granted_at: string;
          revoked_at: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          organization_id: string;
          company_id?: string | null;
          unit_id?: string | null;
          project_id?: string | null;
          granted_by?: string | null;
          granted_at?: string;
          revoked_at?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          organization_id?: string;
          company_id?: string | null;
          unit_id?: string | null;
          project_id?: string | null;
          granted_by?: string | null;
          granted_at?: string;
          revoked_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "client_access_organization_id_fkey";
            columns: ["organization_id"];
            referencedRelation: "organization";
            referencedColumns: ["id"];
          },
        ];
      };
      audit_event: {
        Row: {
          id: string;
          actor_user_id: string | null;
          action: string;
          entity_table: string;
          entity_id: string | null;
          previous_value: Record<string, unknown> | null;
          new_value: Record<string, unknown> | null;
          justification: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          actor_user_id?: string | null;
          action: string;
          entity_table: string;
          entity_id?: string | null;
          previous_value?: Record<string, unknown> | null;
          new_value?: Record<string, unknown> | null;
          justification?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          actor_user_id?: string | null;
          action?: string;
          entity_table?: string;
          entity_id?: string | null;
          previous_value?: Record<string, unknown> | null;
          new_value?: Record<string, unknown> | null;
          justification?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
  };
}
