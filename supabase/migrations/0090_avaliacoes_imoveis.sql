-- Módulo Avaliação de Imóveis: estudo comercial de preço e Parecer
-- Técnico de Avaliação Mercadológica (PTAM), com comparáveis, ajustes
-- justificados, trilha de auditoria e versões emitidas imutáveis.

-- ---------------------------------------------------------------
-- Configuração por empresa: responsável técnica, limiares de alerta
-- e fontes externas autorizadas.
-- ---------------------------------------------------------------
create table public.avaliacao_config (
  tenant_id uuid primary key references public.tenants(id) on delete cascade,
  responsavel_usuario_id uuid references public.usuarios(id),
  responsavel_nome text,
  responsavel_creci text,
  responsavel_cnai text,
  responsavel_curriculo text,
  contato_telefone text,
  contato_email text,
  -- limiares usados só para ALERTAR na tela (não bloqueiam nem entram
  -- no cálculo); definidos pela avaliadora.
  limiares jsonb not null default '{}'::jsonb,
  -- [{ "nome": "...", "observacao": "..." }]
  fontes_externas jsonb not null default '[]'::jsonb,
  atualizado_por uuid references public.usuarios(id),
  atualizado_em timestamptz not null default now()
);

-- Imagem da assinatura: só a própria pessoa lê e grava. É aplicada ao
-- PDF pelo servidor, na sessão dela, no momento da emissão.
create table public.avaliacao_assinaturas (
  usuario_id uuid primary key references public.usuarios(id) on delete cascade,
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  imagem text not null,
  consentimento text not null,
  autorizada_em timestamptz not null default now()
);

-- ---------------------------------------------------------------
-- Avaliação (um estudo/parecer em elaboração)
-- ---------------------------------------------------------------
create table public.avaliacoes (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  codigo text not null,
  modalidade text not null check (modalidade in ('estudo_comercial', 'ptam')),
  finalidade text not null check (finalidade in ('venda', 'locacao')),
  tipologia text not null check (tipologia in ('residencial', 'comercial', 'terreno')),
  status text not null default 'rascunho'
    check (status in ('rascunho', 'em_revisao', 'aprovado', 'emitido', 'arquivado')),
  imovel_id uuid references public.imoveis(id) on delete set null,
  origem_id uuid references public.avaliacoes(id) on delete set null,
  -- campos de busca/listagem
  titulo text not null,
  proprietario_nome text,
  bairro text,
  cidade text,
  data_base date,
  area_m2 numeric check (area_m2 is null or area_m2 > 0),
  -- formulário (identificação, imóvel, vistoria, localização, textos…)
  dados jsonb not null default '{}'::jsonb,
  -- precificação
  valor_calculado numeric,
  faixa_min numeric,
  faixa_max numeric,
  faixa_manual boolean not null default false,
  valor_sugerido numeric,
  margem_negociacao_pct numeric check (margem_negociacao_pct is null or (margem_negociacao_pct >= 0 and margem_negociacao_pct <= 50)),
  valor_proprietario numeric,
  -- fluxo
  revisao integer not null default 1,
  versao_atual integer not null default 0,
  enviado_revisao_por uuid references public.usuarios(id),
  enviado_revisao_em timestamptz,
  aprovado_por uuid references public.usuarios(id),
  aprovado_em timestamptz,
  aprovado_hash text,
  comentario_revisao text,
  criado_por uuid not null references public.usuarios(id),
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  unique (tenant_id, codigo),
  check (faixa_min is null or faixa_max is null or faixa_min <= faixa_max)
);

create index avaliacoes_tenant_status_idx on public.avaliacoes (tenant_id, status, atualizado_em desc);
create index avaliacoes_imovel_idx on public.avaliacoes (imovel_id);
create index avaliacoes_criado_por_idx on public.avaliacoes (criado_por);

