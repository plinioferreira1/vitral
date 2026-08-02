-- =========================================================
-- Corrige contas de locação que ficaram sem vencimento
-- definido (bug: alternarStatusConta criava a linha sem
-- vencimento quando a célula do grid não existia ainda).
-- Sem vencimento, a urgência cai pra competência (dia 1),
-- fazendo a conta aparecer como atrasada já no dia 2 do mês —
-- quando devia esperar até o dia 15.
--
-- Mesma regra já usada na migration 0021: dia 15 do mês de
-- competência.
-- =========================================================

update contas_locacao
set vencimento = date_trunc('month', competencia)::date + interval '14 days'
where vencimento is null;
