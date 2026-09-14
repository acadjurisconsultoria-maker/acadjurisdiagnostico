-- 0001_init_schema.sql
-- Ciclo 0 -- Fundacao tecnica: modelo de dados inicial.
-- organization / company / unit / project / app_user / tabelas de perfil.
--
-- Regra de seguranca (Modelo-de-Seguranca-Multitenant-e-Segregacao-de-Dados-v1.md):
-- toda tabela com dado de cliente tem RLS habilitado desde a criacao -- nunca
-- "adicionar depois". As policies em si (o que cada perfil pode fazer) ficam
-- em 0002_rls_policies.sql, mas RLS ja e habilitado aqui, logo apos cada
-- CREATE TABLE: entre as duas migrations, o estado e "nega tudo por padrao",
-- nunca "aberto".

create extension if not exists "pgcrypto";

create type perfil_interno as enum (
  'admin_acadjuris',
  'consultor_responsavel',
  'analista_auditor'
);
-- super_admin nao entra neste enum -- e um grant proprio (super_admin_grant),
-- conforme Registro-de-Decisoes-do-Produto-v1.md, decisao 10 (designacao
-- individual, nunca fixada em codigo/enum).

-- ---------------------------------------------------------------------------
-- Perfil base do usuario autenticado (1:1 com auth.users)
-- ---------------------------------------------------------------------------
create table app_user (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null,
  created_at timestamptz not null default now()
);
alter table app_user enable row level security;

-- ---------------------------------------------------------------------------
-- Hierarquia do cliente: organization -> company -> unit -> project
-- ---------------------------------------------------------------------------
create table organization (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now()
);
alter table organization enable row level security;

create table company (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organization (id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now()
);
alter table company enable row level security;
create index company_organization_id_idx on company (organization_id);

create table unit (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references company (id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now()
);
alter table unit enable row level security;
create index unit_company_id_idx on unit (company_id);

create table project (
  id uuid primary key default gen_random_uuid(),
  unit_id uuid not null references unit (id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now()
);
alter table project enable row level security;
create index project_unit_id_idx on project (unit_id);

-- ---------------------------------------------------------------------------
-- Concessoes de perfil (tabelas de vinculo -- nunca perfil fixo em claim de
-- JWT; revogar acesso e sempre um UPDATE/DELETE aqui, com efeito imediato
-- em todas as policies). Padrao herdado de Plano-de-Arquitetura-Tecnica-v1,
-- secao 3.1.
-- ---------------------------------------------------------------------------

-- Super Administrador: papel global, designacao individual e auditada
-- (Registro-de-Decisoes-do-Produto-v1.md, decisao 10).
create table super_admin_grant (
  user_id uuid primary key references app_user (id) on delete cascade,
  granted_by uuid references app_user (id),
  granted_at timestamptz not null default now(),
  revoked_at timestamptz
);
alter table super_admin_grant enable row level security;

-- Administrador AcadJuris: papel global (metodologia, usuarios, clientes),
-- distinto de Super Administrador.
create table admin_acadjuris_grant (
  user_id uuid primary key references app_user (id) on delete cascade,
  granted_by uuid references app_user (id),
  granted_at timestamptz not null default now(),
  revoked_at timestamptz
);
alter table admin_acadjuris_grant enable row level security;

-- Equipe interna (Consultor Responsavel / Analista-Auditor) associada a um
-- projeto especifico, com perfil. Um usuario pode ter mais de um vinculo
-- (projetos diferentes, ou perfis diferentes em projetos diferentes).
create table staff_project_access (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references app_user (id) on delete cascade,
  project_id uuid not null references project (id) on delete cascade,
  perfil perfil_interno not null,
  granted_by uuid references app_user (id),
  granted_at timestamptz not null default now(),
  revoked_at timestamptz,
  unique (user_id, project_id, perfil)
);
alter table staff_project_access enable row level security;
create index staff_project_access_project_id_idx on staff_project_access (project_id);
create index staff_project_access_user_id_idx on staff_project_access (user_id);

-- Usuario da Cliente: acesso escopado a organizacao (sempre) e,
-- opcionalmente, restrito a empresa/unidade/projeto especificos.
-- organization_id e sempre exigido; os demais narrowing fields sao
-- opcionais (null = acesso a todos os projetos daquele nivel para baixo,
-- dentro da mesma organizacao -- nunca atravessando organizacao).
create table client_access (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references app_user (id) on delete cascade,
  organization_id uuid not null references organization (id) on delete cascade,
  company_id uuid references company (id) on delete cascade,
  unit_id uuid references unit (id) on delete cascade,
  project_id uuid references project (id) on delete cascade,
  granted_by uuid references app_user (id),
  granted_at timestamptz not null default now(),
  revoked_at timestamptz
);
alter table client_access enable row level security;
create index client_access_user_id_idx on client_access (user_id);
create index client_access_organization_id_idx on client_access (organization_id);

-- ---------------------------------------------------------------------------
-- Trilha de auditoria minima (Ciclo 0: estrutura da tabela; instrumentacao
-- completa dos 10 tipos de acao e trabalho do Ciclo 5-8, ver
-- Plano-de-Seguranca-e-LGPD-v4.md, secao 14).
-- ---------------------------------------------------------------------------
create table audit_event (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid references app_user (id),
  action text not null,
  entity_table text not null,
  entity_id uuid,
  previous_value jsonb,
  new_value jsonb,
  justification text,
  created_at timestamptz not null default now()
);
alter table audit_event enable row level security;
create index audit_event_actor_user_id_idx on audit_event (actor_user_id);
create index audit_event_entity_idx on audit_event (entity_table, entity_id);

-- Nunca registrar dado pessoal/documento/resposta no corpo do evento --
-- apenas referencias (entity_id) e metadados de acao. Reforcado em codigo
-- (src/lib/audit), nao apenas por convencao aqui.
comment on column audit_event.previous_value is
  'Metadados da alteracao (ex.: campo alterado), nunca conteudo de documento/resposta/dado pessoal.';
comment on column audit_event.new_value is
  'Metadados da alteracao (ex.: campo alterado), nunca conteudo de documento/resposta/dado pessoal.';
