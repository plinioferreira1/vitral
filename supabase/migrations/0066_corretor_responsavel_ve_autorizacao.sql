-- =========================================================
-- Além de quem criou a autorização (ou quem já tem a categoria
-- liberada), o corretor que for responsável pelo PROCESSO DE
-- VENDA daquele mesmo imóvel também passa a ver o formulário
-- completo da autorização (antes só tinha acesso ao PDF
-- assinado pra baixar).
-- =========================================================

create or replace function usuario_e_responsavel_processo_imovel(p_imovel_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from processos
    where imovel_id = p_imovel_id
      and responsavel_id = auth.uid()
  )
$$;

-- ---- autorizacoes_venda (leitura) ----

drop policy "autorizacoes_venda - leitura" on autorizacoes_venda;
create policy "autorizacoes_venda - leitura" on autorizacoes_venda
  for select using (
    tenant_id = auth_tenant_id() and (
      usuario_pode_ver_documento_cliente('venda', criado_por)
      or usuario_e_responsavel_processo_imovel(imovel_id)
    )
  );

-- ---- autorizacao_signatarios (leitura) ----
-- Segue a mesma regra da autorização "pai".

drop policy "autorizacao_signatarios - leitura" on autorizacao_signatarios;
create policy "autorizacao_signatarios - leitura" on autorizacao_signatarios
  for select using (
    autorizacao_id in (
      select id from autorizacoes_venda
      where tenant_id = auth_tenant_id() and (
        usuario_pode_ver_documento_cliente('venda', criado_por)
        or usuario_e_responsavel_processo_imovel(imovel_id)
      )
    )
  );
