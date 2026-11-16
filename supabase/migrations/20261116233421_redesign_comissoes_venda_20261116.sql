-- Preserva os rateios existentes; cada linha da comissão continua representando um pagamento/uma parcela.
alter table public.comissoes
  add column if not exists grupo_rateio uuid,
  add column if not exists parcela_numero integer,
  add column if not exists parcela_total integer,
  add column if not exists beneficiario_nome text;

alter table public.comissoes drop constraint if exists comissoes_tipo_beneficiario_check;
alter table public.comissoes add constraint comissoes_tipo_beneficiario_check
  check (tipo_beneficiario in ('corretor','sacra','parceria','externo'));
alter table public.comissoes add constraint comissoes_parcelas_validas_check
  check (
    (parcela_numero is null and parcela_total is null)
    or (parcela_numero >= 1 and parcela_total >= 1 and parcela_numero <= parcela_total and parcela_total <= 60)
  );
alter table public.comissoes add constraint comissoes_beneficiario_externo_check
  check (tipo_beneficiario <> 'externo' or (beneficiario_nome is not null and char_length(btrim(beneficiario_nome)) between 2 and 120));
create index if not exists comissoes_grupo_rateio_idx on public.comissoes(grupo_rateio) where grupo_rateio is not null;
