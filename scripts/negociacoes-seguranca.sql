-- Dados fictícios; nenhuma alteração persiste.
begin;
do $$
declare t uuid:=gen_random_uuid(); outro uuid:=gen_random_uuid(); gestor uuid:=gen_random_uuid();
  corretor uuid:=gen_random_uuid(); auxiliar uuid:=gen_random_uuid(); modelo uuid:=gen_random_uuid();
  n uuid:=gen_random_uuid(); perdida uuid:=gen_random_uuid(); falha uuid:=gen_random_uuid();
  dados jsonb; versao timestamptz; processo uuid; antes bigint;
begin
  insert into public.tenants(id,nome) values(t,'Teste negociações'),(outro,'Outra empresa teste');
  insert into public.convites(tenant_id,email,nivel_acesso,categorias) values
    (t,gestor||'@example.invalid','diretor','{}'),(t,corretor||'@example.invalid','corretor','{venda}'),
    (t,auxiliar||'@example.invalid','auxiliar','{}');
  insert into auth.users(id,email,raw_user_meta_data) values
    (gestor,gestor||'@example.invalid','{"nome":"Gestor teste"}'),
    (corretor,corretor||'@example.invalid','{"nome":"Corretor teste"}'),
    (auxiliar,auxiliar||'@example.invalid','{"nome":"Auxiliar teste"}');
  insert into public.modelos_processo(id,tenant_id,nome,categoria) values(modelo,t,'Venda teste','venda');
  insert into public.etapas_padrao(tenant_id,nome,categoria,tipo,ordem) values(outro,'Etapa de outra empresa','venda','sequencial',999);
  dados:=jsonb_build_object('cliente_nome','Comprador teste','vendedor_nome','Vendedor teste',
    'imovel_endereco','Imóvel teste','valor',123456.78,'data_abertura',(now() at time zone 'America/Sao_Paulo')::date,'responsavel_id',gestor);
  perform public.vendas_negociacao_salvar(n,t,gestor,dados);
  select atualizado_em into versao from public.vendas_negociacoes where id=n;
  begin
    perform public.vendas_negociacao_salvar(n,t,gestor,dados,versao - interval '1 second');
    raise exception 'Aceitou versão antiga';
  exception when raise_exception then if sqlerrm='Aceitou versão antiga' then raise; end if; end;
  begin
    perform public.vendas_negociacao_salvar(gen_random_uuid(),t,auxiliar,dados);
    raise exception 'Auxiliar conseguiu escrever';
  exception when insufficient_privilege then null; end;
  begin
    perform public.vendas_negociacao_salvar(gen_random_uuid(),outro,gestor,dados);
    raise exception 'Gravou em outra empresa';
  exception when insufficient_privilege then null; end;
  perform public.vendas_negociacao_salvar(falha,t,gestor,dados);
  select atualizado_em into versao from public.vendas_negociacoes where id=falha;
  select count(*) into antes from public.processos;
  begin
    perform public.vendas_negociacao_encerrar(falha,t,gestor,'convertida',gen_random_uuid(),null,versao);
    raise exception 'Aceitou modelo inválido';
  exception when raise_exception then if sqlerrm='Aceitou modelo inválido' then raise; end if; end;
  assert (select situacao='em_andamento' and processo_id is null from public.vendas_negociacoes where id=falha),'Falha encerrou negociação';
  assert (select count(*)=antes from public.processos),'Falha deixou processo';
  select atualizado_em into versao from public.vendas_negociacoes where id=n;
  processo:=public.vendas_negociacao_encerrar(n,t,gestor,'convertida',modelo,null,versao);
  assert processo=public.vendas_negociacao_encerrar(n,t,gestor,'convertida',modelo,null,versao),'Repetição duplicou';
  assert (select count(*)=antes+1 from public.processos),'Quantidade incorreta de processos';
  assert (select status='ativo' and categoria='venda' and valor_total=123456.78 from public.processos where id=processo),'Dados não aproveitados';
  assert (select count(*)=1 from public.vendas_negociacao_eventos where negociacao_id=n and acao='Conversão em processo'),'Evento duplicado';
  assert (select count(*) from public.etapas where processo_id=processo)=(select count(*) from public.etapas_padrao where tenant_id=t and categoria='venda' and tipo='sequencial'),'Etapas incompletas';
  assert not exists(select 1 from public.etapas where processo_id=processo and nome='Etapa de outra empresa'),'Copiou etapa de outra empresa';
  perform public.vendas_negociacao_salvar(perdida,t,gestor,dados);
  select atualizado_em into versao from public.vendas_negociacoes where id=perdida;
  begin
    perform public.vendas_negociacao_encerrar(perdida,t,gestor,'perdida',null,' ',versao);
    raise exception 'Aceitou perda sem motivo';
  exception when raise_exception then if sqlerrm='Aceitou perda sem motivo' then raise; end if; end;
  perform public.vendas_negociacao_encerrar(perdida,t,gestor,'perdida',null,'Crédito recusado',versao);
  assert (select situacao='perdida' and motivo_perda='Crédito recusado' and processo_id is null from public.vendas_negociacoes where id=perdida),'Perda incorreta';
  perform set_config('request.jwt.claims',json_build_object('sub',gestor,'role','authenticated')::text,true);
  execute 'set local role authenticated';
  assert (select count(*)=3 from public.vendas_negociacoes),'Gestor não vê negociações';
  begin
    update public.vendas_negociacoes set situacao='em_andamento' where id=n;
    raise exception 'Escrita direta permitida';
  exception when insufficient_privilege then null; end;
  begin
    perform public.vendas_negociacao_encerrar(falha,t,gestor,'perdida',null,'Adulterado',null);
    raise exception 'RPC pública permitida';
  exception when insufficient_privilege then null; end;
  perform set_config('request.jwt.claims',json_build_object('sub',corretor,'role','authenticated')::text,true);
  assert (select count(*)=0 from public.vendas_negociacoes),'Corretor acessou operação';
  assert (select count(*)=0 from public.vendas_negociacao_eventos),'Corretor acessou histórico';
  perform set_config('request.jwt.claims',json_build_object('sub',auxiliar,'role','authenticated')::text,true);
  assert (select count(*)=3 from public.vendas_negociacoes),'Auxiliar perdeu leitura';
  execute 'reset role';
  update public.usuarios set tenant_id=outro where id=gestor;
  perform set_config('request.jwt.claims',json_build_object('sub',gestor,'role','authenticated')::text,true);
  execute 'set local role authenticated';
  assert (select count(*)=0 from public.vendas_negociacoes),'Outra empresa acessou negociações';
  execute 'reset role';
end $$;
rollback;
