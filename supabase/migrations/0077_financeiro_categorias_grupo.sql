-- =========================================================
-- Adiciona "grupo" às categorias financeiras — mantém a mesma
-- organização em grupos (ex: "Receitas Operacionais", "Despesas
-- de Pessoal") que já existia no plano de contas real da Sacra.
-- =========================================================

alter table financeiro_categorias add column grupo text;
create index idx_financeiro_categorias_grupo on financeiro_categorias (tenant_id, tipo, grupo);
