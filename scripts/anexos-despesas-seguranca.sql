-- Dados fictícios e isolamento financeiro; nenhuma alteração é mantida.
begin;
do $$
declare t uuid:=gen_random_uuid(); t2 uuid:=gen_random_uuid(); gestor uuid:=gen_random_uuid(); corretor uuid:=gen_random_uuid(); outro uuid:=gen_random_uuid(); despesa uuid:=gen_random_uuid();
begin
  insert into public.tenants(id,nome) values(t,'Teste anexo'),(t2,'Outra empresa teste');
  insert into public.convites(tenant_id,email,nivel_acesso) values(t,gestor||'@example.invalid','diretor'),(t,corretor||'@example.invalid','corretor'),(t2,outro||'@example.invalid','gerente');
  insert into auth.users(id,email,raw_user_meta_data) values(gestor,gestor||'@example.invalid','{"nome":"Gestor teste"}'),(corretor,corretor||'@example.invalid','{"nome":"Corretor teste"}'),(outro,outro||'@example.invalid','{"nome":"Outra gestão"}');
  insert into public.financeiro_lancamentos(id,tenant_id,tipo,descricao,valor,vencimento) values(despesa,t,'despesa','Boleto fictício',100,current_date);
  insert into public.financeiro_anexos(lancamento_id,tenant_id,caminho,nome,mime,tamanho) values(despesa,t,t||'/'||despesa||'/teste.pdf','teste.pdf','application/pdf',100);
  perform set_config('request.jwt.claims',json_build_object('sub',gestor,'role','authenticated')::text,true);
  execute 'set local role authenticated';
  assert (select count(*)=1 from public.financeiro_anexos where lancamento_id=despesa),'Gestor deve poder ler o vínculo';
  assert not has_table_privilege('authenticated','public.financeiro_anexos','insert'),'Envio deve passar pelo servidor';
  assert not has_table_privilege('authenticated','public.financeiro_anexos','update'),'Substituição deve passar pelo servidor';
  assert not has_table_privilege('authenticated','public.financeiro_anexos','delete'),'Remoção deve passar pelo servidor';
  execute 'reset role';
  perform set_config('request.jwt.claims',json_build_object('sub',outro,'role','authenticated')::text,true);
  execute 'set local role authenticated';
  assert (select count(*)=0 from public.financeiro_anexos where lancamento_id=despesa),'Outra empresa não pode ler';
  execute 'reset role';
  perform set_config('request.jwt.claims',json_build_object('sub',corretor,'role','authenticated')::text,true);
  execute 'set local role authenticated';
  assert (select count(*)=0 from public.financeiro_anexos where lancamento_id=despesa),'Corretor não pode ler';
  execute 'reset role';
  update public.usuarios set ativo=false where id=gestor;
  perform set_config('request.jwt.claims',json_build_object('sub',gestor,'role','authenticated')::text,true);
  execute 'set local role authenticated';
  assert (select count(*)=0 from public.financeiro_anexos where lancamento_id=despesa),'Usuário inativo não pode ler';
  execute 'reset role';
  assert not has_table_privilege('anon','public.financeiro_anexos','select'),'Anônimo não pode ler metadados';
  assert (select public=false and file_size_limit=3145728 from storage.buckets where id='financeiro-despesas'),'Bucket deve ser privado e limitar tamanho';
end $$;
rollback;
select 'Isolamento por empresa, perfil e conta ativa confirmado. Dados fictícios revertidos.' as resultado;
