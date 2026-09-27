-- Tabelas de configuração (etapas padrão, modelos de processo, tarefas
-- recorrentes, checklists de financiamento, onboarding) só tinham a
-- checagem de empresa: qualquer usuário do tenant — inclusive corretor
-- ou social media — conseguia alterá-las chamando a Server Action ou a
-- API do Supabase diretamente. As telas já são exclusivas de
-- diretor/gerente; agora o banco também exige isso para gravar.
-- Leitura continua igual para todos da empresa.

create or replace function usuario_eh_gestor()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select coalesce(
    (select nivel_acesso in ('diretor', 'gerente') from usuarios where id = auth.uid()),
    false
  );
$$;

-- etapas_padrao
drop policy if exists "tenant isolado - etapas_padrao" on etapas_padrao;
create policy "etapas_padrao - leitura" on etapas_padrao for select
  using (tenant_id = auth_tenant_id());
create policy "etapas_padrao - insercao gestores" on etapas_padrao for insert
  with check (tenant_id = auth_tenant_id() and (select usuario_eh_gestor()));
create policy "etapas_padrao - edicao gestores" on etapas_padrao for update
  using (tenant_id = auth_tenant_id() and (select usuario_eh_gestor()))
  with check (tenant_id = auth_tenant_id() and (select usuario_eh_gestor()));
create policy "etapas_padrao - exclusao gestores" on etapas_padrao for delete
  using (tenant_id = auth_tenant_id() and (select usuario_eh_gestor()));

-- tarefas_mensais
drop policy if exists "tenant isolado - tarefas_mensais" on tarefas_mensais;
create policy "tarefas_mensais - leitura" on tarefas_mensais for select
  using (tenant_id = auth_tenant_id());
create policy "tarefas_mensais - insercao gestores" on tarefas_mensais for insert
  with check (tenant_id = auth_tenant_id() and (select usuario_eh_gestor()));
create policy "tarefas_mensais - edicao gestores" on tarefas_mensais for update
  using (tenant_id = auth_tenant_id() and (select usuario_eh_gestor()))
  with check (tenant_id = auth_tenant_id() and (select usuario_eh_gestor()));
create policy "tarefas_mensais - exclusao gestores" on tarefas_mensais for delete
  using (tenant_id = auth_tenant_id() and (select usuario_eh_gestor()));

-- onboarding_etapas (já tinha política de leitura separada)
drop policy if exists "onboarding_etapas - escrita" on onboarding_etapas;
create policy "onboarding_etapas - insercao gestores" on onboarding_etapas for insert
  with check (tenant_id = auth_tenant_id() and (select usuario_eh_gestor()));
create policy "onboarding_etapas - edicao gestores" on onboarding_etapas for update
  using (tenant_id = auth_tenant_id() and (select usuario_eh_gestor()))
  with check (tenant_id = auth_tenant_id() and (select usuario_eh_gestor()));
create policy "onboarding_etapas - exclusao gestores" on onboarding_etapas for delete
  using (tenant_id = auth_tenant_id() and (select usuario_eh_gestor()));

-- checklists_modelo
drop policy if exists "checklists_modelo - tudo" on checklists_modelo;
create policy "checklists_modelo - leitura" on checklists_modelo for select
  using (tenant_id = auth_tenant_id());
create policy "checklists_modelo - insercao gestores" on checklists_modelo for insert
  with check (tenant_id = auth_tenant_id() and (select usuario_eh_gestor()));
create policy "checklists_modelo - edicao gestores" on checklists_modelo for update
  using (tenant_id = auth_tenant_id() and (select usuario_eh_gestor()))
  with check (tenant_id = auth_tenant_id() and (select usuario_eh_gestor()));
create policy "checklists_modelo - exclusao gestores" on checklists_modelo for delete
  using (tenant_id = auth_tenant_id() and (select usuario_eh_gestor()));

-- checklist_grupos
drop policy if exists "checklist_grupos - tudo" on checklist_grupos;
create policy "checklist_grupos - leitura" on checklist_grupos for select
  using (checklist_id in (select id from checklists_modelo where tenant_id = auth_tenant_id()));
create policy "checklist_grupos - insercao gestores" on checklist_grupos for insert
  with check (checklist_id in (select id from checklists_modelo where tenant_id = auth_tenant_id()) and (select usuario_eh_gestor()));
create policy "checklist_grupos - edicao gestores" on checklist_grupos for update
  using (checklist_id in (select id from checklists_modelo where tenant_id = auth_tenant_id()) and (select usuario_eh_gestor()))
  with check (checklist_id in (select id from checklists_modelo where tenant_id = auth_tenant_id()) and (select usuario_eh_gestor()));
create policy "checklist_grupos - exclusao gestores" on checklist_grupos for delete
  using (checklist_id in (select id from checklists_modelo where tenant_id = auth_tenant_id()) and (select usuario_eh_gestor()));

