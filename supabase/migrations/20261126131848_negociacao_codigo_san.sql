-- Código SAN na negociação de venda (preenchido no cadastro e levado ao
-- processo quando a negociação é convertida). Só acréscimo de coluna; as duas
-- funções mantêm a mesma assinatura e as mesmas regras, apenas passam a
-- gravar/copiar o código.
alter table public.vendas_negociacoes
  add column if not exists codigo_san text not null default ''
  check (length(codigo_san) <= 60);

CREATE OR REPLACE FUNCTION public.vendas_negociacao_salvar(p_id uuid, p_tenant_id uuid, p_usuario_id uuid, p_dados jsonb, p_versao timestamp with time zone DEFAULT NULL::timestamp with time zone)
 RETURNS uuid
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
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
  n.codigo_san := left(btrim(coalesce(p_dados->>'codigo_san','')),60);
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
    cliente_nome=n.cliente_nome, telefone=n.telefone, vendedor_nome=n.vendedor_nome, codigo_san=n.codigo_san,
    imovel_endereco=n.imovel_endereco, corretor_id=n.corretor_id, responsavel_id=n.responsavel_id,
    valor=n.valor, data_abertura=n.data_abertura, previsao_fechamento=n.previsao_fechamento,
    proxima_acao=n.proxima_acao, data_acompanhamento=n.data_acompanhamento,
    observacoes=n.observacoes, atualizado_em=n.atualizado_em where id=n.id;
  end if;
  insert into public.vendas_negociacao_eventos(negociacao_id,tenant_id,usuario_id,acao,dados)
    values(n.id,p_tenant_id,p_usuario_id,case when anterior is null then 'Cadastro' else 'Edição' end,
      jsonb_build_object('antes',anterior,'depois',to_jsonb(n)));
  return n.id;
end $function$;

CREATE OR REPLACE FUNCTION public.vendas_negociacao_encerrar(p_id uuid, p_tenant_id uuid, p_usuario_id uuid, p_situacao situacao_negociacao, p_modelo_id uuid DEFAULT NULL::uuid, p_motivo text DEFAULT NULL::text, p_versao timestamp with time zone DEFAULT NULL::timestamp with time zone)
 RETURNS uuid
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
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
    if not exists(select 1 from public.usuarios u where u.id=n.responsavel_id and u.tenant_id=p_tenant_id and u.ativo
      and (u.nivel_acesso in ('diretor','gerente','auxiliar') or (u.nivel_acesso in ('supervisor','gerente_locacao')
        and exists(select 1 from public.usuario_categorias c where c.usuario_id=u.id and c.categoria='venda'))))
    then raise exception 'Atualize o responsável antes de converter.'; end if;
    insert into public.clientes(tenant_id,nome,telefone) values(p_tenant_id,n.cliente_nome,nullif(n.telefone,'')) returning id into comprador;
    insert into public.clientes(tenant_id,nome) values(p_tenant_id,n.vendedor_nome) returning id into vendedor;
    insert into public.imoveis(tenant_id,endereco) values(p_tenant_id,n.imovel_endereco) returning id into imovel;
    processo := gen_random_uuid();
    insert into public.processos(id,tenant_id,modelo_processo_id,numero_processo,comprador_id,vendedor_id,
      imovel_id,corretor_id,indicacao_id,responsavel_id,tipo,status,categoria,valor_total,data_criacao,participacao_vgv_revisada,codigo_san)
    values(processo,p_tenant_id,modelo.id,'PROC-' || to_char(instante at time zone 'America/Sao_Paulo','YYYY') || '-' || processo::text,
      comprador,vendedor,imovel,n.corretor_id,n.corretor_id,n.responsavel_id,modelo.nome,'ativo','venda',n.valor,
      (instante at time zone 'America/Sao_Paulo')::date,true,nullif(n.codigo_san,''));
    insert into public.etapas(processo_id,nome,responsavel_id,status,ordem,especial)
      select processo,e.nome,n.responsavel_id,'pendente',e.ordem,false from public.etapas_padrao e
      where e.tenant_id=p_tenant_id and e.categoria='venda' and e.tipo='sequencial';
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
end $function$;
