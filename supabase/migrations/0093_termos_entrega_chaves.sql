-- Vendas › Termo de Entrega de Chaves e Proporcionalidade.
-- Só acrescenta estruturas; nenhuma tabela existente é alterada.
--
-- termos_entrega              cabeçalho, imóvel, datas, acerto final e situação
-- termo_entrega_partes        vendedores e compradores (vários de cada)
-- termo_entrega_encargos      encargos com os dados e o resultado do cálculo
-- termo_entrega_anexos        comprovantes (boletos, faturas) por encargo
-- termo_entrega_signatarios   quem assina cada versão (link, assinatura, IP)
-- termo_entrega_versoes       retrato imutável de cada versão gerada
-- termo_entrega_eventos       auditoria (só inserção)
-- termo_entrega_config        modelo: cláusula, prazo, multa, papel timbrado
--
-- Dinheiro é sempre guardado em CENTAVOS INTEIROS (bigint).

-- ---------------------------------------------------------------
-- Permissões: nível + área de Vendas, como no restante do sistema
-- ---------------------------------------------------------------
create or replace function public.termo_entrega_pode_ver()
returns boolean
language sql stable security definer set search_path = public
as $$
  select public.usuario_tem_categoria('venda'::public.categoria_processo)
    and exists (
      select 1 from public.usuarios u
      where u.id = (select auth.uid()) and u.nivel_acesso not in ('corretor', 'social_media')
    );
$$;

create or replace function public.termo_entrega_pode_operar()
returns boolean
language sql stable security definer set search_path = public
as $$
  select public.termo_entrega_pode_ver() and public.usuario_pode_editar();
$$;

revoke all on function public.termo_entrega_pode_ver() from public, anon;
revoke all on function public.termo_entrega_pode_operar() from public, anon;
grant execute on function public.termo_entrega_pode_ver() to authenticated;
grant execute on function public.termo_entrega_pode_operar() to authenticated;

-- ---------------------------------------------------------------
-- Modelo do documento (uma linha por empresa)
-- ---------------------------------------------------------------
create table public.termo_entrega_config (
  tenant_id uuid primary key references public.tenants(id) on delete cascade,
  clausula_padrao text,
  prazo_transferencia_dias integer not null default 10 check (prazo_transferencia_dias between 0 and 365),
  multa_diaria_centavos bigint not null default 10000 check (multa_diaria_centavos >= 0),
  observacoes_padrao text,
  texto_complementar text,
  cidade text not null default 'Brasília – DF',
  -- papel timbrado enviado (pasta privada); vazio = timbrado padrão da Sacra
  timbrado_caminho text,
  margem_superior integer not null default 122 check (margem_superior between 40 and 300),
  margem_inferior integer not null default 104 check (margem_inferior between 40 and 300),
  atualizado_por uuid references public.usuarios(id) on delete set null,
  atualizado_em timestamptz not null default now()
);

-- ---------------------------------------------------------------
-- Termo
-- ---------------------------------------------------------------
create table public.termos_entrega (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  codigo text not null,
  processo_id uuid references public.processos(id) on delete set null,
  status text not null default 'rascunho'
    check (status in ('rascunho', 'gerado', 'aguardando_assinatura', 'parcialmente_assinado', 'assinado', 'cancelado')),
  versao integer not null default 1 check (versao >= 1),

  imovel_endereco text,
  imovel_area_privativa text,
  imovel_matricula text,
  imovel_cartorio text,
  imovel_inscricao_iptu text,
  imovel_outros text,

  data_entrega date,
  hora_entrega text,
  marco text not null default 'entrega' check (marco in ('entrega', 'escritura', 'registro', 'quitacao', 'personalizada')),
  marco_data date,

  demais_encargos jsonb not null default '{}'::jsonb,
  ressarcimento jsonb not null default '{}'::jsonb,
  clausula jsonb not null default '{}'::jsonb,
  local_assinatura text,
  data_documento date,

  -- acerto final (compensação entre as partes)
  comprador_deve_centavos bigint not null default 0,
  vendedor_deve_centavos bigint not null default 0,
  saldo_centavos bigint not null default 0 check (saldo_centavos >= 0),
  saldo_a_favor text check (saldo_a_favor in ('vendedor', 'comprador')),
  regra_calculo text,

  -- nomes repetidos aqui só para a busca da listagem
  vendedores_nomes text,
  compradores_nomes text,

  responsavel_id uuid references public.usuarios(id) on delete set null,
  duplicado_de uuid references public.termos_entrega(id) on delete set null,
  criado_por uuid references public.usuarios(id) on delete set null,
  criado_por_nome text,
  criado_em timestamptz not null default now(),
  atualizado_por uuid references public.usuarios(id) on delete set null,
  atualizado_em timestamptz not null default now(),
  gerado_em timestamptz,
  enviado_em timestamptz,
  assinado_em timestamptz,
  cancelado_em timestamptz,
  cancelado_por uuid references public.usuarios(id) on delete set null,
  cancelado_motivo text,
  unique (tenant_id, codigo)
);
create index termos_entrega_lista_idx on public.termos_entrega (tenant_id, status, criado_em desc);
create index termos_entrega_processo_idx on public.termos_entrega (processo_id);

