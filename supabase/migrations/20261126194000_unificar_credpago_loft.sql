-- CredPago e Seguro Fiança (Loft) são a mesma modalidade operacional.
-- Mantém Garantia Investe (Loft) como modalidade distinta.
update public.contratos_locacao
set garantia_locaticia = 'Seguro Fiança (Loft)'
where garantia_locaticia = 'CredPago';
alter table public.contratos_locacao drop constraint if exists contratos_locacao_garantia_lista;
alter table public.contratos_locacao
  add constraint contratos_locacao_garantia_lista
  check (garantia_locaticia is null or garantia_locaticia in (
    'Caução', 'Fiador', 'Seguro Fiança (Loft)', 'Garantia Investe (Loft)',
    'Título de Capitalização (Brasilcap)', 'Seguro Fiança (outra seguradora)',
    'CredAluga', 'Sem garantia'
  ));
