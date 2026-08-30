-- =========================================================
-- Alerta de contagem regressiva pro prazo final do contrato
-- (data_final_contrato), em Vendas e Financiamentos. Diferente
-- dos eventos de etapa (um por prazo), aqui geramos uma série
-- de eventos diários — um pra cada dia dos últimos 30 antes do
-- prazo — pra aparecer como aviso recorrente no Google Agenda
-- até o prazo final chegar.
--
-- Guardamos como jsonb (lista de {data, event_id}) porque são
-- vários eventos por processo, não um só.
-- =========================================================

alter table processos add column google_alerta_contrato jsonb not null default '[]'::jsonb;