create table public.termo_entrega_partes (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  termo_id uuid not null references public.termos_entrega(id) on delete cascade,
  papel text not null check (papel in ('vendedor', 'comprador')),
  nome text not null,
  cpf_cnpj text,
  rg text,
  email text,
  cliente_id uuid references public.clientes(id) on delete set null,
  ordem integer not null default 0
);
create index termo_entrega_partes_termo_idx on public.termo_entrega_partes (termo_id);

create table public.termo_entrega_encargos (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  termo_id uuid not null references public.termos_entrega(id) on delete cascade,
  ordem integer not null default 0,
  categoria text not null,
  descricao text not null,
  competencia text,
  periodo_inicio date,
  periodo_fim date,
  vencimento date,
  valor_total_centavos bigint not null default 0 check (valor_total_centavos >= 0),
  pago_por text not null check (pago_por in ('vendedor', 'comprador', 'nao_pago', 'outro')),
  responsavel text not null check (responsavel in ('vendedor', 'comprador', 'ambos', 'proporcional')),
  tipo_calculo text not null check (tipo_calculo in ('proporcional_dias', 'integral', 'manual')),
  manual_vendedor_centavos bigint not null default 0,
  manual_comprador_centavos bigint not null default 0,
  observacao text,
  -- resultado do cálculo (refeito no servidor a cada gravação)
  dias_total integer,
  dias_vendedor integer,
  dias_comprador integer,
  parte_vendedor_centavos bigint not null default 0,
  parte_comprador_centavos bigint not null default 0,
  ressarcimento_centavos bigint not null default 0,
  ressarcimento_de text check (ressarcimento_de in ('vendedor', 'comprador')),
  memoria_calculo text,
  regra_calculo text,
  criado_por uuid references public.usuarios(id) on delete set null,
  criado_por_nome text,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);
create index termo_entrega_encargos_termo_idx on public.termo_entrega_encargos (termo_id, ordem);

create table public.termo_entrega_anexos (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  termo_id uuid not null references public.termos_entrega(id) on delete cascade,
  -- ligação lógica com o encargo (o anexo pode ser enviado antes de o rascunho ser salvo)
  encargo_id uuid,
  caminho text not null,
  nome text not null,
  tamanho bigint,
  enviado_por uuid references public.usuarios(id) on delete set null,
  enviado_por_nome text,
  criado_em timestamptz not null default now()
);
create index termo_entrega_anexos_termo_idx on public.termo_entrega_anexos (termo_id);

create table public.termo_entrega_signatarios (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  termo_id uuid not null references public.termos_entrega(id) on delete cascade,
  versao integer not null,
  parte_id uuid,
  papel text not null check (papel in ('vendedor', 'comprador')),
  nome_esperado text not null,
  email text,
  token uuid not null default gen_random_uuid() unique,
  nome_digitado text,
  assinatura_imagem text,
  ip_assinatura text,
  assinado_em timestamptz,
  email_enviado_em timestamptz,
  ordem integer not null default 0
);
create index termo_entrega_signatarios_termo_idx on public.termo_entrega_signatarios (termo_id, versao);

