-- 0002_rls_policies.sql
-- Funcoes auxiliares (security definer) e policies de RLS para as tabelas
-- criadas em 0001_init_schema.sql.
--
-- Padrao (Politicas-RLS-e-Storage-Especificacao-v1.md, secao 2): cada tabela
-- recebe policies distintas para SELECT/INSERT/UPDATE/DELETE -- nunca uma
-- policy generica cobrindo as quatro operacoes. As policies autorizam
-- positivamente os perfis esperados; nunca dependem de excluir apenas o
-- perfil de cliente como condicao negativa.

-- ---------------------------------------------------------------------------
-- Funcoes auxiliares
-- ---------------------------------------------------------------------------

create or replace function is_super_admin()
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from super_admin_grant
    where user_id = auth.uid() and revoked_at is null
  );
$$;

create or replace function is_admin_acadjuris()
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from admin_acadjuris_grant
    where user_id = auth.uid() and revoked_at is null
  );
$$;

-- Super Admin e Admin AcadJuris tem acesso amplo por definicao de perfil
-- (Matriz-de-Perfis-e-Permissoes-v1.md) -- usado como atalho nas demais
-- funcoes abaixo.
create or replace function is_privileged_staff()
returns boolean
language sql stable security definer set search_path = public
as $$
  select is_super_admin() or is_admin_acadjuris();
$$;

