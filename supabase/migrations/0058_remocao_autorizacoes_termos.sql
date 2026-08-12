-- =========================================================
-- Autorizacoes_venda e termos_visita ainda nao tinham policy
-- de remocao (so leitura/insercao/atualizacao) -- precisa pra
-- dar pra apagar pela tela, igual ja existe em processos e
-- contratos_locacao.
-- =========================================================

create policy "autorizacoes_venda - remocao" on autorizacoes_venda
  for delete using (
    tenant_id = auth_tenant_id() and usuario_pode_ver_documento_cliente('venda', criado_por)
  );

create policy "termos_visita - remocao" on termos_visita
  for delete using (
    tenant_id = auth_tenant_id()
    and (
      usuario_pode_ver_documento_cliente('venda', criado_por)
      or usuario_pode_ver_documento_cliente('locacao', criado_por)
    )
  );
