-- Garantia locatícia escolhida de uma lista e valor da caução em dinheiro
-- (centavos), para o controle de quanto manter em caixa. Só acréscimos.
alter table public.contratos_locacao
  add column if not exists caucao_valor_centavos bigint
  check (caucao_valor_centavos is null or caucao_valor_centavos >= 0);

alter table public.contratos_locacao
  add constraint contratos_locacao_garantia_lista check (
    garantia_locaticia is null or garantia_locaticia in (
      'Caução', 'Fiador', 'Seguro Fiança (Loft)', 'Garantia Investe (Loft)',
      'Título de Capitalização (Brasilcap)', 'Seguro Fiança (outra seguradora)', 'Sem garantia'
    )
  );

alter table public.contratos_locacao
  add constraint contratos_locacao_caucao_so_com_caucao check (
    caucao_valor_centavos is null or garantia_locaticia = 'Caução'
  );
