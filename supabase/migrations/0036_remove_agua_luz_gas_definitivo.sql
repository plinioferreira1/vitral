-- =========================================================
-- Remove de vez todos os traços de água, luz e gás em
-- contas_locacao (qualquer contrato, qualquer mês/ano,
-- qualquer status). Esses tipos não são mais controlados no
-- sistema desde que Água/Luz saíram da tela de contas e do
-- formulário do contrato (ver comentário da migration 0026).
-- =========================================================

delete from contas_locacao
where tipo in ('agua', 'luz', 'gas');
