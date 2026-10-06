-- Locação › Controle de Débitos: conferência mensal de condomínio e
-- IPTU/TLP dos imóveis administrados, cadastro de administradoras,
-- solicitações por e-mail agrupadas, débitos encontrados e auditoria.
-- Só acrescenta estruturas. Nenhuma coluna existente é alterada ou
-- removida (as colunas antigas de condomínio/portal do contrato continuam
-- lá); o único dado antigo tocado é a inscrição do imóvel, preenchida no
-- cadastro do imóvel onde estava vazia.

-- ---------------------------------------------------------------
-- Permissões: mesmas regras já usadas em Locação
-- ---------------------------------------------------------------
create or replace function public.debitos_pode_ver()
returns boolean
language sql stable security definer set search_path = public
as $$
  select public.usuario_tem_categoria('locacao'::public.categoria_processo);
$$;

create or replace function public.debitos_pode_operar()
returns boolean
language sql stable security definer set search_path = public
as $$
  select public.usuario_tem_categoria('locacao'::public.categoria_processo) and public.usuario_pode_editar();
$$;

revoke all on function public.debitos_pode_ver() from public, anon;
revoke all on function public.debitos_pode_operar() from public, anon;
grant execute on function public.debitos_pode_ver() to authenticated;
grant execute on function public.debitos_pode_operar() to authenticated;

