-- =========================================================
-- etapas.especial: guarda diretamente se essa etapa é uma
-- "situação especial" (fora da sequência normal, sem prazo,
-- sem contar como pendência) -- em vez de descobrir isso
-- comparando o nome contra etapas_padrao toda vez, o que é
-- frágil: se o nome da etapa do processo não bater
-- exatamente com o nome cadastrado em Etapas padrão (ex: uma
-- foi renomeada depois, ou tem um "Em " a mais na frente),
-- ela silenciosamente vira uma etapa sequencial normal, com
-- prazo e "atrasada".
-- =========================================================

alter table etapas add column especial boolean not null default false;

-- Backfill: marca como especial toda etapa cujo nome bate (exato,
-- sem acento/case) ou contém o nome de uma situação especial
-- cadastrada em Etapas padrão pra mesma categoria do processo --
-- essa segunda checagem (contém) é o que resolve o caso real que
-- gerou essa migration ("Em Acordo/Aditivo" na etapa vs "Acordo/
-- Aditivo" cadastrado).
update etapas e
set especial = true
from processos p
join etapas_padrao ep on ep.tenant_id = p.tenant_id and ep.categoria = p.categoria and ep.tipo = 'especial'
where e.processo_id = p.id
  and (
    lower(trim(e.nome)) = lower(trim(ep.nome))
    or lower(trim(e.nome)) like '%' || lower(trim(ep.nome)) || '%'
    or lower(trim(ep.nome)) like '%' || lower(trim(e.nome)) || '%'
  );
