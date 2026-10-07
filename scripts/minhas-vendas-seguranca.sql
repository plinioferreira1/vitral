-- Teste transacional com dados fictícios. Não deixa contas, vínculos ou vendas no banco.
begin;
do $$
declare t uuid:=gen_random_uuid(); outro_t uuid:=gen_random_uuid(); gestor uuid:=gen_random_uuid(); a uuid:=gen_random_uuid(); b uuid:=gen_random_uuid(); c uuid:=gen_random_uuid(); corretor_a uuid:=gen_random_uuid(); corretor_b uuid:=gen_random_uuid(); corretor_c uuid:=gen_random_uuid(); pa uuid:=gen_random_uuid(); pb uuid:=gen_random_uuid(); pc uuid:=gen_random_uuid(); payload jsonb; afetadas integer;
begin
 insert into public.tenants(id,nome) values(t,'Teste isolado acompanhamento'),(outro_t,'Teste outra empresa');
 insert into public.convites(tenant_id,email,nivel_acesso,categorias) values
 (t,gestor||'@example.invalid','diretor','{}'),(t,a||'@example.invalid','corretor','{venda}'),(t,b||'@example.invalid','corretor','{}'),(outro_t,c||'@example.invalid','corretor','{}');
 insert into auth.users(id,email,raw_user_meta_data) values(gestor,gestor||'@example.invalid','{"nome":"Gestão fictícia"}'),(a,a||'@example.invalid','{"nome":"Corretor A fictício"}'),(b,b||'@example.invalid','{"nome":"Corretor B fictício"}'),(c,c||'@example.invalid','{"nome":"Corretor C fictício"}');
 perform set_config('request.jwt.claims',json_build_object('sub',gestor,'role','authenticated')::text,true);
 insert into public.corretores(id,tenant_id,nome,usuario_id) values(corretor_a,t,'A',a),(corretor_b,t,'B',b);
 -- O vínculo de outra empresa é confirmado pelo gestor daquela empresa.
 update public.usuarios set nivel_acesso='diretor' where id=c;
 perform set_config('request.jwt.claims',json_build_object('sub',c,'role','authenticated')::text,true);
 insert into public.corretores(id,tenant_id,nome) values(corretor_c,outro_t,'C');
 update public.usuarios set nivel_acesso='corretor' where id=c;
 insert into public.processos(id,tenant_id,numero_processo,corretor_id,categoria) values(pa,t,'TESTE-A',corretor_a,'venda'),(pb,t,'TESTE-B',corretor_b,'venda'),(pc,outro_t,'TESTE-C',corretor_c,'venda');
 insert into public.etapas(processo_id,nome,ordem) values(pa,'Etapa pública',0);
 insert into public.processo_atualizacoes_corretor(processo_id,autor_id,mensagem) values(pa,gestor,'Atualização destinada ao corretor');
 perform set_config('request.jwt.claims',json_build_object('sub',a,'role','authenticated')::text,true);
 execute 'set local role authenticated';
 payload:=public.minhas_vendas();
 assert jsonb_array_length(payload->'vendas')=1,'A deve ver exatamente a própria venda';
 assert payload->'vendas'->0->>'id'=pa::text,'A recebeu uma venda indevida';
 assert not ((payload->'vendas'->0) ? 'valor_total'),'Não deve enviar valores internos';
 assert not ((payload->'vendas'->0) ? 'comentarios'),'Não deve enviar comentários internos';
 assert jsonb_array_length(payload->'vendas'->0->'atualizacoes')=1,'Atualização publicada deve aparecer';
 assert jsonb_array_length(public.minhas_vendas(pb)->'vendas')=0,'ID de outro corretor não deve ser acessível';
 assert jsonb_array_length(public.minhas_vendas(pc)->'vendas')=0,'Outra empresa não deve ser acessível';
 assert not public.usuario_tem_categoria('venda'),'Categoria atribuída não deve liberar operação';
 assert (select count(*)=0 from public.processos where id=pa),'Tabela operacional não deve expor a venda';
 update public.processos set status='cancelado' where id=pa; get diagnostics afetadas=row_count;
 assert afetadas=0,'Corretor não pode editar o processo';
 update public.etapas set status='concluida' where processo_id=pa; get diagnostics afetadas=row_count;
 assert afetadas=0,'Corretor não pode editar etapas';
 update public.corretores set usuario_id=a where id=corretor_b; get diagnostics afetadas=row_count;
 assert afetadas=0,'Corretor não pode se vincular ao cadastro de outro';
 begin
  insert into public.processo_atualizacoes_corretor(processo_id,autor_id,mensagem) values(pa,a,'Tentativa de edição');
  raise exception 'Corretor conseguiu publicar';
 exception when insufficient_privilege then null; end;
 perform set_config('request.jwt.claims',json_build_object('sub',b,'role','authenticated')::text,true);
 assert public.minhas_vendas()->'vendas'->0->>'id'=pb::text,'B deve ver somente B';
 execute 'reset role';
 update public.usuarios set ativo=false where id=a;
 perform set_config('request.jwt.claims',json_build_object('sub',a,'role','authenticated')::text,true);
 execute 'set local role authenticated';
 begin perform public.minhas_vendas(); raise exception 'Conta desativada conseguiu consultar'; exception when insufficient_privilege then null; end;
 execute 'reset role';
 update public.usuarios set ativo=true where id=a;
 perform set_config('request.jwt.claims',json_build_object('sub',gestor,'role','authenticated')::text,true);
 update public.corretores set usuario_id=b where id=corretor_a;
 perform set_config('request.jwt.claims',json_build_object('sub',a,'role','authenticated')::text,true);
 execute 'set local role authenticated';
 assert jsonb_array_length(public.minhas_vendas()->'vendas')=0,'Troca de corretor deve revogar acesso imediatamente';
 assert public.minhas_vendas()->>'vinculado'='false','Conta sem vínculo deve ser identificada';
 execute 'reset role';
 assert not has_function_privilege('anon','public.minhas_vendas(uuid)','execute'),'Anônimo não pode executar RPC';
end $$;
rollback;
select 'Testes de isolamento, escrita e revogação passaram; todos os dados fictícios revertidos.' as resultado;
