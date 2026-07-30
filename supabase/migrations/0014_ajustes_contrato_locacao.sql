-- =========================================================
-- Ajustes no contrato de locação:
-- - código do cliente é da Luz, não da Água (mantém o campo
--   antigo intocado, só não usamos mais na tela)
-- - data de encerramento, pra quando o contrato for rescindido
-- =========================================================

alter table contratos_locacao add column luz_codigo_cliente text;
alter table contratos_locacao add column data_encerramento date;
