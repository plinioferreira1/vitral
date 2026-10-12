-- Cabeçalho, partes, encargos e auditoria confirmados na mesma transação.
-- Invoker mantém RLS; nenhum status, assinatura ou retrato é recebido do cliente.
create or replace function public.termo_entrega_gravar(
  p_id uuid, p_novo boolean, p_termo jsonb, p_partes jsonb, p_encargos jsonb,
  p_eventos jsonb, p_atualizado_em timestamptz default null, p_duplicado_de uuid default null
) returns jsonb
language plpgsql security invoker set search_path = '' set lock_timeout = '10s'
as $$
declare
  v_tenant uuid := public.auth_tenant_id();
  v_autor uuid := auth.uid();
  v_nome text;
  v_atual public.termos_entrega%rowtype;
  v_doc public.termos_entrega%rowtype;
  v_codigo text;
  v_count integer;
  v_removidos jsonb := '[]'::jsonb;
begin
  select nome into v_nome from public.usuarios
  where id = v_autor and tenant_id = v_tenant and ativo;
  if v_nome is null or not coalesce(public.termo_entrega_pode_operar(), false) then
    raise exception 'Sem permissão para alterar termos de entrega.' using errcode = '42501';
  end if;
  if p_id is null or p_novo is null or jsonb_typeof(p_termo) is distinct from 'object'
    or jsonb_typeof(p_partes) is distinct from 'array' or jsonb_typeof(p_encargos) is distinct from 'array'
    or jsonb_typeof(p_eventos) is distinct from 'array' then
    raise exception 'Dados do termo inválidos.';
  end if;
  v_doc := jsonb_populate_record(null::public.termos_entrega, p_termo);
  if p_novo then
    -- Serializa geração de códigos por empresa e repetição do mesmo envio.
    perform pg_advisory_xact_lock(hashtextextended(v_tenant::text || ':termos-entrega', 0));
  end if;
  select * into v_atual from public.termos_entrega where id = p_id and tenant_id = v_tenant for update;
  if p_novo and found then
    if v_atual.criado_por is distinct from v_autor or v_atual.processo_id is distinct from v_doc.processo_id
      or v_atual.duplicado_de is distinct from p_duplicado_de then
      raise exception 'Solicitação de criação inválida.';
    end if;
    return jsonb_build_object('id',p_id,'atualizado_em',v_atual.atualizado_em,'anexos_removidos','[]'::jsonb);
  elsif not p_novo then
    if v_atual.id is null then raise exception 'Termo não encontrado.'; end if;
    if v_atual.status <> 'rascunho' then raise exception 'Este termo não está em rascunho.'; end if;
    if p_atualizado_em is null or v_atual.atualizado_em is distinct from p_atualizado_em then
      raise exception 'Este termo foi alterado em outra janela. Recarregue a página antes de salvar.' using errcode = '40001';
    end if;
    if v_doc.processo_id is distinct from v_atual.processo_id then raise exception 'A venda vinculada não pode ser alterada.'; end if;
  end if;
  if v_doc.processo_id is not null and not exists (
    select 1 from public.processos where id = v_doc.processo_id and tenant_id = v_tenant and categoria = 'venda'
  ) then raise exception 'Venda não encontrada.'; end if;
  if p_duplicado_de is not null and not exists (
    select 1 from public.termos_entrega where id = p_duplicado_de and tenant_id = v_tenant
  ) then raise exception 'Termo de origem não encontrado.'; end if;
  if exists (select 1 from jsonb_populate_recordset(null::public.termo_entrega_partes,p_partes) r
    where r.cliente_id is not null and not exists(select 1 from public.clientes c where c.id=r.cliente_id and c.tenant_id=v_tenant))
  then raise exception 'Cliente não encontrado.'; end if;

  if p_novo then
    v_codigo := public.termo_entrega_proximo_codigo();
    insert into public.termos_entrega (id, tenant_id, codigo, processo_id, imovel_endereco, imovel_area_privativa, imovel_matricula, imovel_cartorio, imovel_inscricao_iptu, imovel_outros, data_entrega, hora_entrega, marco, marco_data, demais_encargos, ressarcimento, clausula, local_assinatura, data_documento, comprador_deve_centavos, vendedor_deve_centavos, saldo_centavos, saldo_a_favor, regra_calculo, vendedores_nomes, compradores_nomes, responsavel_id, criado_por, criado_por_nome, atualizado_por, duplicado_de)
    values (p_id, v_tenant, v_codigo, v_doc.processo_id, v_doc.imovel_endereco, v_doc.imovel_area_privativa, v_doc.imovel_matricula, v_doc.imovel_cartorio, v_doc.imovel_inscricao_iptu, v_doc.imovel_outros, v_doc.data_entrega, v_doc.hora_entrega, v_doc.marco, v_doc.marco_data, v_doc.demais_encargos, v_doc.ressarcimento, v_doc.clausula, v_doc.local_assinatura, v_doc.data_documento, v_doc.comprador_deve_centavos, v_doc.vendedor_deve_centavos, v_doc.saldo_centavos, v_doc.saldo_a_favor, v_doc.regra_calculo, v_doc.vendedores_nomes, v_doc.compradores_nomes, v_autor, v_autor, v_nome, v_autor, p_duplicado_de)
    returning * into v_atual;
  else
    update public.termos_entrega set
      processo_id = v_doc.processo_id,
      imovel_endereco = v_doc.imovel_endereco,
      imovel_area_privativa = v_doc.imovel_area_privativa,
      imovel_matricula = v_doc.imovel_matricula,
      imovel_cartorio = v_doc.imovel_cartorio,
      imovel_inscricao_iptu = v_doc.imovel_inscricao_iptu,
      imovel_outros = v_doc.imovel_outros,
      data_entrega = v_doc.data_entrega,
      hora_entrega = v_doc.hora_entrega,
      marco = v_doc.marco,
      marco_data = v_doc.marco_data,
      demais_encargos = v_doc.demais_encargos,
      ressarcimento = v_doc.ressarcimento,
      clausula = v_doc.clausula,
      local_assinatura = v_doc.local_assinatura,
      data_documento = v_doc.data_documento,
      comprador_deve_centavos = v_doc.comprador_deve_centavos,
      vendedor_deve_centavos = v_doc.vendedor_deve_centavos,
      saldo_centavos = v_doc.saldo_centavos,
      saldo_a_favor = v_doc.saldo_a_favor,
      regra_calculo = v_doc.regra_calculo,
      vendedores_nomes = v_doc.vendedores_nomes,
      compradores_nomes = v_doc.compradores_nomes, atualizado_por = v_autor
    where id = p_id and tenant_id = v_tenant returning * into v_atual;
    if not found then raise exception 'Não foi possível atualizar o termo.'; end if;
  end if;

  delete from public.termo_entrega_partes where termo_id = p_id
    and id not in (select (r->>'id')::uuid from jsonb_array_elements(p_partes) r);
  delete from public.termo_entrega_encargos where termo_id = p_id
    and id not in (select (r->>'id')::uuid from jsonb_array_elements(p_encargos) r);

  insert into public.termo_entrega_partes (id, tenant_id, termo_id, papel, nome, cpf_cnpj, rg, email, cliente_id, ordem)
  select r.id, v_tenant, p_id, r.papel, r.nome, r.cpf_cnpj, r.rg, r.email, r.cliente_id, r.ordem
  from jsonb_populate_recordset(null::public.termo_entrega_partes, p_partes) r
  on conflict (id) do update set
    papel = excluded.papel,
    nome = excluded.nome,
    cpf_cnpj = excluded.cpf_cnpj,
    rg = excluded.rg,
    email = excluded.email,
    cliente_id = excluded.cliente_id,
    ordem = excluded.ordem
  where termo_entrega_partes.termo_id = p_id and termo_entrega_partes.tenant_id = v_tenant;
  get diagnostics v_count = row_count;
  if v_count <> jsonb_array_length(p_partes) then
    raise exception 'Itens de outro termo não podem ser alterados.';
  end if;


  insert into public.termo_entrega_encargos (id, tenant_id, termo_id, ordem, categoria, descricao, competencia, periodo_inicio, periodo_fim, vencimento, valor_total_centavos, pago_por, responsavel, tipo_calculo, manual_vendedor_centavos, manual_comprador_centavos, observacao, dias_total, dias_vendedor, dias_comprador, parte_vendedor_centavos, parte_comprador_centavos, ressarcimento_centavos, ressarcimento_de, memoria_calculo, regra_calculo, criado_por, criado_por_nome)
  select r.id, v_tenant, p_id, r.ordem, r.categoria, r.descricao, r.competencia, r.periodo_inicio, r.periodo_fim, r.vencimento, r.valor_total_centavos, r.pago_por, r.responsavel, r.tipo_calculo, r.manual_vendedor_centavos, r.manual_comprador_centavos, r.observacao, r.dias_total, r.dias_vendedor, r.dias_comprador, r.parte_vendedor_centavos, r.parte_comprador_centavos, r.ressarcimento_centavos, r.ressarcimento_de, r.memoria_calculo, r.regra_calculo, v_autor, v_nome
  from jsonb_populate_recordset(null::public.termo_entrega_encargos, p_encargos) r
  on conflict (id) do update set
    ordem = excluded.ordem,
    categoria = excluded.categoria,
    descricao = excluded.descricao,
    competencia = excluded.competencia,
    periodo_inicio = excluded.periodo_inicio,
    periodo_fim = excluded.periodo_fim,
    vencimento = excluded.vencimento,
    valor_total_centavos = excluded.valor_total_centavos,
    pago_por = excluded.pago_por,
    responsavel = excluded.responsavel,
    tipo_calculo = excluded.tipo_calculo,
    manual_vendedor_centavos = excluded.manual_vendedor_centavos,
    manual_comprador_centavos = excluded.manual_comprador_centavos,
    observacao = excluded.observacao,
    dias_total = excluded.dias_total,
    dias_vendedor = excluded.dias_vendedor,
    dias_comprador = excluded.dias_comprador,
    parte_vendedor_centavos = excluded.parte_vendedor_centavos,
    parte_comprador_centavos = excluded.parte_comprador_centavos,
    ressarcimento_centavos = excluded.ressarcimento_centavos,
    ressarcimento_de = excluded.ressarcimento_de,
    memoria_calculo = excluded.memoria_calculo,
    regra_calculo = excluded.regra_calculo,
    atualizado_em = now()
  where termo_entrega_encargos.termo_id = p_id and termo_entrega_encargos.tenant_id = v_tenant;
  get diagnostics v_count = row_count;
  if v_count <> jsonb_array_length(p_encargos) then
    raise exception 'Itens de outro termo não podem ser alterados.';
  end if;

  -- Metadados removidos junto com o encargo; arquivos físicos só após commit.
  with removidos as (
    delete from public.termo_entrega_anexos where termo_id = p_id and encargo_id is not null
    and encargo_id not in (select (r->>'id')::uuid from jsonb_array_elements(p_encargos) r)
    returning caminho
  ) select coalesce(jsonb_agg(caminho),'[]'::jsonb) into v_removidos from removidos;

  insert into public.termo_entrega_eventos (tenant_id, termo_id, versao, acao, descricao, anterior, novo, usuario_id, usuario_nome)
  select v_tenant, p_id, v_atual.versao, r->>'acao', left(r->>'descricao',1000), r->'anterior', r->'novo', v_autor, v_nome
  from jsonb_array_elements(p_eventos) r;
  return jsonb_build_object('id',p_id,'atualizado_em',v_atual.atualizado_em,'anexos_removidos',v_removidos);
end;
$$;
revoke all on function public.termo_entrega_gravar(uuid,boolean,jsonb,jsonb,jsonb,jsonb,timestamptz,uuid) from public, anon;
grant execute on function public.termo_entrega_gravar(uuid,boolean,jsonb,jsonb,jsonb,jsonb,timestamptz,uuid) to authenticated;
