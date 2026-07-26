-- =========================================================
-- 1. Processos passam a ter Comprador E Vendedor (antes só
--    tinha 1 cliente por processo — em venda de imóvel os
--    dois lados importam).
-- =========================================================

alter table processos rename column cliente_id to comprador_id;
alter table processos rename constraint processos_cliente_id_fkey to processos_comprador_id_fkey;
alter table processos add column vendedor_id uuid references clientes(id);

-- =========================================================
-- 2. Tabela de Comissões (estava só na especificação, nunca
--    tinha sido criada de fato). Vinculada a um corretor
--    (não a um usuário do sistema — corretor pode nem ter
--    login), com os 3 status que a imobiliária usa de fato:
--    0% pago, 50% pago, 100% pago (+ cancelada).
-- =========================================================

create table comissoes (
  id uuid primary key default gen_random_uuid(),
  processo_id uuid not null references processos(id) on delete cascade,
  beneficiario_id uuid references corretores(id),
  valor_previsto numeric(14,2),
  valor_recebido numeric(14,2),
  data_prevista date,
  data_recebida date,
  status text not null check (status in ('0% pago', '50% pago', '100% pago', 'cancelada')) default '0% pago',
  criado_em timestamptz not null default now()
);

create index idx_comissoes_processo on comissoes(processo_id);

alter table comissoes enable row level security;

create policy "tenant isolado - comissoes" on comissoes
  for all using (
    processo_id in (select id from processos where tenant_id = auth_tenant_id())
  ) with check (
    processo_id in (select id from processos where tenant_id = auth_tenant_id())
  );
