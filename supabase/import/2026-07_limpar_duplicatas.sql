-- =========================================================
-- Limpeza: remove SOMENTE os dados que vieram da importação
-- da planilha (reconhecidos pelo prefixo SAN- ou IMP- no
-- número do processo), inclusive duplicatas.
-- Não toca em processos criados manualmente pelo app
-- (esses usam o padrão PROC-AAAA-NNNNN).
-- =========================================================

-- 1. Remove os processos importados (etapas, comentários e
--    comissões somem juntos, por causa do ON DELETE CASCADE)
delete from public.processos
where numero_processo like 'SAN-%' or numero_processo like 'IMP-%';

-- 2. Remove clientes que ficaram órfãos (não vinculados a
--    nenhum processo como comprador nem vendedor)
delete from public.clientes
where id not in (
  select comprador_id from public.processos where comprador_id is not null
  union
  select vendedor_id from public.processos where vendedor_id is not null
);

-- 3. Remove imóveis órfãos
delete from public.imoveis
where id not in (
  select imovel_id from public.processos where imovel_id is not null
);

-- 4. Remove corretores duplicados por nome (mantém o mais antigo)
delete from public.corretores a
using public.corretores b
where a.nome = b.nome
  and a.tenant_id = b.tenant_id
  and a.id > b.id;