create table public.termo_entrega_versoes (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  termo_id uuid not null references public.termos_entrega(id) on delete cascade,
  versao integer not null,
  -- retrato completo: partes, imóvel, encargos, cálculo, textos e modelo usados
  retrato jsonb not null,
  hash text not null,
  gerado_por uuid references public.usuarios(id) on delete set null,
  gerado_por_nome text,
  gerado_em timestamptz not null default now(),
  unique (termo_id, versao)
);

create table public.termo_entrega_eventos (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  termo_id uuid references public.termos_entrega(id) on delete cascade,
  versao integer,
  acao text not null,
  descricao text not null,
  anterior jsonb,
  novo jsonb,
  usuario_id uuid references public.usuarios(id) on delete set null,
  usuario_nome text,
  criado_em timestamptz not null default now()
);
create index termo_entrega_eventos_termo_idx on public.termo_entrega_eventos (termo_id, criado_em desc);

-- ---------------------------------------------------------------
-- Código sequencial por ano: TEC-2026-0001
-- ---------------------------------------------------------------
create or replace function public.termo_entrega_proximo_codigo()
returns text
language sql stable security definer set search_path = public
as $$
  select 'TEC-' || to_char(now() at time zone 'America/Sao_Paulo', 'YYYY') || '-' ||
    lpad((coalesce(max(substring(t.codigo from '(\d+)$')::int), 0) + 1)::text, 4, '0')
  from public.termos_entrega t
  where t.tenant_id = public.auth_tenant_id()
    and t.codigo like 'TEC-' || to_char(now() at time zone 'America/Sao_Paulo', 'YYYY') || '-%';
$$;
revoke all on function public.termo_entrega_proximo_codigo() from public, anon;
grant execute on function public.termo_entrega_proximo_codigo() to authenticated;

-- ---------------------------------------------------------------
-- Travas: documento assinado não muda; só nova versão
-- ---------------------------------------------------------------
create or replace function public.termos_entrega_guardar()
returns trigger
language plpgsql set search_path = public
as $$
declare
  -- colunas que podem mudar sem que o conteúdo do documento mude
  v_livres text[] := array['status', 'versao', 'atualizado_em', 'atualizado_por', 'gerado_em', 'enviado_em', 'assinado_em',
                           'cancelado_em', 'cancelado_por', 'cancelado_motivo', 'responsavel_id'];
  v_conteudo_mudou boolean;
  v_nova_versao boolean;
begin
  new.atualizado_em := now();
  v_conteudo_mudou := (to_jsonb(new) - v_livres) is distinct from (to_jsonb(old) - v_livres);
  v_nova_versao := new.versao = old.versao + 1 and new.status = 'rascunho';

  if new.versao <> old.versao and not v_nova_versao then
    raise exception 'A versão do termo só avança de uma em uma, voltando a rascunho.';
  end if;

  if old.status = 'cancelado' then
    raise exception 'Termo cancelado não pode ser alterado.';
  end if;

  if old.status in ('parcialmente_assinado', 'assinado') then
    if v_nova_versao then
      return new;
    end if;
    if v_conteudo_mudou then
      raise exception 'Termo com assinatura não pode ser alterado. Crie uma nova versão.';
    end if;
    if new.status not in (old.status, 'assinado', 'cancelado') then
      raise exception 'Termo com assinatura não volta a rascunho. Crie uma nova versão.';
    end if;
    return new;
  end if;

  if v_nova_versao then
    raise exception 'Nova versão só existe depois de alguma assinatura.';
  end if;

  -- gerado / aguardando assinatura: para mexer no conteúdo é preciso voltar a rascunho
  if old.status in ('gerado', 'aguardando_assinatura') and v_conteudo_mudou and new.status <> 'rascunho' then
    raise exception 'Volte o termo para edição antes de alterar o conteúdo.';
  end if;
  return new;
end;
$$;
create trigger termos_entrega_guardar before update on public.termos_entrega
  for each row execute function public.termos_entrega_guardar();

-- partes e encargos só mudam com o termo em rascunho
create or replace function public.termo_entrega_itens_guardar()
returns trigger
language plpgsql set search_path = public
as $$
declare
  v_termo uuid := coalesce(new.termo_id, old.termo_id);
  v_status text;
