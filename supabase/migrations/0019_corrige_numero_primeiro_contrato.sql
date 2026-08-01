-- =========================================================
-- Corrige o número do primeiro contrato de Locação, que
-- ficou como "307 Alegria" (o endereço) em vez de "LOC-0001".
-- =========================================================

update contratos_locacao c
set numero = 'LOC-0001'
from imoveis i
where c.imovel_id = i.id
  and i.endereco = '307 Alegria'
  and c.numero != 'LOC-0001';