create or replace function has_staff_access_to_project(p_project_id uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select is_privileged_staff() or exists (
    select 1 from staff_project_access
    where user_id = auth.uid()
      and project_id = p_project_id
      and revoked_at is null
  );
$$;

create or replace function has_staff_access_to_unit(p_unit_id uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select is_privileged_staff() or exists (
    select 1
    from staff_project_access spa
    join project pr on pr.id = spa.project_id
    where pr.unit_id = p_unit_id
      and spa.user_id = auth.uid()
      and spa.revoked_at is null
  );
$$;

create or replace function has_staff_access_to_company(p_company_id uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select is_privileged_staff() or exists (
    select 1
    from staff_project_access spa
    join project pr on pr.id = spa.project_id
    join unit u on u.id = pr.unit_id
    where u.company_id = p_company_id
      and spa.user_id = auth.uid()
      and spa.revoked_at is null
  );
$$;

create or replace function has_staff_access_to_organization(p_organization_id uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select is_privileged_staff() or exists (
    select 1
    from staff_project_access spa
    join project pr on pr.id = spa.project_id
    join unit u on u.id = pr.unit_id
    join company c on c.id = u.company_id
    where c.organization_id = p_organization_id
      and spa.user_id = auth.uid()
      and spa.revoked_at is null
  );
$$;

create or replace function has_client_access_to_organization(p_organization_id uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from client_access
    where user_id = auth.uid()
      and organization_id = p_organization_id
      and revoked_at is null
  );
$$;

create or replace function has_client_access_to_company(p_company_id uuid, p_organization_id uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from client_access
    where user_id = auth.uid()
      and organization_id = p_organization_id
      and (company_id is null or company_id = p_company_id)
      and revoked_at is null
  );
$$;

create or replace function has_client_access_to_unit(p_unit_id uuid, p_company_id uuid, p_organization_id uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from client_access
    where user_id = auth.uid()
      and organization_id = p_organization_id
      and (company_id is null or company_id = p_company_id)
      and (unit_id is null or unit_id = p_unit_id)
      and revoked_at is null
  );
$$;

create or replace function has_client_access_to_project(
  p_project_id uuid, p_unit_id uuid, p_company_id uuid, p_organization_id uuid
)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from client_access
    where user_id = auth.uid()
      and organization_id = p_organization_id
      and (company_id is null or company_id = p_company_id)
      and (unit_id is null or unit_id = p_unit_id)
      and (project_id is null or project_id = p_project_id)
      and revoked_at is null
  );
$$;

-- ---------------------------------------------------------------------------
-- app_user
-- ---------------------------------------------------------------------------
create policy app_user_select on app_user for select
  using (id = auth.uid() or is_privileged_staff());

create policy app_user_insert on app_user for insert
  with check (id = auth.uid());
  -- a propria linha e criada pelo trigger handle_new_user (0003), que roda
  -- com privilegio de definer -- esta policy cobre o caso de insercao
  -- direta pelo proprio usuario autenticado, se necessario.

create policy app_user_update on app_user for update
  using (id = auth.uid() or is_privileged_staff())
  with check (id = auth.uid() or is_privileged_staff());

-- Nenhuma policy de DELETE: exclusao de usuario e sempre logica (revogar
-- grants), nunca fisica, nesta fase.

-- ---------------------------------------------------------------------------
-- organization
-- ---------------------------------------------------------------------------
create policy organization_select on organization for select
  using (
    is_privileged_staff()
    or has_staff_access_to_organization(id)
    or has_client_access_to_organization(id)
  );

create policy organization_insert on organization for insert
  with check (is_privileged_staff());

create policy organization_update on organization for update
  using (is_privileged_staff())
  with check (is_privileged_staff());

create policy organization_delete on organization for delete
  using (is_super_admin());

-- ---------------------------------------------------------------------------
-- company
-- ---------------------------------------------------------------------------
create policy company_select on company for select
  using (
    is_privileged_staff()
    or has_staff_access_to_company(id)
    or has_client_access_to_company(id, organization_id)
  );

create policy company_insert on company for insert
  with check (is_privileged_staff());

create policy company_update on company for update
  using (is_privileged_staff())
  with check (is_privileged_staff());

create policy company_delete on company for delete
  using (is_super_admin());

-- ---------------------------------------------------------------------------
-- unit
-- ---------------------------------------------------------------------------
create policy unit_select on unit for select
  using (
    is_privileged_staff()
    or has_staff_access_to_unit(id)
    or exists (
      select 1 from company c
      where c.id = unit.company_id
        and has_client_access_to_unit(unit.id, c.id, c.organization_id)
    )
  );

create policy unit_insert on unit for insert
  with check (is_privileged_staff());

create policy unit_update on unit for update
  using (is_privileged_staff())
  with check (is_privileged_staff());

create policy unit_delete on unit for delete
  using (is_super_admin());

-- ---------------------------------------------------------------------------
-- project
-- ---------------------------------------------------------------------------
create policy project_select on project for select
  using (
    is_privileged_staff()
    or has_staff_access_to_project(id)
    or exists (
      select 1 from unit u
      join company c on c.id = u.company_id
      where u.id = project.unit_id
        and has_client_access_to_project(project.id, u.id, c.id, c.organization_id)
    )
  );

create policy project_insert on project for insert
  with check (is_privileged_staff());

create policy project_update on project for update
  using (is_privileged_staff() or has_staff_access_to_project(id))
  with check (is_privileged_staff() or has_staff_access_to_project(id));

create policy project_delete on project for delete
  using (is_super_admin());

-- ---------------------------------------------------------------------------
-- super_admin_grant / admin_acadjuris_grant
-- ---------------------------------------------------------------------------
create policy super_admin_grant_select on super_admin_grant for select
  using (user_id = auth.uid() or is_super_admin());

create policy super_admin_grant_write on super_admin_grant for insert
  with check (is_super_admin());

create policy super_admin_grant_update on super_admin_grant for update
  using (is_super_admin())
  with check (is_super_admin());

create policy admin_acadjuris_grant_select on admin_acadjuris_grant for select
  using (user_id = auth.uid() or is_privileged_staff());

create policy admin_acadjuris_grant_write on admin_acadjuris_grant for insert
  with check (is_super_admin());

create policy admin_acadjuris_grant_update on admin_acadjuris_grant for update
  using (is_super_admin())
  with check (is_super_admin());

-- ---------------------------------------------------------------------------
-- staff_project_access
-- ---------------------------------------------------------------------------
create policy staff_project_access_select on staff_project_access for select
  using (
    user_id = auth.uid()
    or is_privileged_staff()
    or has_staff_access_to_project(project_id)
  );

create policy staff_project_access_insert on staff_project_access for insert
  with check (is_privileged_staff());

create policy staff_project_access_update on staff_project_access for update
  using (is_privileged_staff())
  with check (is_privileged_staff());

create policy staff_project_access_delete on staff_project_access for delete
  using (is_privileged_staff());

-- ---------------------------------------------------------------------------
-- client_access
-- ---------------------------------------------------------------------------
create policy client_access_select on client_access for select
  using (
    user_id = auth.uid()
    or is_privileged_staff()
    or has_staff_access_to_organization(organization_id)
  );

create policy client_access_insert on client_access for insert
  with check (is_privileged_staff());

create policy client_access_update on client_access for update
  using (is_privileged_staff())
  with check (is_privileged_staff());

create policy client_access_delete on client_access for delete
  using (is_privileged_staff());

-- ---------------------------------------------------------------------------
-- audit_event
-- ---------------------------------------------------------------------------
-- Leitura: o proprio ator, ou staff com acesso ao projeto quando a entidade
-- auditada pertencer a um projeto (checagem fina fica para quando as
-- tabelas de projeto existirem, Ciclo 1+); por ora, leitura restrita a
-- privilegiados + o proprio ator, para nao expor trilha de auditoria de
-- outros usuarios a perfis sem permissao.
create policy audit_event_select on audit_event for select
  using (actor_user_id = auth.uid() or is_privileged_staff());

-- Insercao: qualquer usuario autenticado pode gerar um evento referente a
-- sua propria acao (actor_user_id deve ser o proprio usuario) -- nunca em
-- nome de outro usuario.
create policy audit_event_insert on audit_event for insert
  with check (actor_user_id = auth.uid());

-- Nenhuma policy de UPDATE/DELETE: trilha de auditoria e imutavel por
-- definicao (Plano-de-Seguranca-e-LGPD-v1.md, secao 4).