-- ---------------------------------------------------------------
-- Comparáveis (amostra de mercado)
-- ---------------------------------------------------------------
create table public.avaliacao_comparaveis (
  id uuid primary key default gen_random_uuid(),
  avaliacao_id uuid not null references public.avaliacoes(id) on delete cascade,
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  ordem integer not null default 0,
  identificacao text not null,
  regiao text,
  -- sempre igual à finalidade da avaliação: venda e locação nunca
  -- entram na mesma amostra
  finalidade text not null check (finalidade in ('venda', 'locacao')),
  tipologia text check (tipologia is null or tipologia in ('residencial', 'comercial', 'terreno')),
  area_m2 numeric check (area_m2 is null or area_m2 > 0),
  quartos integer,
  suites integer,
  vagas integer,
  preco numeric check (preco is null or preco > 0),
  tipo_preco text not null default 'oferta' check (tipo_preco in ('oferta', 'transacao')),
  fonte_tipo text not null check (fonte_tipo in ('interno', 'manual', 'externo')),
  fonte_nome text,
  fonte_url text,
  referencia_interna text,
  data_coleta date,
  data_atualizacao date,
  status_anuncio text,
  diferencas text,
  observacoes text,
  -- [{ fator, percentual, justificativa, origem, autor_id, autor_nome, em }]
  ajustes jsonb not null default '[]'::jsonb,
  incluido boolean not null default true,
  duplicata boolean not null default false,
  reconferir boolean not null default false,
  motivo_exclusao text,
  excluido_por uuid references public.usuarios(id),
  excluido_em timestamptz,
  foto_caminho text,
  inserido_por uuid references public.usuarios(id),
  criado_em timestamptz not null default now(),
  check (incluido or coalesce(btrim(motivo_exclusao), '') <> '')
);

create index avaliacao_comparaveis_avaliacao_idx on public.avaliacao_comparaveis (avaliacao_id, ordem);

-- ---------------------------------------------------------------
-- Fotos e anexos (arquivos ficam no bucket privado "avaliacoes")
-- ---------------------------------------------------------------
create table public.avaliacao_arquivos (
  id uuid primary key default gen_random_uuid(),
  avaliacao_id uuid not null references public.avaliacoes(id) on delete cascade,
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  tipo text not null check (tipo in ('imovel', 'vistoria', 'mapa', 'matricula', 'anexo')),
  caminho_storage text not null unique,
  nome_arquivo text not null,
  legenda text,
  capa boolean not null default false,
  ordem integer not null default 0,
  mime_type text not null,
  tamanho_bytes bigint not null check (tamanho_bytes > 0 and tamanho_bytes <= 10485760),
  criado_por uuid references public.usuarios(id),
  criado_em timestamptz not null default now()
);

create index avaliacao_arquivos_avaliacao_idx on public.avaliacao_arquivos (avaliacao_id, tipo, ordem);

-- ---------------------------------------------------------------
-- Trilha de auditoria (só inserção)
-- ---------------------------------------------------------------
create table public.avaliacao_eventos (
  id uuid primary key default gen_random_uuid(),
  avaliacao_id uuid not null references public.avaliacoes(id) on delete cascade,
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  tipo text not null,
  descricao text not null,
  dados jsonb not null default '{}'::jsonb,
  autor_id uuid references public.usuarios(id),
  autor_nome text,
  criado_em timestamptz not null default now()
);

create index avaliacao_eventos_avaliacao_idx on public.avaliacao_eventos (avaliacao_id, criado_em desc);

-- ---------------------------------------------------------------
-- Versões emitidas (retrato imutável do conteúdo + PDF)
-- ---------------------------------------------------------------
create table public.avaliacao_versoes (
  id uuid primary key default gen_random_uuid(),
  avaliacao_id uuid not null references public.avaliacoes(id) on delete restrict,
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  numero integer not null check (numero > 0),
  modalidade text not null,
  finalidade text not null,
  snapshot jsonb not null,
  hash_conteudo text not null,
  pdf_caminho text not null,
  valor_calculado numeric,
  valor_sugerido numeric,
  faixa_min numeric,
  faixa_max numeric,
  tipo_assinatura text not null default 'sem_assinatura'
    check (tipo_assinatura in ('sem_assinatura', 'visual')),
  aprovado_por uuid references public.usuarios(id),
  aprovado_por_nome text,
  aprovado_em timestamptz,
  emitido_por uuid not null references public.usuarios(id),
  emitido_por_nome text,
  emitido_em timestamptz not null default now(),
  unique (avaliacao_id, numero)
);

