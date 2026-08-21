-- =========================================================
-- Checklists personalizáveis (substitui a antiga aba fixa
-- "Processos" de Financiamentos, que virou "Checklists"). Cada
-- checklist tem um nome (ex: "Conformidade", "Assinatura
-- E-notariado"), agrupado em seções, cada seção com seus
-- itens -- tudo editável pela tela, sem limite de quantos
-- checklists existirem.
-- =========================================================

create table checklists_modelo (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  categoria categoria_processo not null default 'financiamento',
  nome text not null,
  descricao text,
  ordem int not null default 0,
  criado_em timestamptz not null default now()
);

create table checklist_grupos (
  id uuid primary key default gen_random_uuid(),
  checklist_id uuid not null references checklists_modelo(id) on delete cascade,
  nome text not null,
  observacao text,
  ordem int not null default 0
);

create table checklist_grupo_itens (
  id uuid primary key default gen_random_uuid(),
  grupo_id uuid not null references checklist_grupos(id) on delete cascade,
  texto text not null,
  ordem int not null default 0
);

create index idx_checklists_modelo_tenant on checklists_modelo(tenant_id);
create index idx_checklist_grupos_checklist on checklist_grupos(checklist_id);
create index idx_checklist_grupo_itens_grupo on checklist_grupo_itens(grupo_id);

alter table checklists_modelo enable row level security;
alter table checklist_grupos enable row level security;
alter table checklist_grupo_itens enable row level security;

-- Mesmo padrão "solto" já usado em etapas_padrao/tarefas_mensais:
-- qualquer usuário do tenant lê e edita a configuração.
create policy "checklists_modelo - tudo" on checklists_modelo
  for all using (tenant_id = auth_tenant_id()) with check (tenant_id = auth_tenant_id());

create policy "checklist_grupos - tudo" on checklist_grupos
  for all using (
    checklist_id in (select id from checklists_modelo where tenant_id = auth_tenant_id())
  )
  with check (
    checklist_id in (select id from checklists_modelo where tenant_id = auth_tenant_id())
  );

create policy "checklist_grupo_itens - tudo" on checklist_grupo_itens
  for all using (
    grupo_id in (
      select cg.id from checklist_grupos cg
      join checklists_modelo cm on cm.id = cg.checklist_id
      where cm.tenant_id = auth_tenant_id()
    )
  )
  with check (
    grupo_id in (
      select cg.id from checklist_grupos cg
      join checklists_modelo cm on cm.id = cg.checklist_id
      where cm.tenant_id = auth_tenant_id()
    )
  );

-- Migra o checklist fixo que já existia (Compradores/Vendedores/
-- Imóvel) pro novo formato, como "Checklist de Conformidade".
do $$
declare
  v_tenant_id uuid;
  v_checklist_id uuid;
  v_grupo_id uuid;
begin
  select id into v_tenant_id from tenants limit 1;
  if v_tenant_id is null then
    return;
  end if;

  insert into checklists_modelo (tenant_id, categoria, nome, descricao, ordem)
  values (
    v_tenant_id, 'financiamento', 'Checklist de Conformidade',
    'Documentação pra abertura e conformidade do processo de financiamento. Reúna esses itens antes de enviar pro correspondente/banco.',
    1
  )
  returning id into v_checklist_id;

  insert into checklist_grupos (checklist_id, nome, observacao, ordem)
  values (v_checklist_id, 'Compradores', 'Vale pra cada proponente comprador, exceto os formulários — que são assinados por todos os proponentes juntos.', 1)
  returning id into v_grupo_id;
  insert into checklist_grupo_itens (grupo_id, texto, ordem) values
    (v_grupo_id, 'Documento com foto (RG, CNH, CIN, etc)', 1),
    (v_grupo_id, 'Certidões de Nada Consta', 2),
    (v_grupo_id, 'Comprovante de Endereço', 3),
    (v_grupo_id, 'Comprovante de Estado Civil', 4),
    (v_grupo_id, 'Consulta Cadastral SICAQ/CAIXA AQUI', 5),
    (v_grupo_id, 'Consulta Cadastral CADMUT/CIWEB', 6),
    (v_grupo_id, 'Comprovante de Renda (Contracheque, IRPF, etc)', 7),
    (v_grupo_id, 'Formulário de Cadastro SICAQ/CAIXA AQUI', 8),
    (v_grupo_id, 'Formulário Cliente Habitação MO30844', 9),
    (v_grupo_id, 'Dossiê Habitacional MO30825', 10),
    (v_grupo_id, 'Caso o cliente vá abrir Conta Corrente, incluir também a proposta de adesão', 11);

  insert into checklist_grupos (checklist_id, nome, observacao, ordem)
  values (v_checklist_id, 'Vendedores', 'Vale pra cada vendedor.', 2)
  returning id into v_grupo_id;
  insert into checklist_grupo_itens (grupo_id, texto, ordem) values
    (v_grupo_id, 'Documento com foto (RG, CNH, CIN, etc)', 1),
    (v_grupo_id, 'Certidões de Nada Consta', 2),
    (v_grupo_id, 'Comprovante de Endereço', 3),
    (v_grupo_id, 'Comprovante de Estado Civil', 4),
    (v_grupo_id, 'Consulta Cadastral SICAQ/CAIXA AQUI', 5);

  insert into checklist_grupos (checklist_id, nome, ordem)
  values (v_checklist_id, 'Imóvel', 3)
  returning id into v_grupo_id;
  insert into checklist_grupo_itens (grupo_id, texto, ordem) values
    (v_grupo_id, 'Certidão de Ônus', 1),
    (v_grupo_id, 'Ficha Cadastral junto ao GDF', 2);

  -- Segundo checklist, pedido mas ainda sem conteúdo definido --
  -- fica pronto pra edição pela tela.
  insert into checklists_modelo (tenant_id, categoria, nome, descricao, ordem)
  values (
    v_tenant_id, 'financiamento', 'Checklist de Assinatura E-notariado',
    null,
    2
  );
end $$;
