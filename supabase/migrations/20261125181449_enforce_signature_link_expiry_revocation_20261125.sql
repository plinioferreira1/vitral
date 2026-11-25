-- Aplicada direto no banco de produção (frente de segurança) em 20261125.
-- Arquivo criado em 25/11/2026 a partir de supabase_migrations.schema_migrations,
-- com o SQL exato, para o repositório acompanhar o banco e o db push não parar.

CREATE OR REPLACE FUNCTION public.assinatura_buscar(p_token uuid)
 RETURNS TABLE(signatario_id uuid, nome_esperado text, ja_assinado boolean, imovel_endereco text, imovel_cep text, imovel_area_construida text, imovel_area_lote text, imovel_inscricao_iptu text, imovel_matricula text, imovel_valor_condominio numeric, vendedor_nome text, vendedor_cpf text, vendedor_rg text, vendedor_telefone text, vendedor_endereco text, conjuge_nome text, conjuge_cpf text, conjuge_rg text, conjuge_telefone text, conjuge_endereco text, valor_imovel numeric, comissao_percentual numeric, prazo_dias integer, exclusividade boolean, observacoes text, foro text, status_autorizacao text, criado_em timestamp with time zone)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select
    s.id,
    s.nome_esperado,
    s.assinado_em is not null,
    i.endereco,
    i.cep,
    i.area_construida,
    i.area_lote,
    i.inscricao_iptu,
    i.matricula,
    i.valor_condominio,
    c.nome,
    c.cpf_cnpj,
    c.rg,
    c.telefone,
    c.endereco,
    cc.nome,
    cc.cpf_cnpj,
    cc.rg,
    cc.telefone,
    cc.endereco,
    a.valor_imovel,
    a.comissao_percentual,
    a.prazo_dias,
    a.exclusividade,
    a.observacoes,
    a.foro,
    a.status,
    a.criado_em
  from autorizacao_signatarios s
  join autorizacoes_venda a on a.id = s.autorizacao_id
  join imoveis i on i.id = a.imovel_id
  join clientes c on c.id = a.vendedor_id
  left join clientes cc on cc.id = a.conjuge_id
  where s.token = p_token AND s.link_revogado_em IS NULL AND (s.link_expira_em IS NULL OR s.link_expira_em > now());
$function$;