create index avaliacao_versoes_avaliacao_idx on public.avaliacao_versoes (avaliacao_id, numero desc);

-- ---------------------------------------------------------------
-- Funções de permissão
-- ---------------------------------------------------------------

-- Equipe interna enxerga todas as avaliações da empresa; corretor só as
-- que ele mesmo criou; social media não acessa.
create or replace function public.avaliacao_equipe_interna()
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.usuarios u
    where u.id = (select auth.uid())
      and u.nivel_acesso in ('diretor', 'gerente', 'supervisor', 'auxiliar', 'gerente_locacao')
  );
$$;

create or replace function public.avaliacao_pode_criar()
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.usuarios u
    where u.id = (select auth.uid()) and u.nivel_acesso <> 'social_media'
  );
$$;

-- Quem pode aprovar/emitir: PTAM só a responsável técnica configurada;
-- estudo comercial, diretor/gerente ou a responsável técnica.
create or replace function public.avaliacao_pode_aprovar(p_modalidade text)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1
    from public.usuarios u
    left join public.avaliacao_config c on c.tenant_id = u.tenant_id
    where u.id = (select auth.uid())
      and (
        c.responsavel_usuario_id = u.id
        or (p_modalidade = 'estudo_comercial' and u.nivel_acesso in ('diretor', 'gerente'))
      )
  );
$$;

-- Próximo código sequencial da empresa no ano (AV-2026-0001). Roda com
-- privilégio próprio porque o corretor não enxerga as avaliações dos outros.
create or replace function public.avaliacao_proximo_codigo()
returns text
language sql stable security definer set search_path = public
as $$
  select 'AV-' || to_char(now() at time zone 'America/Sao_Paulo', 'YYYY') || '-' ||
    lpad((coalesce(max(substring(a.codigo from '(\d+)$')::int), 0) + 1)::text, 4, '0')
  from public.avaliacoes a
  where a.tenant_id = public.auth_tenant_id()
    and a.codigo like 'AV-' || to_char(now() at time zone 'America/Sao_Paulo', 'YYYY') || '-%';
$$;
revoke all on function public.avaliacao_proximo_codigo() from public, anon;
grant execute on function public.avaliacao_proximo_codigo() to authenticated;

revoke all on function public.avaliacao_equipe_interna() from public, anon;
revoke all on function public.avaliacao_pode_criar() from public, anon;
revoke all on function public.avaliacao_pode_aprovar(text) from public, anon;
grant execute on function public.avaliacao_equipe_interna() to authenticated;
grant execute on function public.avaliacao_pode_criar() to authenticated;
grant execute on function public.avaliacao_pode_aprovar(text) to authenticated;