-- ---------------------------------------------------------------
-- Administradoras de condomínio (cadastro central)
-- Sem senha: o portal é aberto pela pessoa; o Vitral só guarda o link
-- e as orientações de acesso.
-- ---------------------------------------------------------------
create table public.condominio_administradoras (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  nome text not null,
  cnpj text,
  telefone text,
  email_solicitacao text,
  site text,
  metodo_consulta text not null default 'email' check (metodo_consulta in ('portal', 'email', 'outro')),
  portal_url text,
  portal_orientacoes text,
  portal_identificacao text,
  portal_login_proprio boolean not null default false,
  observacoes text,
  ativa boolean not null default true,
  criado_por uuid references public.usuarios(id),
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create unique index condominio_administradoras_nome_idx on public.condominio_administradoras (tenant_id, lower(nome));

-- ---------------------------------------------------------------
-- Vínculo do imóvel alugado com o condomínio (no contrato de locação)
-- ---------------------------------------------------------------
alter table public.contratos_locacao
  add column if not exists possui_condominio boolean,
  add column if not exists administradora_id uuid references public.condominio_administradoras(id) on delete set null,
  add column if not exists condominio_nome text,
  add column if not exists condominio_unidade text,
  add column if not exists condominio_bloco text,
  add column if not exists condominio_email text,
  add column if not exists condominio_codigo_unidade text,
  add column if not exists condominio_observacoes text;

create index if not exists contratos_locacao_administradora_idx on public.contratos_locacao (administradora_id);

-- ---------------------------------------------------------------
-- Configuração da automação (uma linha por empresa)
-- ---------------------------------------------------------------
create table public.debitos_config (
  tenant_id uuid primary key references public.tenants(id) on delete cascade,
  geracao_automatica boolean not null default true,
  dia_geracao integer not null default 1 check (dia_geracao between 1 and 28),
  periodicidade_condominio_meses integer not null default 1 check (periodicidade_condominio_meses in (1, 2, 3, 6, 12)),
  periodicidade_iptu_meses integer not null default 1 check (periodicidade_iptu_meses in (1, 2, 3, 6, 12)),
  envio_automatico boolean not null default false,
  dia_envio integer not null default 5 check (dia_envio between 1 and 28),
  email_assunto text,
  email_modelo text,
  email_responder_para text,
  email_copia text,
  dias_alerta_sem_resposta integer not null default 7 check (dias_alerta_sem_resposta between 1 and 60),
  url_consulta_iptu text,
  atualizado_por uuid references public.usuarios(id),
  atualizado_em timestamptz not null default now()
);

-- ---------------------------------------------------------------
-- Solicitações de posição de débitos enviadas por e-mail
-- (uma mensagem por administradora, com todas as unidades)
-- ---------------------------------------------------------------
create table public.debitos_solicitacoes (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  administradora_id uuid references public.condominio_administradoras(id) on delete set null,
  administradora_nome text not null,
  competencia date not null,
  destinatario text not null,
  copia text,
  assunto text not null,
  mensagem text not null,
  status text not null default 'enviado' check (status in ('enviado', 'falha', 'respondido', 'conferido')),
  origem text not null default 'manual' check (origem in ('manual', 'automatica')),
  erro text,
  enviado_por uuid references public.usuarios(id),
  enviado_por_nome text,
  enviado_em timestamptz not null default now(),
  respondido_por uuid references public.usuarios(id),
  respondido_em timestamptz,
  resposta_observacao text,
  check (extract(day from competencia) = 1)
);

create index debitos_solicitacoes_competencia_idx on public.debitos_solicitacoes (tenant_id, competencia, administradora_id);

-- ---------------------------------------------------------------
-- Verificações mensais (uma por contrato + tipo + competência)
-- ---------------------------------------------------------------
create table public.debitos_verificacoes (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  contrato_id uuid not null references public.contratos_locacao(id) on delete cascade,
  imovel_id uuid references public.imoveis(id) on delete set null,
  tipo text not null check (tipo in ('condominio', 'iptu_tlp')),
  competencia date not null,
  status text not null default 'pendente'
    check (status in ('pendente', 'aguardando_administradora', 'sem_debitos', 'com_debitos', 'nao_se_aplica')),
  administradora_id uuid references public.condominio_administradoras(id) on delete set null,
  solicitacao_id uuid references public.debitos_solicitacoes(id) on delete set null,
  observacao text,
  origem text not null default 'automatica' check (origem in ('automatica', 'manual')),
  verificado_por uuid references public.usuarios(id),
  verificado_por_nome text,
  verificado_em timestamptz,
  criado_em timestamptz not null default now(),
  -- impede duplicidade: o mesmo imóvel/contrato só tem uma verificação
  -- de cada tipo por competência
  unique (contrato_id, tipo, competencia),
  check (extract(day from competencia) = 1),
  check (tipo = 'condominio' or status <> 'aguardando_administradora')
);

create index debitos_verificacoes_painel_idx on public.debitos_verificacoes (tenant_id, competencia, tipo, status);

create table public.debitos_solicitacao_itens (
  id uuid primary key default gen_random_uuid(),
  solicitacao_id uuid not null references public.debitos_solicitacoes(id) on delete cascade,
  verificacao_id uuid references public.debitos_verificacoes(id) on delete set null,
  contrato_id uuid references public.contratos_locacao(id) on delete set null,
  descricao_unidade text not null,
  resultado text check (resultado is null or resultado in ('sem_debito', 'com_debito', 'nao_informado')),
  unique (solicitacao_id, verificacao_id)
);

create index debitos_solicitacao_itens_solicitacao_idx on public.debitos_solicitacao_itens (solicitacao_id);

-- ---------------------------------------------------------------
-- Débitos encontrados numa verificação
-- ---------------------------------------------------------------
create table public.debitos_itens (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  verificacao_id uuid not null references public.debitos_verificacoes(id) on delete cascade,
  valor numeric check (valor is null or valor >= 0),
  vencimento date,
  -- condomínio: competência do débito; IPTU/TLP: exercício
  referencia text,
  parcela text,
  descricao text,
  situacao text,
  observacao text,
  anexo_caminho text,
  anexo_nome text,
  criado_por uuid references public.usuarios(id),
  criado_por_nome text,
  criado_em timestamptz not null default now()
);

create index debitos_itens_verificacao_idx on public.debitos_itens (verificacao_id);

-- ---------------------------------------------------------------
-- Auditoria (só recebe novas linhas)
-- ---------------------------------------------------------------
create table public.debitos_eventos (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  contrato_id uuid references public.contratos_locacao(id) on delete set null,
  verificacao_id uuid references public.debitos_verificacoes(id) on delete set null,
  administradora_id uuid references public.condominio_administradoras(id) on delete set null,
  solicitacao_id uuid references public.debitos_solicitacoes(id) on delete set null,
  acao text not null,
  descricao text not null,
  anterior jsonb,
  novo jsonb,
  usuario_id uuid references public.usuarios(id),
  usuario_nome text,
  criado_em timestamptz not null default now()
);

create index debitos_eventos_contrato_idx on public.debitos_eventos (contrato_id, criado_em desc);
create index debitos_eventos_tenant_idx on public.debitos_eventos (tenant_id, criado_em desc);

-- ---------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------
alter table public.condominio_administradoras enable row level security;
alter table public.debitos_config enable row level security;
alter table public.debitos_solicitacoes enable row level security;
alter table public.debitos_solicitacao_itens enable row level security;
alter table public.debitos_verificacoes enable row level security;
alter table public.debitos_itens enable row level security;
alter table public.debitos_eventos enable row level security;

create policy "administradoras leitura" on public.condominio_administradoras
  for select to authenticated using (tenant_id = public.auth_tenant_id() and public.debitos_pode_ver());
create policy "administradoras insercao" on public.condominio_administradoras
  for insert to authenticated with check (tenant_id = public.auth_tenant_id() and public.debitos_pode_operar());
create policy "administradoras edicao" on public.condominio_administradoras
  for update to authenticated
  using (tenant_id = public.auth_tenant_id() and public.debitos_pode_operar())
  with check (tenant_id = public.auth_tenant_id());
create policy "administradoras remocao" on public.condominio_administradoras
  for delete to authenticated using (tenant_id = public.auth_tenant_id() and public.debitos_pode_operar());

create policy "debitos_config leitura" on public.debitos_config
  for select to authenticated using (tenant_id = public.auth_tenant_id() and public.debitos_pode_ver());
create policy "debitos_config insercao gestores" on public.debitos_config
  for insert to authenticated with check (tenant_id = public.auth_tenant_id() and public.usuario_eh_gestor());
create policy "debitos_config edicao gestores" on public.debitos_config
  for update to authenticated
  using (tenant_id = public.auth_tenant_id() and public.usuario_eh_gestor())
  with check (tenant_id = public.auth_tenant_id());

create policy "solicitacoes leitura" on public.debitos_solicitacoes
  for select to authenticated using (tenant_id = public.auth_tenant_id() and public.debitos_pode_ver());
create policy "solicitacoes insercao" on public.debitos_solicitacoes
  for insert to authenticated with check (tenant_id = public.auth_tenant_id() and public.debitos_pode_operar());
create policy "solicitacoes edicao" on public.debitos_solicitacoes
  for update to authenticated
  using (tenant_id = public.auth_tenant_id() and public.debitos_pode_operar())
  with check (tenant_id = public.auth_tenant_id());

create policy "solicitacao itens leitura" on public.debitos_solicitacao_itens
  for select to authenticated
  using (exists (select 1 from public.debitos_solicitacoes s where s.id = solicitacao_id));
create policy "solicitacao itens insercao" on public.debitos_solicitacao_itens
  for insert to authenticated
  with check (public.debitos_pode_operar() and exists (select 1 from public.debitos_solicitacoes s where s.id = solicitacao_id));
create policy "solicitacao itens edicao" on public.debitos_solicitacao_itens
  for update to authenticated
  using (public.debitos_pode_operar() and exists (select 1 from public.debitos_solicitacoes s where s.id = solicitacao_id))
  with check (exists (select 1 from public.debitos_solicitacoes s where s.id = solicitacao_id));

create policy "verificacoes leitura" on public.debitos_verificacoes
  for select to authenticated using (tenant_id = public.auth_tenant_id() and public.debitos_pode_ver());
create policy "verificacoes insercao" on public.debitos_verificacoes
  for insert to authenticated with check (tenant_id = public.auth_tenant_id() and public.debitos_pode_operar());
create policy "verificacoes edicao" on public.debitos_verificacoes
  for update to authenticated
  using (tenant_id = public.auth_tenant_id() and public.debitos_pode_operar())
  with check (tenant_id = public.auth_tenant_id());

create policy "debitos itens leitura" on public.debitos_itens
  for select to authenticated using (tenant_id = public.auth_tenant_id() and public.debitos_pode_ver());
create policy "debitos itens insercao" on public.debitos_itens
  for insert to authenticated with check (tenant_id = public.auth_tenant_id() and public.debitos_pode_operar());
create policy "debitos itens edicao" on public.debitos_itens
  for update to authenticated
  using (tenant_id = public.auth_tenant_id() and public.debitos_pode_operar())
  with check (tenant_id = public.auth_tenant_id());
create policy "debitos itens remocao" on public.debitos_itens
  for delete to authenticated using (tenant_id = public.auth_tenant_id() and public.debitos_pode_operar());

create policy "debitos eventos leitura" on public.debitos_eventos
  for select to authenticated using (tenant_id = public.auth_tenant_id() and public.debitos_pode_ver());
create policy "debitos eventos insercao" on public.debitos_eventos
  for insert to authenticated
  with check (tenant_id = public.auth_tenant_id() and public.debitos_pode_operar() and usuario_id = (select auth.uid()));

grant select, insert, update, delete on public.condominio_administradoras to authenticated;
grant select, insert, update on public.debitos_config to authenticated;
grant select, insert, update on public.debitos_solicitacoes to authenticated;
grant select, insert, update on public.debitos_solicitacao_itens to authenticated;
grant select, insert, update on public.debitos_verificacoes to authenticated;
grant select, insert, update, delete on public.debitos_itens to authenticated;
grant select, insert on public.debitos_eventos to authenticated;

-- ---------------------------------------------------------------
-- Anexos (boletos, DAR): bucket privado. Pasta = <empresa>/<contrato>/...
-- ---------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'debitos-locacao', 'debitos-locacao', false, 10485760,
  array['application/pdf', 'image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "debitos anexos leitura" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'debitos-locacao'
    and (storage.foldername(name))[1] = public.auth_tenant_id()::text
    and public.debitos_pode_ver()
  );
create policy "debitos anexos envio" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'debitos-locacao'
    and (storage.foldername(name))[1] = public.auth_tenant_id()::text
    and public.debitos_pode_operar()
  );
