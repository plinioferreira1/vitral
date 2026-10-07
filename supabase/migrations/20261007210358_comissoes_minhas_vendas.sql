-- Consulta somente das comissões do próprio beneficiário, sem acesso operacional.
create or replace function vitral_private.minhas_vendas(p_id uuid default null) returns jsonb language plpgsql stable security definer set search_path='' as $$
declare v_usuario public.usuarios%rowtype; v_vendas jsonb;
begin
 select * into v_usuario from public.usuarios where id=auth.uid() and ativo and nivel_acesso='corretor';
 if not found then raise exception 'Acesso indisponível.' using errcode='42501'; end if;
 select coalesce(jsonb_agg(item order by criado_em desc), '[]'::jsonb) into v_vendas from (
  select p.criado_em, jsonb_build_object(
   'id',p.id,'numero',p.numero_processo,'status',p.status,'imovel',i.endereco,
   'comprador',comprador.nome,'vendedor',vendedor.nome,'responsavel',u.nome,
   'prazo_contrato',p.data_final_contrato,'assinatura_contrato',p.data_assinatura,
   'comissoes',coalesce((select jsonb_agg(jsonb_build_object('id',co.id,'status',co.status,'valor_previsto',co.valor_previsto,'valor_recebido',co.valor_recebido,'data_prevista',co.data_prevista,'data_recebida',co.data_recebida) order by co.criado_em desc,co.id) from public.comissoes co join public.corretores beneficiario on beneficiario.id=co.beneficiario_id and beneficiario.usuario_id=v_usuario.id and beneficiario.tenant_id=v_usuario.tenant_id where co.processo_id=p.id),'[]'::jsonb),
   'etapas',coalesce((select jsonb_agg(jsonb_build_object('id',e.id,'nome',e.nome,'status',e.status,'prevista',e.data_prevista,'realizada',e.data_realizada,'ordem',e.ordem) order by e.ordem,e.id) from public.etapas e where e.processo_id=p.id),'[]'::jsonb),
   'atualizacoes',coalesce((select jsonb_agg(jsonb_build_object('id',a.id,'mensagem',a.mensagem,'criado_em',a.criado_em,'autor',au.nome) order by a.criado_em desc,a.id) from public.processo_atualizacoes_corretor a left join public.usuarios au on au.id=a.autor_id and au.tenant_id=v_usuario.tenant_id where a.processo_id=p.id),'[]'::jsonb)
  ) as item from public.processos p
  join public.corretores c on c.id=p.corretor_id and c.usuario_id=v_usuario.id and c.tenant_id=v_usuario.tenant_id
  left join public.imoveis i on i.id=p.imovel_id and i.tenant_id=v_usuario.tenant_id
  left join public.clientes comprador on comprador.id=p.comprador_id and comprador.tenant_id=v_usuario.tenant_id
  left join public.clientes vendedor on vendedor.id=p.vendedor_id and vendedor.tenant_id=v_usuario.tenant_id
  left join public.usuarios u on u.id=p.responsavel_id and u.tenant_id=v_usuario.tenant_id
  where p.tenant_id=v_usuario.tenant_id and p.categoria='venda' and (p_id is null or p.id=p_id)
 ) vendas;
 return jsonb_build_object('vinculado',exists(select 1 from public.corretores where usuario_id=v_usuario.id and tenant_id=v_usuario.tenant_id),'vendas',v_vendas);
end $$;
revoke all on function vitral_private.minhas_vendas(uuid) from public, anon, authenticated;
grant execute on function vitral_private.minhas_vendas(uuid) to authenticated;
