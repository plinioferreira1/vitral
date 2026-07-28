-- =========================================================
-- Módulo de Locação — área própria, separada de Vendas/CCA.
-- Diferente de processos/etapas: aqui a natureza é recorrente
-- (uma conta por tipo, por mês, por contrato), não uma
-- sequência de etapas que termina.
-- =========================================================

create type tipo_conta_locacao as enum ('iptu', 'condominio', 'agua', 'luz', 'gas');
create type status_conta_locacao as enum ('pago', 'pendente', 'nao_aplicavel');
create type tipo_iptu_locacao as enum ('parcelado', 'cota_unica');
create type responsavel_pagamento_locacao as enum ('locador', 'locatario');

create table contratos_locacao (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  numero text not null,
  imovel_id uuid references imoveis(id),
  locador_id uuid references clientes(id),
  locatario_id uuid references clientes(id),
  emite_nf boolean not null default true,
  iptu_inscricao text,
  iptu_tipo tipo_iptu_locacao,
  condominio_administradora text,
  condominio_contato text,
  agua_inscricao text,
  agua_codigo_cliente text,
  -- Quem paga cada tipo de conta neste contrato. Varia caso a
  -- caso: em alguns contratos o locatário paga tudo, em
  -- outros o IPTU fica com o locador, por exemplo.
  responsavel_iptu responsavel_pagamento_locacao,
  responsavel_condominio responsavel_pagamento_locacao,
  responsavel_agua responsavel_pagamento_locacao,
  responsavel_luz responsavel_pagamento_locacao,
  responsavel_gas responsavel_pagamento_locacao,
  ativo boolean not null default true,
  responsavel_id uuid references usuarios(id),
  observacoes text,
  criado_em timestamptz not null default now()
);

create index idx_contratos_locacao_tenant on contratos_locacao(tenant_id);

create table contas_locacao (
  id uuid primary key default gen_random_uuid(),
  contrato_id uuid not null references contratos_locacao(id) on delete cascade,
  tipo tipo_conta_locacao not null,
  competencia date not null, -- sempre dia 1 do mês de referência
  status status_conta_locacao not null default 'nao_aplicavel',
  valor numeric(14,2),
  vencimento date,
  atualizado_em timestamptz not null default now(),
  unique (contrato_id, tipo, competencia)
);

create index idx_contas_locacao_contrato on contas_locacao(contrato_id);
create index idx_contas_locacao_status on contas_locacao(status);
create index idx_contas_locacao_competencia on contas_locacao(competencia);

-- ---------------------------------------------------------
-- Tarefas mensais recorrentes (genéricas, não por contrato)
-- ---------------------------------------------------------

create table tarefas_mensais (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  nome text not null,
  regra text, -- só descritivo, ex: "1º dia útil do mês"
  ordem int not null default 0
);

create table tarefas_mensais_status (
  id uuid primary key default gen_random_uuid(),
  tarefa_id uuid not null references tarefas_mensais(id) on delete cascade,
  competencia date not null,
  concluida boolean not null default false,
  concluida_por uuid references usuarios(id),
  concluida_em timestamptz,
  unique (tarefa_id, competencia)
);

-- ---------------------------------------------------------
-- RLS — mesmo padrão de isolamento por tenant do resto do app
-- ---------------------------------------------------------

alter table contratos_locacao enable row level security;
alter table contas_locacao enable row level security;
alter table tarefas_mensais enable row level security;
alter table tarefas_mensais_status enable row level security;

create policy "tenant isolado - contratos_locacao" on contratos_locacao
  for all using (tenant_id = auth_tenant_id()) with check (tenant_id = auth_tenant_id());

create policy "tenant isolado - contas_locacao" on contas_locacao
  for all using (
    contrato_id in (select id from contratos_locacao where tenant_id = auth_tenant_id())
  ) with check (
    contrato_id in (select id from contratos_locacao where tenant_id = auth_tenant_id())
  );

create policy "tenant isolado - tarefas_mensais" on tarefas_mensais
  for all using (tenant_id = auth_tenant_id()) with check (tenant_id = auth_tenant_id());

create policy "tenant isolado - tarefas_mensais_status" on tarefas_mensais_status
  for all using (
    tarefa_id in (select id from tarefas_mensais where tenant_id = auth_tenant_id())
  ) with check (
    tarefa_id in (select id from tarefas_mensais where tenant_id = auth_tenant_id())
  );

-- ---------------------------------------------------------
-- Seed das 3 tarefas mensais recorrentes, pro tenant atual
-- ---------------------------------------------------------

do $$
declare
  v_tenant_id uuid;
begin
  select id into v_tenant_id from tenants limit 1;
  if v_tenant_id is not null then
    insert into tarefas_mensais (tenant_id, nome, regra, ordem) values
      (v_tenant_id, 'Verificar NFs do mês passado no Rentzapp', '1º dia útil do mês', 1),
      (v_tenant_id, 'Verificar pendências para geração de boletos', '1º dia útil do mês', 2),
      (v_tenant_id, 'Verificar IPTU/TLP em aberto e cobrar inadimplentes', 'Dia 15 (ou dia útil anterior)', 3);
  end if;
end $$;
