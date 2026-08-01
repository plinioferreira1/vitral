-- =========================================================
-- Correção: o "número" do contrato deve ser o nome/endereço
-- do imóvel (ex: "307 Alegria"), não um código sequencial
-- tipo LOC-0002. Aplica pra todos os contratos existentes.
-- =========================================================

update contratos_locacao c
set numero = i.endereco
from imoveis i
where c.imovel_id = i.id
  and i.endereco is not null
  and c.numero != i.endereco;
