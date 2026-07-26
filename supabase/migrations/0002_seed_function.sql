-- =========================================================
-- Função para popular os modelos de processo padrão de um
-- tenant novo (Venda Financiada, Locação, Correspondente
-- Bancário). É chamada automaticamente quando o primeiro
-- usuário de um tenant é criado (ver trigger em 0003).
-- =========================================================

create or replace function seed_modelos_padrao(p_tenant_id uuid)
returns void
language plpgsql
security definer
as $$
declare
  v_modelo_venda uuid;
  v_modelo_locacao uuid;
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
  -- ---------- Modelo: Venda Financiada ----------
  insert into modelos_processo (tenant_id, nome, descricao)
  values (p_tenant_id, 'Venda Financiada', 'Venda de imóvel com financiamento bancário')
  returning id into v_modelo_venda;

  insert into modelos_etapa (modelo_processo_id, ordem, nome, tipo_regra_data, dias_offset, responsavel_padrao_perfil)
  values (v_modelo_venda, 1, 'Assinatura do Contrato', 'fixa', 0, 'corretor')
  returning id into v_etapa_contrato;

  insert into modelos_etapa (modelo_processo_id, ordem, nome, tipo_regra_data, dias_offset, etapa_referencia_id, responsavel_padrao_perfil)
  values (v_modelo_venda, 2, 'Intermediária', 'relativa_criacao', 30, v_etapa_contrato, 'gerente')
  returning id into v_etapa_intermediaria;

  insert into modelos_etapa (modelo_processo_id, ordem, nome, tipo_regra_data, dias_offset, etapa_referencia_id, responsavel_padrao_perfil)
  values (v_modelo_venda, 3, 'Engenharia', 'relativa_etapa_anterior', 10, v_etapa_intermediaria, 'correspondente')
  returning id into v_etapa_engenharia;

  insert into modelos_etapa (modelo_processo_id, ordem, nome, tipo_regra_data, dias_offset, etapa_referencia_id, responsavel_padrao_perfil)
  values (v_modelo_venda, 4, 'Registro', 'relativa_etapa_anterior', 15, v_etapa_engenharia, 'corretor')
  returning id into v_etapa_registro;

  insert into modelos_checklist_item (modelo_etapa_id, descricao, ordem) values
    (v_etapa_registro, 'Emitir ITBI', 1),
    (v_etapa_registro, 'Protocolar cartório', 2),
    (v_etapa_registro, 'Aguardar devolução', 3),
    (v_etapa_registro, 'Retirar matrícula', 4);

  insert into modelos_etapa (modelo_processo_id, ordem, nome, tipo_regra_data, dias_offset, etapa_referencia_id, responsavel_padrao_perfil)
  values (v_modelo_venda, 5, 'Liberação FGTS', 'relativa_etapa_anterior', 15, v_etapa_engenharia, 'correspondente')
  returning id into v_etapa_fgts;

  insert into modelos_etapa (modelo_processo_id, ordem, nome, tipo_regra_data, dias_offset, etapa_referencia_id, responsavel_padrao_perfil)
  values (v_modelo_venda, 6, 'Assinatura do Financiamento', 'relativa_etapa_anterior', 5, v_etapa_registro, 'correspondente')
  returning id into v_etapa_financiamento;

  insert into modelos_etapa (modelo_processo_id, ordem, nome, tipo_regra_data, dias_offset, etapa_referencia_id, responsavel_padrao_perfil)
  values (v_modelo_venda, 7, 'Pagamento', 'relativa_criacao', 90, v_etapa_contrato, 'financeiro')
  returning id into v_etapa_pagamento;

  insert into modelos_etapa (modelo_processo_id, ordem, nome, tipo_regra_data, dias_offset, etapa_referencia_id, responsavel_padrao_perfil)
  values (v_modelo_venda, 8, 'Comissão', 'relativa_etapa_anterior', 5, v_etapa_pagamento, 'financeiro')
  returning id into v_etapa_comissao;

  -- ---------- Modelo: Locação ----------
  insert into modelos_processo (tenant_id, nome, descricao)
  values (p_tenant_id, 'Locação', 'Contrato de aluguel residencial ou comercial')
  returning id into v_modelo_locacao;

  insert into modelos_etapa (modelo_processo_id, ordem, nome, tipo_regra_data, dias_offset, responsavel_padrao_perfil)
  values (v_modelo_locacao, 1, 'Vistoria de Entrada', 'fixa', 0, 'corretor')
  returning id into v_etapa_temp;

  insert into modelos_etapa (modelo_processo_id, ordem, nome, tipo_regra_data, dias_offset, etapa_referencia_id, responsavel_padrao_perfil)
  values (v_modelo_locacao, 2, 'Assinatura do Contrato', 'relativa_etapa_anterior', 3, v_etapa_temp, 'gerente')
  returning id into v_etapa_temp;

  insert into modelos_etapa (modelo_processo_id, ordem, nome, tipo_regra_data, dias_offset, etapa_referencia_id, responsavel_padrao_perfil)
  values (v_modelo_locacao, 3, 'Entrega das Chaves', 'relativa_etapa_anterior', 1, v_etapa_temp, 'corretor');

  insert into modelos_etapa (modelo_processo_id, ordem, nome, tipo_regra_data, dias_offset, responsavel_padrao_perfil)
  values (v_modelo_locacao, 4, 'Renovação / Reajuste (12 meses)', 'relativa_criacao', 365, 'gerente');

  -- ---------- Modelo: Correspondente Bancário ----------
  insert into modelos_processo (tenant_id, nome, descricao)
  values (p_tenant_id, 'Correspondente Bancário', 'Financiamento habitacional via correspondente')
  returning id into v_modelo_corresp;

  insert into modelos_etapa (modelo_processo_id, ordem, nome, tipo_regra_data, dias_offset, responsavel_padrao_perfil)
  values (v_modelo_corresp, 1, 'Abertura de Simulação', 'fixa', 0, 'correspondente')
  returning id into v_etapa_temp;

  insert into modelos_etapa (modelo_processo_id, ordem, nome, tipo_regra_data, dias_offset, etapa_referencia_id, responsavel_padrao_perfil)
  values (v_modelo_corresp, 2, 'Envio de Documentação ao Banco', 'relativa_etapa_anterior', 3, v_etapa_temp, 'correspondente')
  returning id into v_etapa_temp;

  insert into modelos_etapa (modelo_processo_id, ordem, nome, tipo_regra_data, dias_offset, etapa_referencia_id, responsavel_padrao_perfil)
  values (v_modelo_corresp, 3, 'Análise de Crédito', 'relativa_etapa_anterior', 15, v_etapa_temp, 'correspondente')
  returning id into v_etapa_temp;

  insert into modelos_etapa (modelo_processo_id, ordem, nome, tipo_regra_data, dias_offset, etapa_referencia_id, responsavel_padrao_perfil)
  values (v_modelo_corresp, 4, 'Assinatura do Contrato de Financiamento', 'relativa_etapa_anterior', 10, v_etapa_temp, 'correspondente')
  returning id into v_etapa_temp;

  insert into modelos_etapa (modelo_processo_id, ordem, nome, tipo_regra_data, dias_offset, etapa_referencia_id, responsavel_padrao_perfil)
  values (v_modelo_corresp, 5, 'Liberação de Recursos', 'relativa_etapa_anterior', 10, v_etapa_temp, 'correspondente')
  returning id into v_etapa_temp;

  insert into modelos_etapa (modelo_processo_id, ordem, nome, tipo_regra_data, dias_offset, etapa_referencia_id, responsavel_padrao_perfil)
  values (v_modelo_corresp, 6, 'Comissão do Correspondente', 'relativa_etapa_anterior', 5, v_etapa_temp, 'financeiro');

  -- ---------- Modelo: Registro (avulso) ----------
  insert into modelos_processo (tenant_id, nome, descricao)
  values (p_tenant_id, 'Registro de Imóvel', 'Registro avulso, fora de uma venda em andamento')
  returning id into v_modelo_registro;

  insert into modelos_etapa (modelo_processo_id, ordem, nome, tipo_regra_data, dias_offset, responsavel_padrao_perfil)
  values (v_modelo_registro, 1, 'Registro', 'fixa', 0, 'corretor')
  returning id into v_etapa_temp;

  insert into modelos_checklist_item (modelo_etapa_id, descricao, ordem) values
    (v_etapa_temp, 'Emitir ITBI', 1),
    (v_etapa_temp, 'Protocolar cartório', 2),
    (v_etapa_temp, 'Aguardar devolução', 3),
    (v_etapa_temp, 'Retirar matrícula', 4);

end;
$$;
