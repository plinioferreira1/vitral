-- =========================================================
-- Renomeia os modelos existentes e remove o modelo "Locação"
-- (que era um resquício de antes do módulo de Locação de
-- verdade existir — hoje locação vive só em contratos_locacao,
-- não deve aparecer no dropdown de "Novo processo").
-- =========================================================

update modelos_processo set nome = 'Venda' where nome = 'Venda Financiada';
update modelos_processo set nome = 'Financiamento' where nome = 'Correspondente Bancário';

delete from modelos_processo where nome = 'Locação';

-- ---------------------------------------------------------
-- Atualiza a função de seed pra qualquer organização nova
-- criada a partir de agora já nascer com os nomes certos e
-- sem o modelo de Locação solto.
-- ---------------------------------------------------------

create or replace function seed_modelos_padrao(p_tenant_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_modelo_venda uuid;
  v_modelo_corresp uuid;
  v_modelo_registro uuid;
  v_etapa_contrato uuid;
  v_etapa_intermediaria uuid;
  v_etapa_engenharia uuid;
  v_etapa_registro uuid;
  v_etapa_fgts uuid;
  v_etapa_financiamento uuid;
  v_etapa_pagamento uuid;
  v_etapa_comissao uuid;
  v_etapa_temp uuid;
begin
  -- ---------- Modelo: Venda ----------
  insert into public.modelos_processo (tenant_id, nome, descricao, categoria)
  values (p_tenant_id, 'Venda', 'Venda de imóvel com financiamento bancário', 'venda')
  returning id into v_modelo_venda;

  insert into public.modelos_etapa (modelo_processo_id, ordem, nome, tipo_regra_data, dias_offset, responsavel_padrao_perfil)
  values (v_modelo_venda, 1, 'Assinatura do Contrato', 'fixa', 0, 'corretor')
  returning id into v_etapa_contrato;

  insert into public.modelos_etapa (modelo_processo_id, ordem, nome, tipo_regra_data, dias_offset, etapa_referencia_id, responsavel_padrao_perfil)
  values (v_modelo_venda, 2, 'Intermediária', 'relativa_criacao', 30, v_etapa_contrato, 'gerente')
  returning id into v_etapa_intermediaria;

  insert into public.modelos_etapa (modelo_processo_id, ordem, nome, tipo_regra_data, dias_offset, etapa_referencia_id, responsavel_padrao_perfil)
  values (v_modelo_venda, 3, 'Engenharia', 'relativa_etapa_anterior', 10, v_etapa_intermediaria, 'correspondente')
  returning id into v_etapa_engenharia;

  insert into public.modelos_etapa (modelo_processo_id, ordem, nome, tipo_regra_data, dias_offset, etapa_referencia_id, responsavel_padrao_perfil)
  values (v_modelo_venda, 4, 'Registro', 'relativa_etapa_anterior', 15, v_etapa_engenharia, 'corretor')
  returning id into v_etapa_registro;

  insert into public.modelos_checklist_item (modelo_etapa_id, descricao, ordem) values
    (v_etapa_registro, 'Emitir ITBI', 1),
    (v_etapa_registro, 'Protocolar cartório', 2),
    (v_etapa_registro, 'Aguardar devolução', 3),
    (v_etapa_registro, 'Retirar matrícula', 4);

  insert into public.modelos_etapa (modelo_processo_id, ordem, nome, tipo_regra_data, dias_offset, etapa_referencia_id, responsavel_padrao_perfil)
  values (v_modelo_venda, 5, 'Liberação FGTS', 'relativa_etapa_anterior', 15, v_etapa_engenharia, 'correspondente')
  returning id into v_etapa_fgts;

  insert into public.modelos_etapa (modelo_processo_id, ordem, nome, tipo_regra_data, dias_offset, etapa_referencia_id, responsavel_padrao_perfil)
  values (v_modelo_venda, 6, 'Assinatura do Financiamento', 'relativa_etapa_anterior', 5, v_etapa_registro, 'correspondente')
  returning id into v_etapa_financiamento;

  insert into public.modelos_etapa (modelo_processo_id, ordem, nome, tipo_regra_data, dias_offset, etapa_referencia_id, responsavel_padrao_perfil)
  values (v_modelo_venda, 7, 'Pagamento', 'relativa_criacao', 90, v_etapa_contrato, 'financeiro')
  returning id into v_etapa_pagamento;

  insert into public.modelos_etapa (modelo_processo_id, ordem, nome, tipo_regra_data, dias_offset, etapa_referencia_id, responsavel_padrao_perfil)
  values (v_modelo_venda, 8, 'Comissão', 'relativa_etapa_anterior', 5, v_etapa_pagamento, 'financeiro')
  returning id into v_etapa_comissao;

  -- ---------- Modelo: Financiamento ----------
  insert into public.modelos_processo (tenant_id, nome, descricao, categoria)
  values (p_tenant_id, 'Financiamento', 'Financiamento habitacional via correspondente', 'financiamento')
  returning id into v_modelo_corresp;

  -- (as etapas do Financiamento hoje vêm do catálogo de etapas
  -- padrão da categoria, não de um modelo fixo — ver seed_etapas_padrao)

  -- ---------- Modelo: Registro de Imóvel (avulso) ----------
  insert into public.modelos_processo (tenant_id, nome, descricao, categoria)
  values (p_tenant_id, 'Registro de Imóvel', 'Registro avulso, fora de uma venda em andamento', 'venda')
  returning id into v_modelo_registro;

  insert into public.modelos_etapa (modelo_processo_id, ordem, nome, tipo_regra_data, dias_offset, responsavel_padrao_perfil)
  values (v_modelo_registro, 1, 'Registro', 'fixa', 0, 'corretor')
  returning id into v_etapa_temp;

  insert into public.modelos_checklist_item (modelo_etapa_id, descricao, ordem) values
    (v_etapa_temp, 'Emitir ITBI', 1),
    (v_etapa_temp, 'Protocolar cartório', 2),
    (v_etapa_temp, 'Aguardar devolução', 3),
    (v_etapa_temp, 'Retirar matrícula', 4);

end;
$$;
