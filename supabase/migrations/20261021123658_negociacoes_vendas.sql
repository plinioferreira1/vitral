-- Pré-venda separada da operação. Escrita apenas pelas ações do servidor.
create type public.situacao_negociacao as enum ('em_andamento', 'convertida', 'perdida');

create table public.vendas_negociacoes (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id),
  cliente_nome text not null check (length(trim(cliente_nome)) between 1 and 200),
  telefone text not null default '',
  vendedor_nome text not null default '',
  imovel_endereco text not null check (length(trim(imovel_endereco)) between 1 and 500),
  corretor_id uuid references public.corretores(id),
  responsavel_id uuid not null references public.usuarios(id),
  valor numeric(14,2) not null default 0 check (valor >= 0),
  data_abertura date not null default (now() at time zone 'America/Sao_Paulo')::date,
  previsao_fechamento date,
  proxima_acao text not null default '',
  data_acompanhamento date,
  observacoes text not null default '',
  situacao public.situacao_negociacao not null default 'em_andamento',
  encerrada_em timestamptz,
  motivo_perda text,
  processo_id uuid unique references public.processos(id) on delete restrict,
  criado_por uuid not null references public.usuarios(id),
  criado_em timestamptz not null default clock_timestamp(),
  atualizado_em timestamptz not null default clock_timestamp(),
  check (
    (situacao = 'em_andamento' and encerrada_em is null and processo_id is null and motivo_perda is null)
    or (situacao = 'convertida' and encerrada_em is not null and processo_id is not null and motivo_perda is null)
    or (situacao = 'perdida' and encerrada_em is not null and processo_id is null and length(trim(motivo_perda)) > 0)
  )
);
create index on public.vendas_negociacoes (tenant_id, situacao, data_abertura);
create index on public.vendas_negociacoes (tenant_id, encerrada_em);
create index on public.vendas_negociacoes (responsavel_id);
create index on public.vendas_negociacoes (corretor_id);
create index on public.vendas_negociacoes (criado_por);

create table public.vendas_negociacao_eventos (
  id uuid primary key default gen_random_uuid(),
  negociacao_id uuid not null references public.vendas_negociacoes(id),
  tenant_id uuid not null references public.tenants(id),
  usuario_id uuid not null references public.usuarios(id),
  acao text not null,
  dados jsonb not null,
  criado_em timestamptz not null default clock_timestamp()
);
create index on public.vendas_negociacao_eventos (negociacao_id, criado_em);
create index on public.vendas_negociacao_eventos (tenant_id);
create index on public.vendas_negociacao_eventos (usuario_id);

alter table public.vendas_negociacoes enable row level security;
alter table public.vendas_negociacao_eventos enable row level security;
revoke all on public.vendas_negociacoes, public.vendas_negociacao_eventos from anon, authenticated;
grant select on public.vendas_negociacoes, public.vendas_negociacao_eventos to authenticated;
grant all on public.vendas_negociacoes, public.vendas_negociacao_eventos to service_role;
create policy "negociacoes leitura vendas" on public.vendas_negociacoes for select to authenticated
using (tenant_id = (select public.auth_tenant_id()) and public.usuario_tem_categoria('venda')
  and exists (select 1 from public.usuarios u where u.id = auth.uid() and u.ativo and u.nivel_acesso not in ('corretor','social_media')));
create policy "negociacao eventos leitura vendas" on public.vendas_negociacao_eventos for select to authenticated
using (tenant_id = (select public.auth_tenant_id()) and exists (select 1 from public.vendas_negociacoes n where n.id = negociacao_id));

