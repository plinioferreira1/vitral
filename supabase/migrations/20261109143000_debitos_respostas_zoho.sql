-- Recebimento das respostas do Zoho Mail na área Inadimplências.
-- Uma mensagem recebida não certifica pagamento nem altera automaticamente o status da conferência.
alter table public.debitos_solicitacoes add column if not exists codigo_resposta text;
create unique index if not exists debitos_solicitacoes_codigo_resposta_uniq
  on public.debitos_solicitacoes (codigo_resposta) where codigo_resposta is not null;

create table if not exists public.debitos_respostas_email (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  mensagem_id text not null,
  solicitacao_id uuid references public.debitos_solicitacoes(id) on delete set null,
  administradora_id uuid references public.condominio_administradoras(id) on delete set null,
  remetente text not null,
  assunto text not null,
  resumo text,
  recebido_em timestamptz not null,
  tem_anexo boolean not null default false,
  recebido_por text not null default 'zoho',
  criado_em timestamptz not null default now(),
  unique (tenant_id, mensagem_id)
);
create index if not exists debitos_respostas_email_adm_idx
  on public.debitos_respostas_email(tenant_id, administradora_id, recebido_em desc);
create index if not exists debitos_respostas_email_solicitacao_idx
  on public.debitos_respostas_email(tenant_id, solicitacao_id);
alter table public.debitos_respostas_email enable row level security;
create policy "Locação: consultar respostas do Zoho" on public.debitos_respostas_email
  for select to authenticated using (
    tenant_id = public.auth_tenant_id() and public.debitos_pode_ver()
  );
-- Gravação exclusiva pelo backend com credencial de serviço; sem escrita direta no navegador.
