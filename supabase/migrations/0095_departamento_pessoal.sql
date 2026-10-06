-- Departamento Pessoal: colaboradores, controle de ponto, correções,
-- banco de horas, ausências/afastamentos, documentos, configurações e
-- auditoria. Férias (0094) passa a usar o cadastro de colaboradores.
--
-- Como em Férias, o usuário logado só tem LEITURA nestas tabelas: toda
-- gravação é feita pelo servidor do Vitral depois de conferir quem está
-- pedindo. Assim ninguém altera ponto, saldo ou histórico pelo navegador.

create table public.dp_config (
  tenant_id uuid primary key references public.tenants(id) on delete cascade,
  -- jornada padrão: dias da semana (0 = domingo), horários e intervalo
  jornada jsonb not null default '{"dias":[1,2,3,4,5],"entrada":"09:00","saida":"18:00","intervalo_min":60}'::jsonb,
  tolerancia_min integer not null default 10 check (tolerancia_min between 0 and 120),
  banco_horas_ativo boolean not null default true,
  hora_extra_limite_diario_min integer not null default 120 check (hora_extra_limite_diario_min between 0 and 600),
  ferias_alerta_vencimento_dias integer not null default 60 check (ferias_alerta_vencimento_dias between 0 and 365),
  ferias_antecedencia_dias integer not null default 30 check (ferias_antecedencia_dias between 0 and 180),
  ferias_aviso_proximas_dias integer not null default 7 check (ferias_aviso_proximas_dias between 1 and 60),
  documentos_alerta_dias integer not null default 30 check (documentos_alerta_dias between 1 and 365),
  empresas jsonb not null default '["Sacra Netimóveis","Sacra Cred"]'::jsonb,
  departamentos jsonb not null default '["Vendas","Financiamento","Locação","Administrativo","Marketing"]'::jsonb,
  cargos jsonb not null default '[]'::jsonb,
  -- regime define as regras de férias (CLT tem abono e adiantamento do 13º)
  vinculos jsonb not null default '[{"nome":"CLT","regime":"clt"},{"nome":"Estágio","regime":"estagio"},{"nome":"PJ / prestador","regime":"pj"},{"nome":"Autônomo","regime":"outro"}]'::jsonb,
  -- abona = o dia não conta como falta nem gera horas a cumprir
  tipos_ausencia jsonb not null default '[{"nome":"Falta","abona":false},{"nome":"Falta justificada","abona":true},{"nome":"Atestado","abona":true},{"nome":"Afastamento","abona":true},{"nome":"Folga","abona":true},{"nome":"Licença","abona":true},{"nome":"Outro","abona":true}]'::jsonb,
  tipos_documento jsonb not null default '["Contratos","Termos","Atestados","Avisos","Recibos","Documentos internos","Outros"]'::jsonb,
  atualizado_por uuid references public.usuarios(id) on delete set null,
  atualizado_em timestamptz not null default now()
);

create table public.dp_colaboradores (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  -- colaborador e usuário do Vitral são coisas diferentes; o vínculo é opcional
  usuario_id uuid unique references public.usuarios(id) on delete set null,
  nome text not null,
  foto_caminho text,
  empresa text,
  departamento text,
  cargo text,
  gestor_id uuid references public.dp_colaboradores(id) on delete set null,
  data_admissao date,
  data_nascimento date,
  vinculo text,
  regime text not null default 'clt' check (regime in ('clt', 'estagio', 'pj', 'outro')),
  status text not null default 'ativo' check (status in ('ativo', 'inativo', 'desligado')),
  data_desligamento date,
  -- jornada própria; vazio = jornada padrão das configurações
  jornada jsonb,
  carga_semanal_horas numeric(5,2),
  tem_ferias boolean not null default false,
  dias_ferias_periodo integer not null default 30 check (dias_ferias_periodo between 1 and 60),
  registra_ponto boolean not null default false,
  -- o ponto (faltas, banco de horas) só é contado a partir desta data
  ponto_inicio date,
  email text,
  telefone text,
  observacoes text,
  criado_por uuid references public.usuarios(id) on delete set null,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);
create index dp_colaboradores_tenant_idx on public.dp_colaboradores (tenant_id, status);
create index dp_colaboradores_gestor_idx on public.dp_colaboradores (gestor_id);

