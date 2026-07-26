-- =========================================================
-- Onboarding: quando alguém se cadastra (auth.users), cria
-- uma linha em `usuarios` sem tenant_id ainda. A primeira
-- pessoa "funda" a organização (bootstrap_tenant). Ela então
-- adiciona as demais pessoas ao mesmo tenant (add_member).
-- =========================================================

create or replace function handle_new_auth_user()
returns trigger
language plpgsql
security definer
as $$
begin
  insert into usuarios (id, tenant_id, nome, email, perfil, ativo)
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

-- usuarios.tenant_id precisa aceitar null temporariamente até o bootstrap
alter table usuarios alter column tenant_id drop not null;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_auth_user();

-- ---------------------------------------------------------
-- Primeira pessoa cria a organização (tenant) e vira admin
-- ---------------------------------------------------------
create or replace function bootstrap_tenant(p_nome_empresa text)
returns uuid
language plpgsql
security definer
as $$
declare
  v_tenant_id uuid;
  v_ja_tem_tenant uuid;
begin
  select tenant_id into v_ja_tem_tenant from usuarios where id = auth.uid();
  if v_ja_tem_tenant is not null then
    raise exception 'Este usuário já pertence a uma organização.';
  end if;

  insert into tenants (nome) values (p_nome_empresa) returning id into v_tenant_id;

  update usuarios
     set tenant_id = v_tenant_id,
         perfil = 'admin'
   where id = auth.uid();

  perform seed_modelos_padrao(v_tenant_id);

  return v_tenant_id;
end;
$$;

-- ---------------------------------------------------------
-- Admin/gerente adiciona um colega (que já criou login) ao
-- mesmo tenant, definindo o perfil dela.
-- ---------------------------------------------------------
create or replace function add_member(p_email text, p_perfil perfil_usuario)
returns void
language plpgsql
security definer
as $$
declare
  v_meu_tenant uuid;
  v_meu_perfil perfil_usuario;
  v_alvo_id uuid;
begin
  select tenant_id, perfil into v_meu_tenant, v_meu_perfil from usuarios where id = auth.uid();

  if v_meu_tenant is null then
    raise exception 'Você ainda não pertence a uma organização.';
  end if;

  if v_meu_perfil not in ('admin','diretora','gerente') then
    raise exception 'Apenas admin, diretora ou gerente podem adicionar membros.';
  end if;

  select id into v_alvo_id from usuarios where email = p_email;

  if v_alvo_id is null then
    raise exception 'Essa pessoa ainda não criou uma conta. Peça para ela se cadastrar primeiro em /login.';
  end if;

  update usuarios
     set tenant_id = v_meu_tenant,
         perfil = p_perfil
   where id = v_alvo_id;
end;
$$;
