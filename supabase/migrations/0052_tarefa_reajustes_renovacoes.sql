-- =========================================================
-- Nova rotina mensal de locação: verificar reajustes do mês
-- e renovações de contrato, todo 1º dia útil do mês (mesma
-- regra já usada por outras duas tarefas).
-- =========================================================

do $$
declare
  v_tenant_id uuid;
begin
  select id into v_tenant_id from tenants limit 1;
  if v_tenant_id is not null then
    insert into tarefas_mensais (tenant_id, nome, regra, ordem, periodicidade, tipo_regra) values
      (v_tenant_id, 'Verificar reajustes do mês e renovações de contrato', '1º dia útil do mês', 7, 'mensal', 'primeiro_dia_util');
  end if;
end $$;
