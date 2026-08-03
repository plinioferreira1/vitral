-- =========================================================
-- Corrige o gatilho que cria a linha em usuarios quando
-- alguém cria conta (signup). Estava falhando com
-- "relation usuarios does not exist" — sinal de que, na hora
-- que o gatilho roda (disparado pelo serviço de autenticação,
-- não por uma migration), o search_path não estava incluindo
-- o schema "public" como esperado.
--
-- Recria a função com o nome e a chamada totalmente
-- qualificados (public.handle_new_auth_user, public.usuarios)
-- e o search_path reforçado, e reanexa o gatilho.
-- =========================================================

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  insert into public.usuarios (id, tenant_id, nome, email, perfil, ativo)
  values (
    new.id,
    null,
    coalesce(new.raw_user_meta_data ->> 'nome', split_part(new.email, '@', 1)),
    new.email,
    'corretor',
    true
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_auth_user();
