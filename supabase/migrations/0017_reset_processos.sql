-- =========================================================
-- Reset solicitado pelo usuário: apaga todos os processos
-- (Vendas + Financiamento) pra recomeçar o cadastro do zero.
-- Etapas, comentários, histórico e comissões de cada processo
-- somem junto (cascade). Não mexe em Locação, nem nos
-- cadastros de clientes/imóveis/bancos/corretores.
-- =========================================================

delete from processos where tenant_id = (select id from tenants limit 1);
