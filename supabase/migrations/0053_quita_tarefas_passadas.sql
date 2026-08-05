-- =========================================================
-- Quita (marca como concluída) todas as ocorrências passadas
-- das tarefas recorrentes de locação — desde que a
-- funcionalidade foi criada, ela gerava ocorrências de até
-- 2 meses atrás, e nenhuma delas tinha sido marcada, então
-- viraram uma pilha de "atrasadas" sem sentido prático.
--
-- Cobre os últimos 3 meses (antes do mês atual), pra garantir
-- que pega tudo que a janela de geração já mostrou.
-- =========================================================

do $$
declare
  v_tarefa record;
  v_mes date;
  v_dia date;
begin
  for v_tarefa in select id, tipo_regra from tarefas_mensais loop
    for v_mes in
      select generate_series(
        date_trunc('month', current_date) - interval '3 months',
        date_trunc('month', current_date) - interval '1 month',
        interval '1 month'
      )::date
    loop
      if v_tarefa.tipo_regra in ('primeiro_dia_util', 'dia_fixo', 'primeira_segunda') then
        insert into tarefas_mensais_status (tarefa_id, competencia, concluida)
        values (v_tarefa.id, v_mes, true)
        on conflict (tarefa_id, competencia) do update set concluida = true;
      elsif v_tarefa.tipo_regra = 'toda_segunda' then
        for v_dia in
          select generate_series(v_mes, (v_mes + interval '1 month' - interval '1 day')::date, interval '1 day')::date
        loop
          if extract(dow from v_dia) = 1 then
            insert into tarefas_mensais_status (tarefa_id, competencia, concluida)
            values (v_tarefa.id, v_dia, true)
            on conflict (tarefa_id, competencia) do update set concluida = true;
          end if;
        end loop;
      end if;
    end loop;
  end loop;
end $$;
