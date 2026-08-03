-- =========================================================
-- Gerente de locação não tem acesso automático a todas as
-- categorias (diferente do gerente comum) — só vê o que
-- estiver marcado em usuario_categorias, igual ao supervisor.
-- A função usuario_tem_categoria() já trata isso: só
-- diretor/gerente/auxiliar têm bypass automático, e
-- 'gerente_locacao' é um valor novo que nunca esteve nessa
-- lista, então já nasce restrito por padrão — não precisa
-- redefinir a função.
--
-- Renato passa a ser gerente de locação (só vê locação, não
-- todas as categorias automaticamente).
-- =========================================================

update usuarios
set nivel_acesso = 'gerente_locacao'
where nome ilike '%Renato%';
