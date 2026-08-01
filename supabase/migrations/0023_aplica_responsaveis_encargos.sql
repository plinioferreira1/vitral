-- =========================================================
-- Regra geral: o locatário paga IPTU, condomínio, água, luz
-- e gás — só preenche onde ainda estiver em branco, sem
-- sobrescrever nada que já tenha sido ajustado manualmente.
-- =========================================================

update contratos_locacao
set
  responsavel_iptu = coalesce(responsavel_iptu, 'locatario'),
  responsavel_condominio = coalesce(responsavel_condominio, 'locatario'),
  responsavel_agua = coalesce(responsavel_agua, 'locatario'),
  responsavel_luz = coalesce(responsavel_luz, 'locatario'),
  responsavel_gas = coalesce(responsavel_gas, 'locatario');

-- ---------------------------------------------------------
-- Exceções específicas por contrato
-- ---------------------------------------------------------

-- Vivaldi: condomínio e IPTU ficam com o proprietário (locador)
update contratos_locacao c
set responsavel_condominio = 'locador',
    responsavel_iptu = 'locador'
from imoveis i
where c.imovel_id = i.id
  and i.endereco ilike '%vivaldi%';

-- Fusion 602: condomínio é pago pela imobiliária
update contratos_locacao c
set responsavel_condominio = 'imobiliaria'
from imoveis i
where c.imovel_id = i.id
  and i.endereco ilike '%fusion%602%';

-- Graúna 1601B: condomínio é pago pela imobiliária
update contratos_locacao c
set responsavel_condominio = 'imobiliaria'
from imoveis i
where c.imovel_id = i.id
  and i.endereco ilike '%1601%'
  and i.endereco ilike '%gra%na%';
