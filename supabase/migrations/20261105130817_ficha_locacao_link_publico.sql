-- Acesso público permanente, com identificação segura da proposta pelo titular.
alter table public.fichas_cadastrais_locacao
  add column if not exists codigo_proposta text not null default upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 12)),
  add column if not exists numero_fiador smallint;
create unique index if not exists fichas_locacao_codigo_proposta_uniq on public.fichas_cadastrais_locacao(codigo_proposta);
create unique index if not exists fichas_locacao_fiador_numero_uniq on public.fichas_cadastrais_locacao(ficha_principal_id, numero_fiador)
 where numero_fiador is not null and status <> 'cancelada';
alter table public.fichas_cadastrais_locacao drop constraint if exists fichas_locacao_numero_fiador_check;
alter table public.fichas_cadastrais_locacao add constraint fichas_locacao_numero_fiador_check
 check (numero_fiador is null or (tipo_locatario = 'fiador' and numero_fiador in (1,2)));