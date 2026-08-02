-- =========================================================
-- Processo de rescisão de locação: mesmo padrão de
-- etapas + checklist já usado em processos (venda/
-- financiamento), só que num conjunto de tabelas próprio
-- pra locação, ligado ao contrato.
--
-- Um contrato só pode ter uma rescisão em andamento por vez
-- (índice único parcial abaixo garante isso).
-- =========================================================

create table rescisoes_locacao (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  contrato_id uuid not null references contratos_locacao(id) on delete cascade,
  data_aviso date not null default current_date,
  status text not null check (status in ('em_andamento', 'concluida')) default 'em_andamento',
  criado_em timestamptz not null default now(),
  concluida_em timestamptz
);

create table rescisao_etapas (
  id uuid primary key default gen_random_uuid(),
  rescisao_id uuid not null references rescisoes_locacao(id) on delete cascade,
  nome text not null,
  ordem int not null default 0,
  status text not null check (status in ('pendente', 'concluida')) default 'pendente',
  data_prevista date,
  data_realizada date,
  responsavel_id uuid references usuarios(id)
);

create table rescisao_checklist_itens (
  id uuid primary key default gen_random_uuid(),
  etapa_id uuid not null references rescisao_etapas(id) on delete cascade,
  descricao text not null,
  concluido boolean not null default false,
  ordem int not null default 0
);

create index idx_rescisoes_locacao_contrato on rescisoes_locacao(contrato_id);
create index idx_rescisao_etapas_rescisao on rescisao_etapas(rescisao_id);
create index idx_rescisao_checklist_etapa on rescisao_checklist_itens(etapa_id);

-- só uma rescisão em andamento por contrato de cada vez
create unique index idx_rescisoes_locacao_ativa_unica
  on rescisoes_locacao(contrato_id)
  where status = 'em_andamento';

-- ---------------------------------------------------------
-- RLS — mesmo padrão de contas_locacao (filha de
-- contratos_locacao, categoria 'locacao', escrita exige
-- usuario_pode_editar()).
-- ---------------------------------------------------------

alter table rescisoes_locacao enable row level security;
alter table rescisao_etapas enable row level security;
alter table rescisao_checklist_itens enable row level security;

create policy "rescisoes_locacao - leitura" on rescisoes_locacao
  for select using (tenant_id = auth_tenant_id() and usuario_tem_categoria('locacao'));
create policy "rescisoes_locacao - insercao" on rescisoes_locacao
  for insert with check (tenant_id = auth_tenant_id() and usuario_tem_categoria('locacao') and usuario_pode_editar());
create policy "rescisoes_locacao - atualizacao" on rescisoes_locacao
  for update using (tenant_id = auth_tenant_id() and usuario_tem_categoria('locacao') and usuario_pode_editar())
  with check (tenant_id = auth_tenant_id() and usuario_tem_categoria('locacao') and usuario_pode_editar());
create policy "rescisoes_locacao - remocao" on rescisoes_locacao
  for delete using (tenant_id = auth_tenant_id() and usuario_tem_categoria('locacao') and usuario_pode_editar());

create policy "rescisao_etapas - leitura" on rescisao_etapas
  for select using (rescisao_id in (select id from rescisoes_locacao where tenant_id = auth_tenant_id()));
create policy "rescisao_etapas - insercao" on rescisao_etapas
  for insert with check (
    rescisao_id in (select id from rescisoes_locacao where tenant_id = auth_tenant_id()) and usuario_pode_editar()
  );
create policy "rescisao_etapas - atualizacao" on rescisao_etapas
  for update using (
    rescisao_id in (select id from rescisoes_locacao where tenant_id = auth_tenant_id()) and usuario_pode_editar()
  ) with check (
    rescisao_id in (select id from rescisoes_locacao where tenant_id = auth_tenant_id()) and usuario_pode_editar()
  );
create policy "rescisao_etapas - remocao" on rescisao_etapas
  for delete using (
    rescisao_id in (select id from rescisoes_locacao where tenant_id = auth_tenant_id()) and usuario_pode_editar()
  );

create policy "rescisao_checklist_itens - leitura" on rescisao_checklist_itens
  for select using (
    etapa_id in (
      select re.id from rescisao_etapas re
      join rescisoes_locacao rl on rl.id = re.rescisao_id
      where rl.tenant_id = auth_tenant_id()
    )
  );
create policy "rescisao_checklist_itens - insercao" on rescisao_checklist_itens
  for insert with check (
    etapa_id in (
      select re.id from rescisao_etapas re
      join rescisoes_locacao rl on rl.id = re.rescisao_id
      where rl.tenant_id = auth_tenant_id()
    ) and usuario_pode_editar()
  );
create policy "rescisao_checklist_itens - atualizacao" on rescisao_checklist_itens
  for update using (
    etapa_id in (
      select re.id from rescisao_etapas re
      join rescisoes_locacao rl on rl.id = re.rescisao_id
      where rl.tenant_id = auth_tenant_id()
    ) and usuario_pode_editar()
  ) with check (
    etapa_id in (
      select re.id from rescisao_etapas re
      join rescisoes_locacao rl on rl.id = re.rescisao_id
      where rl.tenant_id = auth_tenant_id()
    ) and usuario_pode_editar()
  );
create policy "rescisao_checklist_itens - remocao" on rescisao_checklist_itens
  for delete using (
    etapa_id in (
      select re.id from rescisao_etapas re
      join rescisoes_locacao rl on rl.id = re.rescisao_id
      where rl.tenant_id = auth_tenant_id()
    ) and usuario_pode_editar()
  );
