-- =========================================================
-- Estrutura as regras das tarefas recorrentes (antes "regra"
-- era só texto descritivo, sem jeito de calcular a data real).
-- Com isso dá pra plotar as ocorrências no calendário, mês
-- a mês, automaticamente.
-- =========================================================

alter table tarefas_mensais add column tipo_regra text not null default 'primeiro_dia_util'
  check (tipo_regra in ('primeiro_dia_util', 'dia_fixo', 'toda_segunda', 'primeira_segunda'));
alter table tarefas_mensais add column dia_fixo int;

update tarefas_mensais set tipo_regra = 'primeiro_dia_util'
  where nome in ('Verificar NFs do mês passado no Rentzapp', 'Verificar pendências para geração de boletos');

update tarefas_mensais set tipo_regra = 'dia_fixo', dia_fixo = 15
  where nome = 'Verificar IPTU/TLP em aberto e cobrar inadimplentes';

update tarefas_mensais set tipo_regra = 'toda_segunda'
  where nome in (
    'Reunião de revisão da semana passada e alinhamento da semana que vem',
    'Feedback para os clientes dos imóveis anunciados'
  );

update tarefas_mensais set tipo_regra = 'primeira_segunda'
  where nome = 'Contatar os proprietários para dar/colher feedback';
