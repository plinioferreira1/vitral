alter table public.processos add column if not exists numero_proposta_contrato text;
comment on column public.processos.numero_proposta_contrato is 'Número da proposta ou contrato de financiamento, informado pelo usuário.';
