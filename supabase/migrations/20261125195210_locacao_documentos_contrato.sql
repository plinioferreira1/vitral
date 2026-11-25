-- Documentos anexados a cada contrato de locação (contrato, aditivo,
-- vistoria, termo, seguro incêndio). Somente acréscimos: nenhuma tabela,
-- função ou política existente é alterada.
--
-- Leitura e escrita seguem as mesmas regras do contrato: quem tem a
-- categoria Locação lê; quem pode editar envia e remove. Os arquivos ficam
-- no bucket privado `locacao-documentos`, sem políticas de storage — o
-- servidor confere a linha (com RLS) e só então gera link de envio ou de
-- leitura de curta duração com a chave de serviço.

create table if not exists public.locacao_documentos (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  contrato_id uuid not null references public.contratos_locacao(id) on delete cascade,
  tipo text not null check (tipo in ('contrato', 'aditivo', 'vistoria', 'termo', 'seguro_incendio', 'outro')),
  nome text not null check (length(btrim(nome)) between 1 and 200),
  data_documento date,
  observacao text check (observacao is null or length(observacao) <= 500),
  arquivo_caminho text not null unique,
  arquivo_nome_original text not null check (length(arquivo_nome_original) between 1 and 200),
  mime text not null check (mime in ('application/pdf', 'image/jpeg', 'image/png', 'image/webp')),
  tamanho integer not null check (tamanho > 0 and tamanho <= 15728640),
  criado_por uuid references public.usuarios(id) on delete set null,
  criado_em timestamptz not null default now()
);

create index if not exists locacao_documentos_contrato_idx on public.locacao_documentos (contrato_id, tipo, data_documento desc);
create index if not exists locacao_documentos_tenant_idx on public.locacao_documentos (tenant_id, criado_em desc);

alter table public.locacao_documentos enable row level security;

create policy "locacao documentos - leitura" on public.locacao_documentos
  for select to authenticated
  using (tenant_id = (select public.auth_tenant_id()) and public.usuario_tem_categoria('locacao'));

create policy "locacao documentos - insercao" on public.locacao_documentos
  for insert to authenticated
  with check (
    tenant_id = (select public.auth_tenant_id())
    and public.usuario_tem_categoria('locacao')
    and public.usuario_pode_editar()
    and exists (
      select 1 from public.contratos_locacao c
      where c.id = locacao_documentos.contrato_id and c.tenant_id = locacao_documentos.tenant_id
    )
  );

create policy "locacao documentos - remocao" on public.locacao_documentos
  for delete to authenticated
  using (tenant_id = (select public.auth_tenant_id()) and public.usuario_tem_categoria('locacao') and public.usuario_pode_editar());

revoke all on public.locacao_documentos from anon;
grant select, insert, delete on public.locacao_documentos to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('locacao-documentos', 'locacao-documentos', false, 15728640,
        array['application/pdf', 'image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;
