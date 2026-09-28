-- Transferência de dinheiro entre contas da própria empresa (pagar a
-- fatura do cartão com a conta corrente, aplicar/resgatar investimento,
-- mover entre Inter e Sicoob). Não é receita nem despesa: tira de uma
-- conta e põe na outra, então o saldo total da empresa não muda.

create table if not exists financeiro_transferencias (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  conta_origem_id uuid not null references financeiro_contas_bancarias(id) on delete restrict,
  conta_destino_id uuid not null references financeiro_contas_bancarias(id) on delete restrict,
  valor numeric(14,2) not null check (valor > 0),
  data date not null,
  descricao text,
  criado_por uuid references usuarios(id) on delete set null,
  criado_em timestamptz not null default now(),
  constraint financeiro_transferencias_contas_diferentes check (conta_origem_id <> conta_destino_id)
);

create index if not exists financeiro_transferencias_tenant_data on financeiro_transferencias (tenant_id, data);
create index if not exists financeiro_transferencias_origem on financeiro_transferencias (conta_origem_id);
create index if not exists financeiro_transferencias_destino on financeiro_transferencias (conta_destino_id);

alter table financeiro_transferencias enable row level security;

create policy "financeiro_transferencias - acesso total diretor/gerente" on financeiro_transferencias
  for all
  using (tenant_id = auth_tenant_id() and (select usuario_eh_gestor()))
  with check (tenant_id = auth_tenant_id() and (select usuario_eh_gestor()));
