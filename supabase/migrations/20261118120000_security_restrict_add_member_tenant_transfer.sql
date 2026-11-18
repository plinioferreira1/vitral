-- Segurança: preserva limites entre organizações no cadastro de membros.
CREATE OR REPLACE FUNCTION public.add_member(p_email text, p_perfil perfil_usuario, p_categorias categoria_processo[], p_nivel_acesso nivel_acesso_usuario DEFAULT 'supervisor'::nivel_acesso_usuario)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  v_meu_tenant uuid;
  v_meu_nivel public.nivel_acesso_usuario;
  v_meu_ativo boolean;
  v_alvo_id uuid;
  v_alvo_tenant uuid;
  v_categoria public.categoria_processo;
BEGIN
  SELECT tenant_id, nivel_acesso, ativo
    INTO v_meu_tenant, v_meu_nivel, v_meu_ativo
    FROM public.usuarios WHERE id = auth.uid();

  IF v_meu_tenant IS NULL OR NOT COALESCE(v_meu_ativo, false)
     OR v_meu_nivel NOT IN ('diretor','gerente') THEN
    RAISE EXCEPTION 'Apenas gestores ativos podem adicionar membros.';
  END IF;

  -- Trava a linha durante o convite, evitando reassociação concorrente.
  SELECT id, tenant_id INTO v_alvo_id, v_alvo_tenant
    FROM public.usuarios
    WHERE lower(email) = lower(btrim(p_email))
    FOR UPDATE;

  IF v_alvo_id IS NULL THEN
    RAISE EXCEPTION 'Essa pessoa ainda não criou uma conta. Peça para ela se cadastrar primeiro em /login.';
  END IF;

  IF v_alvo_tenant IS NOT NULL AND v_alvo_tenant <> v_meu_tenant THEN
    RAISE EXCEPTION 'Usuário já vinculado a outra organização.';
  END IF;

  UPDATE public.usuarios
     SET tenant_id=v_meu_tenant, perfil=p_perfil, nivel_acesso=p_nivel_acesso
   WHERE id=v_alvo_id;

  DELETE FROM public.usuario_categorias WHERE usuario_id=v_alvo_id;
  FOREACH v_categoria IN ARRAY COALESCE(p_categorias, ARRAY[]::public.categoria_processo[]) LOOP
    INSERT INTO public.usuario_categorias(usuario_id,categoria)
    VALUES (v_alvo_id,v_categoria) ON CONFLICT DO NOTHING;
  END LOOP;
END;
$function$
;
REVOKE EXECUTE ON FUNCTION public.add_member(text,public.perfil_usuario,public.categoria_processo[],public.nivel_acesso_usuario) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.add_member(text,public.perfil_usuario,public.categoria_processo[],public.nivel_acesso_usuario) TO authenticated;
