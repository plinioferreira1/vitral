-- Regressão transacional com dados fictícios, sempre ROLLBACK.
-- Executar como postgres; escolhe uma conta ativa com Vendas para simular RLS.
begin;
select set_config('request.jwt.claim.sub', (select id::text from public.usuarios where ativo and nivel_acesso = 'diretor' order by id limit 1), true);
set local role authenticated;
do $$
declare
  t uuid := gen_random_uuid();
  outro uuid := gen_random_uuid();
  parte uuid := gen_random_uuid();
  doc jsonb := '{"marco":"entrega","demais_encargos":{},"ressarcimento":{},"clausula":{},"comprador_deve_centavos":0,"vendedor_deve_centavos":0,"saldo_centavos":0}';
  partes jsonb;
  r jsonb;
  stamp timestamptz;
  encargo uuid := gen_random_uuid();
  encargos jsonb;
  autor text := current_setting('request.jwt.claim.sub');
begin
  partes := jsonb_build_array(jsonb_build_object('id',parte,'papel','comprador','nome','TESTE FICTÍCIO','ordem',0));
  -- Falha de encargo depois de inserir cabeçalho e partes desfaz tudo.
  begin
    perform public.termo_entrega_gravar(t,true,doc,partes,'[{"id":"00000000-0000-4000-8000-000000000001"}]','[]');
    raise exception 'TESTE: deveria falhar';
  exception when not_null_violation then null;
  end;
  if exists(select 1 from public.termos_entrega where id=t) or exists(select 1 from public.termo_entrega_partes where id=parte) then
    raise exception 'TESTE: criação parcial';
  end if;
  r := public.termo_entrega_gravar(t,true,doc,partes,'[]','[{"acao":"criado","descricao":"Teste fictício"}]');
  stamp := (r->>'atualizado_em')::timestamptz;
  -- Repetir o mesmo envio não duplica termo nem auditoria.
  perform public.termo_entrega_gravar(t,true,doc,partes,'[]','[{"acao":"criado","descricao":"Teste fictício"}]');
  if (select count(*) from public.termo_entrega_eventos where termo_id=t) <> 1 then raise exception 'TESTE: criação duplicada'; end if;
  encargos := jsonb_build_array(jsonb_build_object('id',encargo,'ordem',0,'categoria','condominio','descricao','Encargo fictício','valor_total_centavos',10000,'pago_por','vendedor','responsavel','comprador','tipo_calculo','integral','manual_vendedor_centavos',0,'manual_comprador_centavos',0,'parte_vendedor_centavos',0,'parte_comprador_centavos',10000,'ressarcimento_centavos',10000,'ressarcimento_de','comprador'));
  perform public.termo_entrega_gravar(t,false,doc,partes,encargos,'[]',stamp);
  perform public.termo_entrega_gravar(t,false,doc,partes,jsonb_set(encargos,'{0,descricao}','"Encargo atualizado"'),'[]',stamp);
  if not exists(select 1 from public.termo_entrega_encargos where id=encargo and descricao='Encargo atualizado' and criado_por=autor::uuid) then raise exception 'TESTE: encargo não atualizado'; end if;
  -- Falha de auditoria reverte também alteração/remoção de partes.
  begin
    perform public.termo_entrega_gravar(t,false,doc || '{"imovel_endereco":"ALTERADO"}','[]','[]','[{}]',stamp);
    raise exception 'TESTE: deveria falhar';
  exception when not_null_violation then null;
  end;
  if not exists(select 1 from public.termo_entrega_partes where id=parte) or not exists(select 1 from public.termo_entrega_encargos where id=encargo) or exists(select 1 from public.termos_entrega where id=t and imovel_endereco='ALTERADO') then
    raise exception 'TESTE: edição parcial';
  end if;
  -- Não permite tomar uma parte de outro termo.
  perform public.termo_entrega_gravar(outro,true,doc,'[]','[]','[]');
  begin
    perform public.termo_entrega_gravar(outro,false,doc,partes,'[]','[]',(select atualizado_em from public.termos_entrega where id=outro));
    raise exception 'TESTE: deveria falhar';
  exception when raise_exception then
    if sqlerrm <> 'Itens de outro termo não podem ser alterados.' then raise; end if;
  end;
  -- Versão desatualizada é recusada antes da escrita.
  begin
    perform public.termo_entrega_gravar(t,false,doc,'[]','[]','[]',stamp - interval '1 second');
    raise exception 'TESTE: deveria falhar';
  exception when serialization_failure then null;
  end;
  -- Uma edição válida confirma cabeçalho, partes e auditoria.
  perform public.termo_entrega_gravar(t,false,doc || '{"imovel_endereco":"TESTE SALVO"}','[]','[]','[{"acao":"editado","descricao":"Teste"}]',stamp);
  if exists(select 1 from public.termo_entrega_partes where id=parte) or not exists(select 1 from public.termos_entrega where id=t and imovel_endereco='TESTE SALVO') then raise exception 'TESTE: edição não confirmada'; end if;
  update public.termos_entrega set status='gerado' where id=t;
  begin
    perform public.termo_entrega_gravar(t,false,doc,'[]','[]','[]',(select atualizado_em from public.termos_entrega where id=t));
    raise exception 'TESTE: deveria falhar';
  exception when raise_exception then
    if sqlerrm <> 'Este termo não está em rascunho.' then raise; end if;
  end;
  if has_function_privilege('anon','public.termo_entrega_gravar(uuid,boolean,jsonb,jsonb,jsonb,jsonb,timestamptz,uuid)','execute') then raise exception 'TESTE: acesso anônimo'; end if;
  perform set_config('request.jwt.claim.sub',gen_random_uuid()::text,true);
  begin
    perform public.termo_entrega_gravar(gen_random_uuid(),true,doc,'[]','[]','[]');
    raise exception 'TESTE: deveria bloquear usuário sem acesso';
  exception when insufficient_privilege then null;
  end;
  perform set_config('request.jwt.claim.sub',autor,true);
end;
$$;
rollback;
