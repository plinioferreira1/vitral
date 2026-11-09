-- Guarda a origem comercial de cada venda no próprio processo.
alter table public.processos
  add column if not exists fonte_lead text,
  add column if not exists fonte_lead_observacoes text,
  add column if not exists data_venda date;

comment on column public.processos.fonte_lead is 'Canal que originou o comprador da venda';
comment on column public.processos.fonte_lead_observacoes is 'Observação complementar da origem do lead';
comment on column public.processos.data_venda is 'Data comercial da venda, independente do encerramento operacional do processo';
