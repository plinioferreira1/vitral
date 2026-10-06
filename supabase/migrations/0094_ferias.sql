-- Férias: cadastro de quem tem direito, solicitações com negociação entre
-- colaborador e gestor, linha do tempo imutável, afastamentos, ajustes de
-- saldo e notificações internas. Só acrescenta estruturas.
--
-- Toda gravação é feita pelo servidor (ações do Vitral, depois de conferir
-- quem está pedindo e se a etapa permite). Por isso o usuário logado só
-- tem LEITURA aqui — ninguém altera ou apaga o histórico pelo navegador.

create table public.ferias_colaboradores (
  usuario_id uuid primary key references public.usuarios(id) on delete cascade,
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  participa boolean not null default true,
  data_admissao date,
  regime text not null default 'clt' check (regime in ('clt', 'estagio', 'pj', 'outro')),
  departamento text,
  -- quem analisa as férias desta pessoa; vazio = diretoria/gerência
  gestor_id uuid references public.usuarios(id) on delete set null,
  dias_por_periodo integer not null default 30 check (dias_por_periodo between 1 and 60),
  observacoes text,
  atualizado_por uuid references public.usuarios(id) on delete set null,
  atualizado_em timestamptz not null default now()
);

-- férias já tiradas antes do Vitral, ou correções de saldo
create table public.ferias_ajustes (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  usuario_id uuid not null references public.usuarios(id) on delete cascade,
  periodo_inicio date not null,
  -- positivo = dias já utilizados (reduz o saldo); negativo = devolve dias
  dias integer not null check (dias <> 0),
  motivo text not null,
  criado_por uuid references public.usuarios(id) on delete set null,
  criado_por_nome text,
  criado_em timestamptz not null default now()
);
create index ferias_ajustes_usuario_idx on public.ferias_ajustes (usuario_id);

create table public.ferias_afastamentos (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  usuario_id uuid not null references public.usuarios(id) on delete cascade,
  data_inicio date not null,
  data_fim date not null,
  descricao text,
  criado_por uuid references public.usuarios(id) on delete set null,
  criado_em timestamptz not null default now(),
  check (data_fim >= data_inicio)
);
create index ferias_afastamentos_periodo_idx on public.ferias_afastamentos (tenant_id, data_inicio, data_fim);

create table public.ferias_solicitacoes (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  usuario_id uuid not null references public.usuarios(id) on delete cascade,
  tipo text not null default 'ferias' check (tipo in ('ferias', 'alteracao', 'cancelamento')),
  -- alteração/cancelamento apontam para a programação aprovada
  origem_id uuid references public.ferias_solicitacoes(id) on delete set null,
  periodo_aquisitivo_inicio date not null,
  -- período atualmente proposto (muda a cada proposta/contraproposta)
  data_inicio date not null,
  dias integer not null check (dias between 0 and 60),
  data_fim date not null,
  data_retorno date not null,
  abono_dias integer not null default 0 check (abono_dias between 0 and 20),
  adiantamento_13 boolean not null default false,
  observacao text,
  status text not null default 'aguardando_analise'
    check (status in ('rascunho', 'aguardando_analise', 'aguardando_colaborador', 'aguardando_gestor', 'aprovado', 'recusado', 'cancelado')),
  gestor_id uuid references public.usuarios(id) on delete set null,
  decidido_por uuid references public.usuarios(id) on delete set null,
  decidido_por_nome text,
  decidido_em timestamptz,
  motivo_recusa text,
  aviso_proximas_em timestamptz,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);
create index ferias_solicitacoes_usuario_idx on public.ferias_solicitacoes (usuario_id, criado_em desc);
create index ferias_solicitacoes_status_idx on public.ferias_solicitacoes (tenant_id, status);

-- linha do tempo da negociação (só inserção, pelo servidor)
create table public.ferias_eventos (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  solicitacao_id uuid not null references public.ferias_solicitacoes(id) on delete cascade,
  usuario_id uuid references public.usuarios(id) on delete set null,
  usuario_nome text,
  papel text not null check (papel in ('colaborador', 'gestor', 'administrador', 'sistema')),
  acao text not null,
  data_inicio date,
  dias integer,
  data_fim date,
  comentario text,
  -- administrador agindo no lugar do gestor da pessoa
  intervencao boolean not null default false,
  criado_em timestamptz not null default now()
);
create index ferias_eventos_solicitacao_idx on public.ferias_eventos (solicitacao_id, criado_em);

-- notificações internas; email_enviado_em fica pronto para o envio por e-mail no futuro
create table public.ferias_notificacoes (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  usuario_id uuid not null references public.usuarios(id) on delete cascade,
  solicitacao_id uuid references public.ferias_solicitacoes(id) on delete cascade,
  tipo text not null,
  titulo text not null,
  mensagem text not null,
  lida_em timestamptz,
  email_enviado_em timestamptz,
  criado_em timestamptz not null default now()
);
create index ferias_notificacoes_usuario_idx on public.ferias_notificacoes (usuario_id, lida_em, criado_em desc);

-- ---------------------------------------------------------------
-- RLS: só leitura para o usuário logado
-- ---------------------------------------------------------------
alter table public.ferias_colaboradores enable row level security;
alter table public.ferias_ajustes enable row level security;
alter table public.ferias_afastamentos enable row level security;
alter table public.ferias_solicitacoes enable row level security;
alter table public.ferias_eventos enable row level security;
alter table public.ferias_notificacoes enable row level security;

create policy "ferias colaboradores leitura" on public.ferias_colaboradores
  for select to authenticated
  using (tenant_id = public.auth_tenant_id() and (usuario_id = (select auth.uid()) or gestor_id = (select auth.uid()) or public.usuario_eh_gestor()));

create policy "ferias ajustes leitura" on public.ferias_ajustes
  for select to authenticated
  using (
    tenant_id = public.auth_tenant_id() and (
      usuario_id = (select auth.uid()) or public.usuario_eh_gestor()
      or exists (select 1 from public.ferias_colaboradores c where c.usuario_id = ferias_ajustes.usuario_id and c.gestor_id = (select auth.uid()))
    )
  );

create policy "ferias afastamentos leitura" on public.ferias_afastamentos
  for select to authenticated
  using (
    tenant_id = public.auth_tenant_id() and (
      usuario_id = (select auth.uid()) or public.usuario_eh_gestor()
      or exists (select 1 from public.ferias_colaboradores c where c.usuario_id = ferias_afastamentos.usuario_id and c.gestor_id = (select auth.uid()))
    )
  );

create policy "ferias solicitacoes leitura" on public.ferias_solicitacoes
  for select to authenticated
  using (tenant_id = public.auth_tenant_id() and (usuario_id = (select auth.uid()) or gestor_id = (select auth.uid()) or public.usuario_eh_gestor()));

create policy "ferias eventos leitura" on public.ferias_eventos
  for select to authenticated
  using (tenant_id = public.auth_tenant_id() and exists (select 1 from public.ferias_solicitacoes s where s.id = ferias_eventos.solicitacao_id));

create policy "ferias notificacoes leitura" on public.ferias_notificacoes
  for select to authenticated
  using (usuario_id = (select auth.uid()));

revoke all on public.ferias_colaboradores, public.ferias_ajustes, public.ferias_afastamentos, public.ferias_solicitacoes,
  public.ferias_eventos, public.ferias_notificacoes from anon, authenticated;
grant select on public.ferias_colaboradores, public.ferias_ajustes, public.ferias_afastamentos, public.ferias_solicitacoes,
  public.ferias_eventos, public.ferias_notificacoes to authenticated;
