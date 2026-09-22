-- =========================================================
-- Adiciona "marketing" como categoria de permissão, do mesmo
-- jeito que venda/financiamento/locação — usada por enquanto só
-- como marcação de acesso (checkbox em Membros), sem processo/
-- kanban próprio ainda. Isso deixa pronta a organização de
-- permissões pra quando o conteúdo de Marketing for criado.
-- =========================================================

alter type categoria_processo add value 'marketing';
