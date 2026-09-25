-- =========================================================
-- Módulo Financeiro — Etapa 2: contas a pagar/receber, contas
-- bancárias, recorrências e liquidações (baixas). Ainda sem OFX/
-- conciliação (isso é Etapa 5) nem recibos em PDF (Etapa 4).
-- =========================================================

create type financeiro_status_lancamento as enum ('pendente', 'pago_parcial', 'pago', 'cancelado');
create type financeiro_frequencia as enum ('semanal', 'mensal', 'trimestral', 'semestral', 'anual');

-- ---------------------------------------------------------
-- Contas bancárias
-- ---------------------------------------------------------
create table financeiro_contas_bancarias (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  nome text not null,
  banco text,
  agencia text,
  numero_conta text,
  titular text,
  tipo text default 'corrente',
  saldo_inicial numeric(14,2) not null default 0,
  data_abertura date,
  ativa boolean not null default true,
  criado_em timestamptz not null default now()
);

-- ---------------------------------------------------------
-- Recorrências — o "molde" que gera lançamentos futuros
-- antecipadamente (sem executar pagamento nenhum).
-- ---------------------------------------------------------
create table financeiro_recorrencias (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  descricao text not null,
  tipo financeiro_tipo_categoria not null,
  valor numeric(14,2) not null,
  frequencia financeiro_frequencia not null default 'mensal',
  data_inicio date not null,
  data_fim date,
  numero_ocorrencias integer,
  pessoa_id uuid references financeiro_pessoas(id),
  categoria_id uuid references financeiro_categorias(id),
  centro_custo_id uuid references financeiro_centros_custo(id),
  unidade_id uuid references financeiro_unidades(id),
  conta_bancaria_id uuid references financeiro_contas_bancarias(id),
  ativa boolean not null default true,
  criado_por uuid references usuarios(id),
  criado_em timestamptz not null default now(),
  check (data_fim is not null or numero_ocorrencias is not null)
);

-- ---------------------------------------------------------
-- Lançamentos — contas a pagar (despesa) e a receber (receita).
-- Um lançamento pode ter vindo de uma recorrência (recorrencia_id)
-- ou ter sido criado avulso.
-- ---------------------------------------------------------
create table financeiro_lancamentos (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  tipo financeiro_tipo_categoria not null,
  descricao text not null,
  pessoa_id uuid references financeiro_pessoas(id),
  categoria_id uuid references financeiro_categorias(id),
  centro_custo_id uuid references financeiro_centros_custo(id),
  unidade_id uuid references financeiro_unidades(id),
  conta_bancaria_id uuid references financeiro_contas_bancarias(id),
  valor numeric(14,2) not null,
  vencimento date not null,
  competencia date,
  forma_pagamento text,
  numero_documento text,
  observacoes text,
  status financeiro_status_lancamento not null default 'pendente',
  recorrencia_id uuid references financeiro_recorrencias(id) on delete set null,
  criado_por uuid references usuarios(id),
  criado_em timestamptz not null default now()
);

create index idx_financeiro_lancamentos_vencimento on financeiro_lancamentos (tenant_id, vencimento);
create index idx_financeiro_lancamentos_status on financeiro_lancamentos (tenant_id, status);

-- ---------------------------------------------------------
-- Baixas — cada pagamento/recebimento (total ou parcial) contra
-- um lançamento. A soma das baixas define quanto já foi
-- liquidado; o status do lançamento é recalculado a cada baixa.
-- ---------------------------------------------------------
create table financeiro_baixas (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  lancamento_id uuid not null references financeiro_lancamentos(id) on delete cascade,
  valor numeric(14,2) not null,
  data date not null,
  conta_bancaria_id uuid references financeiro_contas_bancarias(id),
  forma_pagamento text,
  observacoes text,
  criado_por uuid references usuarios(id),
  criado_em timestamptz not null default now()
);

create index idx_financeiro_baixas_lancamento on financeiro_baixas (lancamento_id);

-- ---------------------------------------------------------
-- RLS — mesmo padrão: só Diretor/Gerente do tenant.
-- ---------------------------------------------------------
alter table financeiro_contas_bancarias enable row level security;
alter table financeiro_recorrencias enable row level security;
alter table financeiro_lancamentos enable row level security;
alter table financeiro_baixas enable row level security;

create policy "financeiro_contas_bancarias - acesso total diretor/gerente" on financeiro_contas_bancarias
  for all using (
    tenant_id = auth_tenant_id() and
    exists (select 1 from usuarios where id = auth.uid() and nivel_acesso in ('diretor', 'gerente'))
  )
  with check (
    tenant_id = auth_tenant_id() and
    exists (select 1 from usuarios where id = auth.uid() and nivel_acesso in ('diretor', 'gerente'))
  );

create policy "financeiro_recorrencias - acesso total diretor/gerente" on financeiro_recorrencias
  for all using (
    tenant_id = auth_tenant_id() and
    exists (select 1 from usuarios where id = auth.uid() and nivel_acesso in ('diretor', 'gerente'))
  )
  with check (
    tenant_id = auth_tenant_id() and
    exists (select 1 from usuarios where id = auth.uid() and nivel_acesso in ('diretor', 'gerente'))
  );

create policy "financeiro_lancamentos - acesso total diretor/gerente" on financeiro_lancamentos
  for all using (
    tenant_id = auth_tenant_id() and
    exists (select 1 from usuarios where id = auth.uid() and nivel_acesso in ('diretor', 'gerente'))
  )
  with check (
    tenant_id = auth_tenant_id() and
    exists (select 1 from usuarios where id = auth.uid() and nivel_acesso in ('diretor', 'gerente'))
  );

create policy "financeiro_baixas - acesso total diretor/gerente" on financeiro_baixas
  for all using (
    tenant_id = auth_tenant_id() and
    exists (select 1 from usuarios where id = auth.uid() and nivel_acesso in ('diretor', 'gerente'))
  )
  with check (
    tenant_id = auth_tenant_id() and
    exists (select 1 from usuarios where id = auth.uid() and nivel_acesso in ('diretor', 'gerente'))
  );
