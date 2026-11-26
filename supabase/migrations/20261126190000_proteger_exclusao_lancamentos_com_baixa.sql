-- Evita destruição de histórico de pagamentos e conciliação por exclusão em cascata.
-- A exclusão de títulos sem baixas segue permitida.
create or replace function public.impedir_exclusao_financeiro_com_baixa()
returns trigger language plpgsql set search_path = '' as $$
begin
  if old.status in ('pago','pago_parcial')
    or exists (select 1 from public.financeiro_baixas b where b.lancamento_id = old.id)
    or exists (select 1 from public.financeiro_extrato_linhas e where e.lancamento_criado_id = old.id)
  then
    raise exception 'Não é permitido excluir lançamento quitado, com baixa ou vinculado a extrato. Desfaça a conciliação/baixa antes.'
      using errcode='23514';
  end if;
  return old;
end;
$$;
drop trigger if exists financeiro_lancamento_exclusao_protegida on public.financeiro_lancamentos;
create trigger financeiro_lancamento_exclusao_protegida
before delete on public.financeiro_lancamentos
for each row execute function public.impedir_exclusao_financeiro_com_baixa();
