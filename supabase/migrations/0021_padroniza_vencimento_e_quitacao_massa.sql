-- =========================================================
-- 1) Padroniza o vencimento de toda conta pro dia 15 do mês
--    de competência (onde não tiver vencimento definido).
-- =========================================================

update contas_locacao
set vencimento = date_trunc('month', competencia)::date + interval '14 days'
where vencimento is null;

-- =========================================================
-- 2) Quitação em massa: condomínio, água e luz de todos os
--    contratos, de janeiro a julho de 2026, marcados como
--    pagos (cria a linha se não existir, atualiza se já
--    existir com outro status).
-- =========================================================

do $$
declare
  v_contrato record;
  v_tipo tipo_conta_locacao;
  v_mes int;
  v_competencia date;
begin
  for v_contrato in select id from contratos_locacao loop
    foreach v_tipo in array array['condominio', 'agua', 'luz']::tipo_conta_locacao[] loop
      for v_mes in 1..7 loop
        v_competencia := make_date(2026, v_mes, 1);

        insert into contas_locacao (contrato_id, tipo, competencia, status, vencimento)
        values (v_contrato.id, v_tipo, v_competencia, 'pago', v_competencia + interval '14 days')
        on conflict (contrato_id, tipo, competencia)
        do update set status = 'pago';
      end loop;
    end loop;
  end loop;
end $$;
