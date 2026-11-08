-- Documentos bancários (PDF) vinculados às importações financeiras.
-- Bucket privado: acesso ao conteúdo somente por URL temporária gerada no servidor após autorização.
insert into storage.buckets(id, name, public, file_size_limit, allowed_mime_types)
values ('financeiro-pdfs', 'financeiro-pdfs', false, 4194304, array['application/pdf'])
on conflict (id) do update set public=false, file_size_limit=4194304, allowed_mime_types=array['application/pdf'];

create table if not exists public.financeiro_documentos_pdf (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  tipo text not null check (tipo in ('extrato', 'fatura')),
  arquivo_nome text not null check(length(arquivo_nome) between 1 and 240),
  arquivo_caminho text not null unique,
  arquivo_sha256 text not null check(length(arquivo_sha256)=64),
  arquivo_tamanho integer not null check(arquivo_tamanho between 1 and 4194304),
  conta_bancaria_id uuid references public.financeiro_contas_bancarias(id) on delete set null,
  cartao_id uuid references public.financeiro_cartoes(id) on delete set null,
  extrato_importacao_id uuid references public.financeiro_extrato_importacoes(id) on delete set null,
  fatura_id uuid references public.financeiro_faturas(id) on delete set null,
  status text not null default 'em_revisao' check (status in ('em_revisao','importado','erro')),
  quantidade_linhas integer not null default 0,
  observacoes text,
  criado_por uuid references public.usuarios(id) on delete set null,
  criado_em timestamptz not null default now(),
  unique(tenant_id, tipo, arquivo_sha256)
);
create index if not exists financeiro_documentos_pdf_lista_idx
  on public.financeiro_documentos_pdf(tenant_id, criado_em desc);
alter table public.financeiro_documentos_pdf enable row level security;
create policy "financeiro_documentos_pdf - acesso gestores" on public.financeiro_documentos_pdf
 for all to authenticated
 using (tenant_id = auth_tenant_id() and exists (
  select 1 from public.usuarios where id=(select auth.uid()) and ativo
    and nivel_acesso in ('diretor','gerente')
 ))
 with check (tenant_id = auth_tenant_id() and exists (
  select 1 from public.usuarios where id=(select auth.uid()) and ativo
    and nivel_acesso in ('diretor','gerente')
 ));
