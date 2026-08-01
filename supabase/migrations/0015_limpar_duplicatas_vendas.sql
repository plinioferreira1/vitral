-- =========================================================
-- Remove duplicatas que sobraram da importação original de
-- Vendas, que rodou duas vezes sem querer (bem no início do
-- projeto). Mantém sempre o registro mais antigo (criado_em
-- menor) de cada numero_processo duplicado, e apaga o resto
-- — o que também limpa em cascata etapas, comentários,
-- histórico e comissões duplicados junto.
-- =========================================================

delete from processos a
using processos b
where a.numero_processo = b.numero_processo
  and a.tenant_id = b.tenant_id
  and a.criado_em > b.criado_em
  and (a.numero_processo like 'SAN-%' or a.numero_processo like 'IMP-%');

-- Limpa clientes que ficaram órfãos (não vinculados a nenhum
-- processo como comprador nem vendedor, nem locador/locatário)
delete from clientes
where id not in (
  select comprador_id from processos where comprador_id is not null
  union
  select vendedor_id from processos where vendedor_id is not null
  union
  select locador_id from contratos_locacao where locador_id is not null
  union
  select locatario_id from contratos_locacao where locatario_id is not null
);

-- Limpa imóveis órfãos
delete from imoveis
where id not in (
  select imovel_id from processos where imovel_id is not null
  union
  select imovel_id from contratos_locacao where imovel_id is not null
);

-- Remove corretores duplicados por nome, repassando qualquer
-- referência pro registro mais antigo antes de apagar (evita
-- violação de chave estrangeira).
update processos p
set corretor_id = manter.id
from corretores dup
join corretores manter
  on manter.nome = dup.nome and manter.tenant_id = dup.tenant_id and manter.id < dup.id
where p.corretor_id = dup.id;

update processos p
set indicacao_id = manter.id
from corretores dup
join corretores manter
  on manter.nome = dup.nome and manter.tenant_id = dup.tenant_id and manter.id < dup.id
where p.indicacao_id = dup.id;

update comissoes c
set beneficiario_id = manter.id
from corretores dup
join corretores manter
  on manter.nome = dup.nome and manter.tenant_id = dup.tenant_id and manter.id < dup.id
where c.beneficiario_id = dup.id;

delete from corretores a
using corretores b
where a.nome = b.nome and a.tenant_id = b.tenant_id and a.id > b.id;
