alter table financeiro_categorias
  add column if not exists centro_custo_padrao_id uuid references financeiro_centros_custo(id) on delete set null;
