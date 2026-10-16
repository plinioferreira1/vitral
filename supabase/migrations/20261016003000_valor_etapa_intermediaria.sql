-- Valor da intermediária (em centavos), informado na própria etapa e usado nos lembretes.
alter table public.etapas
  add column if not exists valor_centavos bigint check (valor_centavos is null or valor_centavos >= 0);
comment on column public.etapas.valor_centavos is 'Valor a pagar na etapa (ex.: Pagamento de Intermediária), em centavos.';
