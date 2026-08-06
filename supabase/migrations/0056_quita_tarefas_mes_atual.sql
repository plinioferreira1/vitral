-- =========================================================
-- Quita (marca como concluída) as ocorrências do mês atual
-- das tarefas recorrentes de locação — já foram feitas na
-- prática, só não estavam marcadas no sistema. A partir de
-- agora só volta a lembrar no início do mês que vem.
-- =========================================================

do $$
declare
  v_tarefa record;
  v_mes date := date_trunc('month', current_date)::date;
  v_dia date;
begin
  for v_tarefa in select id, tipo_regra from tarefas_mensais loop
    if v_tarefa.tipo_regra in ('primeiro_dia_util', 'dia_fixo', 'primeira_segunda') then
      insert into tarefas_mensais_status (tarefa_id, competencia, concluida)
      values (v_tarefa.id, v_mes, true)
      on conflict (tarefa_id, competencia) do update set concluida = true;
    elsif v_tarefa.tipo_regra = 'toda_segunda' then
      for v_dia in
        select generate_series(v_mes, least((v_mes + interval '1 month' - interval '1 day')::date, current_date), interval '1 day')::date
      loop
        if extract(dow from v_dia) = 1 then
          insert into tarefas_mensais_status (tarefa_id, competencia, concluida)
          values (v_tarefa.id, v_dia, true)
          on conflict (tarefa_id, competencia) do update set concluida = true;
        end if;
      end loop;
    end if;
  end loop;
end $$;
