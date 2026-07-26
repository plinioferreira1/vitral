-- =========================================================
-- Prazo — schema inicial (MVP)
-- Módulos cobertos: motor de processos (modelos + processos +
-- etapas + checklist) e calendário/alertas.
-- =========================================================

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------
-- 1. Tenants e usuários
-- ---------------------------------------------------------

create table tenants (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  criado_em timestamptz not null default now()
);

-- Perfil de acesso. Mantido simples (texto com check) no MVP;
-- pode virar tabela própria (com permissões finas) na V2.
create type perfil_usuario as enum (
  'admin', 'diretora', 'gerente', 'corretor', 'correspondente', 'financeiro'
);

create table usuarios (
  id uuid primary key references auth.users(id) on delete cascade,
  tenant_id uuid not null references tenants(id) on delete cascade,
  nome text not null,
  email text not null,
  perfil perfil_usuario not null default 'corretor',
  ativo boolean not null default true,
  criado_em timestamptz not null default now()
);

-- ---------------------------------------------------------
-- 2. Cadastros base
-- ---------------------------------------------------------

create table clientes (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  nome text not null,
  cpf_cnpj text,
  telefone text,
  email text,
  endereco text,
  observacoes text,
  criado_em timestamptz not null default now()
);

create table bancos (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  nome text not null,
  contato text
);

create table corretores (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  usuario_id uuid references usuarios(id) on delete set null,
  nome text not null,
  percentual_comissao_padrao numeric(5,2)
);

create table imoveis (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  endereco text not null,
  matricula text,
  tipo text check (tipo in ('residencial','comercial','terreno')) default 'residencial',
  valor numeric(14,2),
  proprietario_id uuid references clientes(id) on delete set null
);

-- ---------------------------------------------------------
-- 3. Motor de processos — MODELOS (definição / templates)
-- ---------------------------------------------------------

create table modelos_processo (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  nome text not null,
  descricao text,
  ativo boolean not null default true,
  criado_em timestamptz not null default now()
);

create type tipo_regra_data as enum (
  'fixa',                     -- usa a data informada na criação do processo
  'relativa_criacao',         -- data_criacao_processo + dias_offset
  'relativa_etapa_anterior',  -- data_realizada da etapa_referencia + dias_offset
  'manual'                    -- sem data automática; usuário define depois
);

create table modelos_etapa (
  id uuid primary key default gen_random_uuid(),
  modelo_processo_id uuid not null references modelos_processo(id) on delete cascade,
  ordem int not null,
  nome text not null,
  responsavel_padrao_perfil perfil_usuario,
  tipo_regra_data tipo_regra_data not null default 'manual',
  dias_offset int not null default 0,
  etapa_referencia_id uuid references modelos_etapa(id) on delete set null,
  obrigatoria boolean not null default true
);

create table modelos_checklist_item (
  id uuid primary key default gen_random_uuid(),
  modelo_etapa_id uuid not null references modelos_etapa(id) on delete cascade,
  descricao text not null,
  ordem int not null default 0
);

-- ---------------------------------------------------------
-- 4. Motor de processos — EXECUÇÃO (instâncias reais)
-- ---------------------------------------------------------

create table processos (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  modelo_processo_id uuid references modelos_processo(id),
  numero_processo text not null,
  cliente_id uuid references clientes(id),
  imovel_id uuid references imoveis(id),
  banco_id uuid references bancos(id),
  corretor_id uuid references corretores(id),
  responsavel_id uuid references usuarios(id),
  tipo text,
  status text not null check (status in ('ativo','pendente','concluido','arquivado','cancelado')) default 'ativo',
  valor_total numeric(14,2),
  data_criacao date not null default current_date,
  data_conclusao date,
  criado_em timestamptz not null default now()
);

create table etapas (
  id uuid primary key default gen_random_uuid(),
  processo_id uuid not null references processos(id) on delete cascade,
  modelo_etapa_id uuid references modelos_etapa(id),
  nome text not null,
  responsavel_id uuid references usuarios(id),
  data_prevista date,
  data_realizada date,
  status text not null check (status in ('pendente','em_andamento','concluida','bloqueada')) default 'pendente',
  ordem int not null default 0,
  etapa_dependencia_id uuid references etapas(id) on delete set null
);

create table checklist_itens (
  id uuid primary key default gen_random_uuid(),
  etapa_id uuid not null references etapas(id) on delete cascade,
  descricao text not null,
  concluido boolean not null default false,
  concluido_por uuid references usuarios(id),
  concluido_em timestamptz,
  ordem int not null default 0
);

-- ---------------------------------------------------------
-- 5. Registros e evidências (versão enxuta pro MVP)
-- ---------------------------------------------------------

create table comentarios (
  id uuid primary key default gen_random_uuid(),
  processo_id uuid not null references processos(id) on delete cascade,
  etapa_id uuid references etapas(id) on delete cascade,
  usuario_id uuid references usuarios(id),
  texto text not null,
  criado_em timestamptz not null default now()
);

