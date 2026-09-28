-- Dados para emissão de recibo na baixa de um pagamento.
--
-- Veio originalmente como "0083_financeiro_bancos_recibo.sql", que colidiu
-- com a 0083 já aplicada (config_escrita_so_gestores) e por isso nunca
-- rodou — marcar "Gerar recibo" dava erro. Renumerada para 0085.
-- A criação automática das contas "Caixa" e "Banco do Brasil" que vinha
-- junto foi retirada: a empresa não usa esses bancos, e a tela de Bancos
-- já oferece o botão para criá-las quando necessário.

alter table financeiro_baixas
  add column if not exists gerar_recibo boolean not null default false,
  add column if not exists recibo_emitido_para text,
  add column if not exists recibo_documento text;