-- cada batida é uma linha que nunca é apagada: a correção desativa a
-- original (ativo = false) e cria outra apontando para ela
create table public.dp_ponto_registros (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  colaborador_id uuid not null references public.dp_colaboradores(id) on delete cascade,
  data date not null,
  tipo text not null check (tipo in ('entrada', 'saida_intervalo', 'retorno_intervalo', 'saida')),
  horario timestamptz not null,
  origem text not null default 'app' check (origem in ('app', 'correcao')),
  ativo boolean not null default true,
  correcao_id uuid,
  substitui_id uuid references public.dp_ponto_registros(id) on delete set null,
  ip text,
  registrado_por uuid references public.usuarios(id) on delete set null,
  criado_em timestamptz not null default now()
);
create unique index dp_ponto_registros_unico on public.dp_ponto_registros (colaborador_id, data, tipo) where ativo;
create index dp_ponto_registros_data_idx on public.dp_ponto_registros (tenant_id, data);

create table public.dp_ponto_correcoes (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  colaborador_id uuid not null references public.dp_colaboradores(id) on delete cascade,
  data date not null,
  tipo text not null check (tipo in ('entrada', 'saida_intervalo', 'retorno_intervalo', 'saida')),
  horario_original timestamptz,
  horario_solicitado timestamptz not null,
  justificativa text not null,
  anexo_caminho text,
  anexo_nome text,
  status text not null default 'pendente' check (status in ('pendente', 'aprovada', 'recusada')),
  solicitado_por uuid references public.usuarios(id) on delete set null,
  solicitado_por_nome text,
  decidido_por uuid references public.usuarios(id) on delete set null,
  decidido_por_nome text,
  decidido_em timestamptz,
  motivo_recusa text,
  criado_em timestamptz not null default now()
);
create index dp_ponto_correcoes_idx on public.dp_ponto_correcoes (tenant_id, status);

-- lançamentos manuais no banco de horas (ex.: saldo trazido de antes do Vitral)
create table public.dp_banco_ajustes (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  colaborador_id uuid not null references public.dp_colaboradores(id) on delete cascade,
  data date not null,
  minutos integer not null check (minutos <> 0),
  motivo text not null,
  criado_por uuid references public.usuarios(id) on delete set null,
  criado_por_nome text,
  criado_em timestamptz not null default now()
);

create table public.dp_ausencias (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  colaborador_id uuid not null references public.dp_colaboradores(id) on delete cascade,
  tipo text not null,
  abona boolean not null default true,
  data_inicio date not null,
  data_fim date not null,
  observacao text,
  anexo_caminho text,
  anexo_nome text,
  status text not null default 'aprovada' check (status in ('pendente', 'aprovada', 'recusada', 'cancelada')),
  criado_por uuid references public.usuarios(id) on delete set null,
  criado_por_nome text,
  decidido_por uuid references public.usuarios(id) on delete set null,
  decidido_por_nome text,
  decidido_em timestamptz,
  criado_em timestamptz not null default now(),
  check (data_fim >= data_inicio)
);
create index dp_ausencias_periodo_idx on public.dp_ausencias (tenant_id, data_inicio, data_fim);
create index dp_ausencias_colaborador_idx on public.dp_ausencias (colaborador_id);

create table public.dp_documentos (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  colaborador_id uuid not null references public.dp_colaboradores(id) on delete cascade,
  categoria text not null,
  titulo text not null,
  data_documento date,
  vencimento date,
  observacao text,
  caminho text not null,
  nome_arquivo text not null,
  enviado_por uuid references public.usuarios(id) on delete set null,
  enviado_por_nome text,
  criado_em timestamptz not null default now()
);
create index dp_documentos_colaborador_idx on public.dp_documentos (colaborador_id);
create index dp_documentos_vencimento_idx on public.dp_documentos (tenant_id, vencimento);

-- auditoria (só inserção, pelo servidor)
create table public.dp_eventos (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  colaborador_id uuid references public.dp_colaboradores(id) on delete cascade,
  entidade text not null,
  registro_id uuid,
  acao text not null,
  descricao text not null,
  anterior jsonb,
  novo jsonb,
  justificativa text,
  usuario_id uuid references public.usuarios(id) on delete set null,
  usuario_nome text,
  criado_em timestamptz not null default now()
);
create index dp_eventos_colaborador_idx on public.dp_eventos (colaborador_id, criado_em desc);
create index dp_eventos_tenant_idx on public.dp_eventos (tenant_id, criado_em desc);