create table historico (
  id uuid primary key default gen_random_uuid(),
  processo_id uuid not null references processos(id) on delete cascade,
  etapa_id uuid references etapas(id),
  usuario_id uuid references usuarios(id),
  acao text not null,
  detalhe jsonb,
  criado_em timestamptz not null default now()
);

-- ---------------------------------------------------------
-- 6. Índices úteis
-- ---------------------------------------------------------

create index idx_processos_tenant on processos(tenant_id);
create index idx_processos_status on processos(status);
create index idx_etapas_processo on etapas(processo_id);
create index idx_etapas_data_prevista on etapas(data_prevista);
create index idx_etapas_status on etapas(status);
create index idx_checklist_etapa on checklist_itens(etapa_id);

-- ---------------------------------------------------------
-- 7. Função utilitária: tenant do usuário logado
-- ---------------------------------------------------------

create or replace function auth_tenant_id()
returns uuid
language sql
security definer
stable
set search_path = public
as $$
  select tenant_id from public.usuarios where id = auth.uid()
$$;

-- ---------------------------------------------------------
-- 8. Row Level Security — isolamento por tenant
-- No MVP, qualquer usuário autenticado do tenant pode ler/
-- escrever os dados do próprio tenant (permissões finas por
-- perfil ficam para a V2, ver especificação seção 14).
-- ---------------------------------------------------------

alter table tenants enable row level security;
alter table usuarios enable row level security;
alter table clientes enable row level security;
alter table bancos enable row level security;
alter table corretores enable row level security;
alter table imoveis enable row level security;
alter table modelos_processo enable row level security;
alter table modelos_etapa enable row level security;
alter table modelos_checklist_item enable row level security;
alter table processos enable row level security;
alter table etapas enable row level security;
alter table checklist_itens enable row level security;
alter table comentarios enable row level security;
alter table historico enable row level security;

create policy "tenant isolado - tenants" on tenants
  for select using (id = auth_tenant_id());

create policy "tenant isolado - usuarios" on usuarios
  for select using (tenant_id = auth_tenant_id());
create policy "usuario atualiza a si mesmo" on usuarios
  for update using (id = auth.uid());

create policy "tenant isolado - clientes" on clientes
  for all using (tenant_id = auth_tenant_id()) with check (tenant_id = auth_tenant_id());
create policy "tenant isolado - bancos" on bancos
  for all using (tenant_id = auth_tenant_id()) with check (tenant_id = auth_tenant_id());
create policy "tenant isolado - corretores" on corretores
  for all using (tenant_id = auth_tenant_id()) with check (tenant_id = auth_tenant_id());
create policy "tenant isolado - imoveis" on imoveis
  for all using (tenant_id = auth_tenant_id()) with check (tenant_id = auth_tenant_id());
create policy "tenant isolado - modelos_processo" on modelos_processo
  for all using (tenant_id = auth_tenant_id()) with check (tenant_id = auth_tenant_id());

create policy "tenant isolado - modelos_etapa" on modelos_etapa
  for all using (
    modelo_processo_id in (select id from modelos_processo where tenant_id = auth_tenant_id())
  ) with check (
    modelo_processo_id in (select id from modelos_processo where tenant_id = auth_tenant_id())
  );

create policy "tenant isolado - modelos_checklist_item" on modelos_checklist_item
  for all using (
    modelo_etapa_id in (
      select me.id from modelos_etapa me
      join modelos_processo mp on mp.id = me.modelo_processo_id
      where mp.tenant_id = auth_tenant_id()
    )
  ) with check (
    modelo_etapa_id in (
      select me.id from modelos_etapa me
      join modelos_processo mp on mp.id = me.modelo_processo_id
      where mp.tenant_id = auth_tenant_id()
    )
  );

create policy "tenant isolado - processos" on processos
  for all using (tenant_id = auth_tenant_id()) with check (tenant_id = auth_tenant_id());

create policy "tenant isolado - etapas" on etapas
  for all using (
    processo_id in (select id from processos where tenant_id = auth_tenant_id())
  ) with check (
    processo_id in (select id from processos where tenant_id = auth_tenant_id())
  );

create policy "tenant isolado - checklist_itens" on checklist_itens
  for all using (
    etapa_id in (
      select e.id from etapas e
      join processos p on p.id = e.processo_id
      where p.tenant_id = auth_tenant_id()
    )
  ) with check (
    etapa_id in (
      select e.id from etapas e
      join processos p on p.id = e.processo_id
      where p.tenant_id = auth_tenant_id()
    )
  );

create policy "tenant isolado - comentarios" on comentarios
  for all using (
    processo_id in (select id from processos where tenant_id = auth_tenant_id())
  ) with check (
    processo_id in (select id from processos where tenant_id = auth_tenant_id())
  );

create policy "tenant isolado - historico" on historico
  for all using (
    processo_id in (select id from processos where tenant_id = auth_tenant_id())
  ) with check (
    processo_id in (select id from processos where tenant_id = auth_tenant_id())
  );
