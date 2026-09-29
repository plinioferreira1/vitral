-- Fichas cadastrais públicas de locação e documentos privados.
create table public.fichas_cadastrais_locacao (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  token uuid not null default gen_random_uuid() unique,
  status text not null default 'aguardando' check (status in ('aguardando','em_preenchimento','concluida','cancelada')),
  proponente_nome text,
  proponente_email text,
  imovel_referencia text,
  dados jsonb not null default '{}'::jsonb,
  assinatura_imagem text,
  consentimento_lgpd boolean not null default false,
  criado_por uuid references public.usuarios(id),
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  concluido_em timestamptz,
  expira_em timestamptz not null default (now() + interval '30 days'),
  ip_conclusao text,
  user_agent_conclusao text
);

create table public.ficha_locacao_documentos (
  id uuid primary key default gen_random_uuid(),
  ficha_id uuid not null references public.fichas_cadastrais_locacao(id) on delete cascade,
  tipo text not null,
  nome_arquivo text not null,
  caminho_storage text not null unique,
  tamanho_bytes bigint not null check (tamanho_bytes > 0 and tamanho_bytes <= 10485760),
  mime_type text not null,
  criado_em timestamptz not null default now()
);

create index fichas_locacao_tenant_status_idx on public.fichas_cadastrais_locacao(tenant_id, status, criado_em desc);
create index fichas_locacao_criado_por_idx on public.fichas_cadastrais_locacao(criado_por);
create index ficha_locacao_documentos_ficha_idx on public.ficha_locacao_documentos(ficha_id);

alter table public.fichas_cadastrais_locacao enable row level security;
alter table public.ficha_locacao_documentos enable row level security;

create policy "fichas locacao leitura tenant" on public.fichas_cadastrais_locacao
  for select to authenticated
  using (tenant_id = public.auth_tenant_id());
create policy "fichas locacao insercao tenant" on public.fichas_cadastrais_locacao
  for insert to authenticated
  with check (tenant_id = public.auth_tenant_id() and criado_por = (select auth.uid()));
create policy "fichas locacao atualizacao tenant" on public.fichas_cadastrais_locacao
  for update to authenticated
  using (tenant_id = public.auth_tenant_id())
  with check (tenant_id = public.auth_tenant_id());

create policy "documentos ficha leitura tenant" on public.ficha_locacao_documentos
  for select to authenticated
  using (exists (
    select 1 from public.fichas_cadastrais_locacao f
    where f.id = ficha_id and f.tenant_id = public.auth_tenant_id()
  ));

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'fichas-locacao', 'fichas-locacao', false, 10485760,
  array['application/pdf','image/jpeg','image/png','image/webp']
)
on conflict (id) do update set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Somente usuários do tenant podem baixar. Uploads públicos usam URLs
-- assinadas de curta duração emitidas no servidor após validar o token.
create policy "documentos locacao download tenant" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'fichas-locacao'
    and (storage.foldername(name))[1] = public.auth_tenant_id()::text
  );

grant select, insert, update on public.fichas_cadastrais_locacao to authenticated;
grant select on public.ficha_locacao_documentos to authenticated;
