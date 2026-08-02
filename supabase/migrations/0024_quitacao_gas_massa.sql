-- =========================================================
-- Quitação em massa do Gás (janeiro a agosto de 2026) pra
-- todos os contratos de locação, seguindo o mesmo padrão já
-- aplicado antes pra condomínio/água/luz (jan-jul) — só que
-- o gás vai um mês a mais, até agosto.
-- =========================================================

do $$
declare
  v_contrato record;
  v_mes int;
  v_competencia date;
begin
  for v_contrato in select id from contratos_locacao loop
    for v_mes in 1..8 loop
      v_competencia := make_date(2026, v_mes, 1);

      insert into contas_locacao (contrato_id, tipo, competencia, status, vencimento)
      values (v_contrato.id, 'gas', v_competencia, 'pago', v_competencia + interval '14 days')
      on conflict (contrato_id, tipo, competencia)
      do update set status = 'pago';
    end loop;
  end loop;
end $$;
