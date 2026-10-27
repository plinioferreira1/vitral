-- Financeiro: extratos bancários importados e conciliação.
-- Cada linha do extrato fica "pendente" até a equipe confirmar: ligar a
-- lançamentos existentes (gera a baixa com a data do extrato), criar um
-- lançamento a partir dela ou deixá-la de fora com motivo. Nada vira
-- lançamento sozinho. Mesmo acesso do restante do Financeiro (diretor/gerente).

create table public.financeiro_extrato_importacoes (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  conta_bancaria_id uuid not null references public.financeiro_contas_bancarias(id) on delete cascade,
  origem text not null check (origem in ('ofx', 'pdf', 'manual')),
  arquivo_nome text,
  periodo_inicio date,
  periodo_fim date,
  saldo_final numeric(14, 2),
  saldo_data date,
  linhas_novas integer not null default 0,
  linhas_repetidas integer not null default 0,
  criado_por uuid references public.usuarios(id) on delete set null,
  criado_em timestamptz not null default now()
);
create index financeiro_extrato_importacoes_conta_idx on public.financeiro_extrato_importacoes (conta_bancaria_id, criado_em desc);
create index financeiro_extrato_importacoes_tenant_idx on public.financeiro_extrato_importacoes (tenant_id);
create index financeiro_extrato_importacoes_criador_idx on public.financeiro_extrato_importacoes (criado_por);

create table public.financeiro_extrato_linhas (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  conta_bancaria_id uuid not null references public.financeiro_contas_bancarias(id) on delete cascade,
  importacao_id uuid references public.financeiro_extrato_importacoes(id) on delete set null,
  -- identificador da transação no banco (FITID do OFX) ou chave montada; evita importar duas vezes
  chave text not null check (length(chave) between 1 and 200),
  data date not null,
  valor numeric(14, 2) not null check (valor <> 0),
  descricao text not null default '' check (length(descricao) <= 300),
  status text not null default 'pendente' check (status in ('pendente', 'conciliado', 'ignorado')),
  nota text check (length(nota) <= 500),
  tratado_por uuid references public.usuarios(id) on delete set null,
  tratado_em timestamptz,
  criado_em timestamptz not null default now(),
  unique (conta_bancaria_id, chave)
);
create index financeiro_extrato_linhas_conta_idx on public.financeiro_extrato_linhas (conta_bancaria_id, status, data);
create index financeiro_extrato_linhas_tenant_idx on public.financeiro_extrato_linhas (tenant_id);
create index financeiro_extrato_linhas_importacao_idx on public.financeiro_extrato_linhas (importacao_id);
create index financeiro_extrato_linhas_tratado_idx on public.financeiro_extrato_linhas (tratado_por);

-- A baixa criada pela conciliação aponta para a linha do extrato que a originou.
alter table public.financeiro_baixas
  add column extrato_linha_id uuid references public.financeiro_extrato_linhas(id) on delete set null;
create index financeiro_baixas_extrato_idx on public.financeiro_baixas (extrato_linha_id) where extrato_linha_id is not null;

alter table public.financeiro_extrato_importacoes enable row level security;
alter table public.financeiro_extrato_linhas enable row level security;

create policy "financeiro_extrato_importacoes - acesso total diretor/gerente" on public.financeiro_extrato_importacoes
  for all using (
    tenant_id = auth_tenant_id()
    and exists (select 1 from public.usuarios where id = (select auth.uid()) and ativo and nivel_acesso in ('diretor', 'gerente'))
  ) with check (
    tenant_id = auth_tenant_id()
    and exists (select 1 from public.usuarios where id = (select auth.uid()) and ativo and nivel_acesso in ('diretor', 'gerente'))
  );

create policy "financeiro_extrato_linhas - acesso total diretor/gerente" on public.financeiro_extrato_linhas
  for all using (
    tenant_id = auth_tenant_id()
    and exists (select 1 from public.usuarios where id = (select auth.uid()) and ativo and nivel_acesso in ('diretor', 'gerente'))
  ) with check (
    tenant_id = auth_tenant_id()
    and exists (select 1 from public.usuarios where id = (select auth.uid()) and ativo and nivel_acesso in ('diretor', 'gerente'))
  );
