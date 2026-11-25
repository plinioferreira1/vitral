-- Aplicada direto no banco de produção (frente de segurança) em 20261125.
-- Arquivo criado em 25/11/2026 a partir de supabase_migrations.schema_migrations,
-- com o SQL exato, para o repositório acompanhar o banco e o db push não parar.

CREATE OR REPLACE FUNCTION public.atualizar_categorias_membro(
  p_usuario_id uuid,
  p_categorias public.categoria_processo[],
  p_nivel_acesso public.nivel_acesso_usuario DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  v_meu_nivel public.nivel_acesso_usuario;
  v_meu_tenant uuid;
  v_meu_ativo boolean;
  v_alvo_tenant uuid;
  v_categoria public.categoria_processo;
BEGIN
  SELECT tenant_id, nivel_acesso, ativo
    INTO v_meu_tenant, v_meu_nivel, v_meu_ativo
    FROM public.usuarios WHERE id=auth.uid();
  IF v_meu_tenant IS NULL OR NOT COALESCE(v_meu_ativo, false)
     OR v_meu_nivel NOT IN ('diretor','gerente') THEN
    RAISE EXCEPTION 'Apenas gestores ativos podem alterar permissões.';
  END IF;
  SELECT tenant_id INTO v_alvo_tenant
    FROM public.usuarios WHERE id=p_usuario_id FOR UPDATE;
  IF v_alvo_tenant IS NULL OR v_alvo_tenant <> v_meu_tenant THEN
    RAISE EXCEPTION 'Usuário não encontrado nessa organização.';
  END IF;
  IF p_nivel_acesso IS NOT NULL THEN
    UPDATE public.usuarios SET nivel_acesso=p_nivel_acesso WHERE id=p_usuario_id;
  END IF;
  DELETE FROM public.usuario_categorias WHERE usuario_id=p_usuario_id;
  FOREACH v_categoria IN ARRAY COALESCE(p_categorias, ARRAY[]::public.categoria_processo[]) LOOP
    INSERT INTO public.usuario_categorias(usuario_id,categoria)
    VALUES(p_usuario_id,v_categoria) ON CONFLICT DO NOTHING;
  END LOOP;
END;
$function$;
REVOKE ALL ON FUNCTION public.atualizar_categorias_membro(uuid,public.categoria_processo[],public.nivel_acesso_usuario) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.atualizar_categorias_membro(uuid,public.categoria_processo[],public.nivel_acesso_usuario) TO authenticated, service_role;
