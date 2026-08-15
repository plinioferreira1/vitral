-- =========================================================
-- Campo pra guardar o número do registro do cartório (ex:
-- TJDFT20260310047259GSXO) na etapa "Registro" -- vale tanto
-- pra Venda quanto Financiamento, que compartilham esse nome
-- de etapa.
-- =========================================================

alter table etapas add column numero_registro text;
