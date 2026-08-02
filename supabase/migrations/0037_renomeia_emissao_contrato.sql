-- =========================================================
-- Renomeia a etapa "Emissão de Contrato/Escritura" pra
-- "Emissão de Contrato" (nome mais curto, ficava cortado na
-- linha do tempo). Atualiza tanto o modelo padrão (próximos
-- processos) quanto as etapas já criadas nos processos
-- existentes.
-- =========================================================

update etapas_padrao
set nome = 'Emissão de Contrato'
where nome = 'Emissão de Contrato/Escritura';

update etapas
set nome = 'Emissão de Contrato'
where nome = 'Emissão de Contrato/Escritura';
