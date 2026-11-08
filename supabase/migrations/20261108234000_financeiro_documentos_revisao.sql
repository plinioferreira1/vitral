alter table public.financeiro_documentos_pdf
 add column if not exists dados_extraidos jsonb not null default '{}'::jsonb,
 add column if not exists valor_total_centavos bigint,
 add column if not exists revisado_em timestamptz;
create index if not exists financeiro_documentos_pdf_revisao_idx
 on public.financeiro_documentos_pdf(tenant_id,status,criado_em desc);