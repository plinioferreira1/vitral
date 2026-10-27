-- Financeiro: uma baixa nunca pode levar o total pago/recebido acima do valor
-- do lançamento, nem ser registrada em lançamento cancelado. A trava fica no
-- banco para valer em qualquer caminho (tela, lote, importação futura).
-- Só vale para gravações novas: registros antigos não são reavaliados.
create or replace function public.financeiro_baixas_guardar()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_valor numeric;
  v_status text;
  v_outras numeric;
begin
  if new.valor is null or new.valor <= 0 then
    raise exception 'O valor da baixa deve ser maior que zero.';
  end if;

  -- Trava a linha do lançamento: duas baixas simultâneas não passam juntas do limite.
  select l.valor, l.status::text into v_valor, v_status
    from public.financeiro_lancamentos l
   where l.id = new.lancamento_id
   for update;

  if v_valor is null then
    raise exception 'Lançamento não encontrado.';
  end if;
  if v_status = 'cancelado' then
    raise exception 'Este lançamento está cancelado: reative antes de registrar pagamento.';
  end if;

  select coalesce(sum(b.valor), 0) into v_outras
    from public.financeiro_baixas b
   where b.lancamento_id = new.lancamento_id
     and b.id is distinct from new.id;

  if v_outras + new.valor > v_valor + 0.005 then
    raise exception 'A baixa de % passa do saldo em aberto deste lançamento (%).',
      to_char(new.valor, 'FM999G999G990D00'), to_char(greatest(v_valor - v_outras, 0), 'FM999G999G990D00');
  end if;

  return new;
end;
$$;

drop trigger if exists financeiro_baixas_guardar on public.financeiro_baixas;
create trigger financeiro_baixas_guardar
  before insert or update of valor, lancamento_id on public.financeiro_baixas
  for each row execute function public.financeiro_baixas_guardar();