begin
  select status into v_status from public.termos_entrega where id = v_termo;
  -- sem o termo (exclusão em cascata) não há o que proteger
  if v_status is not null and v_status <> 'rascunho' then
    raise exception 'O termo não está em rascunho: partes e encargos não podem ser alterados.';
  end if;
  return coalesce(new, old);
end;
$$;
create trigger termo_entrega_partes_guardar before insert or update or delete on public.termo_entrega_partes
  for each row execute function public.termo_entrega_itens_guardar();
create trigger termo_entrega_encargos_guardar before insert or update or delete on public.termo_entrega_encargos
  for each row execute function public.termo_entrega_itens_guardar();

-- assinatura registrada nunca é alterada nem apagada
create or replace function public.termo_entrega_signatarios_guardar()
returns trigger
language plpgsql set search_path = public
as $$
begin
  if old.assinado_em is not null and exists (select 1 from public.termos_entrega where id = old.termo_id) then
    raise exception 'Assinatura registrada não pode ser alterada.';
  end if;
  return coalesce(new, old);
end;
$$;
create trigger termo_entrega_signatarios_guardar before update or delete on public.termo_entrega_signatarios
  for each row execute function public.termo_entrega_signatarios_guardar();

-- versão que já recebeu assinatura é imutável
create or replace function public.termo_entrega_versoes_guardar()
returns trigger
language plpgsql set search_path = public
as $$
begin
  if exists (
    select 1 from public.termo_entrega_signatarios s
    where s.termo_id = old.termo_id and s.versao = old.versao and s.assinado_em is not null
  ) then
    raise exception 'Versão assinada não pode ser alterada.';
  end if;
  return coalesce(new, old);
end;
$$;
create trigger termo_entrega_versoes_guardar before update or delete on public.termo_entrega_versoes
  for each row execute function public.termo_entrega_versoes_guardar();

-- ---------------------------------------------------------------
-- Assinatura pelo link (mesmo padrão da Carta Proposta)
-- ---------------------------------------------------------------
create or replace function public.termo_entrega_assinatura_buscar(p_token uuid)
returns jsonb
language sql stable security definer set search_path = public
as $$
  select jsonb_build_object(
    'signatario', jsonb_build_object(
      'nome_esperado', s.nome_esperado, 'papel', s.papel,
      'ja_assinado', s.assinado_em is not null, 'assinado_em', s.assinado_em
    ),
    'termo', jsonb_build_object('codigo', t.codigo, 'versao', t.versao, 'status', t.status),
    'retrato', v.retrato,
    'assinaturas', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'papel', o.papel, 'nomeEsperado', o.nome_esperado, 'nomeDigitado', o.nome_digitado,
        'imagem', o.assinatura_imagem, 'assinadoEm', o.assinado_em, 'ip', o.ip_assinatura
      ) order by o.ordem), '[]'::jsonb)
      from public.termo_entrega_signatarios o
      where o.termo_id = t.id and o.versao = t.versao
    )
  )
  from public.termo_entrega_signatarios s
  join public.termos_entrega t on t.id = s.termo_id and t.versao = s.versao
  join public.termo_entrega_versoes v on v.termo_id = t.id and v.versao = t.versao
  where s.token = p_token
    and t.status in ('aguardando_assinatura', 'parcialmente_assinado', 'assinado');
$$;

create or replace function public.termo_entrega_assinatura_registrar(
  p_token uuid,
  p_nome_digitado text,
  p_assinatura_imagem text,
  p_ip text
)
returns boolean
language plpgsql security definer set search_path = public
as $$
declare
  v_sig public.termo_entrega_signatarios%rowtype;
  v_termo public.termos_entrega%rowtype;
  v_total int;
  v_assinadas int;
  v_status text;
