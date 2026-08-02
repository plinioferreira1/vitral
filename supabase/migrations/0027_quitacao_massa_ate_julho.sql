-- =========================================================
-- Quitação em massa: todas as contas de locação pendentes com
-- competência de julho de 2026 pra trás (qualquer tipo, qualquer
-- contrato) passam pra "pago". As de agosto/2026 em diante ficam
-- como estão.
-- =========================================================

update contas_locacao
set status = 'pago'
where status = 'pendente'
  and competencia <= '2026-07-01';
