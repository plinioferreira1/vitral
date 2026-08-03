-- =========================================================
-- Como a Sacra já é a única organização cadastrada, não faz
-- sentido pedir pra criar uma nova toda vez que alguém cria
-- conta. Se existir exatamente um tenant no sistema, todo
-- cadastro novo já entra automaticamente nele, como "corretor"
-- (o nível de acesso mais restrito — só as duas calculadoras,
-- sem ver processos/locação). Quem cria a conta pode ser
-- promovido depois em Configurações → Membros/Permissões.
--
-- Se não houver tenant algum, ou houver mais de um (não é o
-- caso hoje, mas fica preparado), o comportamento antigo
-- continua: a pessoa cai na tela de "criar organização".
-- =========================================================

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_tenant_unico uuid;
begin
  if (select count(*) from public.tenants) = 1 then
    select id into v_tenant_unico from public.tenants limit 1;
  end if;

  insert into public.usuarios (id, tenant_id, nome, email, perfil, nivel_acesso, ativo)
  values (
    new.id,
    v_tenant_unico,
    coalesce(new.raw_user_meta_data ->> 'nome', split_part(new.email, '@', 1)),
    new.email,
    'corretor',
    'corretor',
    true
  )
  on conflict (id) do nothing;
  return new;
end;
$$;
