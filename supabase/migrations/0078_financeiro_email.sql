-- =========================================================
-- Módulo Financeiro — Etapa 3: e-mail diário. Guarda quem recebe
-- o relatório e um histórico de cada envio (pra debug/auditoria).
-- =========================================================

create table financeiro_email_destinatarios (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  email text not null,
  nome text,
  ativo boolean not null default true,
  criado_em timestamptz not null default now(),
  unique (tenant_id, email)
);

create table financeiro_email_envios (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  enviado_em timestamptz not null default now(),
  destinatarios text[] not null,
  sucesso boolean not null,
  erro text,
  resumo jsonb
);

alter table financeiro_email_destinatarios enable row level security;
alter table financeiro_email_envios enable row level security;

create policy "financeiro_email_destinatarios - acesso total diretor/gerente" on financeiro_email_destinatarios
  for all using (
    tenant_id = auth_tenant_id() and
    exists (select 1 from usuarios where id = auth.uid() and nivel_acesso in ('diretor', 'gerente'))
  )
  with check (
    tenant_id = auth_tenant_id() and
    exists (select 1 from usuarios where id = auth.uid() and nivel_acesso in ('diretor', 'gerente'))
  );

create policy "financeiro_email_envios - leitura diretor/gerente" on financeiro_email_envios
  for select using (
    tenant_id = auth_tenant_id() and
    exists (select 1 from usuarios where id = auth.uid() and nivel_acesso in ('diretor', 'gerente'))
  );
