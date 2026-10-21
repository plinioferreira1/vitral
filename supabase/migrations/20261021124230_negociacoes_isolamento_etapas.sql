-- Confere a categoria do responsável e copia apenas o catálogo da empresa.
create or replace function public.vendas_negociacao_encerrar(
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
    if not exists(select 1 from public.usuarios u where u.id=n.responsavel_id and u.tenant_id=p_tenant_id and u.ativo
      and (u.nivel_acesso in ('diretor','gerente','auxiliar') or (u.nivel_acesso in ('supervisor','gerente_locacao')
        and exists(select 1 from public.usuario_categorias c where c.usuario_id=u.id and c.categoria='venda'))))
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
end $$;
alter table public.vendas_negociacoes drop constraint vendas_negociacoes_check;
alter table public.vendas_negociacoes add constraint vendas_negociacoes_check check (
  (situacao = 'em_andamento' and encerrada_em is null and processo_id is null and motivo_perda is null)
  or (situacao = 'convertida' and encerrada_em is not null and processo_id is not null and motivo_perda is null)
  or (situacao = 'perdida' and encerrada_em is not null and processo_id is null and motivo_perda is not null and length(trim(motivo_perda)) > 0)
);
