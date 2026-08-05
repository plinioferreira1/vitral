-- =========================================================
-- Corrige o e-mail do Renato, cadastrado errado
-- (renato.sacraimoveis@gmail.com em vez de
-- renatogalhardi.sacraimoveis@gmail.com). Atualiza tanto o
-- registro interno (usuarios) quanto o de autenticação
-- (auth.users / auth.identities), pra ele conseguir entrar
-- com o e-mail certo.
-- =========================================================

update usuarios
set email = 'renatogalhardi.sacraimoveis@gmail.com'
where email = 'renato.sacraimoveis@gmail.com';

update auth.users
set email = 'renatogalhardi.sacraimoveis@gmail.com',
    raw_user_meta_data = raw_user_meta_data || jsonb_build_object('email', 'renatogalhardi.sacraimoveis@gmail.com')
where email = 'renato.sacraimoveis@gmail.com';

-- auth.identities guarda o e-mail dentro de identity_data (json) pro
-- provedor "email" — em algumas versões do Supabase a coluna email
-- é derivada disso automaticamente. Atualiza o json se existir a
-- linha correspondente; se essa tabela não existir ou não tiver a
-- coluna esperada, ignora sem quebrar o resto da migration.
do $$
begin
  update auth.identities
  set identity_data = identity_data || jsonb_build_object('email', 'renatogalhardi.sacraimoveis@gmail.com')
  where identity_data ->> 'email' = 'renato.sacraimoveis@gmail.com';
exception
  when others then
    raise notice 'Não foi possível atualizar auth.identities (ok se essa tabela não existir ou tiver outra estrutura): %', sqlerrm;
end $$;
