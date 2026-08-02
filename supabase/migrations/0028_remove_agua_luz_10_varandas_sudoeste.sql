-- =========================================================
-- Remove as contas de água e luz de agosto/2026 do contrato
-- "10 Varandas Sudoeste" (apareciam como atrasadas, mas água/luz
-- não são mais controladas no sistema — ver migration 0026's
-- vizinha, remoção de água/luz/gás da tela de contas).
-- =========================================================

delete from contas_locacao
where tipo in ('agua', 'luz')
  and competencia = '2026-08-01'
  and contrato_id in (
    select cl.id
    from contratos_locacao cl
    join imoveis i on i.id = cl.imovel_id
    where i.endereco = '10 Varandas Sudoeste'
  );
