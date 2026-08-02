-- =========================================================
-- Corrige processos que já têm todas as etapas concluídas
-- (sequenciais E especiais — se houver alguma especial ativa
-- e pendente, tipo "Em Processo Judicial", o processo NÃO
-- conta como concluído), mas cujo status nunca virou
-- "concluido" — porque concluirEtapa não fazia essa checagem
-- até agora (ver commit que corrigiu a action).
-- =========================================================

do $$
declare
  v_processo record;
  v_todas_concluidas boolean;
begin
  for v_processo in select id from processos where status != 'concluido' loop
    select bool_and(e.status = 'concluida') into v_todas_concluidas
    from etapas e
    where e.processo_id = v_processo.id;

    if v_todas_concluidas is true then
      update processos set status = 'concluido' where id = v_processo.id;
    end if;
  end loop;
end $$;