-- RPCs invoker, exclusivas da service_role; a identidade vem da sessão conferida
-- pela ação. A conferência é repetida aqui para evitar gravação fora da empresa.
create function public.vendas_negociacao_salvar(
  p_id uuid, p_tenant_id uuid, p_usuario_id uuid, p_dados jsonb, p_versao timestamptz default null
) returns uuid language plpgsql security invoker set search_path = '' as $$
declare n public.vendas_negociacoes; anterior jsonb; resp uuid; corr uuid;
begin
  if not exists (select 1 from public.usuarios u where u.id=p_usuario_id and u.tenant_id=p_tenant_id and u.ativo
    and (u.nivel_acesso in ('diretor','gerente') or (u.nivel_acesso in ('supervisor','gerente_locacao')
      and exists(select 1 from public.usuario_categorias c where c.usuario_id=u.id and c.categoria='venda'))))
  then raise exception 'Sem permissão para alterar negociações.' using errcode='42501'; end if;
  resp := (p_dados->>'responsavel_id')::uuid;
  corr := nullif(p_dados->>'corretor_id','')::uuid;
  if not exists(select 1 from public.usuarios u where u.id=resp and u.tenant_id=p_tenant_id and u.ativo
    and (u.nivel_acesso in ('diretor','gerente','auxiliar') or (u.nivel_acesso in ('supervisor','gerente_locacao')
      and exists(select 1 from public.usuario_categorias c where c.usuario_id=u.id and c.categoria='venda'))))
  then raise exception 'Escolha um responsável ativo com acesso a Vendas.'; end if;
  if corr is not null and not exists(select 1 from public.corretores c where c.id=corr and c.tenant_id=p_tenant_id)
  then raise exception 'Corretor inválido.'; end if;
  select * into n from public.vendas_negociacoes where id=p_id and tenant_id=p_tenant_id for update;
  if found then
    if n.situacao <> 'em_andamento' then raise exception 'Negociação já encerrada.'; end if;
    if p_versao is distinct from n.atualizado_em then raise exception 'Esta negociação mudou. Atualize a página antes de salvar.'; end if;
    anterior := to_jsonb(n);
  else
    if p_versao is not null then raise exception 'Negociação não encontrada.'; end if;
    n.id := p_id; n.tenant_id := p_tenant_id; n.criado_por := p_usuario_id;
    n.criado_em := clock_timestamp(); n.situacao := 'em_andamento';
  end if;
  n.cliente_nome := trim(p_dados->>'cliente_nome');
  n.telefone := coalesce(p_dados->>'telefone','');
  n.vendedor_nome := coalesce(p_dados->>'vendedor_nome','');
  n.imovel_endereco := trim(p_dados->>'imovel_endereco');
  n.corretor_id := corr; n.responsavel_id := resp;
  n.valor := (p_dados->>'valor')::numeric;
  n.data_abertura := (p_dados->>'data_abertura')::date;
  if n.data_abertura > (now() at time zone 'America/Sao_Paulo')::date then raise exception 'A abertura não pode ser futura.'; end if;
  n.previsao_fechamento := nullif(p_dados->>'previsao_fechamento','')::date;
  n.proxima_acao := coalesce(p_dados->>'proxima_acao','');
  n.data_acompanhamento := nullif(p_dados->>'data_acompanhamento','')::date;
  n.observacoes := coalesce(p_dados->>'observacoes','');
  n.atualizado_em := clock_timestamp();
  if anterior is null then insert into public.vendas_negociacoes select n.*;
  else update public.vendas_negociacoes set
    cliente_nome=n.cliente_nome, telefone=n.telefone, vendedor_nome=n.vendedor_nome,
    imovel_endereco=n.imovel_endereco, corretor_id=n.corretor_id, responsavel_id=n.responsavel_id,
    valor=n.valor, data_abertura=n.data_abertura, previsao_fechamento=n.previsao_fechamento,
    proxima_acao=n.proxima_acao, data_acompanhamento=n.data_acompanhamento,
    observacoes=n.observacoes, atualizado_em=n.atualizado_em where id=n.id;
  end if;
  insert into public.vendas_negociacao_eventos(negociacao_id,tenant_id,usuario_id,acao,dados)
    values(n.id,p_tenant_id,p_usuario_id,case when anterior is null then 'Cadastro' else 'Edição' end,
      jsonb_build_object('antes',anterior,'depois',to_jsonb(n)));
  return n.id;
end $$;

create function public.vendas_negociacao_encerrar(
  p_id uuid, p_tenant_id uuid, p_usuario_id uuid, p_situacao public.situacao_negociacao,
  p_modelo_id uuid default null, p_motivo text default null, p_versao timestamptz default null
) returns uuid language plpgsql security invoker set search_path = '' as $$
declare n public.vendas_negociacoes; modelo public.modelos_processo;
  comprador uuid; vendedor uuid; imovel uuid; processo uuid; instante timestamptz := clock_timestamp();
