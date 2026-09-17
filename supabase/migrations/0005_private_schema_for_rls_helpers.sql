-- 0005_private_schema_for_rls_helpers.sql
-- Corrige achado do advisor de seguranca do Supabase (WARN
-- anon_security_definer_function_executable /
-- authenticated_security_definer_function_executable, 13 ocorrencias):
-- todas as funcoes auxiliares SECURITY DEFINER usadas dentro das policies
-- de RLS (0002/0004) estavam no schema `public`, o unico exposto pela API
-- REST -- ficavam acessiveis diretamente via /rest/v1/rpc/<funcao> por
-- qualquer usuario anonimo ou autenticado.
--
-- Nao e uma falha de RLS em si (as funcoes so retornam booleano
-- referente ao proprio auth.uid() do chamador, nunca expoem dado de
-- outra organizacao), mas nao deveriam ser endpoints publicos -- foram
-- desenhadas para uso interno das policies, nao para chamada direta.
--
-- Correcao: mover as funcoes para o schema `internal` (nao exposto pela
-- API REST). `ALTER FUNCTION ... SET SCHEMA` preserva o OID da funcao,
-- entao as policies existentes (que referenciam a funcao pelo OID
-- compilado, nao pelo nome textual) continuam funcionando sem qualquer
-- alteracao em CREATE POLICY. Nenhuma migration anterior e reescrita.

create schema if not exists internal;

alter function public.is_super_admin() set schema internal;
alter function public.is_admin_acadjuris() set schema internal;
alter function public.is_privileged_staff() set schema internal;
alter function public.has_staff_access_to_project(uuid) set schema internal;
alter function public.has_staff_access_to_unit(uuid) set schema internal;
alter function public.has_staff_access_to_company(uuid) set schema internal;
alter function public.has_staff_access_to_organization(uuid) set schema internal;
alter function public.has_client_access_to_organization(uuid) set schema internal;
alter function public.has_client_access_to_company(uuid, uuid) set schema internal;
alter function public.has_client_access_to_unit(uuid, uuid, uuid) set schema internal;
alter function public.has_client_access_to_project(uuid, uuid, uuid, uuid) set schema internal;
alter function public.has_legal_content_approval() set schema internal;

-- Funcoes que chamam outras funcoes auxiliares por nome nao qualificado
-- (ex.: is_privileged_staff() chama is_super_admin()) precisam do schema
-- `internal` no proprio search_path apos a mudanca -- do contrario, a
-- chamada interna nao encontraria mais a funcao movida.
alter function internal.is_privileged_staff() set search_path = internal, public;
alter function internal.has_staff_access_to_project(uuid) set search_path = internal, public;
alter function internal.has_staff_access_to_unit(uuid) set search_path = internal, public;
alter function internal.has_staff_access_to_company(uuid) set search_path = internal, public;
alter function internal.has_staff_access_to_organization(uuid) set search_path = internal, public;

-- handle_new_auth_user() permanece em public (e referenciada por nome em
-- `create trigger ... execute function handle_new_auth_user()`, e o
-- proprio gatilho continua funcionando apos ALTER FUNCTION SET SCHEMA
-- pelo mesmo motivo de OID estavel) -- movida tambem, por ser igualmente
-- desnecessaria como endpoint publico e por ja nao aceitar chamada direta
-- fora do contexto de gatilho (retorna `trigger`, tipo nao invocavel via
-- RPC comum).
alter function public.handle_new_auth_user() set schema internal;

comment on schema internal is
  'Funcoes auxiliares de RLS (SECURITY DEFINER) e gatilhos internos -- nunca exposto pela API REST (apenas o schema public e exposto). Policies continuam funcionando: ALTER FUNCTION SET SCHEMA preserva o OID referenciado pelas policies compiladas.';
