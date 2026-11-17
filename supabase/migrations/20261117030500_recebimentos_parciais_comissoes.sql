-- A06: recebimentos reais de comissões, sem reescrever registros históricos.
-- Cada registro de pagamento fica no histórico do processo em transação única.
ALTER TABLE public.comissoes DROP CONSTRAINT IF EXISTS comissoes_status_check;
ALTER TABLE public.comissoes ADD CONSTRAINT comissoes_status_check
  CHECK (status IN ('0% pago', '50% pago', 'parcialmente pago', '100% pago', 'cancelada'));

CREATE OR REPLACE FUNCTION public.registrar_recebimento_comissao(
  p_comissao_id uuid, p_valor numeric, p_data date, p_observacao text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_comissao public.comissoes%ROWTYPE;
  v_tenant uuid;
  v_ator uuid := auth.uid();
  v_total numeric;
  v_evento uuid := gen_random_uuid();
BEGIN
  IF v_ator IS NULL THEN RAISE EXCEPTION 'Sessão expirada.'; END IF;
  SELECT c.* INTO v_comissao FROM public.comissoes c
    WHERE c.id = p_comissao_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Comissão não encontrada.'; END IF;
  SELECT p.tenant_id INTO v_tenant FROM public.processos p WHERE p.id=v_comissao.processo_id;
  IF NOT EXISTS (
    SELECT 1 FROM public.usuarios u
    WHERE u.id=v_ator AND u.tenant_id=v_tenant AND u.ativo
      AND u.nivel_acesso::text IN ('diretor','gerente')
  ) THEN
    RAISE EXCEPTION 'Você não tem permissão para registrar pagamentos.';
  END IF;
  IF v_comissao.status IN ('100% pago','cancelada') THEN
    RAISE EXCEPTION 'Comissão quitada ou cancelada. Para corrigir, use a retificação.';
  END IF;
  IF v_comissao.status='50% pago' AND v_comissao.valor_recebido IS NULL THEN
    RAISE EXCEPTION 'Pagamento legado incompleto. Revise o valor já recebido antes de registrar outro.';
  END IF;
  IF p_valor IS NULL OR p_valor <= 0 OR p_valor > 999999999
     OR p_data IS NULL OR p_data > CURRENT_DATE
     OR char_length(coalesce(p_observacao,'')) > 500 THEN
    RAISE EXCEPTION 'Confira o valor, a data real e a observação do pagamento.';
  END IF;
  v_total := round(coalesce(v_comissao.valor_recebido,0) + p_valor,2);
  IF v_comissao.valor_previsto IS NULL OR
     v_total > v_comissao.valor_previsto THEN
    RAISE EXCEPTION 'O pagamento excede o saldo restante da comissão.';
  END IF;

  UPDATE public.comissoes
     SET valor_recebido=v_total, data_recebida=p_data,
         status=CASE WHEN v_total >= valor_previsto THEN '100% pago' ELSE 'parcialmente pago' END
     WHERE id=p_comissao_id;

  INSERT INTO public.historico (processo_id, usuario_id, acao, detalhe)
  VALUES (
    v_comissao.processo_id, v_ator, 'recebimento de comissão',
    jsonb_build_object(
      'evento_id',v_evento,'comissao_id',p_comissao_id,
      'valor',round(p_valor,2),'data_recebimento',p_data,
      'valor_anterior',coalesce(v_comissao.valor_recebido,0),
      'valor_recebido_acumulado',v_total,
      'saldo_restante',v_comissao.valor_previsto-v_total,
      'observacao',nullif(trim(p_observacao),'')
    )
  );
  RETURN v_evento;
END;
$$;
REVOKE ALL ON FUNCTION public.registrar_recebimento_comissao(uuid,numeric,date,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.registrar_recebimento_comissao(uuid,numeric,date,text) TO authenticated;
