-- =========================================================
-- Apaga todos os contratos de locação (e, por cascade, todas
-- as contas de cada um) pra recomeçar do zero com o padrão
-- ajustado. Não mexe em nada de Vendas/Financiamento.
-- =========================================================

delete from contratos_locacao where tenant_id = (select id from tenants limit 1);
