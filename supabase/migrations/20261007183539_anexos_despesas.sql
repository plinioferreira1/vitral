-- Um documento por despesa. Escrita e arquivos somente pelo servidor autorizado.
create table public.financeiro_anexos (
  lancamento_id uuid primary key references public.financeiro_lancamentos(id) on delete cascade,
  tenant_id uuid not null references public.tenants(id),
  caminho text not null unique,
  nome text not null check (length(nome) between 1 and 200),
  mime text not null check (mime in ('application/pdf', 'image/jpeg', 'image/png', 'image/webp')),
  tamanho integer not null check (tamanho between 1 and 3145728),
  criado_por uuid references public.usuarios(id) on delete set null,
  criado_em timestamptz not null default now(),
  constraint financeiro_anexo_pasta check (split_part(caminho, '/', 1) = tenant_id::text and split_part(caminho, '/', 2) = lancamento_id::text and array_length(string_to_array(caminho, '/'), 1) = 3 and caminho not like '%..%')
);
create index financeiro_anexos_tenant_idx on public.financeiro_anexos(tenant_id);
create index financeiro_anexos_criador_idx on public.financeiro_anexos(criado_por);
alter table public.financeiro_anexos enable row level security;
revoke all on public.financeiro_anexos from anon, authenticated;
grant select on public.financeiro_anexos to authenticated;
grant all on public.financeiro_anexos to service_role;
create policy "financeiro anexos leitura gestores" on public.financeiro_anexos
for select to authenticated using (
  tenant_id = (select public.auth_tenant_id())
  and exists (select 1 from public.usuarios u where u.id = (select auth.uid()) and u.ativo and u.nivel_acesso in ('diretor', 'gerente'))
  and exists (select 1 from public.financeiro_lancamentos l where l.id = lancamento_id and l.tenant_id = financeiro_anexos.tenant_id and l.tipo = 'despesa')
);
insert into storage.buckets(id, name, public, file_size_limit, allowed_mime_types)
values ('financeiro-despesas', 'financeiro-despesas', false, 3145728, array['application/pdf', 'image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;
-- Sem políticas de storage.objects para este bucket: só links temporários gerados pelo servidor.
