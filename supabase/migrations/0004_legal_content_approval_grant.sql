-- 0004_legal_content_approval_grant.sql
-- Mecanismo de permissao PROPRIO para aprovacao de conteudo juridico da
-- metodologia -- nunca decorrente de admin_acadjuris ou super_admin
-- (Gestao-da-Metodologia-e-Versionamento-v2.md, secao 5.2: Consultor
-- Responsavel designado / Head da Consultoria / advogado habilitado).
--
-- Corrige uma limitacao da rodada anterior: a unica salvaguarda contra
-- "administrador adquire competencia de aprovacao juridica" era uma
-- checagem de palavras-chave no NOME da operacao dentro de admin.ts --
-- isso e apenas uma segunda camada de defesa, nunca deveria ser a unica.
-- Esta migration cria a PRIMEIRA camada: um grant dedicado, independente
-- de qualquer perfil administrativo, verificavel no banco.
--
-- Nao reescreve nenhuma migration anterior -- apenas adiciona.

create table legal_content_approval_grant (
  user_id uuid primary key references app_user (id) on delete cascade,
  granted_by uuid references app_user (id),
  granted_at timestamptz not null default now(),
  revoked_at timestamptz
);
alter table legal_content_approval_grant enable row level security;

create or replace function has_legal_content_approval()
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from legal_content_approval_grant
    where user_id = auth.uid() and revoked_at is null
  );
$$;

-- Leitura: o proprio usuario (para saber se tem a habilitacao) ou staff
-- privilegiado (para administrar a lista).
create policy legal_content_approval_grant_select on legal_content_approval_grant for select
  using (user_id = auth.uid() or is_privileged_staff());

-- Quem CADASTRA a habilitacao (ato de gestao/designacao) e staff
-- privilegiado -- isso NAO concede a esse staff a propria habilitacao;
-- designar quem pode aprovar conteudo juridico e diferente de poder
-- aprovar conteudo juridico. Um admin_acadjuris so aprova conteudo
-- juridico se ELE MESMO tambem tiver uma linha nesta tabela.
create policy legal_content_approval_grant_insert on legal_content_approval_grant for insert
  with check (is_privileged_staff());

create policy legal_content_approval_grant_update on legal_content_approval_grant for update
  using (is_privileged_staff())
  with check (is_privileged_staff());

-- Nenhuma policy de DELETE: revogacao e sempre logica (revoked_at),
-- mesmo padrao das demais tabelas de vinculo -- preserva o historico de
-- quem teve a habilitacao e quando.

comment on table legal_content_approval_grant is
  'Habilitacao individual para aprovar conteudo juridico da metodologia. Nunca decorre de perfil administrativo (admin_acadjuris/super_admin) -- e um grant proprio, independente, per Gestao-da-Metodologia-e-Versionamento-v2.md secao 5.2.';
