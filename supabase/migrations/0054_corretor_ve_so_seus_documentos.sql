-- =========================================================
-- Corretor só pode ver os Termos de Visita e Autorizações de
-- Venda que ele mesmo criou (não os de outros corretores).
-- Quem já tem a categoria liberada (diretor/gerente/supervisor
-- com categoria 'venda', etc.) continua vendo tudo, normalmente.
-- =========================================================

create or replace function usuario_pode_ver_documento_cliente(p_categoria categoria_processo, p_criado_por uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select usuario_tem_categoria(p_categoria) or p_criado_por = auth.uid()
$$;

-- ---- autorizacoes_venda ----

drop policy "autorizacoes_venda - leitura" on autorizacoes_venda;
create policy "autorizacoes_venda - leitura" on autorizacoes_venda
  for select using (
    tenant_id = auth_tenant_id() and usuario_pode_ver_documento_cliente('venda', criado_por)
  );

drop policy "autorizacoes_venda - atualizacao" on autorizacoes_venda;
create policy "autorizacoes_venda - atualizacao" on autorizacoes_venda
  for update using (
    tenant_id = auth_tenant_id() and usuario_pode_ver_documento_cliente('venda', criado_por)
  )
  with check (
    tenant_id = auth_tenant_id() and usuario_pode_ver_documento_cliente('venda', criado_por)
  );

-- ---- autorizacao_signatarios ----

drop policy "autorizacao_signatarios - leitura" on autorizacao_signatarios;
create policy "autorizacao_signatarios - leitura" on autorizacao_signatarios
  for select using (
    autorizacao_id in (
      select id from autorizacoes_venda
      where tenant_id = auth_tenant_id() and usuario_pode_ver_documento_cliente('venda', criado_por)
    )
  );

-- ---- termos_visita (antes sem restricao nenhuma de leitura) ----
-- Visita pode ser de imóvel de venda OU de locação, então checa as
-- duas categorias, não só uma.

drop policy "termos_visita - leitura" on termos_visita;
create policy "termos_visita - leitura" on termos_visita
  for select using (
    tenant_id = auth_tenant_id()
    and (
      usuario_pode_ver_documento_cliente('venda', criado_por)
      or usuario_pode_ver_documento_cliente('locacao', criado_por)
    )
  );

drop policy "termos_visita - atualizacao" on termos_visita;
create policy "termos_visita - atualizacao" on termos_visita
  for update using (
    tenant_id = auth_tenant_id()
    and (
      usuario_pode_ver_documento_cliente('venda', criado_por)
      or usuario_pode_ver_documento_cliente('locacao', criado_por)
    )
  )
  with check (
    tenant_id = auth_tenant_id()
    and (
      usuario_pode_ver_documento_cliente('venda', criado_por)
      or usuario_pode_ver_documento_cliente('locacao', criado_por)
    )
  );
