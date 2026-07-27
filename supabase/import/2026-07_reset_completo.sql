-- =========================================================
-- Reset completo dos dados de negócio.
-- Mantém: login/contas (usuarios), organização (tenants),
-- modelos de processo (modelos_processo/modelos_etapa).
-- Apaga: todos os processos (e junto, por cascade, etapas,
-- checklist, comentários, histórico e comissões), além de
-- clientes, imóveis, bancos e corretores cadastrados.
-- =========================================================

do $$
declare
  v_tenant_id uuid;
begin
  select id into v_tenant_id from public.tenants limit 1;

  -- Apaga processos primeiro: etapas, checklist_itens,
  -- comentarios, historico e comissoes somem juntos (cascade)
  delete from public.processos where tenant_id = v_tenant_id;

  delete from public.corretores where tenant_id = v_tenant_id;
  delete from public.bancos where tenant_id = v_tenant_id;
  delete from public.imoveis where tenant_id = v_tenant_id;
  delete from public.clientes where tenant_id = v_tenant_id;
end $$;