begin
  if coalesce(trim(p_nome_digitado), '') = '' or coalesce(p_assinatura_imagem, '') = ''
     or length(p_assinatura_imagem) > 600000 or length(p_nome_digitado) > 200 then
    return false;
  end if;

  select * into v_sig from public.termo_entrega_signatarios where token = p_token and assinado_em is null for update;
  if not found then
    return false;
  end if;

  select * into v_termo from public.termos_entrega where id = v_sig.termo_id for update;
  if v_termo.versao <> v_sig.versao or v_termo.status not in ('aguardando_assinatura', 'parcialmente_assinado') then
    return false;
  end if;

  update public.termo_entrega_signatarios
  set nome_digitado = trim(p_nome_digitado),
      assinatura_imagem = p_assinatura_imagem,
      ip_assinatura = left(coalesce(p_ip, ''), 80),
      assinado_em = now()
  where id = v_sig.id;

  select count(*), count(*) filter (where assinado_em is not null) into v_total, v_assinadas
  from public.termo_entrega_signatarios
  where termo_id = v_termo.id and versao = v_termo.versao;

  v_status := case when v_assinadas >= v_total then 'assinado' else 'parcialmente_assinado' end;
  update public.termos_entrega
  set status = v_status,
      assinado_em = case when v_status = 'assinado' then now() else null end
  where id = v_termo.id;

  insert into public.termo_entrega_eventos (tenant_id, termo_id, versao, acao, descricao, usuario_nome, novo)
  values (
    v_termo.tenant_id, v_termo.id, v_termo.versao, 'assinatura',
    trim(p_nome_digitado) || ' assinou como ' || v_sig.nome_esperado || ' (' || v_assinadas || ' de ' || v_total || ').',
    trim(p_nome_digitado) || ' (assinatura pelo link)',
    jsonb_build_object('papel', v_sig.papel, 'ip', left(coalesce(p_ip, ''), 80), 'status', v_status)
  );
  return true;
end;
$$;

revoke all on function public.termo_entrega_assinatura_buscar(uuid) from public;
revoke all on function public.termo_entrega_assinatura_registrar(uuid, text, text, text) from public;
grant execute on function public.termo_entrega_assinatura_buscar(uuid) to anon, authenticated;
grant execute on function public.termo_entrega_assinatura_registrar(uuid, text, text, text) to anon, authenticated;

-- ---------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------
alter table public.termo_entrega_config enable row level security;
alter table public.termos_entrega enable row level security;
alter table public.termo_entrega_partes enable row level security;
alter table public.termo_entrega_encargos enable row level security;
alter table public.termo_entrega_anexos enable row level security;
alter table public.termo_entrega_signatarios enable row level security;
alter table public.termo_entrega_versoes enable row level security;
alter table public.termo_entrega_eventos enable row level security;

create policy "termo config leitura" on public.termo_entrega_config
  for select to authenticated using (tenant_id = public.auth_tenant_id() and public.termo_entrega_pode_ver());
create policy "termo config insercao gestores" on public.termo_entrega_config
  for insert to authenticated with check (tenant_id = public.auth_tenant_id() and public.usuario_eh_gestor());
create policy "termo config edicao gestores" on public.termo_entrega_config
  for update to authenticated using (tenant_id = public.auth_tenant_id() and public.usuario_eh_gestor())
  with check (tenant_id = public.auth_tenant_id());

create policy "termos leitura" on public.termos_entrega
  for select to authenticated using (tenant_id = public.auth_tenant_id() and public.termo_entrega_pode_ver());
create policy "termos insercao" on public.termos_entrega
  for insert to authenticated with check (tenant_id = public.auth_tenant_id() and public.termo_entrega_pode_operar());
create policy "termos edicao" on public.termos_entrega
  for update to authenticated using (tenant_id = public.auth_tenant_id() and public.termo_entrega_pode_operar())
  with check (tenant_id = public.auth_tenant_id());

create policy "termo partes leitura" on public.termo_entrega_partes
  for select to authenticated using (tenant_id = public.auth_tenant_id() and public.termo_entrega_pode_ver());
create policy "termo partes escrita" on public.termo_entrega_partes
  for all to authenticated using (tenant_id = public.auth_tenant_id() and public.termo_entrega_pode_operar())
  with check (tenant_id = public.auth_tenant_id() and public.termo_entrega_pode_operar());

create policy "termo encargos leitura" on public.termo_entrega_encargos
  for select to authenticated using (tenant_id = public.auth_tenant_id() and public.termo_entrega_pode_ver());
