-- Supabase pode conceder EXECUTE explicitamente a anon por defaults de schema.
-- Revogar apenas PUBLIC não remove grants explícitos. Permitir apenas usuários autenticados
-- que ainda passam pelas regras de tenant e gerente/diretor dentro da função.
REVOKE ALL ON FUNCTION public.registrar_recebimento_comissao(uuid,numeric,date,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.registrar_recebimento_comissao(uuid,numeric,date,text) TO authenticated;
