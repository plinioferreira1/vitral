-- =========================================================
-- Apaga contratos de locação de teste — criados sem
-- imóvel/locador/locatário preenchidos (numero com o padrão
-- de fallback "Contrato <timestamp>", sem locador nem
-- locatário). As contas relacionadas somem junto (on delete
-- cascade).
-- =========================================================

delete from contratos_locacao
where numero ~ '^Contrato \d+$'
  and locador_id is null
  and locatario_id is null;
