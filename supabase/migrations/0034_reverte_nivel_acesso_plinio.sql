-- =========================================================
-- Reverte o nível de acesso do Plínio, que tinha ficado
-- "corretor" por engano, de volta pra "diretor".
-- =========================================================

update usuarios
set nivel_acesso = 'diretor'
where email = 'plinio.sacraimoveis@gmail.com';
