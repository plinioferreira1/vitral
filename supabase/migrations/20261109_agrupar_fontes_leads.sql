-- Agrupamento das fontes personalizadas; não altera fontes de vendas existentes.
alter table public.vendas_fontes_personalizadas
  add column if not exists categoria text not null default 'outros';
alter table public.vendas_fontes_personalizadas
  drop constraint if exists vendas_fontes_personalizadas_categoria_check;
alter table public.vendas_fontes_personalizadas
  add constraint vendas_fontes_personalizadas_categoria_check
  check (categoria in ('portais','marketing','relacionamento','rede','outros'));