-- Aprovação e emissão só por quem tem a atribuição, mesmo que alguém
-- tente gravar direto no banco. Sem usuário (rotinas do servidor) passa.
create or replace function public.avaliacoes_guardar_transicao()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  new.atualizado_em := now();

  if (select auth.uid()) is null then
    return new;
  end if;

  if new.modalidade is distinct from old.modalidade and old.versao_atual > 0 then
    raise exception 'A modalidade não pode mudar depois da primeira emissão.';
  end if;

  if new.status = 'aprovado' and old.status is distinct from 'aprovado' then
    if not public.avaliacao_pode_aprovar(new.modalidade) then
      raise exception 'Você não tem atribuição para aprovar esta avaliação.';
    end if;
    new.aprovado_por := (select auth.uid());
    new.aprovado_em := now();
  end if;

  -- Enquanto aprovada, o registro da aprovação não pode ser reescrito:
  -- qualquer mudança de conteúdo passa por devolver a avaliação a rascunho.
  if old.status = 'aprovado' and new.status in ('aprovado', 'emitido') and (
    new.aprovado_hash is distinct from old.aprovado_hash
    or new.aprovado_por is distinct from old.aprovado_por
    or new.aprovado_em is distinct from old.aprovado_em
  ) then
    raise exception 'O registro de aprovação não pode ser alterado.';
  end if;

  if new.status = 'emitido' and old.status is distinct from 'emitido' then
    if old.status is distinct from 'aprovado' then
      raise exception 'Só é possível emitir uma avaliação aprovada.';
    end if;
    if not public.avaliacao_pode_aprovar(new.modalidade) then
      raise exception 'Você não tem atribuição para emitir esta avaliação.';
    end if;
  end if;

  return new;
end;
$$;

create trigger avaliacoes_guardar_transicao
  before update on public.avaliacoes
  for each row execute function public.avaliacoes_guardar_transicao();

-- Versões emitidas nunca mudam nem são apagadas.
create or replace function public.avaliacao_versoes_imutavel()
returns trigger
language plpgsql set search_path = public
as $$
begin
  raise exception 'Versões emitidas são imutáveis.';
end;
$$;

create trigger avaliacao_versoes_imutavel
  before update or delete on public.avaliacao_versoes
  for each row execute function public.avaliacao_versoes_imutavel();

-- ---------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------
alter table public.avaliacao_config enable row level security;
alter table public.avaliacao_assinaturas enable row level security;
alter table public.avaliacoes enable row level security;
alter table public.avaliacao_comparaveis enable row level security;
alter table public.avaliacao_arquivos enable row level security;
alter table public.avaliacao_eventos enable row level security;
alter table public.avaliacao_versoes enable row level security;

create policy "avaliacao_config leitura da empresa" on public.avaliacao_config
  for select to authenticated
  using (tenant_id = public.auth_tenant_id());
create policy "avaliacao_config insercao gestores" on public.avaliacao_config
  for insert to authenticated
  with check (tenant_id = public.auth_tenant_id() and public.avaliacao_pode_aprovar('estudo_comercial'));
create policy "avaliacao_config edicao gestores" on public.avaliacao_config
  for update to authenticated
  using (tenant_id = public.auth_tenant_id() and public.avaliacao_pode_aprovar('estudo_comercial'))
  with check (tenant_id = public.auth_tenant_id());

create policy "assinatura so a propria pessoa" on public.avaliacao_assinaturas
  for all to authenticated
  using (usuario_id = (select auth.uid()))
  with check (usuario_id = (select auth.uid()) and tenant_id = public.auth_tenant_id());

create policy "avaliacoes leitura" on public.avaliacoes
  for select to authenticated
  using (
    tenant_id = public.auth_tenant_id()
    and (public.avaliacao_equipe_interna() or criado_por = (select auth.uid()))
  );
create policy "avaliacoes insercao" on public.avaliacoes
  for insert to authenticated
  with check (
    tenant_id = public.auth_tenant_id()
    and criado_por = (select auth.uid())
    and public.avaliacao_pode_criar()
  );
create policy "avaliacoes edicao" on public.avaliacoes
  for update to authenticated
  using (
    tenant_id = public.auth_tenant_id()
    and (public.avaliacao_equipe_interna() or criado_por = (select auth.uid()))
  )
  with check (tenant_id = public.auth_tenant_id());

create policy "comparaveis da avaliacao visivel" on public.avaliacao_comparaveis
  for all to authenticated
  using (
    tenant_id = public.auth_tenant_id()
    and exists (select 1 from public.avaliacoes a where a.id = avaliacao_id)
  )
  with check (
    tenant_id = public.auth_tenant_id()
    and exists (select 1 from public.avaliacoes a where a.id = avaliacao_id)
  );

