-- =========================================================
-- Campo "responsável" na própria autorização de venda —
-- separado de "criado_por". Por padrão começa igual a quem
-- criou, mas pode ser reatribuído (ex: outro corretor assume
-- o atendimento daquele proprietário). É esse campo, e não um
-- processo vinculado, que agora controla quem mais enxerga o
-- formulário completo da autorização.
-- =========================================================

alter table autorizacoes_venda add column responsavel_id uuid references usuarios(id);
update autorizacoes_venda set responsavel_id = criado_por where responsavel_id is null;

-- ---- autorizacoes_venda (leitura) ----

drop policy "autorizacoes_venda - leitura" on autorizacoes_venda;
create policy "autorizacoes_venda - leitura" on autorizacoes_venda
  for select using (
    tenant_id = auth_tenant_id() and (
      usuario_pode_ver_documento_cliente('venda', criado_por)
      or responsavel_id = auth.uid()
    )
  );

-- ---- autorizacao_signatarios (leitura) ----

drop policy "autorizacao_signatarios - leitura" on autorizacao_signatarios;
create policy "autorizacao_signatarios - leitura" on autorizacao_signatarios
  for select using (
    autorizacao_id in (
      select id from autorizacoes_venda
      where tenant_id = auth_tenant_id() and (
        usuario_pode_ver_documento_cliente('venda', criado_por)
        or responsavel_id = auth.uid()
      )
    )
  );

-- Quem já pode ler a autorização (dono, responsável ou categoria
-- liberada) também pode reatribuir o responsável.
drop policy "autorizacoes_venda - atualizacao" on autorizacoes_venda;
create policy "autorizacoes_venda - atualizacao" on autorizacoes_venda
  for update using (
    tenant_id = auth_tenant_id() and (
      usuario_pode_ver_documento_cliente('venda', criado_por)
      or responsavel_id = auth.uid()
    )
  )
  with check (
    tenant_id = auth_tenant_id() and (
      usuario_pode_ver_documento_cliente('venda', criado_por)
      or responsavel_id = auth.uid()
    )
  );

drop function if exists usuario_e_responsavel_processo_imovel(uuid);
