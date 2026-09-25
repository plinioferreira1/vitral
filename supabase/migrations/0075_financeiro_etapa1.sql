-- =========================================================
-- Módulo Financeiro — Etapa 1: fundação (cadastros, categorias,
-- centros de resultado e permissões). Nenhum lançamento ainda —
-- isso vem na Etapa 2. Sacra Netimóveis e Sacra Cred compartilham
-- o mesmo financeiro, diferenciadas por "unidade de negócio".
--
-- Acesso: só Diretor/Gerente (mesmo padrão de "podeConfigurar" já
-- usado pra Configurações) — Supervisor/Corretor/Social Media não
-- têm acesso nenhum ao Financeiro.
-- =========================================================

create type financeiro_papel_pessoa as enum ('cliente', 'fornecedor', 'ambos');
create type financeiro_tipo_categoria as enum ('receita', 'despesa');

-- ---------------------------------------------------------
-- Unidades de negócio (Sacra Netimóveis / Sacra Cred)
-- ---------------------------------------------------------
create table financeiro_unidades (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  nome text not null,
  criado_em timestamptz not null default now(),
  unique (tenant_id, nome)
);

-- ---------------------------------------------------------
-- Categorias de receita/despesa
-- ---------------------------------------------------------
create table financeiro_categorias (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  nome text not null,
  tipo financeiro_tipo_categoria not null,
  criado_em timestamptz not null default now(),
  unique (tenant_id, nome, tipo)
);

-- ---------------------------------------------------------
-- Centros de resultado (ex: Comercial, Administrativo, Sacra Cred)
-- ---------------------------------------------------------
create table financeiro_centros_custo (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  nome text not null,
  criado_em timestamptz not null default now(),
  unique (tenant_id, nome)
);

-- ---------------------------------------------------------
-- Clientes e fornecedores do financeiro (separado do cadastro de
-- "clientes" do lado imobiliário — aqui é só nome + CPF/CNPJ,
-- por decisão do usuário).
-- ---------------------------------------------------------
create table financeiro_pessoas (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  nome text not null,
  cpf_cnpj text,
  papel financeiro_papel_pessoa not null default 'fornecedor',
  telefone text,
  email text,
  observacoes text,
  criado_em timestamptz not null default now()
);

create index idx_financeiro_pessoas_nome on financeiro_pessoas (tenant_id, nome);

-- ---------------------------------------------------------
-- RLS — todas as tabelas: só Diretor/Gerente do tenant.
-- ---------------------------------------------------------
alter table financeiro_unidades enable row level security;
alter table financeiro_categorias enable row level security;
alter table financeiro_centros_custo enable row level security;
alter table financeiro_pessoas enable row level security;

create policy "financeiro_unidades - acesso total diretor/gerente" on financeiro_unidades
  for all using (
    tenant_id = auth_tenant_id() and
    exists (select 1 from usuarios where id = auth.uid() and nivel_acesso in ('diretor', 'gerente'))
  )
  with check (
    tenant_id = auth_tenant_id() and
    exists (select 1 from usuarios where id = auth.uid() and nivel_acesso in ('diretor', 'gerente'))
  );

create policy "financeiro_categorias - acesso total diretor/gerente" on financeiro_categorias
  for all using (
    tenant_id = auth_tenant_id() and
    exists (select 1 from usuarios where id = auth.uid() and nivel_acesso in ('diretor', 'gerente'))
  )
  with check (
    tenant_id = auth_tenant_id() and
    exists (select 1 from usuarios where id = auth.uid() and nivel_acesso in ('diretor', 'gerente'))
  );

create policy "financeiro_centros_custo - acesso total diretor/gerente" on financeiro_centros_custo
  for all using (
    tenant_id = auth_tenant_id() and
    exists (select 1 from usuarios where id = auth.uid() and nivel_acesso in ('diretor', 'gerente'))
  )
  with check (
    tenant_id = auth_tenant_id() and
    exists (select 1 from usuarios where id = auth.uid() and nivel_acesso in ('diretor', 'gerente'))
  );

create policy "financeiro_pessoas - acesso total diretor/gerente" on financeiro_pessoas
  for all using (
    tenant_id = auth_tenant_id() and
    exists (select 1 from usuarios where id = auth.uid() and nivel_acesso in ('diretor', 'gerente'))
  )
  with check (
    tenant_id = auth_tenant_id() and
    exists (select 1 from usuarios where id = auth.uid() and nivel_acesso in ('diretor', 'gerente'))
  );

-- Semeia as duas unidades de negócio já conhecidas, pra cada tenant existente.
insert into financeiro_unidades (tenant_id, nome)
select id, 'Sacra Netimóveis' from tenants
union all
select id, 'Sacra Cred' from tenants;
