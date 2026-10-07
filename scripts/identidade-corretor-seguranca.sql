-- Regressão transacional: não mantém contas ou alterações fictícias.
begin;
do $$
declare t uuid:=gen_random_uuid(); gestor uuid:=gen_random_uuid(); corretor uuid:=gen_random_uuid(); cadastro uuid:=gen_random_uuid(); desvinculado uuid:=gen_random_uuid(); n integer;
begin
 insert into public.tenants(id,nome) values(t,'Teste identidade corretor');
 insert into public.convites(tenant_id,email,nivel_acesso) values(t,gestor||'@example.invalid','diretor'),(t,corretor||'@example.invalid','corretor');
 insert into auth.users(id,email,raw_user_meta_data) values(gestor,gestor||'@example.invalid','{"nome":"Gestão teste"}'),(corretor,corretor||'@example.invalid','{"nome":"Nome antigo"}');
 perform set_config('request.jwt.claims',json_build_object('sub',gestor,'role','authenticated')::text,true);
 insert into public.corretores(id,tenant_id,usuario_id,nome) values(cadastro,t,corretor,'Nome antigo'),(desvinculado,t,null,'Outro cadastro sem vínculo');
 execute 'set local role authenticated';
 update public.usuarios set nome='Não deve gravar' where id=corretor;
 get diagnostics n=row_count;
 assert n=0,'Política de autoedição não deve permitir alterar outras contas';
 execute 'reset role';
 -- Cliente administrativo, após checagem de gestor/empresa na ação.
 update public.usuarios set nome='Nome corrigido' where id=corretor and tenant_id=t;
 assert (select nome='Nome corrigido' from public.corretores where id=cadastro),'Cadastro vinculado deve acompanhar o nome da conta';
 assert (select nome='Outro cadastro sem vínculo' from public.corretores where id=desvinculado),'Nunca associar ou renomear cadastro por semelhança de nome';
 update auth.users set email=corretor||'-novo@example.invalid' where id=corretor;
 assert (select email=corretor||'-novo@example.invalid' from public.usuarios where id=corretor),'Email do login e cadastro deve ser sincronizado';
 update public.usuarios set ativo=false where id=corretor;
 update auth.users set email=corretor||'-desativado@example.invalid' where id=corretor;
 assert (select email=corretor||'-desativado@example.invalid' from public.usuarios where id=corretor),'Sincronização não deve falhar em conta desativada';
 update public.usuarios set ativo=true where id=corretor;
 perform set_config('request.jwt.claims',json_build_object('sub',corretor,'role','authenticated')::text,true);
 execute 'set local role authenticated';
 update public.usuarios set nome='Nome pelo perfil' where id=corretor;
 assert (select nome='Nome pelo perfil' from public.usuarios where id=corretor),'Autoedição deve continuar funcionando';
 execute 'reset role';
 assert (select nome='Nome pelo perfil' from public.corretores where id=cadastro),'Perfil deve sincronizar o cadastro vinculado';
 assert not has_function_privilege('authenticated','vitral_private.sincronizar_nome_corretor()','execute'),'Trigger não deve ser RPC acessível';
 assert not has_function_privilege('anon','vitral_private.sincronizar_email_usuario()','execute'),'Anônimo não pode chamar sincronização';
end $$;
rollback;
select 'Identidade sincronizada, edição própria preservada e cadastros não vinculados intactos. Dados fictícios revertidos.' as resultado;
