-- 0003_auth_trigger.sql
-- Cria automaticamente a linha correspondente em app_user quando um novo
-- usuario e criado em auth.users (padrao usual do Supabase Auth).
--
-- Roda com privilegio de definer porque auth.users nao e acessivel por RLS
-- de aplicacao -- e o unico ponto do schema com esse privilegio elevado
-- implicito, e seu escopo e minimo (inserir 1 linha em app_user).

create or replace function handle_new_auth_user()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  insert into public.app_user (id, full_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.email, 'Usuario sem nome')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_auth_user();
