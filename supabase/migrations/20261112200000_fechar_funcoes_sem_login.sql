-- Funções SECURITY DEFINER não podem ser chamadas por quem não fez login.
-- Só as de assinatura pública (termos, propostas, visita) e convite_validar
-- continuam abertas ao anon; essas ficam fora desta lista de propósito.
-- O Postgres dá EXECUTE a PUBLIC por padrão, então é preciso revogar de
-- PUBLIC e de anon e devolver a quem usa.

-- Usadas pela equipe logada (telas e regras de acesso das tabelas).
do $$
declare
  f text;
begin
  foreach f in array array[
    'public.add_member(text, public.perfil_usuario, public.categoria_processo[], public.nivel_acesso_usuario)',
    'public.atualizar_categorias_membro(uuid, public.categoria_processo[], public.nivel_acesso_usuario)',
    'public.auth_tenant_id()',
    'public.bootstrap_tenant(text)',
    'public.usuario_eh_gestor()',
    'public.usuario_pode_criar_documento_cliente()',
    'public.usuario_pode_editar()',
    'public.usuario_pode_ver_documento_cliente(public.categoria_processo)',
    'public.usuario_pode_ver_documento_cliente(public.categoria_processo, uuid)',
    'public.usuario_tem_categoria(public.categoria_processo)'
  ] loop
    execute format('revoke execute on function %s from public, anon', f);
    execute format('grant execute on function %s to authenticated, service_role', f);
  end loop;
end $$;

-- Só uso interno: gatilhos e o cadastro inicial de empresa (chamados
-- pelo dono das funções). Ninguém chama direto pela API.
do $$
declare
  f text;
begin
  foreach f in array array[
    'public.avaliacoes_guardar_transicao()',
    'public.handle_new_auth_user()',
    'public.seed_etapas_padrao(uuid)',
    'public.seed_modelos_padrao(uuid)'
  ] loop
    execute format('revoke execute on function %s from public, anon, authenticated', f);
    execute format('grant execute on function %s to service_role', f);
  end loop;
end $$;
