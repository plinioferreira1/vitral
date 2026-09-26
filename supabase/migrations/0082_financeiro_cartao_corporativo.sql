create table if not exists financeiro_cartoes (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  nome text not null,
  banco text,
  final_digitos text,
  ativo boolean not null default true,
  criado_em timestamptz not null default now()
);

create table if not exists financeiro_faturas (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  cartao_id uuid not null references financeiro_cartoes(id) on delete cascade,
  competencia date not null,
  vencimento date,
  criado_em timestamptz not null default now()
);

create table if not exists financeiro_fatura_itens (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  fatura_id uuid not null references financeiro_faturas(id) on delete cascade,
  data date not null,
  estabelecimento text not null,
  descricao text,
  valor numeric not null,
  parcela_atual smallint,
  parcela_total smallint,
  categoria_id uuid references financeiro_categorias(id) on delete set null,
  centro_custo_id uuid references financeiro_centros_custo(id) on delete set null,
  criado_em timestamptz not null default now()
);

alter table financeiro_cartoes enable row level security;
alter table financeiro_faturas enable row level security;
alter table financeiro_fatura_itens enable row level security;

create policy "financeiro_cartoes - acesso total diretor/gerente" on financeiro_cartoes
  for all
  using (tenant_id = auth_tenant_id() and exists (
    select 1 from usuarios where usuarios.id = auth.uid() and usuarios.nivel_acesso = any (array['diretor'::nivel_acesso_usuario, 'gerente'::nivel_acesso_usuario])
  ))
  with check (tenant_id = auth_tenant_id() and exists (
    select 1 from usuarios where usuarios.id = auth.uid() and usuarios.nivel_acesso = any (array['diretor'::nivel_acesso_usuario, 'gerente'::nivel_acesso_usuario])
  ));

create policy "financeiro_faturas - acesso total diretor/gerente" on financeiro_faturas
  for all
  using (tenant_id = auth_tenant_id() and exists (
    select 1 from usuarios where usuarios.id = auth.uid() and usuarios.nivel_acesso = any (array['diretor'::nivel_acesso_usuario, 'gerente'::nivel_acesso_usuario])
  ))
  with check (tenant_id = auth_tenant_id() and exists (
    select 1 from usuarios where usuarios.id = auth.uid() and usuarios.nivel_acesso = any (array['diretor'::nivel_acesso_usuario, 'gerente'::nivel_acesso_usuario])
  ));

create policy "financeiro_fatura_itens - acesso total diretor/gerente" on financeiro_fatura_itens
  for all
  using (tenant_id = auth_tenant_id() and exists (
    select 1 from usuarios where usuarios.id = auth.uid() and usuarios.nivel_acesso = any (array['diretor'::nivel_acesso_usuario, 'gerente'::nivel_acesso_usuario])
  ))
  with check (tenant_id = auth_tenant_id() and exists (
    select 1 from usuarios where usuarios.id = auth.uid() and usuarios.nivel_acesso = any (array['diretor'::nivel_acesso_usuario, 'gerente'::nivel_acesso_usuario])
  ));
