-- =========================================================
-- Acesso ao portal da administradora de condomínio, quando
-- ela disponibiliza um (pra consultar inadimplências mais
-- rápido). Campos opcionais, um contrato pode não ter.
-- =========================================================

alter table contratos_locacao add column portal_administradora_url text;
alter table contratos_locacao add column portal_administradora_login text;
alter table contratos_locacao add column portal_administradora_senha text;
