-- =========================================================
-- Sistema de convites — fecha o cadastro aberto.
--
-- Antes: qualquer pessoa podia ir em /login?modo=cadastro e
-- criar conta livremente. Agora: só é possível criar conta com
-- um link de convite válido (gerado por um diretor/gerente em
-- Membros), pro e-mail exato que foi convidado. O convite já
-- carrega perfil/nível de acesso/categorias, então a conta
-- nasce pronta, sem precisar do passo extra de "adicionar
-- membro depois que a pessoa já criou conta sozinha".
-- =========================================================

create table convites (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  email text not null,
  token uuid not null default gen_random_uuid() unique,
  perfil perfil_usuario not null default 'corretor',
  nivel_acesso nivel_acesso_usuario not null default 'corretor',
  categorias categoria_processo[] not null default '{}',
  criado_por uuid references usuarios(id),
  criado_em timestamptz not null default now(),
  expira_em timestamptz not null default (now() + interval '7 days'),
  usado_em timestamptz
);

create index idx_convites_email on convites(lower(email));

alter table convites enable row level security;

-- Só diretor/gerente do tenant vê/gerencia os convites do
-- próprio tenant. Nenhuma policy de leitura pública aqui — a
-- validação por token (usada na tela de cadastro, sem login)
-- passa pela função abaixo, que só devolve o e-mail, não a
-- linha inteira.
create policy "convites - leitura" on convites
  for select using (
    tenant_id = auth_tenant_id() and
    exists (select 1 from usuarios where id = auth.uid() and nivel_acesso in ('diretor', 'gerente'))
  );
create policy "convites - insercao" on convites
  for insert with check (
    tenant_id = auth_tenant_id() and
    exists (select 1 from usuarios where id = auth.uid() and nivel_acesso in ('diretor', 'gerente'))
  );
create policy "convites - remocao" on convites
  for delete using (
    tenant_id = auth_tenant_id() and
    exists (select 1 from usuarios where id = auth.uid() and nivel_acesso in ('diretor', 'gerente'))
  );

-- ---------------------------------------------------------
-- Validação pública do token (chamada sem estar logado, na
-- tela de cadastro) — só expõe o e-mail convidado e se ainda
-- vale, nunca a linha inteira do convite.
-- ---------------------------------------------------------

create or replace function convite_validar(p_token uuid)
returns table (email text, valido boolean, nome_empresa text)
language sql
security definer
stable
set search_path = public
as $$
  select c.email, (c.usado_em is null and c.expira_em > now()), t.nome
  from convites c
  join tenants t on t.id = c.tenant_id
  where c.token = p_token;
$$;

grant execute on function convite_validar(uuid) to anon, authenticated;

-- ---------------------------------------------------------
-- Cadastro (gatilho em auth.users) agora exige convite válido
-- pro e-mail — sem isso, a conta nem chega a ser criada.
-- ---------------------------------------------------------

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_convite record;
  v_categoria categoria_processo;
begin
  select * into v_convite
  from public.convites
  where lower(email) = lower(new.email)
    and usado_em is null
    and expira_em > now()
  order by criado_em desc
  limit 1;

  if v_convite is null then
    raise exception 'Você precisa de um convite válido pra criar uma conta. Peça um link de convite pra quem já usa o sistema.';
  end if;

  insert into public.usuarios (id, tenant_id, nome, email, perfil, nivel_acesso, ativo)
  values (
    new.id,
    v_convite.tenant_id,
    coalesce(new.raw_user_meta_data ->> 'nome', split_part(new.email, '@', 1)),
    new.email,
    v_convite.perfil,
    v_convite.nivel_acesso,
    true
  )
  on conflict (id) do nothing;

  foreach v_categoria in array v_convite.categorias loop
    insert into public.usuario_categorias (usuario_id, categoria) values (new.id, v_categoria)
    on conflict do nothing;
  end loop;

  update public.convites set usado_em = now() where id = v_convite.id;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_auth_user();
