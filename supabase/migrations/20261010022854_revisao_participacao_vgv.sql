-- Distingue participação histórica de papéis revisados pela equipe, inclusive quando o captador é removido.
alter table public.processos add column if not exists participacao_vgv_revisada boolean not null default false;
