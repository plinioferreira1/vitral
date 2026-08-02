-- =========================================================
-- Histórico de simulações de custas geradas: toda vez que
-- alguém baixa a imagem de resultado na Simulação de Custas,
-- registra aqui. Usado pra mostrar "últimas simulações" no
-- Início do corretor (reabrir rápido sem digitar tudo de novo).
-- =========================================================

create table simulacoes_custas (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  usuario_id uuid not null references usuarios(id) on delete cascade,
  valor numeric not null,
  tipo_imovel text not null check (tipo_imovel in ('usado', 'novo')),
  valor_financiado numeric,
  primeiro_imovel boolean not null default false,
  instrumento_particular boolean not null default false,
  total numeric not null,
  criado_em timestamptz not null default now()
);

create index idx_simulacoes_custas_usuario on simulacoes_custas(usuario_id, criado_em desc);

alter table simulacoes_custas enable row level security;

-- Cada um só vê e cria as próprias simulações (é histórico pessoal
-- de atalho, não precisa ser visto pelo tenant inteiro).
create policy "simulacoes_custas - leitura propria" on simulacoes_custas
  for select using (usuario_id = auth.uid());
create policy "simulacoes_custas - insercao propria" on simulacoes_custas
  for insert with check (usuario_id = auth.uid() and tenant_id = auth_tenant_id());
create policy "simulacoes_custas - remocao propria" on simulacoes_custas
  for delete using (usuario_id = auth.uid());
