-- =========================================================
-- Categorias de processo: Vendas, Financiamento (CCA) e,
-- mais pra frente, Locação. Isso é a base pra separar
-- dashboards, permissões e checklists de etapas por área.
-- =========================================================

create type categoria_processo as enum ('venda', 'financiamento', 'locacao');

alter table processos add column categoria categoria_processo not null default 'venda';

-- Campos que a Venda não usa, mas o Correspondente Bancário
-- (CCA) precisa: valor financiado (separado do valor do
-- imóvel, que já usamos como valor_total) e a origem do
-- negócio (Indicação/SACRA/etc).
alter table processos add column valor_financiado numeric(14,2);
alter table processos add column origem text;

-- Indicação (quem indicou o cliente pro correspondente) —
-- referencia um corretor, igual ao corretor responsável.
alter table processos add column indicacao_id uuid references corretores(id);

-- =========================================================
-- Etapas padrão passam a ser filtráveis por categoria, senão
-- o checklist de "Adicionar etapa" de uma Venda ia mostrar
-- fase de Financiamento junto e vice-versa.
-- =========================================================

alter table etapas_padrao add column categoria categoria_processo not null default 'venda';

-- Popula as fases padrão do Correspondente Bancário pro
-- tenant que já existe (Sacra), seguindo a ordem real de
-- fluxo do processo de financiamento.
do $$
declare
  v_tenant_id uuid;
begin
  select id into v_tenant_id from tenants limit 1;
  if v_tenant_id is not null then
    insert into etapas_padrao (tenant_id, nome, ordem, categoria) values
      (v_tenant_id, 'Simulação', 1, 'financiamento'),
      (v_tenant_id, 'Cadastro', 2, 'financiamento'),
      (v_tenant_id, 'Análise de Crédito', 3, 'financiamento'),
      (v_tenant_id, 'Assinatura de Proposta', 4, 'financiamento'),
      (v_tenant_id, 'Vistoria', 5, 'financiamento'),
      (v_tenant_id, 'Conformidade', 6, 'financiamento'),
      (v_tenant_id, 'Emissão de Contrato/Escritura', 7, 'financiamento'),
      (v_tenant_id, 'Emissão de ITBI', 8, 'financiamento'),
      (v_tenant_id, 'Registro', 9, 'financiamento'),
      (v_tenant_id, 'Liberação de Recursos', 10, 'financiamento'),
      (v_tenant_id, 'Pagamento de Comissão', 11, 'financiamento'),
      (v_tenant_id, '100% Concluído', 12, 'financiamento'),
      (v_tenant_id, 'Reprovado', 13, 'financiamento'),
      (v_tenant_id, 'Desistência', 14, 'financiamento');
  end if;
end $$;

-- Marca as etapas padrão já existentes (as 16 de Vendas)
-- explicitamente como categoria 'venda' (já é o default, mas
-- deixamos explícito pra clareza).
update etapas_padrao set categoria = 'venda' where categoria is null;

-- Marca o modelo "Correspondente Bancário" (criado no seed
-- original) como categoria financiamento.
update modelos_processo set nome = nome where nome = 'Correspondente Bancário';

alter table modelos_processo add column categoria categoria_processo not null default 'venda';
update modelos_processo set categoria = 'financiamento' where nome = 'Correspondente Bancário';

-- As etapas fixas que tinham sido criadas no seed original pro
-- Correspondente Bancário não batem com o fluxo real (a
-- planilha usa "Fase" como status atual, não uma sequência
-- fixa com datas automáticas). Agora que existe o checklist
-- flexível de etapas padrão (categoria financiamento), essas
-- etapas fixas do modelo ficam sem uso — melhor remover pra
-- não criar etapas erradas automaticamente em processo novo.
delete from modelos_checklist_item
where modelo_etapa_id in (
  select me.id from modelos_etapa me
  join modelos_processo mp on mp.id = me.modelo_processo_id
  where mp.nome = 'Correspondente Bancário'
);
delete from modelos_etapa
where modelo_processo_id in (select id from modelos_processo where nome = 'Correspondente Bancário');

-- =========================================================
-- Evita duplicar corretor/banco se um script de importação
-- rodar mais de uma vez (mesmo problema que já tivemos com
-- a importação de Vendas). Antes de remover a duplicata,
-- repassa qualquer processo/comissão que apontava pra ela
-- pro registro que vamos manter — senão a remoção quebra por
-- violação de chave estrangeira.
-- =========================================================

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

update processos p
set banco_id = manter.id
from bancos dup
join bancos manter
  on manter.nome = dup.nome and manter.tenant_id = dup.tenant_id and manter.id < dup.id
where p.banco_id = dup.id;

delete from bancos a
using bancos b
where a.nome = b.nome and a.tenant_id = b.tenant_id and a.id > b.id;

alter table corretores add constraint corretores_tenant_nome_unique unique (tenant_id, nome);
alter table bancos add constraint bancos_tenant_nome_unique unique (tenant_id, nome);
