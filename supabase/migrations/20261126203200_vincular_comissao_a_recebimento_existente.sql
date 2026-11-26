-- Reconciliacao MANUAL de comissao prevista com credito ja quitado.
-- Nunca vincular automaticamente apenas por valor ou nome de pagador.
create or replace function public.financeiro_vincular_comissao_recebida(
  p_id uuid,p_lancamento_id uuid
) returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v public.financeiro_comissoes_previstas%rowtype;
  l public.financeiro_lancamentos%rowtype;
  valor_baixado numeric;
begin
  if auth.uid() is null then raise exception 'Acesso negado'; end if;
  select * into v from public.financeiro_comissoes_previstas where id=p_id for update;
  if not found or not exists(
    select 1 from public.usuarios u where u.id=auth.uid() and u.ativo
      and u.tenant_id=v.tenant_id and u.nivel_acesso in ('diretor','gerente')
  ) then raise exception 'Acesso negado ao recebível'; end if;
  if v.lancamento_id = p_lancamento_id then return p_lancamento_id; end if;
  if v.lancamento_id is not null then raise exception 'Parcela já vinculada'; end if;
  select * into l from public.financeiro_lancamentos where id=p_lancamento_id for update;
  if not found or l.tenant_id<>v.tenant_id or l.tipo<>'receita'
    or l.status<>'pago' or l.valor<>v.valor
  then
    raise exception 'Recebimento não confere com parcela/empresa ou não está quitado';
  end if;
  select coalesce(sum(b.valor),0) into valor_baixado
  from public.financeiro_baixas b where b.lancamento_id=l.id;
  if valor_baixado < v.valor - 0.005 then
    raise exception 'Recebimento sem baixa integral';
  end if;
  if exists (
    select 1 from public.financeiro_comissoes_previstas outro
    where outro.lancamento_id=l.id and outro.id<>v.id
  ) then raise exception 'Recebimento já vinculado a outra parcela'; end if;
  update public.financeiro_comissoes_previstas
    set lancamento_id=l.id, vencimento=l.vencimento
    where id=v.id;
  return l.id;
end;
$$;
revoke execute on function public.financeiro_vincular_comissao_recebida(uuid,uuid) from public,anon;
grant execute on function public.financeiro_vincular_comissao_recebida(uuid,uuid) to authenticated;