-- ---------------------------------------------------------------
-- Leitura: administrador vê tudo; gestor vê a própria equipe;
-- colaborador vê só o que é dele
-- ---------------------------------------------------------------
create or replace function public.dp_meu_colaborador_id()
returns uuid
language sql stable security definer set search_path = public
as $$
  select id from public.dp_colaboradores where usuario_id = (select auth.uid()) limit 1;
$$;
revoke all on function public.dp_meu_colaborador_id() from public, anon;
grant execute on function public.dp_meu_colaborador_id() to authenticated;

create or replace function public.dp_pode_ver_colaborador(p_colaborador uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.dp_colaboradores c
    where c.id = p_colaborador
      and c.tenant_id = public.auth_tenant_id()
      and (public.usuario_eh_gestor() or c.usuario_id = (select auth.uid()) or c.gestor_id = public.dp_meu_colaborador_id())
  );
$$;
revoke all on function public.dp_pode_ver_colaborador(uuid) from public, anon;
grant execute on function public.dp_pode_ver_colaborador(uuid) to authenticated;

alter table public.dp_config enable row level security;
alter table public.dp_colaboradores enable row level security;
alter table public.dp_ponto_registros enable row level security;
alter table public.dp_ponto_correcoes enable row level security;
alter table public.dp_banco_ajustes enable row level security;
alter table public.dp_ausencias enable row level security;
alter table public.dp_documentos enable row level security;
alter table public.dp_eventos enable row level security;

create policy "dp config leitura" on public.dp_config for select to authenticated using (tenant_id = public.auth_tenant_id());
create policy "dp colaboradores leitura" on public.dp_colaboradores for select to authenticated using (public.dp_pode_ver_colaborador(id));
create policy "dp ponto leitura" on public.dp_ponto_registros for select to authenticated using (public.dp_pode_ver_colaborador(colaborador_id));
create policy "dp correcoes leitura" on public.dp_ponto_correcoes for select to authenticated using (public.dp_pode_ver_colaborador(colaborador_id));
create policy "dp banco leitura" on public.dp_banco_ajustes for select to authenticated using (public.dp_pode_ver_colaborador(colaborador_id));
create policy "dp ausencias leitura" on public.dp_ausencias for select to authenticated using (public.dp_pode_ver_colaborador(colaborador_id));
-- documentos: administrador e o próprio colaborador (o gestor de equipe não vê)
create policy "dp documentos leitura" on public.dp_documentos for select to authenticated
  using (tenant_id = public.auth_tenant_id() and (public.usuario_eh_gestor() or colaborador_id = public.dp_meu_colaborador_id()));
-- auditoria: só a administração
create policy "dp eventos leitura" on public.dp_eventos for select to authenticated
  using (tenant_id = public.auth_tenant_id() and public.usuario_eh_gestor());

revoke all on public.dp_config, public.dp_colaboradores, public.dp_ponto_registros, public.dp_ponto_correcoes, public.dp_banco_ajustes,
  public.dp_ausencias, public.dp_documentos, public.dp_eventos from anon, authenticated;
grant select on public.dp_config, public.dp_colaboradores, public.dp_ponto_registros, public.dp_ponto_correcoes, public.dp_banco_ajustes,
  public.dp_ausencias, public.dp_documentos, public.dp_eventos to authenticated;

-- arquivos (documentos, atestados, fotos): pasta privada, lida e gravada só pelo servidor
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('departamento-pessoal', 'departamento-pessoal', false, 10485760, array['application/pdf', 'image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

-- ---------------------------------------------------------------
-- Férias passa a usar as ausências do DP (a tabela antiga nunca foi usada)
-- ---------------------------------------------------------------
drop table if exists public.ferias_afastamentos;

-- ---------------------------------------------------------------
-- Ponto de partida: uma ficha para cada usuário ativo que não é corretor
-- (dados reais já existentes; férias e ponto ficam desligados até a gestão conferir)
-- ---------------------------------------------------------------
insert into public.dp_config (tenant_id) select id from public.tenants on conflict do nothing;

insert into public.dp_colaboradores (tenant_id, usuario_id, nome, cargo, email)
select u.tenant_id, u.id, u.nome, u.cargo, u.email
from public.usuarios u
where u.ativo and u.tenant_id is not null and u.nivel_acesso <> 'corretor'
  and not exists (select 1 from public.dp_colaboradores c where c.usuario_id = u.id);
