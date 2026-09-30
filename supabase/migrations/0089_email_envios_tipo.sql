-- O mesmo registro de envios passa a guardar os dois e-mails diários:
-- o resumo financeiro e o novo resumo dos processos.
alter table financeiro_email_envios
  add column if not exists tipo text not null default 'financeiro'
  check (tipo in ('financeiro', 'processos'));
