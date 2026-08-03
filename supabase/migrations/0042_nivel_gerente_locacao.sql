-- =========================================================
-- Novo nível de acesso: "gerente_locacao". Diferente do
-- "gerente" comum (que vê todas as categorias automaticamente),
-- o gerente de locação só vê as categorias marcadas em
-- usuario_categorias — igual ao supervisor, mas com permissão
-- de escrita de gerente. Ver migration seguinte pro resto do
-- ajuste (não dá pra usar o valor novo na mesma migration que
-- o cria).
-- =========================================================

alter type nivel_acesso_usuario add value if not exists 'gerente_locacao';