create policy "termo encargos escrita" on public.termo_entrega_encargos
  for all to authenticated using (tenant_id = public.auth_tenant_id() and public.termo_entrega_pode_operar())
  with check (tenant_id = public.auth_tenant_id() and public.termo_entrega_pode_operar());

create policy "termo anexos leitura" on public.termo_entrega_anexos
  for select to authenticated using (tenant_id = public.auth_tenant_id() and public.termo_entrega_pode_ver());
create policy "termo anexos insercao" on public.termo_entrega_anexos
  for insert to authenticated with check (tenant_id = public.auth_tenant_id() and public.termo_entrega_pode_operar());
create policy "termo anexos remocao" on public.termo_entrega_anexos
  for delete to authenticated using (tenant_id = public.auth_tenant_id() and public.termo_entrega_pode_operar());

create policy "termo signatarios leitura" on public.termo_entrega_signatarios
  for select to authenticated using (tenant_id = public.auth_tenant_id() and public.termo_entrega_pode_ver());
create policy "termo signatarios insercao" on public.termo_entrega_signatarios
  for insert to authenticated with check (tenant_id = public.auth_tenant_id() and public.termo_entrega_pode_operar());
create policy "termo signatarios edicao" on public.termo_entrega_signatarios
  for update to authenticated using (tenant_id = public.auth_tenant_id() and public.termo_entrega_pode_operar())
  with check (tenant_id = public.auth_tenant_id());
create policy "termo signatarios remocao" on public.termo_entrega_signatarios
  for delete to authenticated using (tenant_id = public.auth_tenant_id() and public.termo_entrega_pode_operar());

create policy "termo versoes leitura" on public.termo_entrega_versoes
  for select to authenticated using (tenant_id = public.auth_tenant_id() and public.termo_entrega_pode_ver());
create policy "termo versoes insercao" on public.termo_entrega_versoes
  for insert to authenticated with check (tenant_id = public.auth_tenant_id() and public.termo_entrega_pode_operar());
create policy "termo versoes edicao" on public.termo_entrega_versoes
  for update to authenticated using (tenant_id = public.auth_tenant_id() and public.termo_entrega_pode_operar())
  with check (tenant_id = public.auth_tenant_id());

create policy "termo eventos leitura" on public.termo_entrega_eventos
  for select to authenticated using (tenant_id = public.auth_tenant_id() and public.termo_entrega_pode_ver());
create policy "termo eventos insercao" on public.termo_entrega_eventos
  for insert to authenticated
  with check (tenant_id = public.auth_tenant_id() and public.termo_entrega_pode_operar() and usuario_id = (select auth.uid()));

revoke all on public.termo_entrega_config, public.termos_entrega, public.termo_entrega_partes, public.termo_entrega_encargos,
  public.termo_entrega_anexos, public.termo_entrega_signatarios, public.termo_entrega_versoes, public.termo_entrega_eventos from anon;
grant select, insert, update on public.termo_entrega_config, public.termos_entrega, public.termo_entrega_versoes to authenticated;
grant select, insert, update, delete on public.termo_entrega_partes, public.termo_entrega_encargos, public.termo_entrega_signatarios to authenticated;
grant select, insert, delete on public.termo_entrega_anexos to authenticated;
grant select, insert on public.termo_entrega_eventos to authenticated;

-- ---------------------------------------------------------------
-- Arquivos: bucket privado. Pasta = <empresa>/<termo>/... e <empresa>/timbrado/...
-- ---------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'termos-entrega', 'termos-entrega', false, 10485760,
  array['application/pdf', 'image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "termos entrega arquivos leitura" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'termos-entrega'
    and (storage.foldername(name))[1] = public.auth_tenant_id()::text
    and public.termo_entrega_pode_ver()
  );
create policy "termos entrega arquivos envio" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'termos-entrega'
    and (storage.foldername(name))[1] = public.auth_tenant_id()::text
    and public.termo_entrega_pode_operar()
  );
create policy "termos entrega arquivos remocao" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'termos-entrega'
    and (storage.foldername(name))[1] = public.auth_tenant_id()::text
    and public.termo_entrega_pode_operar()
  );
