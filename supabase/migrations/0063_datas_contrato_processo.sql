-- =========================================================
-- Duas datas novas em processos (Vendas/Financiamentos):
-- data de assinatura do contrato e data final (validade/prazo
-- de conclusão) do contrato. Preenchidas manualmente, aparecem
-- na tabela "Em andamento".
-- =========================================================

alter table processos add column data_assinatura date;
alter table processos add column data_final_contrato date;