CREATE OR REPLACE FUNCTION public.assinatura_registrar(p_token uuid, p_nome_digitado text, p_assinatura_imagem text, p_ip text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  v_signatario uuid;
  v_autorizacao_id uuid;
  v_status text;
  v_pendentes integer;
BEGIN
  IF p_token IS NULL OR char_length(btrim(coalesce(p_nome_digitado,''))) NOT BETWEEN 1 AND 200
     OR char_length(coalesce(p_assinatura_imagem,'')) NOT BETWEEN 1 AND 600000 THEN
    RETURN false;
  END IF;
  SELECT s.id,s.autorizacao_id INTO v_signatario,v_autorizacao_id
    FROM public.autorizacao_signatarios s
    WHERE s.token=p_token AND s.assinado_em IS NULL AND s.link_revogado_em IS NULL AND (s.link_expira_em IS NULL OR s.link_expira_em > now()) FOR UPDATE;
  IF v_signatario IS NULL THEN RETURN false; END IF;
  SELECT a.status INTO v_status FROM public.autorizacoes_venda a
    WHERE a.id=v_autorizacao_id FOR UPDATE;
  IF v_status IS DISTINCT FROM 'pendente' THEN RETURN false; END IF;
  UPDATE public.autorizacao_signatarios
    SET nome_digitado=btrim(p_nome_digitado), assinatura_imagem=p_assinatura_imagem,
        ip_assinatura=left(coalesce(p_ip,''),80), assinado_em=now()
    WHERE id=v_signatario AND assinado_em IS NULL;
  IF NOT FOUND THEN RETURN false; END IF;
  SELECT count(*) INTO v_pendentes FROM public.autorizacao_signatarios
    WHERE autorizacao_id=v_autorizacao_id AND assinado_em IS NULL;
  IF v_pendentes=0 THEN
    UPDATE public.autorizacoes_venda SET status='assinado', assinado_em=now()
      WHERE id=v_autorizacao_id AND status='pendente';
  END IF;
  RETURN true;
END
$function$;

CREATE OR REPLACE FUNCTION public.carta_proposta_assinatura_buscar(p_token uuid)
 RETURNS TABLE(signatario_id uuid, nome_esperado text, ja_assinado boolean, imovel_endereco text, codigo_san text, proponente_nome text, proponente_cpf text, segundo_proponente_nome text, segundo_proponente_cpf text, valor_total numeric, prazo_dias_validade integer, condicoes jsonb, observacoes text, status_proposta text, criado_em timestamp with time zone)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select
    s.id,
    s.nome_esperado,
    s.assinado_em is not null,
    i.endereco,
    p.codigo_san,
    c.nome,
    c.cpf_cnpj,
    cc.nome,
    cc.cpf_cnpj,
    p.valor_total,
    p.prazo_dias_validade,
    coalesce(
      (select jsonb_agg(jsonb_build_object('descricao', cond.descricao, 'valor', cond.valor) order by cond.ordem)
       from carta_proposta_condicoes cond where cond.carta_proposta_id = p.id),
      '[]'::jsonb
    ),
    p.observacoes,
    p.status,
    p.criado_em
  from carta_proposta_signatarios s
  join cartas_proposta p on p.id = s.carta_proposta_id
  join imoveis i on i.id = p.imovel_id
  join clientes c on c.id = p.proponente_id
  left join clientes cc on cc.id = p.segundo_proponente_id
  where s.token = p_token AND s.link_revogado_em IS NULL AND (s.link_expira_em IS NULL OR s.link_expira_em > now());
$function$;

CREATE OR REPLACE FUNCTION public.carta_proposta_assinatura_registrar(p_token uuid, p_nome_digitado text, p_assinatura_imagem text, p_ip text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  v_signatario uuid;
  v_proposta_id uuid;
  v_status text;
  v_pendentes integer;
BEGIN
  IF p_token IS NULL OR char_length(btrim(coalesce(p_nome_digitado,''))) NOT BETWEEN 1 AND 200
     OR char_length(coalesce(p_assinatura_imagem,'')) NOT BETWEEN 1 AND 600000 THEN
    RETURN false;
  END IF;
  SELECT s.id,s.carta_proposta_id INTO v_signatario,v_proposta_id
    FROM public.carta_proposta_signatarios s
    WHERE s.token=p_token AND s.assinado_em IS NULL AND s.link_revogado_em IS NULL AND (s.link_expira_em IS NULL OR s.link_expira_em > now()) FOR UPDATE;
  IF v_signatario IS NULL THEN RETURN false; END IF;
  SELECT p.status INTO v_status FROM public.cartas_proposta p
    WHERE p.id=v_proposta_id FOR UPDATE;
  IF v_status IS DISTINCT FROM 'pendente' THEN RETURN false; END IF;
  UPDATE public.carta_proposta_signatarios
    SET nome_digitado=btrim(p_nome_digitado), assinatura_imagem=p_assinatura_imagem,
        ip_assinatura=left(coalesce(p_ip,''),80), assinado_em=now()
    WHERE id=v_signatario AND assinado_em IS NULL;
  IF NOT FOUND THEN RETURN false; END IF;
  SELECT count(*) INTO v_pendentes FROM public.carta_proposta_signatarios
    WHERE carta_proposta_id=v_proposta_id AND assinado_em IS NULL;
  IF v_pendentes=0 THEN
    UPDATE public.cartas_proposta SET status='assinado', assinado_em=now()
      WHERE id=v_proposta_id AND status='pendente';
  END IF;
  RETURN true;
END
$function$;

CREATE OR REPLACE FUNCTION public.termo_entrega_assinatura_buscar(p_token uuid)
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
    and s.link_revogado_em IS NULL AND (s.link_expira_em IS NULL OR s.link_expira_em > now())
    and t.status in ('aguardando_assinatura', 'parcialmente_assinado', 'assinado');
$function$;

CREATE OR REPLACE FUNCTION public.termo_entrega_assinatura_registrar(p_token uuid, p_nome_digitado text, p_assinatura_imagem text, p_ip text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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

  select * into v_sig from public.termo_entrega_signatarios where token = p_token and assinado_em is null AND link_revogado_em IS NULL AND (link_expira_em IS NULL OR link_expira_em > now()) for update;
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
$function$;

CREATE OR REPLACE FUNCTION public.termo_visita_buscar(p_token uuid)
 RETURNS TABLE(termo_id uuid, ja_assinado boolean, imovel_endereco text, codigo_imovel text, valor_imovel numeric, cliente_nome text, cliente_telefone text, cliente_email text, corretor_nome text, multa_percentual numeric, data_visita date, status_termo text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select
    t.id,
    t.assinado_em is not null,
    i.endereco,
    t.codigo_imovel,
    t.valor_imovel,
    c.nome,
    c.telefone,
    c.email,
    co.nome,
    t.multa_percentual,
    t.data_visita,
    t.status
  from termos_visita t
  join imoveis i on i.id = t.imovel_id
  join clientes c on c.id = t.cliente_id
  left join corretores co on co.id = t.corretor_id
  where t.token = p_token AND t.link_revogado_em IS NULL AND (t.link_expira_em IS NULL OR t.link_expira_em > now());
$function$;

CREATE OR REPLACE FUNCTION public.termo_visita_buscar_ficha(p_token uuid)
 RETURNS TABLE(termo_id uuid, ja_assinado boolean, imovel_endereco text, codigo_imovel text, valor_imovel numeric, cliente_nome text, cliente_telefone text, cliente_email text, corretor_nome text, multa_percentual numeric, data_visita date, status_termo text, imoveis_visitados jsonb, hora_visita time without time zone, cliente_cpf_informado text, cliente_rg_informado text, corretor_creci text, corretor_creci_j text, imobiliaria_parceira text, nota integer, feedback text, observacoes text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select t.id, t.assinado_em is not null, i.endereco, t.codigo_imovel,
    t.valor_imovel, c.nome, c.telefone, c.email, co.nome, t.multa_percentual,
    t.data_visita, t.status, t.imoveis_visitados, t.hora_visita,
    t.cliente_cpf_informado, t.cliente_rg_informado, t.corretor_creci,
    t.corretor_creci_j, t.imobiliaria_parceira, t.nota, t.feedback, t.observacoes
  from public.termos_visita t
  join public.imoveis i on i.id = t.imovel_id
  join public.clientes c on c.id = t.cliente_id
  left join public.corretores co on co.id = t.corretor_id
  where t.token = p_token AND t.link_revogado_em IS NULL AND (t.link_expira_em IS NULL OR t.link_expira_em > now()) and t.status <> 'cancelado'
$function$;

CREATE OR REPLACE FUNCTION public.termo_visita_registrar(p_token uuid, p_nome_digitado text, p_cpf text, p_rg text, p_assinatura_imagem text, p_ip text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  v_termo_id uuid;
BEGIN
  IF p_token IS NULL OR char_length(btrim(coalesce(p_nome_digitado,''))) NOT BETWEEN 1 AND 200
     OR char_length(coalesce(p_assinatura_imagem,'')) NOT BETWEEN 1 AND 600000
     OR char_length(coalesce(p_cpf,''))>30 OR char_length(coalesce(p_rg,''))>40 THEN
    RETURN false;
  END IF;
  SELECT t.id INTO v_termo_id FROM public.termos_visita t
    WHERE t.token=p_token AND t.assinado_em IS NULL AND t.status='pendente' AND t.link_revogado_em IS NULL AND (t.link_expira_em IS NULL OR t.link_expira_em > now())
    FOR UPDATE;
  IF v_termo_id IS NULL THEN RETURN false; END IF;
  UPDATE public.termos_visita SET
    nome_digitado=btrim(p_nome_digitado), cliente_cpf=p_cpf, cliente_rg=p_rg,
    assinatura_imagem=p_assinatura_imagem, ip_assinatura=left(coalesce(p_ip,''),80),
    assinado_em=now(), status='assinado'
    WHERE id=v_termo_id AND assinado_em IS NULL AND status='pendente';
  RETURN FOUND;
END
$function$;
