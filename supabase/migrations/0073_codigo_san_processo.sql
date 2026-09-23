-- =========================================================
-- Código SAN do processo — código interno de referência que a
-- Sacra já usa (mesmo conceito da Carta Proposta), agora
-- também disponível em qualquer processo de Venda/Financiamento,
-- aparecendo no lugar do número interno (PROC-...) nas listas.
-- =========================================================

alter table processos add column codigo_san text;
