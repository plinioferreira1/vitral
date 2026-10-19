-- Certidões de "nada consta" das partes de uma venda (emissão assistida).
-- O Vitral não acessa os sites oficiais: a equipe emite, anexa e o sistema
-- acompanha a validade. Uma certidão vigente por processo, parte e tipo.
-- Leitura para quem enxerga o processo; escrita e arquivos só pelo servidor.
create table public.processo_certidoes (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  processo_id uuid not null references public.processos(id) on delete cascade,
  parte text not null check (parte in ('vendedor', 'comprador')),
  cliente_id uuid references public.clientes(id) on delete set null,
  tipo text not null check (tipo in ('tjdft_especial', 'tjdft_falencias', 'trf1_civel', 'trf1_criminal', 'trt10', 'cndt', 'receita_federal', 'receita_df')),
  resultado text not null default 'nada_consta' check (resultado in ('nada_consta', 'positiva')),
  emitida_em date not null,
  valida_ate date not null check (valida_ate >= emitida_em),
  caminho text not null unique,
  nome_arquivo text not null check (length(nome_arquivo) between 1 and 200),
  mime text not null check (mime in ('application/pdf', 'image/jpeg', 'image/png', 'image/webp')),
  tamanho integer not null check (tamanho between 1 and 3145728),
  criado_por uuid references public.usuarios(id) on delete set null,
  criado_em timestamptz not null default now(),
  unique (processo_id, parte, tipo),
  constraint processo_certidoes_pasta check (
    split_part(caminho, '/', 1) = tenant_id::text
    and split_part(caminho, '/', 2) = processo_id::text
    and array_length(string_to_array(caminho, '/'), 1) = 3
    and caminho not like '%..%'
  )
);
create index processo_certidoes_tenant_idx on public.processo_certidoes (tenant_id, valida_ate);
create index processo_certidoes_cliente_idx on public.processo_certidoes (cliente_id);
create index processo_certidoes_criador_idx on public.processo_certidoes (criado_por);

alter table public.processo_certidoes enable row level security;
revoke all on public.processo_certidoes from anon, authenticated;
grant select on public.processo_certidoes to authenticated;
grant all on public.processo_certidoes to service_role;

-- Quem enxerga o processo (pelas regras atuais de processos) enxerga as certidões dele.
create policy "processo certidoes leitura" on public.processo_certidoes
  for select to authenticated
  using (
    tenant_id = (select public.auth_tenant_id())
    and exists (select 1 from public.processos p where p.id = processo_id)
  );

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('processos-certidoes', 'processos-certidoes', false, 3145728, array['application/pdf', 'image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;
-- Sem políticas em storage.objects para este bucket: só links temporários gerados pelo servidor.