create policy "arquivos da avaliacao visivel" on public.avaliacao_arquivos
  for all to authenticated
  using (
    tenant_id = public.auth_tenant_id()
    and exists (select 1 from public.avaliacoes a where a.id = avaliacao_id)
  )
  with check (
    tenant_id = public.auth_tenant_id()
    and exists (select 1 from public.avaliacoes a where a.id = avaliacao_id)
  );

create policy "eventos leitura" on public.avaliacao_eventos
  for select to authenticated
  using (
    tenant_id = public.auth_tenant_id()
    and exists (select 1 from public.avaliacoes a where a.id = avaliacao_id)
  );
create policy "eventos insercao" on public.avaliacao_eventos
  for insert to authenticated
  with check (
    tenant_id = public.auth_tenant_id()
    and autor_id = (select auth.uid())
    and exists (select 1 from public.avaliacoes a where a.id = avaliacao_id)
  );

create policy "versoes leitura" on public.avaliacao_versoes
  for select to authenticated
  using (
    tenant_id = public.auth_tenant_id()
    and exists (select 1 from public.avaliacoes a where a.id = avaliacao_id)
  );
create policy "versoes insercao por quem aprova" on public.avaliacao_versoes
  for insert to authenticated
  with check (
    tenant_id = public.auth_tenant_id()
    and emitido_por = (select auth.uid())
    and public.avaliacao_pode_aprovar(modalidade)
    and exists (select 1 from public.avaliacoes a where a.id = avaliacao_id and a.status = 'aprovado')
  );

grant select, insert, update on public.avaliacao_config to authenticated;
grant select, insert, update, delete on public.avaliacao_assinaturas to authenticated;
grant select, insert, update on public.avaliacoes to authenticated;
grant select, insert, update, delete on public.avaliacao_comparaveis to authenticated;
grant select, insert, update, delete on public.avaliacao_arquivos to authenticated;
grant select, insert on public.avaliacao_eventos to authenticated;
grant select, insert on public.avaliacao_versoes to authenticated;

-- ---------------------------------------------------------------
-- Arquivos: bucket privado. Pasta = <empresa>/<avaliação>/...
-- Os PDFs emitidos ficam em .../versoes/ e não podem ser trocados
-- nem apagados.
-- ---------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'avaliacoes', 'avaliacoes', false, 10485760,
  array['application/pdf', 'image/jpeg', 'image/png']
)
on conflict (id) do update set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "avaliacoes arquivos leitura" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'avaliacoes'
    and (storage.foldername(name))[1] = public.auth_tenant_id()::text
    and exists (
      select 1 from public.avaliacoes a
      where a.id::text = (storage.foldername(name))[2]
    )
  );
create policy "avaliacoes arquivos envio" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'avaliacoes'
    and (storage.foldername(name))[1] = public.auth_tenant_id()::text
    and exists (
      select 1 from public.avaliacoes a
      where a.id::text = (storage.foldername(name))[2]
    )
  );
create policy "avaliacoes arquivos remocao" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'avaliacoes'
    and (storage.foldername(name))[1] = public.auth_tenant_id()::text
    and coalesce((storage.foldername(name))[3], '') <> 'versoes'
    and exists (
      select 1 from public.avaliacoes a
      where a.id::text = (storage.foldername(name))[2]
    )
  );

-- ---------------------------------------------------------------
-- Responsável técnica: registro informado pela diretoria da Sacra.
-- Só cria a configuração onde a usuária existe; não altera nada se a
-- configuração já existir.
-- ---------------------------------------------------------------
insert into public.avaliacao_config (tenant_id, responsavel_usuario_id, responsavel_nome, responsavel_creci, responsavel_cnai)
select u.tenant_id, u.id, 'Amanda Martins', '14.502', '24.939'
from public.usuarios u
where u.nome = 'Amanda Martins' and u.nivel_acesso = 'diretor' and u.tenant_id is not null
on conflict (tenant_id) do nothing;
