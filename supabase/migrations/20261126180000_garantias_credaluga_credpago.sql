-- Adiciona os produtos CredPago e CredAluga sem confundi-los com a Loft.
-- Contratos históricos permanecem inalterados.
alter table public.contratos_locacao
  drop constraint if exists contratos_locacao_garantia_lista;
alter table public.contratos_locacao
  add constraint contratos_locacao_garantia_lista
  check (garantia_locaticia is null or garantia_locaticia in (
    'Caução','Fiador','Seguro Fiança (Loft)','Garantia Investe (Loft)',
    'Título de Capitalização (Brasilcap)','Seguro Fiança (outra seguradora)',
    'CredPago','CredAluga','Sem garantia'
  ));