create policy "debitos anexos remocao" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'debitos-locacao'
    and (storage.foldername(name))[1] = public.auth_tenant_id()::text
    and public.debitos_pode_operar()
  );

-- ---------------------------------------------------------------
-- Aproveitamento dos dados que já existem nos contratos
-- ---------------------------------------------------------------

-- 1) A inscrição do imóvel no DF passa a ficar também no cadastro do
--    imóvel (só preenche onde estava vazio).
update public.imoveis i
set inscricao_iptu = c.iptu_inscricao
from public.contratos_locacao c
where c.imovel_id = i.id
  and coalesce(btrim(i.inscricao_iptu), '') = ''
  and coalesce(btrim(c.iptu_inscricao), '') <> ''
  and c.iptu_inscricao !~* '^x+$';

-- 2) Uma administradora para cada valor distinto já digitado no campo
--    "Administradora do condomínio" (hoje quase sempre o e-mail dela).
--    Valores como "NÃO TEM" e "xxxxx" não viram administradora.
insert into public.condominio_administradoras (tenant_id, nome, email_solicitacao, telefone, metodo_consulta, portal_url, observacoes)
select
  c.tenant_id,
  btrim(c.condominio_administradora),
  case when btrim(c.condominio_administradora) ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then lower(btrim(c.condominio_administradora)) end,
  min(c.condominio_contato) filter (where c.condominio_contato !~* '^x+$' and btrim(c.condominio_contato) <> ''),
  case
    when max(c.portal_administradora_url) filter (where btrim(c.portal_administradora_url) <> '') is not null then 'portal'
    when btrim(c.condominio_administradora) ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then 'email'
    else 'outro'
  end,
  max(c.portal_administradora_url) filter (where btrim(c.portal_administradora_url) <> ''),
  'Criada automaticamente a partir do cadastro dos contratos. Confira o nome e o método de consulta.'