begin
  if not exists (select 1 from public.usuarios u where u.id=p_usuario_id and u.tenant_id=p_tenant_id and u.ativo
    and (u.nivel_acesso in ('diretor','gerente') or (u.nivel_acesso in ('supervisor','gerente_locacao')
      and exists(select 1 from public.usuario_categorias c where c.usuario_id=u.id and c.categoria='venda'))))
  then raise exception 'Sem permissão para encerrar negociações.' using errcode='42501'; end if;
  select * into n from public.vendas_negociacoes where id=p_id and tenant_id=p_tenant_id for update;
  if not found then raise exception 'Negociação não encontrada.'; end if;
  -- Repetição do mesmo fechamento retorna o vínculo, sem duplicar processo/evento.
  if n.situacao = p_situacao and p_situacao in ('convertida','perdida') then return n.processo_id; end if;
  if n.situacao <> 'em_andamento' then raise exception 'Negociação já encerrada.'; end if;
  if p_versao is distinct from n.atualizado_em then raise exception 'Esta negociação mudou. Atualize a página antes de encerrar.'; end if;
  if p_situacao = 'perdida' then
    if coalesce(length(trim(p_motivo)),0) = 0 then raise exception 'Informe o motivo da perda.'; end if;
  elsif p_situacao = 'convertida' then
    if n.valor <= 0 or length(trim(n.vendedor_nome)) = 0 then raise exception 'Preencha vendedor e valor da venda antes de converter.'; end if;
    select * into modelo from public.modelos_processo where id=p_modelo_id and tenant_id=p_tenant_id and ativo and categoria='venda';
    if not found then raise exception 'Escolha um modelo ativo de venda da sua empresa.'; end if;
    if not exists(select 1 from public.usuarios u where u.id=n.responsavel_id and u.tenant_id=p_tenant_id and u.ativo)
    then raise exception 'Atualize o responsável antes de converter.'; end if;
    insert into public.clientes(tenant_id,nome,telefone) values(p_tenant_id,n.cliente_nome,nullif(n.telefone,'')) returning id into comprador;
    insert into public.clientes(tenant_id,nome) values(p_tenant_id,n.vendedor_nome) returning id into vendedor;
    insert into public.imoveis(tenant_id,endereco) values(p_tenant_id,n.imovel_endereco) returning id into imovel;
    processo := gen_random_uuid();
    insert into public.processos(id,tenant_id,modelo_processo_id,numero_processo,comprador_id,vendedor_id,
      imovel_id,corretor_id,indicacao_id,responsavel_id,tipo,status,categoria,valor_total,data_criacao,participacao_vgv_revisada)
    values(processo,p_tenant_id,modelo.id,'PROC-' || to_char(instante at time zone 'America/Sao_Paulo','YYYY') || '-' || processo::text,
      comprador,vendedor,imovel,n.corretor_id,n.corretor_id,n.responsavel_id,modelo.nome,'ativo','venda',n.valor,
      (instante at time zone 'America/Sao_Paulo')::date,true);
    insert into public.etapas(processo_id,nome,responsavel_id,status,ordem,especial)
      select processo,e.nome,n.responsavel_id,'pendente',e.ordem,false from public.etapas_padrao e
      where e.categoria='venda' and e.tipo='sequencial';
    insert into public.historico(processo_id,usuario_id,acao,detalhe)
      values(processo,p_usuario_id,'criou o processo a partir de negociação',jsonb_build_object('negociacao_id',n.id));
  else raise exception 'Situação de encerramento inválida.';
  end if;
  update public.vendas_negociacoes set situacao=p_situacao, processo_id=processo,
    motivo_perda=case when p_situacao='perdida' then trim(p_motivo) end,
    encerrada_em=instante, atualizado_em=instante where id=n.id;
  insert into public.vendas_negociacao_eventos(negociacao_id,tenant_id,usuario_id,acao,dados)
    values(n.id,p_tenant_id,p_usuario_id,case when p_situacao='convertida' then 'Conversão em processo' else 'Perda' end,
      jsonb_build_object('situacao',p_situacao,'processo_id',processo,'motivo',case when p_situacao='perdida' then trim(p_motivo) end));
  return processo;
end $$;
revoke all on function public.vendas_negociacao_salvar(uuid,uuid,uuid,jsonb,timestamptz) from public,anon,authenticated;
revoke all on function public.vendas_negociacao_encerrar(uuid,uuid,uuid,public.situacao_negociacao,uuid,text,timestamptz) from public,anon,authenticated;
grant execute on function public.vendas_negociacao_salvar(uuid,uuid,uuid,jsonb,timestamptz) to service_role;
grant execute on function public.vendas_negociacao_encerrar(uuid,uuid,uuid,public.situacao_negociacao,uuid,text,timestamptz) to service_role;
