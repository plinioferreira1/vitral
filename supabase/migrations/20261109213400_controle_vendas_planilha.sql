-- Separa o fechamento comercial do andamento operacional das etapas.
-- Aplicada à base Vitral em 2026-11-09; mantida no repositório para rastreabilidade.
alter table public.processos
  add column if not exists situacao_comercial text
  check (situacao_comercial in ('concluida', 'andamento'));

alter table public.vendas_fontes_historicas
  add column if not exists situacao_comercial text not null default 'concluida'
  check (situacao_comercial in ('concluida', 'andamento'));