from public.contratos_locacao c
where coalesce(btrim(c.condominio_administradora), '') <> ''
  and c.condominio_administradora !~* '^x+$'
  and c.condominio_administradora !~* '^n.o\s*tem$'
group by c.tenant_id, btrim(c.condominio_administradora)
on conflict do nothing;

-- 3) Liga cada contrato à administradora criada a partir do seu texto.
update public.contratos_locacao c
set administradora_id = a.id, possui_condominio = true
from public.condominio_administradoras a
where a.tenant_id = c.tenant_id
  and lower(a.nome) = lower(btrim(c.condominio_administradora))
  and c.administradora_id is null;

-- 4) Contrato sem texto de administradora, mas com link de portal igual
--    ao de uma administradora já criada (mesmo site).
update public.contratos_locacao c
set administradora_id = a.id, possui_condominio = true
from public.condominio_administradoras a
where a.tenant_id = c.tenant_id
  and c.administradora_id is null
  and coalesce(btrim(c.portal_administradora_url), '') <> ''
  and a.portal_url is not null
  and split_part(regexp_replace(c.portal_administradora_url, '^https?://', ''), '/', 1)
    = split_part(regexp_replace(a.portal_url, '^https?://', ''), '/', 1);

-- 5) "NÃO TEM" vira "não possui condomínio".
update public.contratos_locacao
set possui_condominio = false
where possui_condominio is null and condominio_administradora ~* '^n.o\s*tem$';

-- 6) Configuração inicial (envio automático desligado até a diretoria ligar).
insert into public.debitos_config (tenant_id)
select id from public.tenants
on conflict (tenant_id) do nothing;
