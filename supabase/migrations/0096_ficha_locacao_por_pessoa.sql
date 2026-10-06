-- Ficha cadastral de locação: uma ficha por pessoa (titular, corresponsável,
-- fiador), todas ligadas à ficha do titular da proposta.
alter table public.fichas_cadastrais_locacao
  add column tipo_locatario text not null default 'titular'
    check (tipo_locatario in ('titular','corresponsavel','fiador')),
  add column ficha_principal_id uuid references public.fichas_cadastrais_locacao(id) on delete cascade,
  add constraint fichas_locacao_vinculo_coerente check (
    (tipo_locatario = 'titular' and ficha_principal_id is null)
    or (tipo_locatario <> 'titular' and ficha_principal_id is not null)
  );

create index fichas_locacao_principal_idx on public.fichas_cadastrais_locacao(ficha_principal_id);
