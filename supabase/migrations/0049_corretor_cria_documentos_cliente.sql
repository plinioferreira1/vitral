-- =========================================================
-- Libera o nível "corretor" pra criar e ver Autorizações de
-- Venda e Termos de Visita — são os dois documentos que o
-- corretor de fato usa no dia a dia (não faz sentido ele
-- depender de um gerente pra gerar o link de assinatura).
-- Continua sem acesso a processos/locação/etc, que usam
-- usuario_pode_editar()/usuario_tem_categoria() sem alteração.
-- =========================================================

create or replace function usuario_pode_criar_documento_cliente()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select coalesce(
    (select nivel_acesso != 'auxiliar' from usuarios where id = auth.uid()),
    false
  )
$$;

create or replace function usuario_pode_ver_documento_cliente(p_categoria categoria_processo)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select usuario_tem_categoria(p_categoria) or exists (
    select 1 from usuarios u where u.id = auth.uid() and u.nivel_acesso = 'corretor'
  )
$$;

-- ---- autorizacoes_venda ----

drop policy "autorizacoes_venda - leitura" on autorizacoes_venda;
create policy "autorizacoes_venda - leitura" on autorizacoes_venda
  for select using (tenant_id = auth_tenant_id() and usuario_pode_ver_documento_cliente('venda'));

drop policy "autorizacoes_venda - insercao" on autorizacoes_venda;
create policy "autorizacoes_venda - insercao" on autorizacoes_venda
  for insert with check (tenant_id = auth_tenant_id() and usuario_pode_criar_documento_cliente());

drop policy "autorizacoes_venda - atualizacao" on autorizacoes_venda;
create policy "autorizacoes_venda - atualizacao" on autorizacoes_venda
  for update using (tenant_id = auth_tenant_id() and usuario_pode_ver_documento_cliente('venda'))
  with check (tenant_id = auth_tenant_id() and usuario_pode_ver_documento_cliente('venda'));

-- ---- autorizacao_signatarios ----

drop policy "autorizacao_signatarios - leitura" on autorizacao_signatarios;
create policy "autorizacao_signatarios - leitura" on autorizacao_signatarios
  for select using (
    autorizacao_id in (
      select id from autorizacoes_venda
      where tenant_id = auth_tenant_id() and usuario_pode_ver_documento_cliente('venda')
    )
  );

drop policy "autorizacao_signatarios - insercao" on autorizacao_signatarios;
create policy "autorizacao_signatarios - insercao" on autorizacao_signatarios
  for insert with check (
    autorizacao_id in (select id from autorizacoes_venda where tenant_id = auth_tenant_id())
    and usuario_pode_criar_documento_cliente()
  );

drop policy "autorizacao_signatarios - remocao" on autorizacao_signatarios;
create policy "autorizacao_signatarios - remocao" on autorizacao_signatarios
  for delete using (
    autorizacao_id in (select id from autorizacoes_venda where tenant_id = auth_tenant_id())
    and usuario_pode_criar_documento_cliente()
  );

-- ---- termos_visita ----

drop policy "termos_visita - insercao" on termos_visita;
create policy "termos_visita - insercao" on termos_visita
  for insert with check (tenant_id = auth_tenant_id() and usuario_pode_criar_documento_cliente());
