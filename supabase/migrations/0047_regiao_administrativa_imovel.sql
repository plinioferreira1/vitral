-- =========================================================
-- Guarda a Região Administrativa do imóvel, pra poder
-- calcular sozinho o foro (circunscrição judiciária) certo em
-- documentos jurídicos, em vez de usar sempre "Brasília/DF".
-- =========================================================

alter table imoveis add column regiao_administrativa text;