-- checklist_grupo_itens
drop policy if exists "checklist_grupo_itens - tudo" on checklist_grupo_itens;
create policy "checklist_grupo_itens - leitura" on checklist_grupo_itens for select
  using (grupo_id in (select cg.id from checklist_grupos cg join checklists_modelo cm on cm.id = cg.checklist_id where cm.tenant_id = auth_tenant_id()));
create policy "checklist_grupo_itens - insercao gestores" on checklist_grupo_itens for insert
  with check (grupo_id in (select cg.id from checklist_grupos cg join checklists_modelo cm on cm.id = cg.checklist_id where cm.tenant_id = auth_tenant_id()) and (select usuario_eh_gestor()));
create policy "checklist_grupo_itens - edicao gestores" on checklist_grupo_itens for update
  using (grupo_id in (select cg.id from checklist_grupos cg join checklists_modelo cm on cm.id = cg.checklist_id where cm.tenant_id = auth_tenant_id()) and (select usuario_eh_gestor()))
  with check (grupo_id in (select cg.id from checklist_grupos cg join checklists_modelo cm on cm.id = cg.checklist_id where cm.tenant_id = auth_tenant_id()) and (select usuario_eh_gestor()));
create policy "checklist_grupo_itens - exclusao gestores" on checklist_grupo_itens for delete
  using (grupo_id in (select cg.id from checklist_grupos cg join checklists_modelo cm on cm.id = cg.checklist_id where cm.tenant_id = auth_tenant_id()) and (select usuario_eh_gestor()));

-- modelos_processo
drop policy if exists "tenant isolado - modelos_processo" on modelos_processo;
create policy "modelos_processo - leitura" on modelos_processo for select
  using (tenant_id = auth_tenant_id());
create policy "modelos_processo - insercao gestores" on modelos_processo for insert
  with check (tenant_id = auth_tenant_id() and (select usuario_eh_gestor()));
create policy "modelos_processo - edicao gestores" on modelos_processo for update
  using (tenant_id = auth_tenant_id() and (select usuario_eh_gestor()))
  with check (tenant_id = auth_tenant_id() and (select usuario_eh_gestor()));
create policy "modelos_processo - exclusao gestores" on modelos_processo for delete
  using (tenant_id = auth_tenant_id() and (select usuario_eh_gestor()));

-- modelos_etapa
drop policy if exists "tenant isolado - modelos_etapa" on modelos_etapa;
create policy "modelos_etapa - leitura" on modelos_etapa for select
  using (modelo_processo_id in (select id from modelos_processo where tenant_id = auth_tenant_id()));
create policy "modelos_etapa - insercao gestores" on modelos_etapa for insert
  with check (modelo_processo_id in (select id from modelos_processo where tenant_id = auth_tenant_id()) and (select usuario_eh_gestor()));
create policy "modelos_etapa - edicao gestores" on modelos_etapa for update
  using (modelo_processo_id in (select id from modelos_processo where tenant_id = auth_tenant_id()) and (select usuario_eh_gestor()))
  with check (modelo_processo_id in (select id from modelos_processo where tenant_id = auth_tenant_id()) and (select usuario_eh_gestor()));
create policy "modelos_etapa - exclusao gestores" on modelos_etapa for delete
  using (modelo_processo_id in (select id from modelos_processo where tenant_id = auth_tenant_id()) and (select usuario_eh_gestor()));

-- modelos_checklist_item
drop policy if exists "tenant isolado - modelos_checklist_item" on modelos_checklist_item;
create policy "modelos_checklist_item - leitura" on modelos_checklist_item for select
  using (modelo_etapa_id in (select me.id from modelos_etapa me join modelos_processo mp on mp.id = me.modelo_processo_id where mp.tenant_id = auth_tenant_id()));
create policy "modelos_checklist_item - insercao gestores" on modelos_checklist_item for insert
  with check (modelo_etapa_id in (select me.id from modelos_etapa me join modelos_processo mp on mp.id = me.modelo_processo_id where mp.tenant_id = auth_tenant_id()) and (select usuario_eh_gestor()));
create policy "modelos_checklist_item - edicao gestores" on modelos_checklist_item for update
  using (modelo_etapa_id in (select me.id from modelos_etapa me join modelos_processo mp on mp.id = me.modelo_processo_id where mp.tenant_id = auth_tenant_id()) and (select usuario_eh_gestor()))
  with check (modelo_etapa_id in (select me.id from modelos_etapa me join modelos_processo mp on mp.id = me.modelo_processo_id where mp.tenant_id = auth_tenant_id()) and (select usuario_eh_gestor()));
create policy "modelos_checklist_item - exclusao gestores" on modelos_checklist_item for delete
  using (modelo_etapa_id in (select me.id from modelos_etapa me join modelos_processo mp on mp.id = me.modelo_processo_id where mp.tenant_id = auth_tenant_id()) and (select usuario_eh_gestor()));
