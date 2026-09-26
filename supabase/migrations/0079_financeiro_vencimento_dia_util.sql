alter table financeiro_recorrencias
  add column if not exists tipo_vencimento text not null default 'fixo' check (tipo_vencimento in ('fixo','dia_util')),
  add column if not exists dia_util smallint;
