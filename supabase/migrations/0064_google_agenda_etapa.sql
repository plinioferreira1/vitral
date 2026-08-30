-- =========================================================
-- Integração com o Google Agenda.
--
-- Cada etapa com prazo (data_prevista) pode ter um evento
-- correspondente numa das 3 agendas do Google (venda,
-- financiamento, locação — mapeadas por categoria do
-- processo). Guardamos o ID do evento no Google pra saber
-- se é preciso criar um novo ou atualizar/apagar o existente.
-- =========================================================

alter table etapas add column google_event_id text;
