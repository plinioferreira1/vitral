-- =========================================================
-- 3 novas rotinas de locação. Duas são semanais (toda
-- segunda-feira), diferente das tarefas mensais que já
-- existiam — por isso a tabela ganha uma "periodicidade":
-- tarefas semanais são controladas por semana (reseta toda
-- segunda), não por mês.
-- =========================================================

alter table tarefas_mensais add column periodicidade text not null default 'mensal'
  check (periodicidade in ('mensal', 'semanal'));

do $$
declare
  v_tenant_id uuid;
begin
  select id into v_tenant_id from tenants limit 1;
  if v_tenant_id is not null then
    insert into tarefas_mensais (tenant_id, nome, regra, ordem, periodicidade) values
      (v_tenant_id, 'Reunião de revisão da semana passada e alinhamento da semana que vem', 'Toda segunda-feira', 4, 'semanal'),
      (v_tenant_id, 'Feedback para os clientes dos imóveis anunciados', 'Toda segunda-feira', 5, 'semanal'),
      (v_tenant_id, 'Contatar os proprietários para dar/colher feedback', 'Primeira segunda-feira do mês', 6, 'mensal');
  end if;
end $$;
