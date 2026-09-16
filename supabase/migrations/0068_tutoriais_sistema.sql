-- =========================================================
-- Tutoriais de "como usar o sistema" (Vitral), organizados por
-- categoria (Vendas, Financiamento, Locação, Google Agenda...).
-- Cada tutorial é vídeo (link) ou texto (conteúdo escrito
-- direto aqui). Qualquer usuário do tenant pode ler; só quem
-- pode editar (gerente/diretor) cria, edita ou apaga.
-- =========================================================

create table tutoriais (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  categoria text not null,
  tipo text not null check (tipo in ('video', 'texto')),
  titulo text not null,
  descricao text,
  conteudo text,
  link text,
  ordem integer not null default 0,
  criado_em timestamptz not null default now()
);

alter table tutoriais enable row level security;

create policy "tutoriais - leitura" on tutoriais
  for select using (tenant_id = auth_tenant_id());

create policy "tutoriais - insercao" on tutoriais
  for insert with check (tenant_id = auth_tenant_id() and usuario_pode_editar());

create policy "tutoriais - atualizacao" on tutoriais
  for update using (tenant_id = auth_tenant_id() and usuario_pode_editar())
  with check (tenant_id = auth_tenant_id() and usuario_pode_editar());

create policy "tutoriais - remocao" on tutoriais
  for delete using (tenant_id = auth_tenant_id() and usuario_pode_editar());
