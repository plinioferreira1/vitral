-- Aplicada direto no banco de produção (frente de segurança) em 20261125.
-- Arquivo criado em 25/11/2026 a partir de supabase_migrations.schema_migrations,
-- com o SQL exato, para o repositório acompanhar o banco e o db push não parar.

CREATE OR REPLACE FUNCTION public.assinatura_registrar(p_token uuid, p_nome_digitado text, p_assinatura_imagem text, p_ip text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path TO ''
AS $fn$
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
    WHERE s.token=p_token AND s.assinado_em IS NULL FOR UPDATE;
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
$fn$;

CREATE OR REPLACE FUNCTION public.carta_proposta_assinatura_registrar(p_token uuid, p_nome_digitado text, p_assinatura_imagem text, p_ip text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path TO ''
AS $fn$
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
    WHERE s.token=p_token AND s.assinado_em IS NULL FOR UPDATE;
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
$fn$;

CREATE OR REPLACE FUNCTION public.termo_visita_registrar(p_token uuid, p_nome_digitado text, p_cpf text, p_rg text, p_assinatura_imagem text, p_ip text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path TO ''
AS $fn$
DECLARE
  v_termo_id uuid;
BEGIN
  IF p_token IS NULL OR char_length(btrim(coalesce(p_nome_digitado,''))) NOT BETWEEN 1 AND 200
     OR char_length(coalesce(p_assinatura_imagem,'')) NOT BETWEEN 1 AND 600000
     OR char_length(coalesce(p_cpf,''))>30 OR char_length(coalesce(p_rg,''))>40 THEN
    RETURN false;
  END IF;
  SELECT t.id INTO v_termo_id FROM public.termos_visita t
    WHERE t.token=p_token AND t.assinado_em IS NULL AND t.status='pendente'
    FOR UPDATE;
  IF v_termo_id IS NULL THEN RETURN false; END IF;
  UPDATE public.termos_visita SET
    nome_digitado=btrim(p_nome_digitado), cliente_cpf=p_cpf, cliente_rg=p_rg,
    assinatura_imagem=p_assinatura_imagem, ip_assinatura=left(coalesce(p_ip,''),80),
    assinado_em=now(), status='assinado'
    WHERE id=v_termo_id AND assinado_em IS NULL AND status='pendente';
  RETURN FOUND;
END
$fn$;
