-- Novo layout comercial do termo de visita, preservando os registros e assinaturas anteriores.
alter table public.termos_visita
  add column if not exists imoveis_visitados jsonb not null default '[]'::jsonb,
  add column if not exists hora_visita time,
  add column if not exists cliente_cpf_informado text,
  add column if not exists cliente_rg_informado text,
  add column if not exists corretor_creci text,
  add column if not exists corretor_creci_j text,
  add column if not exists imobiliaria_parceira text;
comment on column public.termos_visita.imoveis_visitados is 'Até sete imóveis: descrição, código e valor em reais, em ordem de visita.';
